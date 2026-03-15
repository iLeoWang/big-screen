import React from "react";
import TopStats from "./TopStats";
import PieChart from "./PieChart";

/**
 * 左侧面板组件
 * 包含两个垂直堆叠的内容：
 * - 上方：核心污染物实时数据（固定高度 200px）
 * - 下方：空气质量等级分布饼图（剩余高度，减去上下间距 space-y-4 = 16px）
 */
const LeftPanel: React.FC = () => {
    return (
        <div className="flex flex-col space-y-4 h-full">
            {/* 上方：核心污染物实时数据 - 固定高度 200px */}
            <TopStats />

            {/* 下方：空气质量等级分布饼图 - 剩余高度 */}
            <PieChart />
        </div>
    );
};

export default LeftPanel;
