import React from "react";
import WarningList from "./WarningList";
import StationRanks from "./StationRanks";

/**
 * 右侧面板组件
 * 包含两个垂直堆叠的内容：
 * - 上方：污染预警信息列表（40%，最小高度 300px）
 * - 下方：监测站点排名（60%）
 */
const RightPanel: React.FC = () => {
    return (
        <div className="flex h-full flex-col gap-4">
            {/* 上方：污染预警信息列表 */}
            <div className="h-[40%] min-h-[300px]">
                <WarningList />
            </div>

            {/* 下方：监测站点排名 */}
            <div className="h-[60%] min-h-0">
                <StationRanks />
            </div>
        </div>
    );
};

export default RightPanel;
