import { twMerge } from "tailwind-merge";

/**
 * 合并 Tailwind CSS 类名的工具函数
 *
 * 使用 tailwind-merge 智能合并类名，自动处理冲突并过滤 falsy 值
 *
 * @param inputs 类名字符串数组，可包含 undefined、null、false 等 falsy 值
 * @returns 合并后的类名字符串
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
    return twMerge(inputs.filter(Boolean).join(" "));
}
