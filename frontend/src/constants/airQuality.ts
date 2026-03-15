/**
 * 空气质量等级和预警等级颜色配置
 *
 * 统一管理空气质量相关的颜色定义。
 */

/**
 * 空气质量等级类型
 *
 * 根据 AQI 值划分的空气质量等级。
 */
export type AirQualityLevel = "优" | "良" | "轻度污染" | "中度污染" | "重度污染" | "严重污染";

/**
 * 预警等级类型
 *
 * 污染预警的等级划分。
 */
export type WarningLevel = "轻度" | "中度" | "重度" | "严重";

/**
 * 空气质量等级颜色映射
 *
 * 每个空气质量等级对应的颜色值。
 */
export const AIR_QUALITY_LEVEL_COLORS: Record<AirQualityLevel, string> = {
    优: "#52C785",
    良: "#9DD852",
    轻度污染: "#FFD166",
    中度污染: "#FF9A6B",
    重度污染: "#FF6B8E",
    严重污染: "#E85D75",
};

/**
 * 预警等级颜色映射
 *
 * 每个预警等级对应的颜色值。
 */
export const WARNING_LEVEL_COLORS: Record<WarningLevel, string> = {
    轻度: "#FFD166",
    中度: "#FF9A6B",
    重度: "#FF6B8E",
    严重: "#E85D75",
};

/**
 * 获取空气质量等级颜色
 *
 * 根据空气质量等级返回对应的颜色值。
 *
 * @param level - 空气质量等级
 * @returns 返回对应的颜色值，如果不存在则返回默认颜色（青色）
 */
export const getAirQualityLevelColor = (level: AirQualityLevel | string): string => {
    return AIR_QUALITY_LEVEL_COLORS[level as AirQualityLevel] || "rgba(35, 206, 253, 1)";
};

/**
 * 获取预警等级颜色
 *
 * 根据预警等级返回对应的颜色值。
 *
 * @param level - 预警等级
 * @returns 返回对应的颜色值
 */
export const getWarningLevelColor = (level: WarningLevel): string => {
    return WARNING_LEVEL_COLORS[level];
};

/**
 * 所有空气质量等级数组
 *
 * 包含所有可能的空气质量等级，用于数据验证和循环处理。
 */
export const AIR_QUALITY_LEVELS: AirQualityLevel[] = [
    "优",
    "良",
    "轻度污染",
    "中度污染",
    "重度污染",
    "严重污染",
];

export const getAirQualityLevelByAqi = (aqi: number): AirQualityLevel => {
    const safeAqi = Number.isFinite(aqi) ? aqi : 0;
    if (safeAqi <= 50) return "优";
    if (safeAqi <= 100) return "良";
    if (safeAqi <= 150) return "轻度污染";
    if (safeAqi <= 200) return "中度污染";
    if (safeAqi <= 300) return "重度污染";
    return "严重污染";
};

export const getAirQualityColorByAqi = (aqi: number): string => {
    const level = getAirQualityLevelByAqi(aqi);
    return AIR_QUALITY_LEVEL_COLORS[level];
};
