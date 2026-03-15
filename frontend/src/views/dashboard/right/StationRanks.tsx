import React, { useMemo } from "react";
import Card from "@/components/Card";
import Title from "@/components/Title";
import ProvinceName from "@/components/ProvinceName";
import type { MonitoringStationRankItem } from "@/api/right";
import { getAirQualityLevelColor } from "@/constants/airQuality";
import { useMapContext } from "@/contexts/MapContext";
import { useProvinceData } from "@/contexts/ProvinceDataContext";
import { useDict } from "@/hooks/useDict";
import { clamp, hexToRgba } from "@/utils/color";

const getRankPalette = (index: number) => {
    if (index === 0) {
        return {
            badgeBg: "linear-gradient(135deg, rgba(252,211,77,0.95), rgba(245,158,11,0.92))",
            badgeText: "rgba(21,25,33,0.95)",
            glow: "rgba(252,211,77,0.28)",
        };
    }

    if (index === 1) {
        return {
            badgeBg: "linear-gradient(135deg, rgba(226,232,240,0.95), rgba(148,163,184,0.92))",
            badgeText: "rgba(15,23,42,0.9)",
            glow: "rgba(203,213,225,0.26)",
        };
    }

    if (index === 2) {
        return {
            badgeBg: "linear-gradient(135deg, rgba(251,191,142,0.95), rgba(234,88,12,0.88))",
            badgeText: "rgba(24,24,27,0.92)",
            glow: "rgba(251,146,60,0.22)",
        };
    }

    return {
        badgeBg: "linear-gradient(135deg, rgba(56,189,248,0.32), rgba(2,132,199,0.5))",
        badgeText: "rgba(219,242,255,0.92)",
        glow: "rgba(56,189,248,0.14)",
    };
};

const StationRanks: React.FC = () => {
    const { selectedProvince } = useMapContext();
    const { overview, loading, error, refresh } = useProvinceData();
    const airLevelDict = useDict("air_quality_level");
    const stations: MonitoringStationRankItem[] = overview.right.stationRanks;

    const maxAqi = useMemo(() => {
        if (stations.length === 0) return 1;
        return Math.max(...stations.map((station) => station.aqi), 1);
    }, [stations]);

    const avgAqi = useMemo(() => {
        if (stations.length === 0) return 0;
        const sum = stations.reduce((acc, station) => acc + station.aqi, 0);
        return Math.round(sum / stations.length);
    }, [stations]);

    return (
        <Card
            title={
                <div className="mb-2 flex w-full items-center gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Title
                            className="min-w-0"
                            textClassName="title-emphasis"
                            decorationClassName="title-decoration-compact"
                            decorationGap={8}
                            decorationScale={0.9}
                            decorationOpacity={0.75}
                        >
                            监测站点排名
                            {selectedProvince && <ProvinceName name={selectedProvince.name} />}
                        </Title>
                    </div>
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                        <div className="panel-pill metric-text-crisp flex items-center gap-1.5">
                            <span className="panel-muted text-[10px]">平均 AQI {avgAqi}</span>
                        </div>
                    </div>
                </div>
            }
            className="h-full min-h-0"
            loading={loading && !error && stations.length === 0}
            error={error}
            onRetry={refresh}
            errorMessage="加载数据失败"
        >
            <div className="flex h-full min-h-0 flex-col">
                <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {stations.length === 0 ? (
                        <div className="panel-subtitle py-4 text-center">
                            {selectedProvince
                                ? `${selectedProvince.name}暂无监测站点数据`
                                : "暂无监测站点数据"}
                        </div>
                    ) : (
                        stations.map((station, index) => {
                            const levelColor =
                                (airLevelDict.getByValue(station.level)?.color as string) ||
                                getAirQualityLevelColor(station.level);
                            const progress = clamp(station.aqi / maxAqi, 0.08, 1);
                            const rankPalette = getRankPalette(index);
                            const stationKey = `${station.name}-${station.aqi}-${station.level}-${index}`;

                            return (
                                <div
                                    key={stationKey}
                                    className="tech-list-item shrink-0 rounded-lg p-3"
                                    style={{
                                        borderColor: hexToRgba(levelColor, 0.28),
                                        boxShadow: `inset 0 0 0 1px ${hexToRgba(levelColor, 0.08)}, 0 0 0 1px ${rankPalette.glow}`,
                                    }}
                                >
                                    <div
                                        className="tech-list-item-strip"
                                        style={{
                                            background: `linear-gradient(180deg, ${hexToRgba(levelColor, 0.92)} 0%, ${hexToRgba(levelColor, 0.36)} 100%)`,
                                        }}
                                    />

                                    <div className="relative z-10 flex items-center justify-between gap-3 pl-0.5">
                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                            <div
                                                className="tech-rank-index flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-[12px] font-bold"
                                                style={{
                                                    borderColor: hexToRgba(levelColor, 0.34),
                                                    background: rankPalette.badgeBg,
                                                    color: rankPalette.badgeText,
                                                    boxShadow: `0 4px 14px ${rankPalette.glow}`,
                                                }}
                                            >
                                                {index + 1}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="panel-title truncate text-sm font-semibold">
                                                        {station.name}
                                                    </div>
                                                    {index < 3 && (
                                                        <span className="panel-pill border-[rgba(251,191,36,0.55)] bg-[rgba(60,42,10,0.45)] text-[rgba(255,225,150,0.96)]">
                                                            TOP {index + 1}
                                                        </span>
                                                    )}
                                                    {station.provinceName && (
                                                        <span className="panel-muted truncate text-[10px]">
                                                            {station.provinceName}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="panel-subtitle mt-1.5 flex items-center gap-2 text-[11px]">
                                                    <span
                                                        className="rounded border px-1.5 py-0.5 text-[10px] leading-none"
                                                        style={{
                                                            borderColor: hexToRgba(levelColor, 0.4),
                                                            color: hexToRgba(levelColor, 0.98),
                                                            backgroundColor: hexToRgba(levelColor, 0.1),
                                                        }}
                                                    >
                                                        首要污染物 {station.mainPollutant}
                                                    </span>
                                                    <span className="panel-muted">
                                                        PM2.5 {station.pm25} μg/m³
                                                    </span>
                                                </div>

                                                <div className="panel-track mt-2 h-[6px] bg-[rgba(12,26,44,0.78)]">
                                                    <div
                                                        className="tech-meter-fill h-full rounded-full"
                                                        style={{
                                                            width: `${progress * 100}%`,
                                                            background: `linear-gradient(90deg, ${hexToRgba(levelColor, 0.22)} 0%, ${hexToRgba(levelColor, 0.58)} 40%, ${levelColor} 100%)`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <div className="panel-muted text-[10px] tracking-[0.08em]">
                                                AQI
                                            </div>
                                            <div
                                                className="tech-number tabular-nums text-[26px] font-bold leading-none tracking-tight"
                                                style={{
                                                    color: levelColor,
                                                    textShadow: `0 0 12px ${hexToRgba(levelColor, 0.22)}`,
                                                }}
                                            >
                                                {station.aqi}
                                            </div>
                                            <div
                                                className="mt-1 text-[11px] font-semibold"
                                                style={{ color: hexToRgba(levelColor, 0.95) }}
                                            >
                                                {station.level}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </Card>
    );
};

export default StationRanks;
