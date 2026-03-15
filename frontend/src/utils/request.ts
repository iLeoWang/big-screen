import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";
import { REQUEST_TIMEOUT, HTTP_STATUS, API_SUCCESS_CODE } from "@/constants/config";

/**
 * API 响应数据接口
 *
 * 标准化的 API 响应格式，所有 API 请求都应返回此格式。
 */
export interface ApiResponse<T = unknown> {
    /** 响应状态码（200 表示成功） */
    code: number;
    /** 响应消息 */
    message: string;
    /** 响应数据 */
    data: T;
    /** 是否成功（可选，部分 API 使用此字段） */
    success?: boolean;
}

/**
 * 扩展的请求配置接口
 *
 * 继承 AxiosRequestConfig，添加自定义配置选项。
 */
export interface RequestConfig extends AxiosRequestConfig {
    /** 是否显示加载提示（预留，暂未实现） */
    showLoading?: boolean;
    /** 是否显示错误提示（预留，暂未实现） */
    showError?: boolean;
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
    if (!value || typeof value !== "object") {
        return null;
    }
    return value as Record<string, unknown>;
};

/**
 * 创建并配置 axios 实例
 *
 * 配置请求拦截器、响应拦截器，统一处理响应格式和错误。
 * 自动处理标准 API 响应格式，统一错误处理逻辑。
 *
 * @returns 返回配置好的 axios 实例
 */
const createAxiosInstance = (): AxiosInstance => {
    const instance = axios.create({
        baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
        timeout: REQUEST_TIMEOUT,
        headers: {
            "Content-Type": "application/json;charset=UTF-8",
        },
    });

    instance.interceptors.request.use(
        (config) => config,
        (error: AxiosError) => Promise.reject(error)
    );

    instance.interceptors.response.use(
        (response: AxiosResponse<unknown>) => {
            const { data } = response;
            const payload = asRecord(data);

            if (payload && "code" in payload) {
                const code = Number(payload.code);
                const success = Boolean(payload.success);
                const message = typeof payload.message === "string" ? payload.message : "请求失败";

                if (code === API_SUCCESS_CODE || success) {
                    return { ...response, data };
                }
                return Promise.reject(new Error(message));
            }

            return response;
        },
        (error: AxiosError) => {
            if (error.code === "ERR_CANCELED") {
                return Promise.reject(error);
            }

            let message = "请求失败";

            if (error.response) {
                switch (error.response.status) {
                    case HTTP_STATUS.BAD_REQUEST:
                        message = "请求参数错误";
                        break;
                    case HTTP_STATUS.UNAUTHORIZED:
                        message = "未授权，请重新登录";
                        break;
                    case HTTP_STATUS.FORBIDDEN:
                        message = "拒绝访问";
                        break;
                    case HTTP_STATUS.NOT_FOUND:
                        message = "请求地址不存在";
                        break;
                    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
                        message = "服务器内部错误";
                        break;
                    default:
                        message = `请求失败：${error.response.status}`;
                }
            } else if (error.request) {
                message = "网络连接失败，请检查网络";
            } else {
                message = error.message || "请求失败";
            }

            return Promise.reject(new Error(message));
        }
    );

    return instance;
};

const request = createAxiosInstance();

/**
 * 发送 GET 请求
 *
 * @template T 响应数据的类型
 * @param url 请求 URL（相对于 baseURL）
 * @param params 查询参数对象
 * @param config 可选的请求配置
 * @returns Promise，解析为标准的 API 响应格式
 */
export const get = <T = unknown>(
    url: string,
    params?: unknown,
    config?: RequestConfig
): Promise<ApiResponse<T>> => {
    return request.get<ApiResponse<T>>(url, { ...config, params }).then((response) => {
        const data = response.data;
        if (data && typeof data === "object" && "data" in data) {
            return data as ApiResponse<T>;
        }
        return {
            code: API_SUCCESS_CODE,
            message: "成功",
            data: data as T,
            success: true,
        };
    });
};

/**
 * 发送 POST 请求
 *
 * @template T 响应数据的类型
 * @param url 请求 URL（相对于 baseURL）
 * @param data 请求体数据
 * @param config 可选的请求配置
 * @returns Promise，解析为标准的 API 响应格式
 */
export const post = <T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig
): Promise<ApiResponse<T>> => {
    return request.post<ApiResponse<T>>(url, data, config).then((response) => {
        const responseData = response.data;
        if (responseData && typeof responseData === "object" && "data" in responseData) {
            return responseData as ApiResponse<T>;
        }
        return {
            code: API_SUCCESS_CODE,
            message: "成功",
            data: responseData as T,
            success: true,
        };
    });
};

/**
 * 发送 PUT 请求
 *
 * @template T 响应数据的类型
 * @param url 请求 URL（相对于 baseURL）
 * @param data 请求体数据
 * @param config 可选的请求配置
 * @returns Promise，解析为标准的 API 响应格式
 */
export const put = <T = unknown>(
    url: string,
    data?: unknown,
    config?: RequestConfig
): Promise<ApiResponse<T>> => {
    return request.put<ApiResponse<T>>(url, data, config).then((response) => {
        const responseData = response.data;
        if (responseData && typeof responseData === "object" && "data" in responseData) {
            return responseData as ApiResponse<T>;
        }
        return {
            code: API_SUCCESS_CODE,
            message: "成功",
            data: responseData as T,
            success: true,
        };
    });
};

/**
 * 发送 DELETE 请求
 *
 * @template T 响应数据的类型
 * @param url 请求 URL（相对于 baseURL）
 * @param params 查询参数对象
 * @param config 可选的请求配置
 * @returns Promise，解析为标准的 API 响应格式
 */
export const del = <T = unknown>(
    url: string,
    params?: unknown,
    config?: RequestConfig
): Promise<ApiResponse<T>> => {
    return request.delete<ApiResponse<T>>(url, { ...config, params }).then((response) => {
        const responseData = response.data;
        if (responseData && typeof responseData === "object" && "data" in responseData) {
            return responseData as ApiResponse<T>;
        }
        return {
            code: API_SUCCESS_CODE,
            message: "成功",
            data: responseData as T,
            success: true,
        };
    });
};

export default request;
