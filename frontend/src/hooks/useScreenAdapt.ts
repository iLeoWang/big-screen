import { useEffect, useCallback, useMemo, useRef } from "react";
import type { ResponsiveConfig } from "@/types";
import { DESIGN_WIDTH, DESIGN_HEIGHT, SCREEN_ADAPT_DEBOUNCE } from "@/constants/config";

/**
 * 根据窗口和设计稿尺寸计算缩放样式
 */
function computeScaleStyle(
    designWidth: number,
    designHeight: number
): {
    scale: number;
    style: React.CSSProperties;
} {
    const currentWidth = typeof window !== "undefined" ? window.innerWidth : designWidth;
    const currentHeight = typeof window !== "undefined" ? window.innerHeight : designHeight;

    const scaleRatio = Math.min(currentWidth / designWidth, currentHeight / designHeight);
    const left = (currentWidth - designWidth * scaleRatio) / 2;
    const top = (currentHeight - designHeight * scaleRatio) / 2;

    return {
        scale: scaleRatio,
        style: {
            position: "absolute",
            width: `${designWidth}px`,
            height: `${designHeight}px`,
            transform: `scale(${scaleRatio}) translateZ(0)`,
            transformOrigin: "0 0",
            left: `${left}px`,
            top: `${top}px`,
            willChange: "transform",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
        },
    };
}

/**
 * 大屏自适应缩放 Hook
 *
 * 根据屏幕大小等比例缩放，确保设计稿完整显示。
 * 使用 CSS transform scale 实现缩放，避免频繁重排，提升性能。
 * 初始样式同步计算，避免首帧闪烁。
 *
 * @param config - 响应式配置选项
 * @param config.designWidth - 设计稿宽度（像素）
 * @param config.designHeight - 设计稿高度（像素）
 * @param config.scaleMode - 缩放模式：'fit' | 'fill' | 'none'
 * @returns 返回包含缩放比例、样式对象、刷新函数和容器引用的对象
 */
export const useScreenAdapt = (
    config: ResponsiveConfig = {
        designWidth: DESIGN_WIDTH,
        designHeight: DESIGN_HEIGHT,
        scaleMode: "fit",
    }
) => {
    // 稳定 config 对象，避免依赖项变化导致不必要的重新计算
    const stableConfig = useMemo(
        () => config,
        [config.designWidth, config.designHeight, config.scaleMode]
    );

    // 同步计算初始样式，避免首帧空样式导致闪烁
    const initialComputed = useMemo(
        () => computeScaleStyle(stableConfig.designWidth, stableConfig.designHeight),
        [stableConfig.designWidth, stableConfig.designHeight]
    );

    // 使用 ref 存储当前样式，通过直接操作 DOM 更新，避免 setState 触发子树重渲染
    const scaleRef = useRef(initialComputed.scale);
    const styleRef = useRef(initialComputed.style);
    const resizeTimerRef = useRef<number | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    /**
     * 触发全局图表重绘事件
     */
    const triggerChartResize = useCallback((newScale: number) => {
        requestAnimationFrame(() => {
            window.dispatchEvent(
                new CustomEvent("screen-resize", {
                    detail: { scale: newScale },
                })
            );
        });
    }, []);

    /**
     * 计算缩放比例并直接更新 DOM（不触发 React 重渲染）
     */
    const calculateScale = useCallback(() => {
        const { designWidth, designHeight } = stableConfig;
        const computed = computeScaleStyle(designWidth, designHeight);

        scaleRef.current = computed.scale;
        styleRef.current = computed.style;

        // 直接更新 DOM，避免 setState 引起整棵子树重渲染/闪烁
        const el = wrapperRef.current;
        if (el) {
            el.style.transform = `scale(${computed.scale}) translateZ(0)`;
            el.style.left = computed.style.left as string;
            el.style.top = computed.style.top as string;
        }

        // 触发图表 resize（triggerChartResize 内部已使用 rAF）
        triggerChartResize(computed.scale);
    }, [stableConfig, triggerChartResize]);

    /**
     * 防抖处理窗口大小变化
     */
    const handleResize = useCallback(() => {
        if (resizeTimerRef.current) {
            clearTimeout(resizeTimerRef.current);
        }

        resizeTimerRef.current = window.setTimeout(() => {
            calculateScale();
        }, SCREEN_ADAPT_DEBOUNCE);
    }, [calculateScale]);

    // 监听窗口大小变化和方向变化
    useEffect(() => {
        window.addEventListener("resize", handleResize);
        window.addEventListener("orientationchange", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("orientationchange", handleResize);
            if (resizeTimerRef.current) {
                clearTimeout(resizeTimerRef.current);
            }
        };
    }, [handleResize]);

    return {
        scale: scaleRef.current,
        style: initialComputed.style,
        refresh: calculateScale,
        wrapperRef,
    };
};
