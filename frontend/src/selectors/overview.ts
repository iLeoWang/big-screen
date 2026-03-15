import type { ProvinceOverview } from "@/api/province";
import type { ProvincePollutionData } from "@/api/middle";
import type { PollutionWarningItem } from "@/api/right";
import { normalizeOverview } from "@/utils/overview";

export interface OverviewUiSelection {
    overview: ProvinceOverview;
    provinceCities: ProvincePollutionData[];
    stationPoints: ProvincePollutionData[];
    warnings: PollutionWarningItem[];
}

export const selectOverviewForUI = (
    overview: ProvinceOverview | null | undefined,
    code = "all",
    name = "全国"
): OverviewUiSelection => {
    const normalized = normalizeOverview(overview, code, name);
    const cities = Array.isArray(normalized.cities) ? normalized.cities : [];

    return {
        overview: normalized,
        provinceCities: cities.filter((item) => item.type === "province"),
        stationPoints: cities.filter((item) => item.type === "station"),
        warnings: Array.isArray(normalized.right?.warnings) ? normalized.right.warnings : [],
    };
};
