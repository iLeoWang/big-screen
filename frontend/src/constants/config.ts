/**
 * 项目配置常量
 *
 * 统一管理所有硬编码的数值配置，包括 HTTP 请求、服务器、防抖延迟、
 * 设计尺寸、图表、构建和数据生成等配置。
 */

// ============================================
// HTTP 请求配置
// ============================================

/** 请求超时时间（毫秒） */
export const REQUEST_TIMEOUT = 10000;

/**
 * HTTP 状态码
 *
 * 常用的 HTTP 响应状态码常量。
 */
export const HTTP_STATUS = {
    /** 成功 */
    OK: 200,
    /** 请求参数错误 */
    BAD_REQUEST: 400,
    /** 未授权 */
    UNAUTHORIZED: 401,
    /** 拒绝访问 */
    FORBIDDEN: 403,
    /** 资源不存在 */
    NOT_FOUND: 404,
    /** 服务器内部错误 */
    INTERNAL_SERVER_ERROR: 500,
} as const;

/** API 响应成功代码 */
export const API_SUCCESS_CODE = 200;

// ============================================
// 服务器配置
// ============================================

/** 开发服务器端口 */
export const DEV_SERVER_PORT = 3000;

/** 默认后端服务器端口 */
export const DEFAULT_BACKEND_PORT = 8080;

/** 默认后端服务器地址 */
export const DEFAULT_BACKEND_URL = `http://localhost:${DEFAULT_BACKEND_PORT}`;

// ============================================
// 防抖和延迟配置
// ============================================

/** 图表 resize 防抖延迟（毫秒） */
export const CHART_RESIZE_DEBOUNCE = 100;

/** 屏幕适配防抖延迟（毫秒） */
export const SCREEN_ADAPT_DEBOUNCE = 150;

/** 时间更新间隔（毫秒） */
export const TIME_UPDATE_INTERVAL = 1000;

// ============================================
// 设计尺寸配置
// ============================================

/** 设计稿宽度（像素） */
export const DESIGN_WIDTH = 1920;

/** 设计稿高度（像素） */
export const DESIGN_HEIGHT = 1080;

// ============================================
// 图表配置
// ============================================

/** 最小设备像素比 */
export const MIN_DEVICE_PIXEL_RATIO = 2.0;

/** 最大设备像素比（避免过度放大导致性能问题） */
export const MAX_DEVICE_PIXEL_RATIO = 3.0;

// ============================================
// 构建配置
// ============================================

/** 构建大小警告阈值（KB） */
export const BUILD_CHUNK_SIZE_WARNING_LIMIT = 1000;

// ============================================
// 数据生成配置
// ============================================

/** Faker 种子偏移量 */
export const FAKER_SEED_OFFSETS = {
    /** 24小时数据偏移 */
    HOURLY: 1000,
    /** 月度数据偏移 */
    MONTHLY: 2000,
    /** 实时数据偏移 */
    REALTIME: 3000,
    /** 空气质量等级数据偏移 */
    AIR_QUALITY_LEVEL: 4000,
    /** 污染预警数据偏移 */
    POLLUTION_WARNING: 5000,
    /** 监测站点排名数据偏移 */
    STATION_RANK: 6000,
    /** 全国排名种子 */
    NATIONAL_RANK: 999999,
} as const;

/** 城市数据生成倍数范围 */
export const CITY_DATA_MULTIPLIER = {
    /** 基础倍数 */
    BASE: 0.9,
    /** 倍数增量 */
    INCREMENT: 0.05,
    /** 最大倍数 */
    MAX: 3,
} as const;

/** 省份数据调整倍数 */
export const PROVINCE_DATA_MULTIPLIER = {
    /** 基础倍数 */
    BASE: 0.8,
    /** 倍数增量 */
    INCREMENT: 0.1,
    /** 最大倍数 */
    MAX: 5,
} as const;

// ============================================
// 默认数据值
// ============================================

/** 默认污染物数据 */
export const DEFAULT_POLLUTANT_DATA = {
    PM25: 50,
    PM10: 80,
    NO2: 40,
    SO2: 20,
    CO: 1.5,
    O3: 100,
    AQI: 90,
} as const;

/** 默认空气质量等级 */
export const DEFAULT_AIR_QUALITY_LEVEL = "良";

// ============================================
// 数字格式化配置
// ============================================

/** 小数位数 */
export const DECIMAL_PLACES = {
    /** 污染物数据小数位 */
    POLLUTANT: 1,
    /** CO 数据小数位 */
    CO: 2,
} as const;

/** 代码填充位数 */
export const CODE_PADDING_LENGTH = 4;
