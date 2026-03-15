/**
 * 中间面板数据类型定义
 *
 * 仅保留被组件引用的类型定义，请求函数已迁移到 province.ts
 */

/**
 * 省份污染数据接口
 */
export interface ProvincePollutionData {
    name: string;
    code: string;
    longitude: number;
    latitude: number;
    pm25: number;
    pm10: number;
    no2: number;
    so2: number;
    co: number;
    o3: number;
    aqi: number;
    level: string;
}

/**
 * 饼图数据接口
 */
export interface MiddlePieChartData {
    name: string;
    value: number;
}

/**
 * 中间区域统计数据接口
 */
export interface MiddleStatsData {
    totalRiskCount: number;
    riskPercentage: number;
}

/**
 * 仪表盘数据接口
 */
export interface MiddleGaugeChartData {
    value: number;
}

/**
 * 省份列表数据接口
 */
export interface ProvinceListData {
    provinces: ProvincePollutionData[];
}
