import React, { Component, type ReactNode } from "react";
import { cn } from "@/utils/cn";

/**
 * 错误边界组件属性
 */
interface ErrorBoundaryProps {
    /** 子组件 */
    children: ReactNode;
    /** 错误发生时的回调函数 */
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    /** 自定义错误显示组件（ReactNode 或返回 ReactNode 的函数） */
    fallback?: ReactNode | ((error: Error) => ReactNode);
    /** 是否在开发环境显示详细错误信息 */
    showDetails?: boolean;
}

/**
 * 错误边界组件状态
 */
interface ErrorBoundaryState {
    /** 是否发生错误 */
    hasError: boolean;
    /** 错误对象 */
    error: Error | null;
    /** React 错误信息 */
    errorInfo: React.ErrorInfo | null;
}

/**
 * 错误边界组件
 *
 * 用于捕获子组件树中的 JavaScript 错误，记录错误并显示降级 UI。
 * 实现 React 错误边界模式，防止整个应用崩溃。
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        // 更新 state 使下一次渲染能够显示降级后的 UI
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({
            errorInfo,
        });

        // 调用错误回调
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError && this.state.error) {
            // 如果有自定义 fallback，使用它
            if (this.props.fallback) {
                return typeof this.props.fallback === "function"
                    ? this.props.fallback(this.state.error)
                    : this.props.fallback;
            }

            // 默认错误 UI
            return (
                <div
                    className={cn(
                        "flex flex-col items-center justify-center",
                        "min-h-[400px] p-8",
                        "bg-[rgba(20,31,59,0.85)] rounded-md",
                        "border border-red-500/50"
                    )}
                >
                    <div className="text-red-400 text-4xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-white mb-2">页面出现错误</h2>
                    <p className="text-gray-400 text-center mb-6 max-w-md">
                        抱歉，页面加载时出现了问题。请尝试刷新页面或联系技术支持。
                    </p>
                    <button
                        onClick={this.handleReset}
                        className={cn(
                            "px-6 py-2 rounded",
                            "bg-tech-cyan text-white",
                            "hover:bg-tech-cyan/80",
                            "transition-colors",
                            "font-medium"
                        )}
                    >
                        重试
                    </button>
                    {this.props.showDetails && this.state.error && (
                        <details className="mt-6 w-full max-w-2xl">
                            <summary className="text-gray-400 cursor-pointer mb-2">
                                错误详情（开发环境）
                            </summary>
                            <div
                                className={cn(
                                    "p-4 rounded",
                                    "bg-black/30 text-red-300",
                                    "text-sm font-mono",
                                    "overflow-auto max-h-64"
                                )}
                            >
                                <div className="mb-2">
                                    <strong>错误信息:</strong>
                                    <div className="mt-1">{this.state.error.toString()}</div>
                                </div>
                                {this.state.errorInfo && (
                                    <div className="mt-4">
                                        <strong>组件堆栈:</strong>
                                        <pre className="mt-1 whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
