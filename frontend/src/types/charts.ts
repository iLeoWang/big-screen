/**
 * 图表相关类型定义
 *
 * 包含 ECharts 相关的接口和类型定义。
 */

import type { ChartSize } from "./common";
import type { ECharts } from "@/lib/echarts";
import type { EChartsOption } from "echarts";

/**
 * ECharts 组件属性
 *
 * 定义 ECharts 图表组件的所有可用属性。
 */
export interface EChartsProps {
    /** 图表配置项 */
    option: EChartsOption;
    /** 自定义样式 */
    style?: React.CSSProperties;
    /** 自定义类名 */
    className?: string;
    /** 主题名称 */
    theme?: string;
    /** 是否不合并配置（替换而非合并） */
    notMerge?: boolean;
    /** 是否延迟更新 */
    lazyUpdate?: boolean;
    /** 是否显示加载动画 */
    loading?: boolean;
    /** 是否显示加载动画（兼容属性） */
    showLoading?: boolean;
    /** 加载动画配置 */
    loadingOption?: object;
    /** 图表就绪回调 */
    onChartReady?: (instance: ECharts) => void;
    /** 事件处理函数映射 */
    onEvents?: Record<string, Function>;
    /** 图表初始化选项 */
    opts?: {
        /** 设备像素比 */
        devicePixelRatio?: number;
        /** 渲染器类型 */
        renderer?: "canvas" | "svg";
        /** 宽度 */
        width?: number | string;
        /** 高度 */
        height?: number | string;
    };
}

/**
 * 图表类型
 *
 * 支持的图表类型枚举。
 */
export type ChartType =
    | "line"
    | "bar"
    | "pie"
    | "scatter"
    | "radar"
    | "gauge"
    | "map"
    | "heatmap"
    | "custom";

/**
 * 图表组件基础属性
 *
 * 所有图表组件共用的基础属性。
 */
export interface BaseChartProps {
    /** 图表数据 */
    data: any;
    /** 是否显示加载状态 */
    loading?: boolean;
    /** 图表尺寸 */
    size?: ChartSize;
    /** 自定义类名 */
    className?: string;
    /** 自定义样式 */
    style?: React.CSSProperties;
    /** 图表标题 */
    title?: string;
    /** 图表类型 */
    type?: ChartType;
    /** ECharts 配置项 */
    config?: EChartsOption;
    /** 事件处理函数映射 */
    onEvents?: Record<string, Function>;
}

/**
 * 折线图配置
 *
 * 折线图组件的专用配置属性。
 */
export interface LineChartProps extends BaseChartProps {
    /** 图表类型 */
    type: "line";
    /** 是否平滑曲线 */
    smooth?: boolean;
    /** 是否显示面积 */
    area?: boolean;
    /** X 轴字段名 */
    xField: string;
    /** Y 轴字段名（支持多个） */
    yField: string | string[];
    /** 系列字段名 */
    seriesField?: string;
}

/**
 * 柱状图配置
 *
 * 柱状图组件的专用配置属性。
 */
export interface BarChartProps extends BaseChartProps {
    /** 图表类型 */
    type: "bar";
    /** X 轴字段名 */
    xField: string;
    /** Y 轴字段名（支持多个） */
    yField: string | string[];
    /** 系列字段名 */
    seriesField?: string;
    /** 是否堆叠 */
    isStack?: boolean;
    /** 是否分组 */
    isGroup?: boolean;
}

/**
 * 饼图配置
 *
 * 饼图组件的专用配置属性。
 */
export interface PieChartProps extends BaseChartProps {
    /** 图表类型 */
    type: "pie";
    /** 角度字段名 */
    angleField: string;
    /** 颜色字段名 */
    colorField: string;
    /** 半径（支持数组表示内外半径） */
    radius?: number | string | [number | string, number | string];
    /** 内半径 */
    innerRadius?: number | string;
    /** 玫瑰图类型 */
    rosetype?: boolean | "radius" | "area";
}

/**
 * 仪表盘配置
 *
 * 仪表盘组件的专用配置属性。
 */
export interface GaugeChartProps extends BaseChartProps {
    /** 图表类型 */
    type: "gauge";
    /** 仪表盘数值 */
    value: number;
    /** 最小值 */
    min?: number;
    /** 最大值 */
    max?: number;
    /** 起始角度 */
    startAngle?: number;
    /** 结束角度 */
    endAngle?: number;
    /** 分割段数 */
    splitNumber?: number;
}
