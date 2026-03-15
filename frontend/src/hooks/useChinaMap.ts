import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import type { ECharts } from "@/lib/echarts";
import type { EChartsOption } from "echarts";
import { useRequest } from "ahooks";
import type { ProvincePollutionData } from "@/api/middle";
import {
    loadChinaGeoJson,
    convertAdcodeToCode,
    type ProvinceGeoJson,
} from "@/data/china-provinces";
import { clamp, hexToRgba } from "@/utils/color";
import { echarts } from "@/lib/echarts";
import { MAP_DISPLAY_CONFIG } from "@/constants/map";
import { PRIMARY_COLOR } from "@/constants/colors";
import { getAirQualityColorByAqi } from "@/constants/airQuality";

const MAP_CENTER: [number, number] = [104.0, 24.0];
const MAP_ZOOM = 1;

const getAqiColor = (aqi: number): string => {
    return getAirQualityColorByAqi(Number.isFinite(aqi) ? aqi : 0);
};

interface MapDataItem {
    name: string;
    value: number;
    code: string;
    province: ProvincePollutionData | null;
}

interface MapClickParams {
    componentType?: string;
    seriesType?: string;
    name?: string;
    data?: unknown;
}

const getClickDataField = (value: unknown, key: "code" | "name"): string | undefined => {
    if (!value || typeof value !== "object") return undefined;
    const record = value as Record<string, unknown>;
    const field = record[key];
    return typeof field === "string" ? field : undefined;
};

export interface UseChinaMapOptions {
    selectedProvince: ProvincePollutionData | null;
    setSelectedProvince: (province: ProvincePollutionData | null) => void;
    chartInstance: ECharts | null;
    setOption: (option: EChartsOption, notMerge?: boolean, lazyUpdate?: boolean) => void;
    liveProvinceData?: ProvincePollutionData[];
}

export interface UseChinaMapReturn {
    mapData: MapDataItem[];
    geoJsonData: ProvinceGeoJson | null;
    isMapRegistered: boolean;
}

