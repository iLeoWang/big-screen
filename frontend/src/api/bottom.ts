/**
 * 底部面板数据类型定义
 */

/**
 * 24小时污染物浓度趋势数据
 */
export interface HourlyPollutantData {
    hour: string;
    pm25: number;
    pm10: number;
    no2: number;
    o3: number;
}

/**
 * 月度污染物对比数据
 */
export interface MonthlyPollutantData {
    month: string;
    currentPM25: number;
    previousPM25: number;
    currentPM10: number;
    previousPM10: number;
}
