import type { ProvinceOverview } from "@/api/province";


export const createDefaultOverview = (code = "all", name = "全国"): ProvinceOverview => ({
    code,
    name,
    ts: Date.now(),
    left: {
        realtime: {
            pm25: 0,
            pm10: 0,
            no2: 0,
            so2: 0,
            co: 0,
            o3: 0,
        },
        airQualityLevels: [],
    },
    right: {
        warnings: [],
        stationRanks: [],
    },
    bottom: {
        hourlyPollutant: [],
        monthlyPollutant: [],
    },
    cities: [],
});

export const normalizeOverview = (
    overview: ProvinceOverview | null | undefined,
    code = "all",
    name = "全国"
): ProvinceOverview => {
    const fallback = createDefaultOverview(code, name);

    if (!overview) {
        return fallback;
    }

    return {
        ...fallback,
        ...overview,
        left: {
            ...fallback.left,
            ...(overview.left || {}),
            realtime: {
                ...fallback.left.realtime,
                ...(overview.left?.realtime || {}),
            },
            airQualityLevels: Array.isArray(overview.left?.airQualityLevels)
                ? overview.left.airQualityLevels
                : fallback.left.airQualityLevels,
        },
        right: {
            ...fallback.right,
            ...(overview.right || {}),
            warnings: Array.isArray(overview.right?.warnings)
                ? overview.right.warnings
                : fallback.right.warnings,
            stationRanks: Array.isArray(overview.right?.stationRanks)
                ? overview.right.stationRanks
                : fallback.right.stationRanks,
        },
        bottom: {
            ...fallback.bottom,
            ...(overview.bottom || {}),
            hourlyPollutant: Array.isArray(overview.bottom?.hourlyPollutant)
                ? overview.bottom.hourlyPollutant
                : fallback.bottom.hourlyPollutant,
            monthlyPollutant: Array.isArray(overview.bottom?.monthlyPollutant)
                ? overview.bottom.monthlyPollutant
                : fallback.bottom.monthlyPollutant,
        },
        cities: Array.isArray(overview.cities) ? overview.cities : fallback.cities,
    };
};
