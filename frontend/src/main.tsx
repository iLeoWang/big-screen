/**
 * 应用入口文件
 *
 * 初始化 React 应用并挂载到 DOM，启用 StrictMode 进行开发时检查。
 */

import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App";
import { AppQueryProvider } from "@/providers/QueryProvider";
import "@/styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <AppQueryProvider>
            <App />
        </AppQueryProvider>
    </React.StrictMode>
);
