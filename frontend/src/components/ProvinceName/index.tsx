import React from "react";

/**
 * 省份名称显示组件属性
 */
interface ProvinceNameProps {
    /** 省份名称 */
    name: string;
    /** 自定义类名 */
    className?: string;
}

/**
 * 省份名称显示组件
 *
 * 用于在标题中显示选中的省份名称，格式为 `(省份名称)`。
 *
 * @param props - 组件属性
 * @param props.name - 省份名称
 * @param props.className - 自定义类名
 * @returns 返回省份名称显示组件
 */
const ProvinceName: React.FC<ProvinceNameProps> = ({ name, className = "" }) => {
    return (
        <span className={`ml-2 text-xs text-[rgba(255,255,255,0.6)] font-normal ${className}`}>
            ({name})
        </span>
    );
};

export default ProvinceName;
