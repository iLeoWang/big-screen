import React, { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import Card from "@/components/Card";
import Title from "@/components/Title";
import ProvinceName from "@/components/ProvinceName";
import type { HourlyPollutantData } from "@/api/bottom";
import { POLLUTANT_COLORS } from "@/constants/pollutants";
import { PRIMARY_COLOR, BACKGROUND_COLOR, TEXT_COLOR, CHART_COLOR } from "@/constants/colors";
import { useMapContext } from "@/contexts/MapContext";
import { useProvinceData } from "@/contexts/ProvinceDataContext";
import { useECharts } from "@/hooks/useECharts";

/**
 * 默认24小时数据
 */
const DEFAULT_HOURLY_DATA: HourlyPollutantData[] = Array.from({ length: 24 }, (_, i) => ({
    hour: String(i).padStart(2, "0"),
    pm25: 50,
    pm10: 80,
    no2: 40,
    o3: 100,
}));

/**
 * 创建折线图 series 配置
 */
const createLineSeries = (
    name: string,
    pollutantKey: keyof Pick<HourlyPollutantData, "pm25" | "pm10" | "no2" | "o3">,
    data: HourlyPollutantData[]
) => ({
    name,
    type: "line" as const,
    smooth: true,
    symbol: "circle",
    symbolSize: 5,
    data: data.map((item) => item[pollutantKey]),
    lineStyle: {
        width: 2,
        color: POLLUTANT_COLORS[name as keyof typeof POLLUTANT_COLORS].color,
    },
    itemStyle: {
        color: POLLUTANT_COLORS[name as keyof typeof POLLUTANT_COLORS].color,
        borderColor: "#fff",
        borderWidth: 1,
    },
    areaStyle: {
        color: {
            type: "linear" as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
                {
                    offset: 0,
                    color: POLLUTANT_COLORS[name as keyof typeof POLLUTANT_COLORS].rgba.medium,
                },
                {
                    offset: 1,
                    color: POLLUTANT_COLORS[name as keyof typeof POLLUTANT_COLORS].rgba.light,
                },
            ],
        },
    },
});

/**
 * 24小时污染物浓度趋势折线图组件
 */
const HourlyPollutantChart: React.FC = () => {
    const { selectedProvince } = useMapContext();
    const { overview, error, refresh } = useProvinceData();

const FALLBACK_COLORS = {
    "PM2.5": "#FF6B8E",
    PM10: "#FF9A6B",
    "NO₂": "#FFD166",
    "O₃": "#A78BFA",
};

const buildLinePoints = (values: number[], width: number, height: number) => {
    if (values.length === 0) return "";
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 1);
    const stepX = values.length > 1 ? width / (values.length - 1) : width;
    return values
        .map((value, index) => {
            const x = index * stepX;
            const y = height - ((value - min) / range) * height;
            return `${x},${y}`;
        })
        .join(" ");
};

const HourlyFallbackChart: React.FC<{ data: HourlyPollutantData[] }> = ({ data }) => {
    const rows = data.length > 0 ? data : DEFAULT_HOURLY_DATA;
    const width = 900;
    const height = 220;

    const series = [
        { name: "PM2.5", values: rows.map((item) => Number(item.pm25) || 0) },
        { name: "PM10", values: rows.map((item) => Number(item.pm10) || 0) },
        { name: "NO₂", values: rows.map((item) => Number(item.no2) || 0) },
        { name: "O₃", values: rows.map((item) => Number(item.o3) || 0) },
    ] as const;

    return (
        <div className="h-[260px] w-full rounded bg-[rgba(7,21,38,0.45)] p-2">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
                {[0, 1, 2, 3, 4].map((line) => (
                    <line
                        key={line}
                        x1={0}
                        y1={(height / 4) * line}
                        x2={width}
                        y2={(height / 4) * line}
                        stroke="rgba(180,212,242,0.14)"
                        strokeDasharray="4 4"
                    />
                ))}
                {series.map((item) => (
                    <polyline
                        key={item.name}
                        points={buildLinePoints(item.values, width, height)}
                        fill="none"
                        stroke={FALLBACK_COLORS[item.name]}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ))}
            </svg>
        </div>
    );
};

    const hourlyData: HourlyPollutantData[] = overview.bottom.hourlyPollutant;

    const chartOption: EChartsOption = useMemo(() => {
        const data = hourlyData.length > 0 ? hourlyData : DEFAULT_HOURLY_DATA;

        return {
            backgroundColor: "transparent",
            tooltip: {
                trigger: "axis",
                axisPointer: {
                    type: "line",
                    lineStyle: {
                        color: PRIMARY_COLOR.cyanMedium,
                        width: 1,
                        type: "dashed",
                    },
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
                data: ["PM2.5", "PM10", "NO₂", "O₃"],
                top: 5,
                right: 0,
                itemGap: 25,
                textStyle: {
                    color: TEXT_COLOR.secondary,
                    fontSize: 13,
                    fontWeight: "normal",
                },
                icon: "line",
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
                data: data.map((item) => item.hour.includes(":") ? item.hour : `${item.hour}:00`),
                boundaryGap: false,
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
                createLineSeries("PM2.5", "pm25", data),
                createLineSeries("PM10", "pm10", data),
                createLineSeries("NO₂", "no2", data),
                createLineSeries("O₃", "o3", data),
            ],
        };
    }, [hourlyData]);

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
                    24小时污染物浓度趋势
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
                        <HourlyFallbackChart data={hourlyData} />
                    </div>
                ) : null}
            </div>
        </Card>
    );
};

export default HourlyPollutantChart;
