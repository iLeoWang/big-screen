import { CHART_RESIZE_DEBOUNCE } from "@/constants/config";
import type { ECharts } from "@/lib/echarts";
import { echarts } from "@/lib/echarts";
import type { EChartsOption } from "echarts";

/**
 * 获取当前 scale 值
 */
export const getCurrentScale = (container: HTMLElement): number => {
    const scaleWrapper = container.closest("#scale-wrapper");
    if (!scaleWrapper) return 1;
    const transform = window.getComputedStyle(scaleWrapper).transform;
    if (!transform || transform === "none") return 1;
    const matrix = transform.match(/matrix\(([^)]+)\)/);
    if (!matrix || !matrix[1]) return 1;
    const values = matrix[1].split(",").map(Number);
    const scale = values[0];
    return scale && !isNaN(scale) ? scale : 1;
};

/**
 * 计算适配 scale 的 devicePixelRatio
 *
 * 注意：使用 SVG 渲染器时，devicePixelRatio 的影响较小。
 * 为了简化并避免问题，直接使用 window.devicePixelRatio。
 */
export const calculateDevicePixelRatio = (_scale: number): number => {
    // 直接使用设备的 devicePixelRatio，不除以 scale
    // SVG 渲染器在缩放时能保持清晰度，不需要特殊处理
    const baseDevicePixelRatio = window.devicePixelRatio || 1.0;
    // 限制范围，避免过小或过大
    return Math.max(1, Math.min(baseDevicePixelRatio, 3));
};

/**
 * 初始化 ECharts 图表
 */
export const initECharts = (
    container: HTMLElement,
    option?: EChartsOption,
    theme: string | object = "dark"
): ECharts | null => {
    try {
        const rect = container.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) {
            return null;
        }

        const scale = getCurrentScale(container);
        const devicePixelRatio = calculateDevicePixelRatio(scale);

        const chartInstance = echarts.init(container, theme, {
            devicePixelRatio,
            renderer: "svg",
        });

        if (option) {
            chartInstance.setOption(option);
        } else {
            console.warn("图表初始化时 option 为空");
        }

        requestAnimationFrame(() => {
            if (!chartInstance.isDisposed()) {
                chartInstance.resize();
            }
        });

        return chartInstance;
    } catch (err) {
        console.error("初始化图表失败:", err);
        return null;
    }
};

/**
 * 创建防抖的 resize 处理函数
 */
export const createResizeHandler = (
    chartInstanceRef: React.MutableRefObject<ECharts | null>
): (() => void) => {
    let resizeTimer: number | null = null;

    return () => {
        if (resizeTimer) {
            clearTimeout(resizeTimer);
        }
        resizeTimer = window.setTimeout(() => {
            if (chartInstanceRef.current && !chartInstanceRef.current.isDisposed()) {
                try {
                    chartInstanceRef.current.resize();
                } catch (err) {
                    console.error("图表 resize 失败:", err);
                }
            }
        }, CHART_RESIZE_DEBOUNCE);
    };
};