export const useChinaMap = (options: UseChinaMapOptions): UseChinaMapReturn => {
    const {
        selectedProvince,
        setSelectedProvince,
        chartInstance,
        setOption,
    } = options;
    const liveProvinceData = options.liveProvinceData;

    const [isMapRegistered, setIsMapRegistered] = useState(false);
    const selectedProvinceRef = useRef<ProvincePollutionData | null>(selectedProvince);
    selectedProvinceRef.current = selectedProvince;

    const mapDataRef = useRef<MapDataItem[]>([]);
    const liveProvinceRef = useRef<ProvincePollutionData[]>(liveProvinceData || []);
    const clickTimerRef = useRef<number | null>(null);

    const { data: geoJsonData } = useRequest(loadChinaGeoJson, {
        defaultParams: [],
    });

    const mapData = useMemo(() => {
        if (!geoJsonData) return [];

        const activeProvinces = Array.isArray(liveProvinceData) && liveProvinceData.length > 0
            ? liveProvinceData
            : [];

        return geoJsonData.features
            .filter((feature) => feature.properties.level === "province")
            .map((feature) => {
                const provinceCode = convertAdcodeToCode(feature.properties.adcode);
                const provinceName = feature.properties.name;
                const province = activeProvinces.find((p) => p.code === provinceCode);

                return {
                    name: provinceName,
                    value: province ? province.aqi : 50,
                    code: provinceCode,
                    province: province || null,
                };
            });
    }, [geoJsonData, liveProvinceData]);

    mapDataRef.current = mapData;
    liveProvinceRef.current = liveProvinceData || [];

    const buildMapOption = useCallback((): EChartsOption => {
        const currentMapData = mapDataRef.current;
        const mapAqiValues = currentMapData.map((item) => item.value);
        const minAqi = mapAqiValues.length > 0 ? Math.min(...mapAqiValues) : 0;
        const maxAqi = mapAqiValues.length > 0 ? Math.max(...mapAqiValues) : 1;
        const aqiRange = Math.max(maxAqi - minAqi, 1);

        const mapDataWithColor = currentMapData.map((item) => {
            const baseColor = getAqiColor(item.value);
            return {
                name: item.name,
                value: item.value,
                code: item.code,
                itemStyle: {
                    areaColor: hexToRgba(baseColor, 0.7),
                    borderColor: hexToRgba(baseColor, 0.9),
                    borderWidth: 1.2,
                    shadowBlur: 10,
                    shadowColor: hexToRgba(baseColor, 0.48),
                },
            };
        });

        const hotSpotData = currentMapData
            .filter((item) => {
                const longitude = item.province?.longitude;
                const latitude = item.province?.latitude;
                return Number.isFinite(longitude) && Number.isFinite(latitude);
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 16)
            .map((item) => {
                const baseColor = getAqiColor(item.value);
                return {
                    name: item.name,
                    value: [item.province!.longitude, item.province!.latitude, item.value],
                    aqi: item.value,
                    itemStyle: { color: baseColor },
                };
            });

        return {
            backgroundColor: MAP_DISPLAY_CONFIG.backgroundColor,
            animationDuration: 900,
            animationDurationUpdate: 450,
            animationEasing: "quarticOut",
            animationEasingUpdate: "cubicOut",
            geo: {
                map: "china",
                roam: false,
                zoom: MAP_ZOOM,
                center: MAP_CENTER,
                silent: true,
                itemStyle: {
                    areaColor: "rgba(9, 21, 40, 0.95)",
                    borderColor: "rgba(35, 206, 253, 0.18)",
                    borderWidth: 1,
                },
                emphasis: { disabled: true },
                zlevel: 0,
                z: 0,
            },
            series: [
                {
                    type: "map",
                    map: "china",
                    roam: false,
                    zoom: MAP_ZOOM,
                    center: MAP_CENTER,
                    selectedMode: "single",
                    data: mapDataWithColor,
                    itemStyle: {
                        areaColor: "rgba(35, 206, 253, 0.24)",
                        borderColor: "rgba(35, 206, 253, 0.46)",
                        borderWidth: 1.2,
                        shadowBlur: 8,
                        shadowColor: "rgba(35, 206, 253, 0.18)",
                    },
                    emphasis: {
                        itemStyle: {
                            borderColor: "rgba(255, 255, 255, 0.95)",
                            borderWidth: 2.2,
                            shadowBlur: 20,
                            shadowColor: "rgba(255, 255, 255, 0.28)",
                        },
                        label: {
                            show: true,
                            color: "#ffffff",
                            fontSize: 13,
                            fontWeight: 600,
                            textShadowColor: "rgba(0, 0, 0, 0.6)",
                            textShadowBlur: 8,
                        },
                    },
                    select: {
                        itemStyle: {
                            borderColor: "rgba(255, 255, 255, 0.95)",
                            borderWidth: 3,
                            shadowBlur: 26,
                            shadowColor: "rgba(255, 255, 255, 0.32)",
                        },
                        label: {
                            show: true,
                            color: "#f6fbff",
                            fontSize: 13,
                            fontWeight: 700,
                            textShadowColor: "rgba(0, 0, 0, 0.65)",
                            textShadowBlur: 8,
                        },
                    },
                    label: {
                        show: false,
                        color: "rgba(233, 248, 255, 0.95)",
                        fontSize: 11,
                    },
                    zlevel: 1,
                    z: 3,
                } as any,
                {
                    name: "热点省份",
                    type: "effectScatter",
                    coordinateSystem: "geo",
                    showEffectOn: "render",
                    rippleEffect: {
                        period: 4,
                        scale: 4,
                        brushType: "stroke",
                    },
                    symbolSize: (value: unknown) => {
                        const rawAqi =
                            Array.isArray(value) && value.length >= 3 ? Number(value[2]) : 0;
                        const ratio = clamp((rawAqi - minAqi) / aqiRange, 0, 1);
                        return 7 + ratio * 13;
                    },
                    itemStyle: {
                        borderColor: "rgba(255, 255, 255, 0.86)",
                        borderWidth: 1,
                        shadowBlur: 16,
                        shadowColor: "rgba(35, 206, 253, 0.5)",
                    },
                    tooltip: { show: false },
                    data: hotSpotData,
                    zlevel: 3,
                    z: 7,
                } as any,
            ],
            tooltip: {
                trigger: "item",
                confine: true,
                transitionDuration: 0.15,
                formatter: (params: any) => {
                    const activeProvinceCode = selectedProvinceRef.current?.code || null;

                    if (params.seriesType === "effectScatter") return "";

                    const item = mapDataRef.current.find((d) => d?.name === params.name);
                    if (!item) {
                        return `
                            <div style="padding: 8px 10px; min-width: 120px;">
                                <div style="font-weight: 600; color: #eaf8ff;">${params.name}</div>
                                <div style="margin-top: 4px; color: rgba(220,236,255,0.82);">暂无数据</div>
                            </div>
                        `;
                    }

                    if (activeProvinceCode && item.code !== activeProvinceCode) return "";

                    const color = getAqiColor(item.value);
                    if (!item.province) {
                        return `
                            <div style="padding: 8px 10px; min-width: 140px;">
                                <div style="font-weight: 600; color: #eaf8ff;">${item.name}</div>
                                <div style="margin-top: 6px; color: ${color}; font-weight: 700;">AQI ${item.value}</div>
                            </div>
                        `;
                    }

                    const p = item.province;
                    return `
                        <div style="padding: 8px 12px; min-width: 180px;">
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px;">
                                <div style="font-weight: 600; color: #ecf9ff;">${p.name}</div>
                                <div style="font-size: 11px; color: rgba(199,229,255,0.85);">空气质量</div>
                            </div>
                            <div style="display:flex; align-items:baseline; gap: 6px; margin-bottom: 8px;">
                                <span style="font-size: 24px; font-weight: 700; color: ${color}; line-height: 1;">${p.aqi}</span>
                                <span style="color: ${color}; font-size: 12px;">${p.level}</span>
                            </div>
                            <div style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 10px; color: rgba(226, 240, 255, 0.9); font-size: 12px;">
                                <div>PM2.5: ${p.pm25}</div>
                                <div>PM10: ${p.pm10}</div>
                                <div>NO₂: ${p.no2}</div>
                                <div>SO₂: ${p.so2}</div>
                            </div>
                        </div>
                    `;
                },
                backgroundColor: "rgba(10, 25, 45, 0.95)",
                borderColor: hexToRgba(PRIMARY_COLOR.cyan, 0.72),
                borderWidth: 1,
                padding: 0,
                extraCssText: "box-shadow: 0 12px 28px rgba(0,0,0,0.35); border-radius: 8px;",
                textStyle: { color: "#e6f5ff" },
            },
        };
    }, [mapData, selectedProvince?.code]);

    // 注册地图
    useEffect(() => {
        if (!geoJsonData || !chartInstance || isMapRegistered) return;
        try {
            echarts.registerMap("china", geoJsonData as any);
            setIsMapRegistered(true);
        } catch (error) {
            console.error("注册地图失败:", error);
        }
    }, [geoJsonData, chartInstance, isMapRegistered]);

    const hasInitializedRef = useRef(false);

    // 初始化或数据变化时更新地图配置
    useEffect(() => {
        if (!chartInstance || !geoJsonData || !isMapRegistered || mapData.length === 0) return;
        if (chartInstance.isDisposed()) return;

        try {
            const option = buildMapOption();
            requestAnimationFrame(() => {
                if (!chartInstance || chartInstance.isDisposed()) return;
                setOption(option, !hasInitializedRef.current);
                hasInitializedRef.current = true;
            });
        } catch (error) {
            console.error("更新地图配置失败:", error);
        }
    }, [chartInstance, geoJsonData, isMapRegistered, mapData, setOption, buildMapOption]);

    // 选中省份变化时，用 dispatchAction select 驱动选中态
    // select 状态下 ECharts 自动将该区域渲染在最上层，且不会被 mouseout 取消
    useEffect(() => {
        if (!chartInstance || !isMapRegistered || chartInstance.isDisposed() || !hasInitializedRef.current) {
            return;
        }

        // 先取消所有选中
        chartInstance.dispatchAction({
            type: "unselect",
            seriesIndex: 0,
            dataIndex: mapDataRef.current.map((_, i) => i),
        });

        // 选中目标省份
        if (selectedProvince) {
            const selectedName = mapDataRef.current.find(
                (d) => d.code === selectedProvince.code
            )?.name;
            if (selectedName) {
                chartInstance.dispatchAction({
                    type: "select",
                    seriesIndex: 0,
                    name: selectedName,
                });
            }
        }
    }, [chartInstance, isMapRegistered, selectedProvince]);

    // 处理地图点击事件（selectchanged 不可靠，仍用 click）
    useEffect(() => {
        if (!chartInstance || !isMapRegistered) return;

        const handleClick = (params: MapClickParams) => {
            if (chartInstance && !chartInstance.isDisposed()) {
                chartInstance.dispatchAction({ type: "hideTip" });
            }

            if (params.componentType === "series" && params.seriesType === "map") {
                const currentMapData = mapDataRef.current;
                const currentProvinces = liveProvinceRef.current;
                const clickedCode = getClickDataField(params.data, "code");
                const clickedName = params.name || getClickDataField(params.data, "name");
                const clickedItem =
                    (clickedCode
                        ? currentMapData.find((d) => d.code === clickedCode)
                        : undefined) || currentMapData.find((d) => d.name === clickedName);

                if (clickedItem) {
                    if (clickTimerRef.current !== null) {
                        clearTimeout(clickTimerRef.current);
                        clickTimerRef.current = null;
                    }

                    // 点击已选中的省份 → 取消选中（回到全国）
                    if (selectedProvinceRef.current?.code === clickedItem.code) {
                        clickTimerRef.current = window.setTimeout(() => {
                            setSelectedProvince(null);
                            clickTimerRef.current = null;
                        }, 0);
                        return;
                    }

                    const resolvedProvince =
                        clickedItem.province ||
                        currentProvinces.find((p) => p.code === clickedItem.code) ||
                        ({
                            name: clickedItem.name,
                            code: clickedItem.code,
                            longitude: 0, latitude: 0,
                            pm25: 0, pm10: 0, no2: 0, so2: 0, co: 0, o3: 0,
                            aqi: clickedItem.value || 50,
                            level: "优",
                        } as ProvincePollutionData);

                    clickTimerRef.current = window.setTimeout(() => {
                        setSelectedProvince(resolvedProvince);
                        clickTimerRef.current = null;
                    }, 0);
                }
            }
        };

        chartInstance.on("click", handleClick);

        return () => {
            if (clickTimerRef.current !== null) {
                clearTimeout(clickTimerRef.current);
                clickTimerRef.current = null;
            }
            if (chartInstance && !chartInstance.isDisposed()) {
                chartInstance.off("click", handleClick);
            }
        };
    }, [chartInstance, isMapRegistered, setSelectedProvince]);

    return {
        mapData,
        geoJsonData: geoJsonData ?? null,
        isMapRegistered,
    };
};
