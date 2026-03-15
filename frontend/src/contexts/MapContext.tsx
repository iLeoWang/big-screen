import React, { createContext, useContext, useMemo, useState } from "react";
import type { ProvincePollutionData } from "@/api/middle";

interface MapContextType {
    selectedProvince: ProvincePollutionData | null;
    setSelectedProvince: (province: ProvincePollutionData | null) => void;
    provinces: ProvincePollutionData[];
    setProvinces: (provinces: ProvincePollutionData[]) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedProvince, setSelectedProvince] = useState<ProvincePollutionData | null>(null);
    const [provinces, setProvinces] = useState<ProvincePollutionData[]>([]);

    const value = useMemo(
        () => ({
            selectedProvince,
            setSelectedProvince,
            provinces,
            setProvinces,
        }),
        [provinces, selectedProvince]
    );

    return (
        <MapContext.Provider value={value}>{children}</MapContext.Provider>
    );
};

export const useMapContext = (): MapContextType => {
    const context = useContext(MapContext);
    if (!context) {
        throw new Error("useMapContext must be used within MapProvider");
    }
    return context;
};
