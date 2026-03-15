import React, { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import Card from "@/components/Card";
import Title from "@/components/Title";
import ProvinceName from "@/components/ProvinceName";
import type { MonthlyPollutantData } from "@/api/bottom";
import { POLLUTANT_COLORS } from "@/constants/pollutants";
import { PRIMARY_COLOR, BACKGROUND_COLOR, TEXT_COLOR, CHART_COLOR } from "@/constants/colors";
import { useMapContext } from "@/contexts/MapContext";
import { useProvinceData } from "@/contexts/ProvinceDataContext";
import { useECharts } from "@/hooks/useECharts";

/**
 * 默认月度数据
 */
const DEFAULT_MONTHLY_DATA: MonthlyPollutantData[] = [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
].map((month) => ({
    month,
    currentPM25: 60,
    previousPM25: 70,
    currentPM10: 90,
    previousPM10: 100,
}));

/**
 * 创建柱状图 series 配置
 */
const createBarSeries = (
    name: string,
    pollutantKey: keyof Pick<
        MonthlyPollutantData,
        "currentPM25" | "previousPM25" | "currentPM10" | "previousPM10"
    >,
    data: MonthlyPollutantData[],
    isCurrent: boolean
) => {
    const pollutantName = name.includes("PM2.5") ? "PM2.5" : "PM10";
    const colors = POLLUTANT_COLORS[pollutantName as keyof typeof POLLUTANT_COLORS];

    return {
        name,
        type: "bar" as const,
        data: data.map((item) => item[pollutantKey]),
        barWidth: "15%",
        itemStyle: {
            color: {
                type: "linear" as const,
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                    {
                        offset: 0,
                        color: isCurrent ? colors.color : colors.rgba.medium,
                    },
                    {
                        offset: 1,
                        color: isCurrent ? colors.rgba.mediumHigh : colors.rgba.mediumLow,
                    },
                ],
            },
            borderRadius: [4, 4, 0, 0],
        },
    };
};

