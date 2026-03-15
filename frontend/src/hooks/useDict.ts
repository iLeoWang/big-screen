import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDictByType } from "@/api/dicts";
import type { DictItem, DictType } from "@/types/dict";

const TEN_MINUTES = 10 * 60 * 1000;

export const useDict = (type: DictType) => {
    const query = useQuery({
        queryKey: ["dict", type],
        queryFn: () => getDictByType(type),
        staleTime: TEN_MINUTES,
        gcTime: TEN_MINUTES,
        refetchOnWindowFocus: false,
        retry: 1,
    });

    const items = query.data?.items ?? [];

    const itemMap = useMemo(() => {
        return new Map(items.map((item) => [String(item.value), item]));
    }, [items]);

    const getByValue = useCallback(
        (value: string): DictItem | undefined => {
            return itemMap.get(String(value));
        },
        [itemMap]
    );

    return {
        ...query,
        items,
        getByValue,
    };
};
