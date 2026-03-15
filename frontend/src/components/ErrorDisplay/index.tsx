import React from "react";
import { cn } from "@/utils/cn";

/**
 * 错误显示组件属性
 */
interface ErrorDisplayProps {
    /** 错误信息（Error 对象、字符串或 null） */
    error: Error | string | null;
    /** 是否显示重试按钮 */
    showRetry?: boolean;
    /** 重试回调函数 */
    onRetry?: () => void;
    /** 自定义错误消息（优先级高于 error） */
    message?: string;
    /** 自定义样式类名 */
    className?: string;
    /** 是否紧凑模式（减少内边距） */
    compact?: boolean;
}

/**
 * 错误显示组件
 *
 * 用于统一显示错误信息，支持自定义消息和重试功能。
 *
 * @param props - 组件属性
 * @param props.error - 错误信息
 * @param props.showRetry - 是否显示重试按钮
 * @param props.onRetry - 重试回调函数
 * @param props.message - 自定义错误消息
 * @param props.className - 自定义样式类名
 * @param props.compact - 是否紧凑模式
 * @returns 返回错误显示组件，如果 error 为 null 则返回 null
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
    error,
    showRetry = false,
    onRetry,
    message,
    className,
    compact = false,
}) => {
    if (!error) return null;

    const errorMessage = typeof error === "string" ? error : error?.message || "发生未知错误";
    const displayMessage = message || errorMessage;
    const shouldShowFallbackHint = displayMessage === "加载数据失败";

    return (
        <div
            className={cn(
                "flex h-full w-full flex-col items-center justify-center text-center rounded-md",
                compact ? "p-4 gap-2" : "p-8 gap-3",
                "border border-[rgba(96,165,250,0.28)]",
                "bg-[linear-gradient(160deg,rgba(20,36,64,0.72)_0%,rgba(12,24,47,0.82)_100%)]",
                "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]",
                className
            )}
        >
            <div
                className={cn(
                    "rounded-full border border-[#f59e0b]/60 bg-[#f59e0b]/10 text-[#fbbf24]",
                    compact ? "text-base px-2 py-0.5" : "text-lg px-2.5 py-1"
                )}
                aria-hidden
            >
                !
            </div>
            <div className="space-y-1">
                <p
                    className={cn(
                        "font-semibold text-[#c6e7ff]",
                        compact ? "text-sm" : "text-base"
                    )}
                >
                    {displayMessage}
                </p>
                {shouldShowFallbackHint && (
                    <p className={cn("text-[#7ea4c7]", compact ? "text-xs" : "text-sm")}>
                        网络或服务暂不可用，请稍后重试
                    </p>
                )}
            </div>
            {showRetry && onRetry && (
                <button
                    onClick={onRetry}
                    className={cn(
                        "mt-1 rounded-md border border-[#58cfff]/70",
                        compact ? "h-8 px-4 text-xs" : "h-9 px-5 text-sm",
                        "bg-[rgba(35,206,253,0.16)] text-[#b7eeff] font-medium",
                        "hover:bg-[rgba(35,206,253,0.26)] hover:border-[#8ce8ff]",
                        "active:translate-y-px transition-all duration-200"
                    )}
                >
                    重试
                </button>
            )}
        </div>
    );
};

export default ErrorDisplay;
