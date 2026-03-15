/**
 * 通用类型定义
 *
 * 包含项目中通用的接口和类型定义。
 */

/**
 * 图表尺寸类型
 *
 * 用于定义图表的宽度和高度。
 */
export interface ChartSize {
    /** 宽度（支持数字或字符串，如 "100%"） */
    width: number | string;
    /** 高度（支持数字或字符串，如 "100%"） */
    height: number | string;
}

/**
 * 卡片组件属性
 *
 * 定义卡片组件的所有可用属性。
 */
export interface CardProps {
    /** 标题 */
    title?: string | React.ReactNode;
    /** 自定义类名 */
    className?: string;
    /** 子元素 */
    children?: React.ReactNode;
    /** 是否显示加载状态 */
    loading?: boolean;
    /** 错误信息 */
    error?: Error | null;
    /** 重试回调 */
    onRetry?: () => void;
    /** 自定义错误消息 */
    errorMessage?: string;
    /** 是否显示重试按钮（默认 true，当 onRetry 存在时） */
    showRetry?: boolean;
}

/**
 * 头部组件属性
 *
 * 定义头部组件的所有可用属性。
 */
export interface HeaderProps {
    /** 标题文字 */
    title: string;
    /** 是否显示时间 */
    showTime?: boolean;
    /** 是否显示日期 */
    showDate?: boolean;
    /** 额外内容 */
    extra?: React.ReactNode;
}

/**
 * 布局组件属性
 *
 * 定义布局组件的所有可用属性。
 */
export interface LayoutProps {
    /** 子元素 */
    children?: React.ReactNode;
    /** 自定义类名 */
    className?: string;
}

/**
 * 响应式配置
 *
 * 用于配置大屏自适应缩放的参数。
 */
export interface ResponsiveConfig {
    /** 设计稿宽度（像素） */
    designWidth: number;
    /** 设计稿高度（像素） */
    designHeight: number;
    /**
     * 缩放模式
     * - "fit": 等比缩放确保完整显示（默认）
     * - "fill": 等比缩放填满屏幕
     * - "none": 不缩放
     */
    scaleMode: "fit" | "fill" | "none";
}