const MonthlyFallbackChart: React.FC<{ data: MonthlyPollutantData[] }> = ({ data }) => {
    const rows = data.length > 0 ? data : DEFAULT_MONTHLY_DATA;
    const allValues = rows.flatMap((item) => [
        Number(item.currentPM25) || 0,
        Number(item.previousPM25) || 0,
        Number(item.currentPM10) || 0,
        Number(item.previousPM10) || 0,
    ]);
    const max = Math.max(...allValues, 1);

    return (
        <div className="h-[260px] w-full rounded bg-[rgba(7,21,38,0.45)] p-3">
            <div className="flex h-full items-end gap-2 overflow-hidden">
                {rows.slice(0, 12).map((item) => (
                    <div key={item.month} className="flex h-full min-w-0 flex-1 items-end gap-1">
                        <div
                            className="w-1/4 rounded-t bg-[rgba(255,107,142,0.86)]"
                            style={{ height: `${Math.max((item.currentPM25 / max) * 100, 2)}%` }}
                        />
                        <div
                            className="w-1/4 rounded-t bg-[rgba(255,107,142,0.45)]"
                            style={{ height: `${Math.max((item.previousPM25 / max) * 100, 2)}%` }}
                        />
                        <div
                            className="w-1/4 rounded-t bg-[rgba(255,154,107,0.86)]"
                            style={{ height: `${Math.max((item.currentPM10 / max) * 100, 2)}%` }}
                        />
                        <div
                            className="w-1/4 rounded-t bg-[rgba(255,154,107,0.45)]"
                            style={{ height: `${Math.max((item.previousPM10 / max) * 100, 2)}%` }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * 月度污染物浓度对比柱状图组件
 */
const MonthlyPollutantChart: React.FC = () => {
    const { selectedProvince } = useMapContext();
    const { overview, error, refresh } = useProvinceData();

    const monthlyData: MonthlyPollutantData[] = overview.bottom.monthlyPollutant;

    const chartOption: EChartsOption = useMemo(() => {
        const data = monthlyData.length > 0 ? monthlyData : DEFAULT_MONTHLY_DATA;

        return {
            backgroundColor: "transparent",
            tooltip: {
                trigger: "axis",
                axisPointer: {
                    type: "shadow",
                },
                backgroundColor: BACKGROUND_COLOR.tooltip,
                borderColor: PRIMARY_COLOR.cyan,
                borderWidth: 1,
                padding: [10, 15],
                textStyle: {
                    color: TEXT_COLOR.primary,
                    fontSize: 13,
                    fontWeight: "normal",
                },
                extraCssText: `box-shadow: 0 0 10px ${PRIMARY_COLOR.cyanShadow};`,
            },
            legend: {
                data: ["本月PM2.5", "上月PM2.5", "本月PM10", "上月PM10"],
                top: 5,
                right: 0,
                itemGap: 20,
                textStyle: {
                    color: TEXT_COLOR.secondary,
                    fontSize: 13,
                    fontWeight: "normal",
                },
                icon: "rect",
                itemWidth: 14,
                itemHeight: 8,
            },
            grid: {
                top: "15%",
                right: "2%",
                bottom: "2%",
                left: "2%",
                containLabel: true,
            },
            xAxis: {
                type: "category",
                data: data.map((item) => item.month),
                axisLine: {
                    lineStyle: {
                        color: CHART_COLOR.axisLine,
                        width: 1,
                    },
                },
                axisTick: {
                    show: false,
                },
                axisLabel: {
                    color: CHART_COLOR.axisLabel,
                    fontSize: 13,
                    fontWeight: "normal",
                },
            },
            yAxis: {
                type: "value",
                name: "浓度(μg/m³)",
                nameTextStyle: {
                    color: TEXT_COLOR.secondary,
                    fontSize: 13,
                    fontWeight: "normal",
                    padding: [0, 0, 0, 10],
                },
                axisLine: {
                    show: true,
                    lineStyle: {
                        color: CHART_COLOR.axisLine,
                        width: 1,
                    },
                },
                axisTick: {
                    show: false,
                },
                splitLine: {
                    lineStyle: {
                        color: CHART_COLOR.splitLine,
                        width: 1,
                        type: "dashed",
                    },
                },
                axisLabel: {
                    color: CHART_COLOR.axisLabel,
                    fontSize: 13,
                    fontWeight: "normal",
                },
            },
            series: [
                createBarSeries("本月PM2.5", "currentPM25", data, true),
                createBarSeries("上月PM2.5", "previousPM25", data, false),
                createBarSeries("本月PM10", "currentPM10", data, true),
                createBarSeries("上月PM10", "previousPM10", data, false),
            ],
        };
    }, [monthlyData]);

    const { chartRef, chartError } = useECharts(chartOption);
    const [showFallback, setShowFallback] = useState(false);

    useEffect(() => {
        setShowFallback(false);
        let attempts = 0;
        const timer = window.setInterval(() => {
            attempts += 1;
            const host = chartRef.current;
            const hasRenderedChart = Boolean(host?.querySelector("svg, canvas"));
            if (hasRenderedChart) {
                setShowFallback(false);
                window.clearInterval(timer);
                return;
            }
            if (attempts >= 25) {
                setShowFallback(true);
                window.clearInterval(timer);
            }
        }, 120);

        return () => window.clearInterval(timer);
    }, [chartRef, chartOption]);

    const displayError = error || chartError;

    return (
        <Card
            title={
                <Title>
                    月度污染物浓度对比
                    {selectedProvince ? (
                        <ProvinceName name={selectedProvince.name} />
                    ) : null}
                </Title>
            }
            className="flex-1 h-full min-h-0"
            loading={false}
            error={displayError}
            onRetry={refresh}
            errorMessage="加载数据失败"
        >
            <div className="relative flex h-full min-h-0 flex-col">
                <div ref={chartRef} className="w-full h-[260px] min-h-[260px]" />
                {showFallback ? (
                    <div className="absolute inset-0">
                        <MonthlyFallbackChart data={monthlyData} />
                    </div>
                ) : null}
            </div>
        </Card>
    );
};

export default MonthlyPollutantChart;
