import React from "react";
import { cn } from "@/utils/cn";
import { MAP_DISPLAY_CONFIG } from "@/constants/map";
import { useMapContext } from "@/contexts/MapContext";
import { useProvinceData } from "@/contexts/ProvinceDataContext";
import { useChinaMap } from "@/hooks/useChinaMap";
import { useECharts } from "@/hooks/useECharts";
import type { ProvincePollutionData } from "@/api/middle";

const MAP_INITIAL_OPTION = {
    backgroundColor: MAP_DISPLAY_CONFIG.backgroundColor,
};

const MapBackground: React.FC = () => {
    const { selectedProvince, setSelectedProvince } = useMapContext();
    const { mapProvinces } = useProvinceData();

    const liveProvinceData: ProvincePollutionData[] | undefined =
        mapProvinces.length > 0 ? mapProvinces : undefined;

    const { chartRef, chartInstanceRef, setOption } = useECharts(MAP_INITIAL_OPTION);

    useChinaMap({
        selectedProvince,
        setSelectedProvince,
        chartInstance: chartInstanceRef.current,
        setOption,
        liveProvinceData,
    });

    return (
        <div className={cn("relative w-full h-full overflow-hidden")}>
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-[49%] h-[620px] w-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(circle,rgba(35,206,253,0.14)_0%,rgba(35,206,253,0.06)_35%,rgba(6,13,26,0)_68%)]" />
                <div className="absolute left-1/2 top-[49%] h-[540px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-[rgba(35,206,253,0.15)] animate-border-breathe" />
                <div className="absolute left-1/2 top-[49%] h-[470px] w-[920px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-[rgba(35,206,253,0.1)]" />
                <div className="absolute left-1/2 top-[49%] h-[400px] w-[840px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-[rgba(35,206,253,0.06)]" />
                <div className="absolute left-[10%] top-[15%] h-1 w-1 rounded-full bg-[rgba(35,206,253,0.5)] animate-glow-pulse" />
                <div
                    className="absolute right-[10%] top-[15%] h-1 w-1 rounded-full bg-[rgba(35,206,253,0.5)] animate-glow-pulse"
                    style={{ animationDelay: "1s" }}
                />
                <div
                    className="absolute left-[15%] bottom-[25%] h-1 w-1 rounded-full bg-[rgba(35,206,253,0.4)] animate-glow-pulse"
                    style={{ animationDelay: "0.5s" }}
                />
                <div
                    className="absolute right-[15%] bottom-[25%] h-1 w-1 rounded-full bg-[rgba(35,206,253,0.4)] animate-glow-pulse"
                    style={{ animationDelay: "1.5s" }}
                />
            </div>
            <div ref={chartRef} className="relative z-10 w-full h-full" />
        </div>
    );
};

export default MapBackground;
