import React, { createContext, useContext, useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useMapContext } from "@/contexts/MapContext";
import { getOverview, getMapData, toProvinceOverview, type ProvinceOverview } from "@/api/province";
import type { ProvincePollutionData } from "@/api/middle";
import { selectOverviewForUI } from "@/selectors/overview";

const AGGREGATE_POLL_MS = 60_000;

interface ProvinceDataContextType {
    overview: ProvinceOverview;
    mapProvinces: ProvincePollutionData[];
    loading: boolean;
    error: Error | null;
    refresh: () => void;
    lastUpdatedAt: number | null;
}

const ProvinceDataContext = createContext<ProvinceDataContextType | undefined>(undefined);

export const ProvinceDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { selectedProvince, setProvinces } = useMapContext();

    const scope = selectedProvince?.code || "ALL";

    const [overview, setOverview] = useState<ProvinceOverview | undefined>(undefined);
    const [mapProvinces, setMapProvinces] = useState<ProvincePollutionData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
    const requestVersionRef = useRef(0);
    const abortRef = useRef<AbortController | null>(null);
    const overviewRef = useRef<ProvinceOverview | undefined>(overview);

    overviewRef.current = overview;

    const loadMapData = useCallback(async () => {
        try {
            const data = await getMapData();
            setMapProvinces(data.provinces);
            setProvinces(data.provinces);
        } catch (err) {
            console.error("Failed to load map data:", err);
        }
    }, [setProvinces]);

    const loadOverview = useCallback(
        async (targetScope: string, options?: { silent?: boolean; retryCount?: number }) => {
            requestVersionRef.current += 1;
            const currentVersion = requestVersionRef.current;
            const silent = options?.silent === true;
            const retryCount = Number(options?.retryCount || 0);
            const shouldShowLoading = !silent && !overviewRef.current;

            if (abortRef.current) {
                abortRef.current.abort();
            }

            const controller = new AbortController();
            abortRef.current = controller;
            if (shouldShowLoading) {
                setLoading(true);
            }
            if (!silent) {
                setError(null);
            }

            try {
                const raw = await getOverview(targetScope, { signal: controller.signal });

                if (currentVersion !== requestVersionRef.current) return;
                setOverview(toProvinceOverview(raw));
                setError(null);
                setLastUpdatedAt(raw.ts || Date.now());
            } catch (loadError) {
                if ((loadError as { code?: string })?.code === "ERR_CANCELED") {
                    return;
                }
                if (currentVersion !== requestVersionRef.current) return;

                const requestError = loadError as Error;
                setError(new Error(`${targetScope} 数据加载失败：${requestError.message || "请求失败"}`));

                if (retryCount < 1) {
                    window.setTimeout(() => {
                        void loadOverview(targetScope, { silent: true, retryCount: retryCount + 1 });
                    }, 800);
                }
            } finally {
                if (currentVersion === requestVersionRef.current && shouldShowLoading) {
                    setLoading(false);
                }
            }
        },
        []
    );

    useEffect(() => {
        void loadOverview(scope);

        return () => {
            if (abortRef.current) {
                abortRef.current.abort();
                abortRef.current = null;
            }
        };
    }, [scope, loadOverview]);

    useEffect(() => {
        void loadMapData();
    }, [loadMapData]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            void loadOverview(scope, { silent: true });
            void loadMapData();
        }, AGGREGATE_POLL_MS);

        return () => {
            window.clearInterval(timer);
        };
    }, [scope, loadOverview, loadMapData]);

    const refresh = useCallback(() => {
        void loadOverview(scope, { silent: true });
        void loadMapData();
    }, [scope, loadOverview, loadMapData]);

    const overviewSelection = useMemo(
        () => selectOverviewForUI(overview, scope === "ALL" ? "all" : scope, selectedProvince?.name || "全国"),
        [overview, scope, selectedProvince?.name]
    );
    const normalizedOverview = overviewSelection.overview;

    return (
        <ProvinceDataContext.Provider
            value={{
                overview: normalizedOverview,
                mapProvinces,
                loading,
                error,
                refresh,
                lastUpdatedAt,
            }}
        >
            {children}
        </ProvinceDataContext.Provider>
    );
};

export const useProvinceData = (): ProvinceDataContextType => {
    const ctx = useContext(ProvinceDataContext);
    if (!ctx) throw new Error("useProvinceData must be used within ProvinceDataProvider");
    return ctx;
};
