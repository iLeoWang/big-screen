import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import {
    DEV_SERVER_PORT,
    DEFAULT_BACKEND_URL,
    BUILD_CHUNK_SIZE_WARNING_LIMIT,
} from "./src/constants/config";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // 加载环境变量
    const env = loadEnv(mode, process.cwd(), "");
    const apiBaseUrl = env.VITE_API_BASE_URL || "";
    const proxyTarget = /^https?:\/\//.test(apiBaseUrl) ? apiBaseUrl : DEFAULT_BACKEND_URL;

    return {
        // 基础路径，用于部署到 nginx 子路径
        base: env.VITE_BASE_PATH || "/big-screen/",
        plugins: [
            react(),
        ],
        resolve: {
            alias: {
                "@": path.resolve(process.cwd(), "./src"),
                "@api": path.resolve(process.cwd(), "./src/api"),
                "@assets": path.resolve(process.cwd(), "./src/assets"),
                "@components": path.resolve(process.cwd(), "./src/components"),
                "@constants": path.resolve(process.cwd(), "./src/constants"),
                "@contexts": path.resolve(process.cwd(), "./src/contexts"),
                "@data": path.resolve(process.cwd(), "./src/data"),
                "@hooks": path.resolve(process.cwd(), "./src/hooks"),
                "@layouts": path.resolve(process.cwd(), "./src/layouts"),

                "@styles": path.resolve(process.cwd(), "./src/styles"),
                "@types": path.resolve(process.cwd(), "./src/types"),
                "@utils": path.resolve(process.cwd(), "./src/utils"),
                "@views": path.resolve(process.cwd(), "./src/views"),
            },
        },
        server: {
            port: DEV_SERVER_PORT,
            open: true,
            cors: true,
            proxy: {
                // 开发环境代理配置
                "/api": {
                    target: proxyTarget,
                    changeOrigin: true,
                    ws: true,
                    rewrite: (path) => path.replace(/^\/api/, ""),
                    configure: (proxy) => {
                        // 后端未就绪或连接已关闭时的常见错误，不刷屏
                        const quietCodes = new Set(["ECONNRESET", "EPIPE"]);
                        proxy.on("error", (err, _req, _res) => {
                            if (!quietCodes.has((err as NodeJS.ErrnoException).code ?? "")) {
                                console.error("[vite] proxy error:", err.message);
                            }
                        });
                    },
                },
            },
        },
        build: {
            outDir: "dist",
            assetsDir: "assets",
            sourcemap: false,
            minify: "terser",
            terserOptions: {
                compress: {
                    drop_console: true,
                    drop_debugger: true,
                },
            },
            rollupOptions: {
                output: {
                    manualChunks: (id) => {
                        if (
                            id.includes("node_modules/echarts/") ||
                            id.includes("node_modules/zrender/")
                        ) {
                            return "echarts";
                        }
                        if (
                            id.includes("node_modules/react/") ||
                            id.includes("node_modules/react-dom/")
                        ) {
                            return "react";
                        }
                        if (id.includes("node_modules/antd/")) {
                            return "antd";
                        }
                        return undefined;
                    },
                    // 确保资源路径正确
                    chunkFileNames: "assets/js/[name]-[hash].js",
                    entryFileNames: "assets/js/[name]-[hash].js",
                    assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
                },
            },
            // 构建大小警告阈值
            chunkSizeWarningLimit: BUILD_CHUNK_SIZE_WARNING_LIMIT,
        },
    };
});
