import { get } from "@/utils/request";
import type { DictData, DictType } from "@/types/dict";

export const getAllDicts = async (): Promise<DictData[]> => {
    const response = await get<DictData[]>("/meta/dicts");
    return Array.isArray(response.data) ? response.data : [];
};

export const getDictByType = async (type: DictType): Promise<DictData> => {
    const response = await get<DictData>(`/meta/dicts/${type}`);
    return (
        response.data || {
            type,
            description: "",
            items: [],
        }
    );
};
