import React, { useEffect, useRef, useCallback, useState } from "react";
import type { ECharts } from "@/lib/echarts";
import type { EChartsOption } from "echarts";
import { initECharts, createResizeHandler } from "@/utils/echartsHelper";

/**
 * useECharts Hook 配置选项
 */
export interface UseEChartsOptions {
    /** ECharts 主题（默认 'dark'） */
    theme?: string | object;
    /** 是否在 option 变化时使用 notMerge 模式（默认 false） */
    notMerge?: boolean;
    /** 是否延迟更新（默认 false） */
    lazyUpdate?: boolean;
}

/**
 * useECharts Hook 返回值
 */
export interface UseEChartsReturn {
    /** 图表容器 ref，需要绑定到 DOM 元素 */
    chartRef: React.RefObject<HTMLDivElement>;
    /** ECharts 实例 ref */
    chartInstanceRef: React.MutableRefObject<ECharts | null>;
    /** 图表初始化错误 */
    chartError: Error | null;
    /** 提供 setOption 方法，用于外部（如 useChinaMap）直接操作图表 */
    setOption: (option: EChartsOption, notMerge?: boolean, lazyUpdate?: boolean) => void;
}

/**
 * ECharts 通用 Hook
 *
 * 封装 ECharts 实例的创建、销毁、resize 监听和 option 更新逻辑。
 * 消除各图表组件中重复的 ~80 行样板代码。
 *
 * 关键设计：
 * - 使用 ResizeObserver 监听容器尺寸变化，自动初始化
 * - 监听 screen-resize 自定义事件（来自 useScreenAdapt），处理缩放后的图表重绘
 * - option 变化时增量更新（merge 模式），不销毁重建
 * - 组件卸载时自动清理
 *
 * @param option - ECharts 配置对象，变化时自动更新图表
 * @param opts - Hook 选项
 * @returns 图表容器 ref、实例 ref、错误状态和 setOption 方法
 */
export const useECharts = (
    option: EChartsOption | null,
    opts: UseEChartsOptions = {}
): UseEChartsReturn => {
    const { theme = "dark", notMerge = false, lazyUpdate = false } = opts;

    const chartRef = useRef<HTMLDivElement | null>(null);
    const chartInstanceRef = useRef<ECharts | null>(null);
    const chartErrorRef = useRef<Error | null>(null);
    const [chartError, setChartError] = useState<Error | null>(null);

    // 缓存最新 option，供延迟初始化时使用
    const optionRef = useRef<EChartsOption | null>(option);
    optionRef.current = option;
    const initRetryRef = useRef(0);

    // 防抖 resize 处理器
    const handleResize = useCallback(createResizeHandler(chartInstanceRef), []);

    /**
     * setOption 方法 - 供外部直接操作图表（如 useChinaMap）
     */
    const setOption = useCallback((opt: EChartsOption, nm?: boolean, lu?: boolean) => {
        if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
            try {
                chartInstanceRef.current.setOption(opt, nm, lu);
            } catch (err) {
                console.error("设置图表配置失败:", err);
            }
        }
    }, []);

    // 初始化图表 + ResizeObserver 监听
    useEffect(() => {
        const container = chartRef.current;
        if (!container) return;

        const initChart = () => {
            // 已初始化则跳过
            if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
                return;
            }

            const rect = container.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) {
                initRetryRef.current += 1;
                return;
            }

            const instance = initECharts(container, optionRef.current ?? undefined, theme);
            if (instance) {
                chartInstanceRef.current = instance;
                chartErrorRef.current = null;
                setChartError(null);
                initRetryRef.current = 0;
            } else {
                const err = new Error("图表初始化失败");
                chartErrorRef.current = err;
                setChartError(err);
            }
        };

        let observer: ResizeObserver | null = null;
        let initTimer: number | null = null;

        if (typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver(() => {
                if (!chartInstanceRef.current) {
                    requestAnimationFrame(initChart);
                }
            });
            observer.observe(container);
        }

        // 延迟初始化，确保 DOM 已完成布局
        initTimer = window.setTimeout(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(initChart);
            });
        }, 50);

        const retryTimer = window.setInterval(() => {
            if (chartInstanceRef.current || initRetryRef.current >= 20) {
                return;
            }
            requestAnimationFrame(initChart);
        }, 120);

        return () => {
            if (initTimer !== null) clearTimeout(initTimer);
            clearInterval(retryTimer);
            observer?.disconnect();
            if (chartInstanceRef.current) {
                try {
                    if (!chartInstanceRef.current.isDisposed()) {
                        chartInstanceRef.current.dispose();
                    }
                } catch (err) {
                    console.warn("清理图表失败:", err);
                }
                chartInstanceRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [theme]);

    // option 变化时更新图表（不销毁重建）
    useEffect(() => {
        if (!option) return;

        if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
            try {
                chartInstanceRef.current.setOption(option, notMerge, lazyUpdate);
            } catch (err) {
                console.error("更新图表配置失败:", err);
            }
        }
    }, [option, notMerge, lazyUpdate]);

    // 监听 screen-resize（大屏缩放）和 window resize
    useEffect(() => {
        const onScreenResize = () => handleResize();

        window.addEventListener("screen-resize", onScreenResize as EventListener);
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("screen-resize", onScreenResize as EventListener);
            window.removeEventListener("resize", handleResize);
        };
    }, [handleResize]);

    return {
        chartRef,
        chartInstanceRef,
        chartError,
        setOption,
    };
};
