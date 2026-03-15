import React from "react";
import type { CardProps } from "@/types";
import { cn } from "@/utils/cn";
import ErrorDisplay from "@/components/ErrorDisplay";
import cardCornerLt from "@assets/images/card-corner-lt.webp";
import cardCornerLt2x from "@assets/images/card-corner-lt@2x.webp";
import cardCornerRt from "@assets/images/card-corner-rt.webp";
import cardCornerRt2x from "@assets/images/card-corner-rt@2x.webp";
import cardCornerLb from "@assets/images/card-corner-lb.png";
import cardCornerLb2x from "@assets/images/card-corner-lb@2x.png";
import cardCornerRb from "@assets/images/card-corner-rb.webp";
import cardCornerRb2x from "@assets/images/card-corner-rb@2x.webp";

/**
 * 卡片组件
 *
 * 提供统一的卡片样式，支持标题、加载状态、错误处理等功能。
 * 包含四个角的装饰图片，使用 image-set 支持高分辨率显示。
 *
 * @param props - 卡片组件属性
 * @param props.title - 卡片标题（可选）
 * @param props.className - 自定义类名
 * @param props.children - 卡片内容
 * @param props.loading - 是否显示加载状态
 * @param props.error - 错误信息（Error 对象或 null）
 * @param props.onRetry - 重试回调函数
 * @param props.errorMessage - 自定义错误消息
 * @param props.showRetry - 是否显示重试按钮
 * @returns 返回卡片组件
 */
const Card: React.FC<CardProps> = ({
    title,
    className = "",
    children,
    loading = false,
    error = null,
    onRetry,
    errorMessage,
    showRetry = true,
}) => {
    return (
        <div
            className={cn(
                "relative rounded-md p-4 border tech-border-breathe tech-lab-card",
                className
            )}
            style={{
                ...(title ? { display: "flex", flexDirection: "column" } : {}),
            }}
        >
            {/* 左上角装饰 */}
            <div
                className="absolute pointer-events-none"
                style={{
                    backgroundImage: `image-set(url(${cardCornerLt}) 1x, url(${cardCornerLt2x}) 2x)`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "top left",
                    width: "100%",
                    height: "100%",
                    top: "-1px",
                    left: "-4px",
                }}
            />
            {/* 右上角装饰 */}
            <div
                className="absolute pointer-events-none"
                style={{
                    backgroundImage: `image-set(url(${cardCornerRt}) 1x, url(${cardCornerRt2x}) 2x)`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "top right",
                    width: "100%",
                    height: "100%",
                    top: "-1px",
                    right: "-4px",
                }}
            />
            {/* 左下角装饰 */}
            <div
                className="absolute pointer-events-none"
                style={{
                    backgroundImage: `image-set(url(${cardCornerLb}) 1x, url(${cardCornerLb2x}) 2x)`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "bottom left",
                    width: "100%",
                    height: "100%",
                    bottom: "-1px",
                    left: "-4px",
                }}
            />
            {/* 右下角装饰 */}
            <div
                className="absolute pointer-events-none"
                style={{
                    backgroundImage: `image-set(url(${cardCornerRb}) 1x, url(${cardCornerRb2x}) 2x)`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "bottom right",
                    width: "100%",
                    height: "100%",
                    bottom: "-1px",
                    right: "-7px",
                }}
            />
            {title && <div className="card-title flex-shrink-0">{title}</div>}
            {loading && !error ? (
                <div className="flex items-center justify-center flex-1">
                    <div role="status" aria-live="polite" aria-label="正在加载">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-tech-cyan"></div>
                    </div>
                </div>
            ) : error ? (
                <div className={title ? "flex-1 min-h-0" : ""}>
                    <ErrorDisplay
                        error={error}
                        showRetry={showRetry && !!onRetry}
                        onRetry={onRetry}
                        message={errorMessage}
                    />
                </div>
            ) : (
                <div className={title ? "flex-1 min-h-0" : ""}>{children}</div>
            )}
        </div>
    );
};

export default Card;
