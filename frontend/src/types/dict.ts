/**
 * 标准字典项
 */
export interface DictItem {
    label: string;
    value: string;
    color?: string;
    unit?: string;
    [key: string]: unknown;
}

/**
 * 标准字典响应结构
 */
export interface DictData {
    type: string;
    description: string;
    items: DictItem[];
}

/**
 * 当前项目的字典类型
 */
export type DictType = "air_quality_level" | "warning_level" | "pollutant";
