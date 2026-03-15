import React, { useMemo } from "react";
import CardInner from "@/components/CardInner";
import type { PollutantRealtimeData } from "@/api/left";
import { POLLUTANT_COLORS } from "@/constants/pollutants";
import { useProvinceData } from "@/contexts/ProvinceDataContext";
import { useDict } from "@/hooks/useDict";

/**
 * 污染物阈值配置
 */
interface PollutantThreshold {
    good: number;
    warning: number;
}

/**
 * 污染物配置常量
 *
 * 定义六种核心污染物的显示配置，包括键名、显示名称、单位和颜色键。
 */
const POLLUTANT_CONFIG = [
    {
        key: "pm25" as const,
        name: "PM2.5",
        unit: "μg/m³",
        colorKey: "PM2.5" as const,
        threshold: { good: 35, warning: 75 } as PollutantThreshold,
    },
    {
        key: "pm10" as const,
        name: "PM10",
        unit: "μg/m³",
        colorKey: "PM10" as const,
        threshold: { good: 50, warning: 150 } as PollutantThreshold,
    },
    {
        key: "no2" as const,
        name: "NO₂",
        unit: "μg/m³",
        colorKey: "NO₂" as const,
        threshold: { good: 80, warning: 180 } as PollutantThreshold,
    },
    {
        key: "so2" as const,
        name: "SO₂",
        unit: "μg/m³",
        colorKey: "SO₂" as const,
        threshold: { good: 50, warning: 150 } as PollutantThreshold,
    },
    {
        key: "co" as const,
        name: "CO",
        unit: "mg/m³",
        colorKey: "CO" as const,
        threshold: { good: 2, warning: 6 } as PollutantThreshold,
    },
    {
        key: "o3" as const,
        name: "O₃",
        unit: "μg/m³",
        colorKey: "O₃" as const,
        threshold: { good: 100, warning: 180 } as PollutantThreshold,
    },
] as const;

const clamp = (value: number, min: number, max: number): number => {
    if (value < min) return min;
    if (value > max) return max;
    return value;
};

const hexToRgba = (hex: string, alpha: number): string => {
    const normalized = hex.replace("#", "").trim();
    const parsedHex =
        normalized.length === 3
            ? normalized
                  .split("")
                  .map((char) => `${char}${char}`)
                  .join("")
            : normalized;

    if (!/^[\da-fA-F]{6}$/.test(parsedHex)) {
        return hex;
    }

    const r = Number.parseInt(parsedHex.slice(0, 2), 16);
    const g = Number.parseInt(parsedHex.slice(2, 4), 16);
    const b = Number.parseInt(parsedHex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
};

const getPollutantStatus = (value: number, threshold: PollutantThreshold) => {
    if (value <= threshold.good) {
        return {
            label: "良好",
            color: "#6EE7B7",
            progress: clamp(value / threshold.warning, 0.06, 1),
        };
    }

    if (value <= threshold.warning) {
        return {
            label: "偏高",
            color: "#FFD166",
            progress: clamp(value / threshold.warning, 0.06, 1),
        };
    }

    return {
        label: "警戒",
        color: "#FF6B8E",
        progress: clamp(value / (threshold.warning * 1.35), 0.06, 1),
    };
};

/**
 * 左侧面板上方组件 - 核心污染物实时数据
 *
 * 显示六种核心污染物的实时浓度数据，固定高度 200px。
 * 根据选中的省份自动更新数据。
 */
const TopStats: React.FC = () => {
    const { overview, loading, error, refresh } = useProvinceData();
    const pollutantDict = useDict("pollutant");

    const displayData: PollutantRealtimeData = overview.left.realtime;

    // 核心污染物实时数据配置
    const pollutants = useMemo(() => {
        return POLLUTANT_CONFIG.map((config) => {
            const value = displayData[config.key];
            const status = getPollutantStatus(value, config.threshold);
            const dictItem = pollutantDict.getByValue(config.name);

            return {
                name: dictItem?.label || config.name,
                value,
                unit: typeof dictItem?.unit === "string" ? dictItem.unit : config.unit,
                color: POLLUTANT_COLORS[config.colorKey].color,
                statusLabel: status.label,
                statusColor: status.color,
                progress: status.progress,
            };
        });
    }, [displayData, pollutantDict.getByValue]);

    return (
        <CardInner
            className="h-[200px]"
            error={error}
            onRetry={refresh}
            errorMessage="加载数据失败"
            loading={loading && !error && pollutants.length === 0}
            decorated={false}
            frameTone="calm"
        >
            <div className="grid grid-cols-3 grid-rows-2 gap-3 h-full">
                {pollutants.map((pollutant) => (
                    <div
                        key={pollutant.name}
                        className="panel-item p-3 metric-card-clean"
                        style={{
                            background:
                                "linear-gradient(180deg, rgba(12, 24, 43, 0.96) 0%, rgba(8, 17, 32, 0.98) 100%)",
                            boxShadow: `inset 0 0 0 1px ${hexToRgba(pollutant.color, 0.08)}, 0 10px 22px rgba(2, 10, 20, 0.18)`,
                        }}
                    >
                        <div className="relative z-10 flex h-full flex-col justify-between">
                            <div className="flex items-start justify-between gap-2">
                                <div className="text-[12px] leading-4 tracking-[0.04em] panel-title font-semibold uppercase metric-text-crisp">
                                    {pollutant.name}
                                </div>
                                <span
                                    className="panel-pill metric-text-crisp"
                                    style={{
                                        borderColor: hexToRgba(pollutant.statusColor, 0.45),
                                        backgroundColor: hexToRgba(pollutant.statusColor, 0.08),
                                        color: pollutant.statusColor,
                                        textShadow: "none",
                                    }}
                                >
                                    {pollutant.statusLabel}
                                </span>
                            </div>

                            <div className="mt-1 flex items-end gap-1">
                                <span
                                    className="text-[28px] leading-none font-bold tech-number metric-text-crisp"
                                    style={{
                                        color: pollutant.color,
                                        textShadow: "none",
                                    }}
                                >
                                    {pollutant.value.toFixed(1)}
                                </span>
                                <span className="mb-0.5 text-[11px] text-[rgba(179,206,233,0.92)] metric-text-crisp">
                                    {pollutant.unit}
                                </span>
                            </div>

                            <div className="panel-track mt-2">
                                <div
                                    className="panel-track-fill"
                                    style={{
                                        width: `${pollutant.progress * 100}%`,
                                        background: `linear-gradient(90deg, ${hexToRgba(pollutant.color, 0.24)} 0%, ${hexToRgba(pollutant.color, 0.88)} 100%)`,
                                        boxShadow: `0 0 0 1px ${hexToRgba(pollutant.color, 0.12)}`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </CardInner>
    );
};

export default TopStats;
