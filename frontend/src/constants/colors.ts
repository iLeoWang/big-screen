/**
 * 全局颜色配置
 *
 * 统一管理大屏中所有使用的颜色，包括主色调、背景色、文本颜色和图表颜色。
 */

/**
 * 主色调 - 头部青色系
 *
 * 用于标题、边框、强调等场景的青色系颜色。
 */
export const PRIMARY_COLOR = {
    /** 主青色 - 用于标题、边框、强调 */
    cyan: "rgba(35, 206, 253, 1)",
    /** 半透明青色 - 用于边框、悬停效果 */
    cyanMedium: "rgba(35, 206, 253, 0.6)",
    /** 用于阴影和发光效果 */
    cyanShadow: "rgba(35, 206, 253, 0.3)",
    /** 用于强调阴影 */
    cyanShadowStrong: "rgba(35, 206, 253, 0.5)",
};

/**
 * 背景色
 *
 * 用于卡片、内部卡片、Tooltip 等组件的背景颜色。
 */
export const BACKGROUND_COLOR = {
    /** 卡片背景 */
    card: "rgba(20, 31, 59, 0.6)",
    /** 内部卡片背景 */
    cardInner: "rgba(15, 45, 74, 0.4)",
    /** Tooltip背景 */
    tooltip: "rgba(15, 45, 74, 0.95)",
};

/**
 * 文本颜色
 *
 * 用于不同层级文本的颜色定义。
 */
export const TEXT_COLOR = {
    /** 主文本颜色 */
    primary: "rgba(255, 255, 255, 1)",
    /** 次要文本颜色 */
    secondary: "rgba(204, 204, 204, 1)",
    /** 四级文本颜色 */
    quaternary: "rgba(204, 204, 204, 0.7)",
};

/**
 * 图表通用颜色
 *
 * 用于 ECharts 图表的轴线、分割线、标签等元素的颜色。
 */
export const CHART_COLOR = {
    /** 轴线颜色 */
    axisLine: "rgba(204, 204, 204, 0.5)",
    /** 分割线颜色 */
    splitLine: "rgba(255, 255, 255, 0.08)",
    /** 坐标轴标签颜色 */
    axisLabel: "rgba(255, 255, 255, 1)",
};
