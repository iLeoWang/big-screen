/**
 * 全局类型声明
 * 包含全局类型扩展和模块声明
 */

/**
 * 扩展全局 Window 对象
 */
declare global {
    // 可以在这里添加全局类型声明
}

/**
 * 声明 JSON 模块类型（用于 Vite 导入 JSON 文件）
 */
declare module "*.json" {
    /** JSON 文件内容 */
    const value: any;
    export default value;
}

/**
 * 导出空对象以确保这是一个模块
 */
export {};
