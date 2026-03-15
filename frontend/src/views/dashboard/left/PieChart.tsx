import React, { useMemo } from "react";
import type { EChartsOption } from "echarts";
import Card from "@/components/Card";
import Title from "@/components/Title";
import ProvinceName from "@/components/ProvinceName";
import type { AirQualityLevelData } from "@/api/left";
import { PRIMARY_COLOR, BACKGROUND_COLOR, TEXT_COLOR } from "@/constants/colors";
import { useMapContext } from "@/contexts/MapContext";
import { useProvinceData } from "@/contexts/ProvinceDataContext";
import { getAirQualityLevelColor } from "@/constants/airQuality";
import { useECharts } from "@/hooks/useECharts";

/**
 * 左侧面板下方组件 - 空气质量等级分布饼图
 */
const PieChart: React.FC = () => {
    const { selectedProvince } = useMapContext();
    const { overview, error, refresh } = useProvinceData();

    const levelData: AirQualityLevelData[] = overview.left.airQualityLevels;

    const normalizedLevelData = useMemo(
        () =>
            levelData
                .map((item) => ({
                    ...item,
                    color: item.color || getAirQualityLevelColor(item.name),
                }))
                .sort((a, b) => b.value - a.value),
        [levelData]
    );

    const totalCount = useMemo(
        () => normalizedLevelData.reduce((sum, item) => sum + item.value, 0),
        [normalizedLevelData]
    );
    const pieLevelData = useMemo(
        () => normalizedLevelData.filter((item) => item.value > 0),
        [normalizedLevelData]
    );

    const hasData = totalCount > 0;

    const pieOption: EChartsOption = useMemo(
        () => ({
            backgroundColor: "transparent",
            animationDuration: 900,
            animationDurationUpdate: 450,
            animationEasing: "quarticOut",
            tooltip: {
                trigger: "item",
                backgroundColor: BACKGROUND_COLOR.tooltip,
                borderColor: PRIMARY_COLOR.cyan,
                borderWidth: 1,
                padding: [8, 12],
                textStyle: {
                    color: TEXT_COLOR.primary,
                    fontSize: 12,
                    fontWeight: "normal",
                },
                extraCssText: `box-shadow: 0 10px 24px rgba(0,0,0,0.35); border-radius: 8px;`,
                formatter: (params: any) => {
                    if (params.name === "暂无数据") {
                        return "暂无有效监测数据";
                    }
                    const value = Number(params.value || 0);
                    const percent = totalCount ? ((value / totalCount) * 100).toFixed(1) : "0.0";
                    return `${params.marker}${params.name}<br/>数量：${value}<br/>占比：${percent}%`;
                },
            },
            legend: {
                show: hasData,
                orient: "vertical",
                right: 4,
                top: "middle",
                icon: "roundRect",
                itemWidth: 10,
                itemHeight: 10,
                itemGap: 11,
                selectedMode: false,
                padding: [9, 9],
                borderRadius: 10,
                backgroundColor: "rgba(9, 30, 55, 0.34)",
                borderColor: "rgba(111, 186, 236, 0.22)",
                borderWidth: 1,
                textStyle: {
                    color: "rgba(225,238,252,0.94)",
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: 16,
                    rich: {
                        name: {
                            width: 58,
                            fontSize: 13,
                            fontWeight: 500,
                            color: "rgba(228,240,252,0.96)",
                            align: "left",
                        },
                        value: {
                            width: 16,
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: "'DIN Alternate', 'Arial', sans-serif",
                            color: "#EEF8FF",
                            align: "right",
                        },
                        percent: {
                            width: 38,
                            fontSize: 12,
                            fontFamily: "'DIN Alternate', 'Arial', sans-serif",
                            color: "rgba(174, 209, 238, 0.92)",
                            align: "right",
                        },
                    },
                },
                formatter: (name: string) => {
                    const item = normalizedLevelData.find((dataItem) => dataItem.name === name);
                    if (!item) return name;
                    const percent = totalCount
                        ? ((item.value / totalCount) * 100).toFixed(1)
                        : "0.0";
                    return `{name|${name}}{value|${item.value}}{percent|${percent}%}`;
                },
            },
            series: [
                {
                    name: "空气质量等级分布",
                    type: "pie",
                    radius: ["34%", "68%"],
                    center: ["35%", "50%"],
                    minAngle: 0,
                    minShowLabelAngle: 6,
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderColor: "rgba(6,16,30,0.98)",
                        borderWidth: 2,
                        shadowBlur: 12,
                        shadowColor: "rgba(11,57,102,0.35)",
                    },
                    label: {
                        show: hasData,
                        formatter: (params: any) =>
                            params.percent >= 8
                                ? `${params.name}\n${params.percent}%`
                                : `${params.name}`,
                        color: "rgba(232,244,255,0.92)",
                        fontSize: 12,
                        fontWeight: 500,
                        lineHeight: 16,
                    },
                    labelLine: {
                        show: hasData,
                        length: 10,
                        length2: 12,
                        lineStyle: {
                            color: "rgba(185,220,245,0.66)",
                            width: 1,
                        },
                    },
                    labelLayout: {
                        hideOverlap: true,
                    },
                    emphasis: {
                        scale: true,
                        scaleSize: 7,
                        itemStyle: {
                            shadowBlur: 20,
                            shadowColor: "rgba(35,206,253,0.28)",
                        },
                    },
                    data: hasData
                        ? pieLevelData.map((item) => ({
                              name: item.name,
                              value: item.value,
                              itemStyle: {
                                  color: item.color,
                              },
                          }))
                        : [
                              {
                                  name: "暂无数据",
                                  value: 1,
                                  itemStyle: {
                                      color: "rgba(120,166,196,0.25)",
                                  },
                                  label: {
                                      show: false,
                                  },
                              },
                          ],
                },
                {
                    type: "pie",
                    radius: ["72%", "75%"],
                    center: ["35%", "50%"],
                    silent: true,
                    label: {
                        show: true,
                        position: "center",
                        formatter: `{value|${totalCount}}\n{label|监测总量}`,
                        rich: {
                            value: {
                                fontFamily: "'DIN Alternate', 'Arial', sans-serif",
                                fontSize: 30,
                                fontWeight: 700,
                                lineHeight: 40,
                                color: "#EAF8FF",
                                align: "center",
                            },
                            label: {
                                fontFamily: "'Microsoft YaHei', sans-serif",
                                fontSize: 16,
                                fontWeight: 500,
                                lineHeight: 26,
                                color: "rgba(190,216,238,0.92)",
                                align: "center",
                            },
                        },
                    },
                    labelLine: { show: false },
                    data: [
                        {
                            value: 100,
                            itemStyle: {
                                color: "rgba(35,206,253,0.22)",
                            },
                        },
                    ],
                    z: 0,
                },
            ],
        }),
        [normalizedLevelData, pieLevelData, totalCount, hasData]
    );

    const { chartRef, chartError } = useECharts(pieOption);

    const displayError = error || chartError;

    return (
        <Card
            title={
                <Title
                    textClassName="title-emphasis"
                    decorationClassName="title-decoration-compact"
                    decorationGap={9}
                    decorationScale={0.92}
                    decorationOpacity={0.72}
                >
                    空气质量等级分布
                    {selectedProvince && <ProvinceName name={selectedProvince.name} />}
                </Title>
            }
            className="h-[calc(100%-200px-1rem)]"
            loading={false}
            error={displayError}
            onRetry={refresh}
            errorMessage="加载数据失败"
        >
            <div ref={chartRef} className="w-full h-full" />
        </Card>
    );
};

export default PieChart;
