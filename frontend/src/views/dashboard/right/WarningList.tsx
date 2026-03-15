import React, { useMemo } from "react";
import { Typography } from "antd";
import CardInner from "@/components/CardInner";
import Title from "@/components/Title";
import ProvinceName from "@/components/ProvinceName";
import type { PollutionWarningItem } from "@/api/right";
import { getWarningLevelColor } from "@/constants/airQuality";
import { useMapContext } from "@/contexts/MapContext";
import { useProvinceData } from "@/contexts/ProvinceDataContext";
import { useDict } from "@/hooks/useDict";
import { hexToRgba } from "@/utils/color";

const WARNING_LEVEL_WEIGHT: Record<PollutionWarningItem["level"], number> = {
    严重: 4,
    重度: 3,
    中度: 2,
    轻度: 1,
};

const WARNING_LEVEL_LABEL: Record<PollutionWarningItem["level"], string> = {
    严重: "高危",
    重度: "重度",
    中度: "中度",
    轻度: "轻度",
};

const WARNING_LEVEL_ORDER: PollutionWarningItem["level"][] = ["严重", "重度", "中度", "轻度"];

const PROVINCE_SHORT_NAME_MAP: Record<string, string> = {
    内蒙古自治区: "内蒙古",
    广西壮族自治区: "广西",
    西藏自治区: "西藏",
    宁夏回族自治区: "宁夏",
    新疆维吾尔自治区: "新疆",
    香港特别行政区: "香港",
    澳门特别行政区: "澳门",
};

const toProvinceShortName = (name?: string | null): string => {
    if (!name) {
        return "--";
    }

    if (PROVINCE_SHORT_NAME_MAP[name]) {
        return PROVINCE_SHORT_NAME_MAP[name];
    }

    return name
        .replace(/特别行政区$/, "")
        .replace(/维吾尔自治区$/, "")
        .replace(/回族自治区$/, "")
        .replace(/壮族自治区$/, "")
        .replace(/自治区$/, "")
        .replace(/省$/, "")
        .replace(/市$/, "");
};

const splitTimeRange = (timeRange?: string, fallback?: string): [string, string | null] => {
    const source = (timeRange || fallback || "").trim();
    if (!source) {
        return ["--", null];
    }

    const parts = source.split(/\s+-\s+/);
    const [start, end] = parts;

    if (start && end) {
        return [start.trim(), end.trim()];
    }

    return [source, null];
};

const getStatusTone = (status?: string) => {
    switch (status) {
        case "active":
            return {
                color: "rgba(110,231,183,0.96)",
                background: "rgba(110,231,183,0.14)",
                border: "rgba(110,231,183,0.36)",
            };
        case "published":
            return {
                color: "rgba(147,197,253,0.96)",
                background: "rgba(147,197,253,0.14)",
                border: "rgba(147,197,253,0.34)",
            };
        default:
            return {
                color: "rgba(180,212,242,0.9)",
                background: "rgba(180,212,242,0.1)",
                border: "rgba(180,212,242,0.26)",
            };
    }
};

/**
 * 右侧面板上方组件 - 污染预警信息列表
 * 由父容器控制高度（默认约 38%，最小高度 280px）
 */
