/**
 * 左侧面板数据类型定义
 */

/**
 * 核心污染物实时数据
 */
export interface PollutantRealtimeData {
    pm25: number;
    pm10: number;
    no2: number;
    so2: number;
    co: number;
    o3: number;
}

/**
 * 空气质量等级分布数据
 */
export interface AirQualityLevelData {
    name: string;
    value: number;
    color: string;
}
