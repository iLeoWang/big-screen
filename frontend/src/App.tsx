import React from "react";
import Dashboard from "@/views/dashboard";
import ErrorBoundary from "@/components/ErrorBoundary";

/**
 * 应用根组件
 *
 * 包含错误边界和主视图，提供全局错误处理。
 *
 * @returns 返回应用根组件
 */
const App: React.FC = () => {
    return (
        <ErrorBoundary
            showDetails={import.meta.env.DEV}
            onError={() => {}}
        >
            <Dashboard />
        </ErrorBoundary>
    );
};

export default App;
