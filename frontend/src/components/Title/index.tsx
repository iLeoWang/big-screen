import React from "react";
import { cn } from "@/utils/cn";

/**
 * 标题组件属性
 */
interface TitleProps {
    /** 标题文字内容 */
    children: React.ReactNode;
    /** 自定义类名 */
    className?: string;
    /** 标题文字类名 */
    textClassName?: string;
    /** 装饰区类名 */
    decorationClassName?: string;
    /** 装饰与文字间距（px） */
    decorationGap?: number;
    /** 装饰缩放 */
    decorationScale?: number;
    /** 装饰透明度 */
    decorationOpacity?: number;
}

/**
 * 标题组件
 *
 * 包含文字和四段可定制的 CSS 斜切装饰条。
 *
 * @param props - 组件属性
 * @param props.children - 标题文字内容
 * @param props.className - 自定义类名
 * @returns 返回标题组件
 */
const Title: React.FC<TitleProps> = ({
    children,
    className = "",
    textClassName = "",
    decorationClassName = "",
    decorationGap = 10,
    decorationScale = 1,
    decorationOpacity = 0.76,
}) => {
    const titleStyle = {
        "--title-marker-gap": `${decorationGap}px`,
        "--title-marker-scale": decorationScale,
        "--title-marker-opacity": decorationOpacity,
    } as React.CSSProperties;

    return (
        <div className={cn("title-shell", className)} style={titleStyle}>
            <span
                className={cn(
                    "title-text relative font-semibold text-sm text-[rgba(147,197,253,1)] text-left flex items-center tech-title",
                    textClassName
                )}
            >
                {children}
            </span>
            <span
                aria-hidden="true"
                className={cn("title-decoration-group tech-title-marker", decorationClassName)}
            >
                <span className="title-decoration-item" />
                <span className="title-decoration-item" />
                <span className="title-decoration-item" />
                <span className="title-decoration-item" />
            </span>
        </div>
    );
};

export default Title;
