/**
 * Dashboard API
 *
 * 两个接口:
 * 1. /dashboard/map - 地图数据（所有省份）
 * 2. /dashboard/overview?scope=ALL|{code} - 聚合面板数据
 */

import { get } from "@/utils/request";
import type { PollutantRealtimeData, AirQualityLevelData } from "@/api/left";
import type { PollutionWarningItem, MonitoringStationRankItem } from "@/api/right";
import type { HourlyPollutantData, MonthlyPollutantData } from "@/api/bottom";
import type { ProvincePollutionData } from "@/api/middle";

// ─── Map API Response ───

export interface MapDataResponse {
    provinces: ProvincePollutionData[];
}

// ─── Overview API Response ───

export interface OverviewResponse {
    scope: string;
    scopeName: string;
    ts: number;
    updatedAt: string;
    summary: {
        aqi: number;
        level: string;
        stationCount: number;
        warningCount: number;
    };
    realtime: PollutantRealtimeData;
    airQualityLevels: AirQualityLevelData[];
    warnings: PollutionWarningItem[];
    stationRanks: MonitoringStationRankItem[];
    hourlyPollutant: HourlyPollutantData[];
    monthlyPollutant: MonthlyPollutantData[];
    cities: Array<ProvincePollutionData & { type?: string }>;
}

// ─── Legacy-compatible shape used by existing UI components ───

export interface ProvinceOverview {
    code: string;
    name: string;
    ts: number;
    left: {
        realtime: PollutantRealtimeData;
        airQualityLevels: AirQualityLevelData[];
    };
    right: {
        warnings: PollutionWarningItem[];
        stationRanks: MonitoringStationRankItem[];
    };
    bottom: {
        hourlyPollutant: HourlyPollutantData[];
        monthlyPollutant: MonthlyPollutantData[];
    };
    cities: Array<ProvincePollutionData & { type?: string }>;
}

// ─── API Functions ───

/**
 * 获取地图数据（所有省份的 AQI / 坐标 / 污染物）
 */
export const getMapData = async (config?: { signal?: AbortSignal }): Promise<MapDataResponse> => {
    const response = await get<MapDataResponse>("/dashboard/map", undefined, config);
    const data = response.data as MapDataResponse;
    return {
        provinces: Array.isArray(data?.provinces) ? data.provinces : [],
    };
};

/**
 * 获取聚合面板数据
 * @param scope - "ALL" 或省份代码
 */
export const getOverview = async (
    scope: string,
    config?: { signal?: AbortSignal }
): Promise<OverviewResponse> => {
    const response = await get<OverviewResponse>(
        "/dashboard/overview",
        { scope },
        config
    );
    return response.data as OverviewResponse;
};

/**
 * 将 OverviewResponse 转换为 ProvinceOverview（兼容现有组件）
 */
export const toProvinceOverview = (raw: OverviewResponse): ProvinceOverview => ({
    code: raw.scope === "ALL" ? "all" : raw.scope,
    name: raw.scopeName,
    ts: raw.ts,
    left: {
        realtime: raw.realtime || { pm25: 0, pm10: 0, no2: 0, so2: 0, co: 0, o3: 0 },
        airQualityLevels: raw.airQualityLevels || [],
    },
    right: {
        warnings: raw.warnings || [],
        stationRanks: raw.stationRanks || [],
    },
    bottom: {
        hourlyPollutant: raw.hourlyPollutant || [],
        monthlyPollutant: raw.monthlyPollutant || [],
    },
    cities: raw.cities || [],
});
