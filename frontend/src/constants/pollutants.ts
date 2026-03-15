/**
 * 污染物颜色配置
 *
 * 基于头部青色系设计，具有警示感但保持科技感。
 * 统一管理所有污染物相关的颜色定义。
 */

/**
 * 污染物类型
 *
 * 支持的六种核心污染物类型。
 */
export type PollutantType = "PM2.5" | "PM10" | "NO₂" | "SO₂" | "CO" | "O₃";

/**
 * 污染物颜色配置接口
 *
 * 定义每种污染物的颜色配置，包括主色和不同透明度的 RGBA 值。
 */
export interface PollutantColorConfig {
    /** 污染物名称 */
    name: string;
    /** 主要颜色（用于数值、线条、柱状图等） */
    color: string;
    /** RGBA格式，用于渐变和透明度效果 */
    rgba: {
        /** 半透明（0.4）用于area填充 */
        medium: string;
        /** 低透明（0.05）用于渐变结束 */
        light: string;
        /** 高透明（0.6）用于柱状图渐变 */
        mediumHigh: string;
        /** 中低透明（0.3）用于对比柱状图 */
        mediumLow: string;
    };
}

/**
 * 污染物颜色配置映射
 *
 * 每种污染物对应的颜色配置，用于图表展示。
 */
export const POLLUTANT_COLORS: Record<PollutantType, PollutantColorConfig> = {
    "PM2.5": {
        name: "PM2.5",
        color: "#FF6B8E",
        rgba: {
            medium: "rgba(255, 107, 142, 0.4)",
            light: "rgba(255, 107, 142, 0.05)",
            mediumHigh: "rgba(255, 107, 142, 0.6)",
            mediumLow: "rgba(255, 107, 142, 0.3)",
        },
    },
    PM10: {
        name: "PM10",
        color: "#FF9A6B",
        rgba: {
            medium: "rgba(255, 154, 107, 0.4)",
            light: "rgba(255, 154, 107, 0.05)",
            mediumHigh: "rgba(255, 154, 107, 0.6)",
            mediumLow: "rgba(255, 154, 107, 0.3)",
        },
    },
    "NO₂": {
        name: "NO₂",
        color: "#FFD166",
        rgba: {
            medium: "rgba(255, 209, 102, 0.4)",
            light: "rgba(255, 209, 102, 0.05)",
            mediumHigh: "rgba(255, 209, 102, 0.6)",
            mediumLow: "rgba(255, 209, 102, 0.3)",
        },
    },
    "SO₂": {
        name: "SO₂",
        color: "#FFE66D",
        rgba: {
            medium: "rgba(255, 230, 109, 0.4)",
            light: "rgba(255, 230, 109, 0.05)",
            mediumHigh: "rgba(255, 230, 109, 0.6)",
            mediumLow: "rgba(255, 230, 109, 0.3)",
        },
    },
    CO: {
        name: "CO",
        color: "#8FA8C4",
        rgba: {
            medium: "rgba(143, 168, 196, 0.4)",
            light: "rgba(143, 168, 196, 0.05)",
            mediumHigh: "rgba(143, 168, 196, 0.6)",
            mediumLow: "rgba(143, 168, 196, 0.3)",
        },
    },
    "O₃": {
        name: "O₃",
        color: "#A78BFA",
        rgba: {
            medium: "rgba(167, 139, 250, 0.4)",
            light: "rgba(167, 139, 250, 0.05)",
            mediumHigh: "rgba(167, 139, 250, 0.6)",
            mediumLow: "rgba(167, 139, 250, 0.3)",
        },
    },
};
