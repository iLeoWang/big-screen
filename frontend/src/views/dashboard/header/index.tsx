import React, { useState, useEffect, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import { Select, ConfigProvider } from "antd";
import type { HeaderProps } from "@/types";
import { useMapContext } from "@/contexts/MapContext";
import { TIME_UPDATE_INTERVAL } from "@/constants/config";
import { PRIMARY_COLOR } from "@/constants/colors";
import headLeft from "@assets/svg/header-left.svg";
import headCenter from "@assets/svg/header-center-bg.svg";
import headCenterleft from "@assets/svg/header-center-left.svg";
import headCenterright from "@assets/svg/header-center-right.svg";
import headRight from "@assets/svg/header-right.svg";

/**
 * 格式化时间
 *
 * 将 Date 对象格式化为 "HH:mm:ss" 格式的时间字符串。
 *
 * @param date - 日期对象
 * @returns 返回格式化的时间字符串
 */
const formatTime = (date: Date): string => dayjs(date).format("HH:mm:ss");

/**
 * 格式化日期
 *
 * 将 Date 对象格式化为 "YYYY-MM-DD" 格式的日期字符串。
 *
 * @param date - 日期对象
 * @returns 返回格式化的日期字符串
 */
const formatDate = (date: Date): string => dayjs(date).format("YYYY-MM-DD");

/**
 * Select 组件主题配置
 *
 * 自定义 Ant Design Select 组件的主题样式，适配大屏设计。
 */
const SELECT_THEME = {
    components: {
        Select: {
            selectorBg: "rgba(15, 45, 74, 0.8)",
            colorBorder: PRIMARY_COLOR.cyanMedium,
            colorText: PRIMARY_COLOR.cyan,
            colorTextPlaceholder: PRIMARY_COLOR.cyanMedium,
            fontSize: 12,
            controlHeight: 18,
            optionSelectedBg: "rgba(35, 206, 253, 0.3)",
            optionActiveBg: "rgba(35, 206, 253, 0.2)",
            colorPrimary: PRIMARY_COLOR.cyan,
            colorPrimaryHover: PRIMARY_COLOR.cyanMedium,
            borderRadius: 4,
        },
    },
} as const;

/**
 * 头部组件
 *
 * 显示大屏标题、当前时间和日期，以及省份选择下拉框。
 * 支持自定义显示内容和样式。
 *
 * @param props - 头部组件属性
 * @param props.title - 标题文字
 * @param props.showTime - 是否显示时间
 * @param props.showDate - 是否显示日期
 * @param props.extra - 额外内容（可选）
 * @returns 返回头部组件
 */
const Header: React.FC<HeaderProps> = ({ title, showTime = true, showDate = true, extra }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const { provinces, selectedProvince, setSelectedProvince } = useMapContext();

    // 更新时间
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, TIME_UPDATE_INTERVAL);

        return () => {
            clearInterval(timer);
        };
    }, []);

    // 处理省份选择
    const handleProvinceChange = useCallback(
        (value: string | undefined) => {
            if (!value || value === "all") {
                setSelectedProvince(null);
                return;
            }
            const province = provinces.find((p) => p.code === value);
            if (province) {
                setSelectedProvince(province);
            }
        },
        [provinces, setSelectedProvince]
    );

    // 省份选择器选项
    const provinceOptions = useMemo(
        () => [
            { label: "全国（全部）", value: "all" },
            ...[...provinces]
                .sort((a, b) => a.code.localeCompare(b.code))
                .map((province) => ({
                    label: province.name,
                    value: province.code,
                })),
        ],
        [provinces]
    );

    return (
        <header className="h-16 from-blue-900 flex items-center justify-between transition-colors relative px-5">
            <img
                src={headLeft}
                className="absolute left-0 top-1/2 -translate-y-1/2 select-none pointer-events-none"
            />
            <img
                src={headCenter}
                className="absolute left-1/2 top-[30px] -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
            />
            <img
                src={headCenterleft}
                className="absolute left-[26%] z-[9] top-[20px] -translate-y-1/2 select-none pointer-events-none"
            />
            <img
                src={headCenterright}
                className="absolute right-[26%] z-[9] top-[20px] -translate-y-1/2 select-none pointer-events-none"
            />
            <img
                src={headRight}
                className="absolute right-0 top-1/2 -translate-y-1/2 select-none pointer-events-none"
            />

            <div className="relative z-20 flex min-w-0 flex-1 justify-start items-center">
                {/* 时间显示 */}
                {(showDate || showTime) && (
                    <div className="text-left pr-3 py-1">
                        <div className="flex items-center gap-2">
                            <div className="text-[#23CEFD] font-bold text-[16px] tracking-[0.8px] leading-[23px]">
                                {showDate && formatDate(currentTime)}
                                {showDate && showTime && " "}
                                {showTime && formatTime(currentTime)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center pt-[8px]">
                <div className="opacity-100 text-[30px] font-bold tracking-[1.8px] leading-[43px] text-[#93C5FD] text-center align-top tech-title">
                    {title}
                </div>
            </div>

            <div className="relative z-20 flex min-w-0 flex-1 justify-end items-center gap-3">
                {extra}
                {/* 省份选择下拉框 */}
                <div className="flex items-center gap-2">
                    <label className="text-[#23CEFD] text-xs font-bold">省份：</label>
                    <ConfigProvider theme={SELECT_THEME}>
                        <Select
                            value={selectedProvince ? selectedProvince.code : "all"}
                            onChange={handleProvinceChange}
                            placeholder="全国（全部）"
                            showSearch
                            optionFilterProp="label"
                            filterOption={(input, option) =>
                                String(option?.label || "")
                                    .toLowerCase()
                                    .includes(input.toLowerCase())
                            }
                            allowClear
                            onClear={() => setSelectedProvince(null)}
                            disabled={provinces.length === 0}
                            style={{
                                width: 180,
                            }}
                            className="province-select"
                            classNames={{
                                popup: {
                                    root: "province-select-dropdown",
                                },
                            }}
                            options={provinceOptions}
                        />
                    </ConfigProvider>
                </div>
            </div>
        </header>
    );
};

export default Header;
