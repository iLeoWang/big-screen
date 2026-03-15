import React from "react";
import { DashboardLayout } from "@/layouts";
import { MapProvider } from "@/contexts/MapContext";
import { ProvinceDataProvider } from "@/contexts/ProvinceDataContext";
import LeftPanel from "@/views/dashboard/left";
import RightPanel from "@/views/dashboard/right";
import BottomContent from "@/views/dashboard/bottom";
import MapBackground from "@/views/dashboard/middle";

/**
 * 仪表盘页面
 *
 * 大屏可视化仪表盘的主页面，包含左侧、右侧、底部和中间地图区域。
 * 使用 MapProvider 和 ProvinceDataProvider 提供全局状态管理。
 */
const Dashboard: React.FC = () => {
    return (
        <MapProvider>
            <ProvinceDataProvider>
                <DashboardLayout
                    centerContent={<MapBackground />}
                    leftContent={<LeftPanel />}
                    rightContent={<RightPanel />}
                    bottomContent={<BottomContent />}
                />
            </ProvinceDataProvider>
        </MapProvider>
    );
};

export default Dashboard;
