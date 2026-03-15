import React from "react";
import HourlyPollutantChart from "./HourlyPollutantChart";
import MonthlyPollutantChart from "./MonthlyPollutantChart";

/**
 * 底部内容组件 - 污染物趋势图表
 * 包含两个子图表组件：
 * - 24小时污染物浓度趋势折线图
 * - 月度污染物浓度对比柱状图
 */
const BottomContent: React.FC = () => {
    return (
        <div className="flex h-full min-h-0 space-x-8">
            <MonthlyPollutantChart />
            <HourlyPollutantChart />
        </div>
    );
};

export default BottomContent;
