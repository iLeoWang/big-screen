/**
 * 右侧面板数据类型定义
 */

/**
 * 预警信息数据
 */
export interface PollutionWarningItem {
    warningCode?: string;
    type: string;
    level: "轻度" | "中度" | "重度" | "严重";
    provinceCode?: string;
    provinceName?: string;
    area: string;
    title?: string;
    description?: string;
    status?: "active" | "published" | "resolved" | string;
    statusLabel?: string;
    time: string;
    startTime?: string;
    endTime?: string;
    timeRange?: string;
    mainPollutant: string;
    stationName?: string;
}

/**
 * 监测站点排名数据
 */
export interface MonitoringStationRankItem {
    stationId?: number;
    stationCode?: string;
    rank?: number;
    prevRank?: number | null;
    rankDelta?: number | null;
    aqiDelta?: number | null;
    name: string;
    provinceCode?: string;
    provinceName?: string;
    areaName?: string;
    observedAt?: string;
    aqi: number;
    level: string;
    mainPollutant: string;
    pm25: number;
    pm10?: number;
    freshnessMinutes?: number;
    isStale?: boolean;
    trend?: number[];
}