const WarningList: React.FC = () => {
    const { selectedProvince } = useMapContext();
    const { overview, loading, error, refresh } = useProvinceData();
    const warningLevelDict = useDict("warning_level");
    const warnings: PollutionWarningItem[] = overview.right.warnings;
    const getLevelColor = (level: PollutionWarningItem["level"]): string =>
        (warningLevelDict.getByValue(level)?.color as string) || getWarningLevelColor(level);

    const sortedWarnings = useMemo(
        () =>
            [...warnings].sort(
                (a, b) => WARNING_LEVEL_WEIGHT[b.level] - WARNING_LEVEL_WEIGHT[a.level]
            ),
        [warnings]
    );

    const warningSummary = useMemo(() => {
        return warnings.reduce(
            (acc, item) => {
                acc[item.level] += 1;
                return acc;
            },
            {
                轻度: 0,
                中度: 0,
                重度: 0,
                严重: 0,
            }
        );
    }, [warnings]);

    const dominantLevel = useMemo(() => {
        return WARNING_LEVEL_ORDER.find((level) => warningSummary[level] > 0) ?? null;
    }, [warningSummary]);

    const riskScore = useMemo(() => {
        return WARNING_LEVEL_ORDER.reduce(
            (acc, level) => acc + warningSummary[level] * WARNING_LEVEL_WEIGHT[level],
            0
        );
    }, [warningSummary]);

    const warningTotal = useMemo(
        () => WARNING_LEVEL_ORDER.reduce((acc, level) => acc + warningSummary[level], 0),
        [warningSummary]
    );

    const riskDensity = useMemo(() => {
        if (warningTotal <= 0) {
            return 0;
        }
        return Math.round((riskScore / (warningTotal * WARNING_LEVEL_WEIGHT.严重)) * 100);
    }, [riskScore, warningTotal]);

    const averageSeverity = useMemo(() => {
        if (warningTotal <= 0) {
            return 0;
        }
        return riskScore / warningTotal;
    }, [riskScore, warningTotal]);

    const riskSnapshot = useMemo(() => {
        if (dominantLevel === "严重" || averageSeverity >= 3.2 || riskDensity >= 75) {
            return {
                label: "高风险",
                color: "rgba(255, 107, 142, 0.96)",
                glow: "rgba(255, 107, 142, 0.28)",
            };
        }
        if (dominantLevel === "重度" || averageSeverity >= 2.2 || riskDensity >= 45) {
            return {
                label: "中风险",
                color: "rgba(255, 154, 107, 0.96)",
                glow: "rgba(255, 154, 107, 0.26)",
            };
        }
        return {
            label: "低风险",
            color: "rgba(110, 231, 183, 0.96)",
            glow: "rgba(110, 231, 183, 0.24)",
        };
    }, [averageSeverity, dominantLevel, riskDensity]);

    const focusWarnings = useMemo(() => sortedWarnings.slice(0, 1), [sortedWarnings]);

    const streamWarnings = useMemo(() => sortedWarnings.slice(1), [sortedWarnings]);

    const focusArea = useMemo(() => {
        if (sortedWarnings.length === 0) {
            return toProvinceShortName(selectedProvince?.name);
        }

        const areaWeights = sortedWarnings.reduce<Record<string, number>>((acc, item) => {
            acc[item.area] = (acc[item.area] || 0) + WARNING_LEVEL_WEIGHT[item.level];
            return acc;
        }, {});

        return toProvinceShortName(
            Object.entries(areaWeights).sort((a, b) => b[1] - a[1])[0]?.[0] || "--"
        );
    }, [selectedProvince?.name, sortedWarnings]);

    const headlinePollutant = useMemo(() => {
        if (sortedWarnings.length === 0) {
            return "--";
        }

        const pollutantWeights = sortedWarnings.reduce<Record<string, number>>((acc, item) => {
            acc[item.mainPollutant] = (acc[item.mainPollutant] || 0) + WARNING_LEVEL_WEIGHT[item.level];
            return acc;
        }, {});

        return Object.entries(pollutantWeights).sort((a, b) => b[1] - a[1])[0]?.[0] || "--";
    }, [sortedWarnings]);

    const renderFocusCard = (item: PollutionWarningItem, index: number) => {
        const levelColor = getLevelColor(item.level);
        const statusTone = getStatusTone(item.status);
        const itemKey = `${item.area}-${item.time}-${item.mainPollutant}-${item.level}-focus-${index}`;
        const [timeStart, timeEnd] = splitTimeRange(item.timeRange, item.time);

        return (
            <div
                key={itemKey}
                className="warning-focus-card"
                style={{
                    background: `linear-gradient(135deg, ${hexToRgba(levelColor, 0.18)} 0%, rgba(8, 18, 33, 0.94) 32%, rgba(8, 18, 33, 0.98) 100%)`,
                }}
            >
                <div className="warning-focus-glow" style={{ backgroundColor: hexToRgba(levelColor, 0.2) }} />
                <div className="warning-focus-inner">
                    <div
                        className="warning-focus-band"
                        style={{
                            background: `linear-gradient(180deg, ${hexToRgba(levelColor, 0.95)}, ${hexToRgba(levelColor, 0.52)})`,
                        }}
                    >
                        <span className="warning-focus-band-label">TOP {index + 1}</span>
                        <span className="warning-focus-band-value">{item.level}</span>
                    </div>
                    <div className="warning-focus-content">
                        <div className="warning-focus-header">
                            <div className="min-w-0">
                                <div className="warning-focus-area metric-text-crisp">{item.area}</div>
                            </div>
                            <span
                                className="warning-focus-status"
                                style={{
                                    backgroundColor: statusTone.background,
                                    color: statusTone.color,
                                }}
                            >
                                {item.statusLabel || "生效中"}
                            </span>
                        </div>

                        <div className="warning-focus-facts">
                            <div className="warning-focus-fact warning-focus-fact-pollutant">
                                <span className="warning-focus-fact-label">主污染物</span>
                                <span className="warning-focus-fact-value">{item.mainPollutant}</span>
                            </div>
                            <div className="warning-focus-fact warning-focus-fact-time-block">
                                <span className="warning-focus-fact-label">生效时段</span>
                                <span className="warning-focus-fact-value warning-focus-time">
                                    <span>{timeStart}</span>
                                    {timeEnd ? <span>{timeEnd}</span> : null}
                                </span>
                            </div>
                            {item.description ? (
                                <div className="warning-focus-fact warning-focus-fact-wide">
                                    <span className="warning-focus-fact-label">关注原因</span>
                                    <Typography.Paragraph
                                        className="warning-focus-fact-value warning-focus-reason"
                                        ellipsis={{
                                            rows: 2,
                                            tooltip: item.description,
                                        }}
                                    >
                                        {item.description}
                                    </Typography.Paragraph>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderStreamItem = (item: PollutionWarningItem, index: number) => {
        const levelColor = getLevelColor(item.level);
        const statusTone = getStatusTone(item.status);
        const itemKey = `${item.area}-${item.time}-${item.mainPollutant}-${item.level}-stream-${index}`;

        return (
            <div key={itemKey} className="warning-stream-item">
                <div className="warning-stream-left">
                    <span
                        className="warning-stream-dot"
                        style={{ backgroundColor: levelColor, boxShadow: `0 0 12px ${hexToRgba(levelColor, 0.34)}` }}
                    />
                    <div className="min-w-0">
                        <div className="warning-stream-area">{item.area}</div>
                        <div className="warning-stream-meta">
                            {item.mainPollutant} · {item.timeRange || item.time}
                        </div>
                    </div>
                </div>
                <div className="warning-stream-right">
                    <span className="warning-stream-level" style={{ color: levelColor }}>
                        {item.level}
                    </span>
                    <span
                        className="warning-stream-status"
                        style={{
                            backgroundColor: statusTone.background,
                            color: statusTone.color,
                        }}
                    >
                        {item.statusLabel || "生效中"}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <CardInner
            className="h-full flex flex-col overflow-hidden"
            error={error}
            onRetry={refresh}
            errorMessage="加载数据失败"
            loading={loading && !error && warnings.length === 0}
        >
            <div className="mb-3 flex items-center">
                <Title
                    className="min-w-0"
                    textClassName="title-emphasis"
                    decorationClassName="title-decoration-compact"
                    decorationGap={8}
                    decorationScale={0.9}
                    decorationOpacity={0.75}
                >
                    污染预警信息
                    {selectedProvince && <ProvinceName name={selectedProvince.name} />}
                </Title>
            </div>

            <div className="warning-command-board min-h-0 flex-1 gap-2">
                <section className="warning-situation-bar">
                    <div className="warning-situation-main">
                        <div className="warning-situation-label">当前态势</div>
                        <div className="warning-situation-value" style={{ color: riskSnapshot.color }}>
                            {riskSnapshot.label}
                        </div>
                    </div>
                    <div className="warning-situation-metrics">
                        <div className="warning-situation-metric">
                            <span className="warning-situation-metric-label">预警总数</span>
                            <span className="warning-situation-metric-value tech-number">{warningTotal}</span>
                        </div>
                        <div className="warning-situation-metric">
                            <span className="warning-situation-metric-label">重点区域</span>
                            <span className="warning-situation-metric-value">{focusArea}</span>
                        </div>
                        <div className="warning-situation-metric">
                            <span className="warning-situation-metric-label">主导污染物</span>
                            <span className="warning-situation-metric-value">{headlinePollutant}</span>
                        </div>
                        <div className="warning-situation-metric">
                            <span className="warning-situation-metric-label">风险强度</span>
                            <span className="warning-situation-metric-value tech-number">{riskDensity}%</span>
                        </div>
                    </div>
                </section>

                <section className="warning-stream-panel min-h-0">
                    <div className="warning-stream-panel-header">
                        <span className="warning-stream-panel-title">次级预警流</span>
                        {dominantLevel ? (
                            <span className="warning-stream-panel-note">
                                当前主风险等级：{WARNING_LEVEL_LABEL[dominantLevel]}
                            </span>
                        ) : null}
                    </div>
                    {warnings.length === 0 ? (
                        <div className="py-10 text-center panel-subtitle metric-text-crisp text-[13px]">
                            {selectedProvince
                                ? `${selectedProvince.name}暂无预警信息`
                                : "暂无预警信息"}
                        </div>
                    ) : (
                        <div className="warning-list-scroll min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                            <div className="warning-stream-scroll-content">
                                {focusWarnings.length > 0 ? (
                                    <div className="warning-focus-grid">
                                        {focusWarnings.map((item, index) => renderFocusCard(item, index))}
                                    </div>
                                ) : null}
                                {streamWarnings.length > 0 ? (
                                    <div className="warning-stream-list">
                                    {streamWarnings.map((item, index) => renderStreamItem(item, index))}
                                    </div>
                                ) : (
                                    <div className="warning-stream-empty">当前预警已在重点卡片全部展示</div>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </CardInner>
    );
};

export default WarningList;
