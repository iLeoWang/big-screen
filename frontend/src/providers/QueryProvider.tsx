import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const TEN_MINUTES = 10 * 60 * 1000;

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: TEN_MINUTES,
            gcTime: TEN_MINUTES,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

export const AppQueryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
