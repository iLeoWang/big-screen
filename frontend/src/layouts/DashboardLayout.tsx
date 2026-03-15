import React, { useMemo } from "react";
import Header from "@/views/dashboard/header";
import { useScreenAdapt } from "@/hooks";
import { cn } from "@/utils/cn";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "@/constants/config";
import type { LayoutProps } from "@/types";

interface DashboardLayoutProps extends LayoutProps {
    leftContent?: React.ReactNode;
    rightContent?: React.ReactNode;
    bottomContent?: React.ReactNode;
    centerContent?: React.ReactNode;
}

/**
 * 仪表盘布局组件
 *
 * 提供大屏可视化仪表盘的整体布局结构，包括头部、左侧、右侧、底部和中心内容区域。
 * 集成屏幕自适应功能，确保在不同分辨率下正确显示。
 *
 * @param props - 布局组件属性
 * @param props.children - 默认子内容
 * @param props.leftContent - 左侧内容
 * @param props.rightContent - 右侧内容
 * @param props.bottomContent - 底部内容
 * @param props.centerContent - 中心内容（通常为地图）
 * @param props.className - 自定义类名
 * @returns 返回布局组件
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    children,
    leftContent,
    rightContent,
    bottomContent,
    centerContent,
    className = "",
}) => {
    // 稳定配置对象，避免每次渲染都创建新对象
    const screenConfig = useMemo(
        () => ({
            designWidth: DESIGN_WIDTH,
            designHeight: DESIGN_HEIGHT,
            scaleMode: "fit" as const,
        }),
        []
    );

    const { style, wrapperRef } = useScreenAdapt(screenConfig);

    return (
        <div className={cn("w-screen h-screen overflow-hidden relative dashboard-root-bg")}>
            {/* 容器使用固定尺寸1920x1080，由useScreenAdapt控制缩放和位置 */}
            {/* 不设置 key，避免 scale 变化时导致组件树重新挂载造成闪屏 */}
            {/* 样式变化和 screen-resize 事件已足够处理适配 */}
            <div ref={wrapperRef} style={style} id="scale-wrapper" className="px-[30px]">
                {/* 头部 */}
                <Header title="空气污染数据可视化大屏" showTime showDate />

                {/* 主内容区域 - 相对定位容器 */}
                <div className={cn("relative w-full h-[1015px]", className)}>
                    {/* 地图背景层 - 占全部空间，最底层 */}
                    {centerContent && (
                        <div className={cn("absolute inset-0 w-full h-full z-0")}>
                            {centerContent}
                        </div>
                    )}

                    {/* 左侧内容 - 浮动在地图之上，距离header和bottom的距离一致 */}
                    {leftContent && (
                        <div className={cn("absolute top-4 w-[550px] h-[calc(100%-388px)] z-10")}>
                            {leftContent}
                        </div>
                    )}

                    {/* 右侧内容 - 浮动在地图之上，距离header和bottom的距离一致 */}
                    {rightContent && (
                        <div
                            className={cn(
                                "absolute top-4 right-0 w-[550px] h-[calc(100%-388px)] z-10"
                            )}
                        >
                            {rightContent}
                        </div>
                    )}

                    {/* 底部内容 - 浮动在地图之上，占满宽度，高度340px */}
                    {bottomContent && (
                        <div className={cn("absolute bottom-4 left-0 right-0 h-[340px] z-10")}>
                            {bottomContent}
                        </div>
                    )}

                    {/* 默认子内容 */}
                    {children}
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout;
