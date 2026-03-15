/**
 * 中国省份 GeoJSON 数据
 *
 * 使用阿里云 GeoJSON 数据源：https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json
 * 提供地图数据加载和省份代码转换功能。
 */

/**
 * 阿里云 GeoJSON 数据格式接口
 *
 * 表示一个地理要素（Feature），包含属性和几何信息。
 */
export interface AliGeoJsonFeature {
    type: "Feature";
    properties: {
        adcode: number; // 行政区划代码
        name: string; // 省份名称
        center: [number, number]; // 中心点坐标 [经度, 纬度]
        centroid?: [number, number]; // 质心坐标
        childrenNum?: number; // 子级数量
        level: string; // 级别 (province/city/district)
        parent?: {
            adcode: number;
        };
        subFeatureIndex?: number;
        acroutes?: number[];
    };
    geometry: {
        type: "Polygon" | "MultiPolygon";
        coordinates: number[][][] | number[][][][];
    };
}

/**
 * 省份 GeoJSON 数据接口
 *
 * 包含所有省份的地理要素集合。
 */
export interface ProvinceGeoJson {
    type: "FeatureCollection";
    features: AliGeoJsonFeature[];
}

/**
 * GeoJSON 数据 URL（阿里云数据源，备用）
 *
 * 当本地文件加载失败时，使用此 URL 作为备用数据源。
 */
export const CHINA_GEOJSON_URL = "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json";

/**
 * 加载中国省份 GeoJSON 数据
 *
 * 优先从本地 JSON 文件加载，失败时尝试从 URL 加载。
 *
 * @returns 返回 Promise，解析为省份 GeoJSON 数据，失败时返回 null
 */
export const loadChinaGeoJson = async (): Promise<ProvinceGeoJson | null> => {
    try {
        // 使用 fetch 加载本地 JSON 文件（相对于 public 目录）
        // 在开发环境中，文件在 src/data，需要放在 public 目录或通过 Vite 导入
        // 使用动态导入，Vite 会自动处理 JSON 文件的导入
        const geoJsonModule = await import("./china.json");
        // Vite 导入 JSON 时，默认导出整个对象
        return (geoJsonModule.default || geoJsonModule) as ProvinceGeoJson;
    } catch (_error) {
        // 如果本地加载失败，尝试从 URL 加载
        try {
            const response = await fetch(CHINA_GEOJSON_URL);
            if (response.ok) {
                const data = await response.json();
                return data as ProvinceGeoJson;
            }
        } catch (_urlError) {}
    }
    return null;
};

/**
 * 获取省份中心点坐标
 *
 * 根据省份代码从 GeoJSON 数据中查找对应的中心点坐标。
 *
 * @param geoJson - GeoJSON 数据
 * @param code - 省份代码（adcode 数字或 code 字符串）
 * @returns 返回中心点坐标 [经度, 纬度]，如果未找到则返回 null
 */
export const getProvinceCenter = (
    geoJson: ProvinceGeoJson,
    code: string | number
): [number, number] | null => {
    const codeNum = typeof code === "string" ? parseInt(code) : code;
    const feature = geoJson.features.find((f) => f.properties.adcode === codeNum);
    return feature?.properties.center || null;
};

/**
 * 获取省份名称
 *
 * 根据省份代码从 GeoJSON 数据中查找对应的省份名称。
 *
 * @param geoJson - GeoJSON 数据
 * @param code - 省份代码（adcode 数字或 code 字符串）
 * @returns 返回省份名称，如果未找到则返回 null
 */
export const getProvinceName = (geoJson: ProvinceGeoJson, code: string | number): string | null => {
    const codeNum = typeof code === "string" ? parseInt(code) : code;
    const feature = geoJson.features.find((f) => f.properties.adcode === codeNum);
    return feature?.properties.name || null;
};

/**
 * 将省份代码转换为 adcode 格式
 *
 * 将字符串格式的省份代码转换为数字格式的 adcode。
 *
 * @param code - 省份代码（字符串或数字）
 * @returns 返回数字格式的 adcode
 */
export const convertCodeToAdcode = (code: string | number): number => {
    return typeof code === "string" ? parseInt(code) : code;
};

/**
 * 将 adcode 转换为字符串格式的 code
 *
 * 将数字格式的 adcode 转换为字符串格式的省份代码。
 *
 * @param adcode - 数字格式的 adcode
 * @returns 返回字符串格式的省份代码
 */
export const convertAdcodeToCode = (adcode: number): string => {
    return adcode.toString();
};
