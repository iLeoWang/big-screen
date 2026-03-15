import React from "react";
import { cn } from "@/utils/cn";
import ErrorDisplay from "@/components/ErrorDisplay";
import cardInnerCornerLt from "@assets/images/card-inner-corner-lt.webp";
import cardInnerCornerLt2x from "@assets/images/card-inner-corner-lt@2x.webp";
import cardInnerCornerRt from "@assets/images/card-inner-corner-rt.webp";
import cardInnerCornerRt2x from "@assets/images/card-inner-corner-rt@2x.webp";
import cardInnerCornerLb from "@assets/images/card-inner-corner-lb.webp";
import cardInnerCornerLb2x from "@assets/images/card-inner-corner-lb@2x.webp";
import cardInnerCornerRb from "@assets/images/card-inner-corner-rb.webp";
import cardInnerCornerRb2x from "@assets/images/card-inner-corner-rb@2x.webp";

/**
 * 内部卡片组件属性
 */
interface CardInnerProps {
    /** 自定义类名 */
    className?: string;
    /** 子元素 */
    children: React.ReactNode;
    /** 错误信息 */
    error?: Error | null;
    /** 重试回调 */
    onRetry?: () => void;
    /** 自定义错误消息 */
    errorMessage?: string;
    /** 是否显示重试按钮（默认 true，当 onRetry 存在时） */
    showRetry?: boolean;
    /** 是否显示加载状态 */
    loading?: boolean;
    /** 是否显示四角装饰 */
    decorated?: boolean;
    /** 边框风格 */
    frameTone?: "default" | "calm";
}

/**
 * 内部卡片组件
 *
 * 与 Card 组件类似，但边框颜色不同，padding 为 5px。
 * 四个角的装饰图片向内靠拢，使用 image-set 支持高分辨率显示。
 *
 * @param props - 组件属性
 * @param props.className - 自定义类名
 * @param props.children - 子元素
 * @param props.error - 错误信息（Error 对象或 null）
 * @param props.onRetry - 重试回调函数
 * @param props.errorMessage - 自定义错误消息
 * @param props.showRetry - 是否显示重试按钮
 * @param props.loading - 是否显示加载状态
 * @returns 返回内部卡片组件
 */
const CardInner: React.FC<CardInnerProps> = ({
    className = "",
    children,
    error = null,
    onRetry,
    errorMessage,
    showRetry = true,
    loading = false,
    decorated = true,
    frameTone = "default",
}) => {
    return (
        <div
            className={cn(
                "relative p-4 border tech-lab-card-inner",
                decorated && "tech-corner",
                frameTone === "calm" && "tech-lab-card-inner-calm",
                className
            )}
        >
            {decorated && (
                <>
                    {/* 左上角装饰 - 向内靠拢 */}
                    <div
                        className="absolute pointer-events-none"
                        style={{
                            backgroundImage: `image-set(url(${cardInnerCornerLt}) 1x, url(${cardInnerCornerLt2x}) 2x)`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "top left",
                            width: "100%",
                            height: "100%",
                            top: "5px",
                            left: "5px",
                        }}
                    />
                    {/* 右上角装饰 - 向内靠拢 */}
                    <div
                        className="absolute pointer-events-none"
                        style={{
                            backgroundImage: `image-set(url(${cardInnerCornerRt}) 1x, url(${cardInnerCornerRt2x}) 2x)`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "top right",
                            width: "100%",
                            height: "100%",
                            top: "5px",
                            right: "5px",
                        }}
                    />
                    {/* 左下角装饰 - 向内靠拢 */}
                    <div
                        className="absolute pointer-events-none"
                        style={{
                            backgroundImage: `image-set(url(${cardInnerCornerLb}) 1x, url(${cardInnerCornerLb2x}) 2x)`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "bottom left",
                            width: "100%",
                            height: "100%",
                            bottom: "5px",
                            left: "5px",
                        }}
                    />
                    {/* 右下角装饰 - 向内靠拢 */}
                    <div
                        className="absolute pointer-events-none"
                        style={{
                            backgroundImage: `image-set(url(${cardInnerCornerRb}) 1x, url(${cardInnerCornerRb2x}) 2x)`,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "bottom right",
                            width: "100%",
                            height: "100%",
                            bottom: "5px",
                            right: "5px",
                        }}
                    />
                </>
            )}
            {loading && !error ? (
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[rgba(35,206,253,1)]"></div>
                </div>
            ) : error ? (
                <ErrorDisplay
                    error={error}
                    showRetry={showRetry && !!onRetry}
                    onRetry={onRetry}
                    message={errorMessage}
                    compact
                />
            ) : (
                children
            )}
        </div>
    );
};

export default CardInner;
