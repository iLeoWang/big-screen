const toNumber = (value, fallback = 0) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
};

const formatWarningTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "-";
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
};

const formatWarningRange = (startTime, endTime) => {
  const start = formatWarningTime(startTime);
  const end = formatWarningTime(endTime);
  if (start === "-" && end === "-") return "待更新";
  if (end === "-") return `${start} 起`;
  return `${start} - ${end}`;
};

const getStatusLabel = (status) => {
  switch (status) {
    case "active":
      return "生效中";
    case "published":
      return "已发布";
    case "resolved":
      return "已解除";
    default:
      return "未知状态";
  }
};

const normalizeWarnings = (raw) => {
  return (raw?.panels?.right?.warnings || []).map((item) => ({
    warningCode: item.warningCode || "",
    type: item.type || "空气污染预警",
    level: item.level,
    provinceCode: item.provinceCode || "",
    provinceName: item.provinceName || "",
    area: item.provinceName || "未知区域",
    title: item.title || `${item.provinceName || "区域"}空气污染预警`,
    description: item.description || "",
    status: item.status || "active",
    statusLabel: getStatusLabel(item.status),
    time: formatWarningTime(item.startTime),
    startTime: formatWarningTime(item.startTime),
    endTime: formatWarningTime(item.endTime),
    timeRange: formatWarningRange(item.startTime, item.endTime),
    mainPollutant: item.mainPollutant || "-",
    stationName: item.stationName || "",
  }));
};

const normalizeStationRanks = (raw) => {
  return (raw?.panels?.right?.stationRanks || []).map((item) => ({
    stationId: toNumber(item.stationId, 0),
    stationCode: item.stationCode || "",
    rank: toNumber(item.rank, 0),
    prevRank: item.prevRank == null ? null : toNumber(item.prevRank, 0),
    rankDelta: item.rankDelta == null ? null : toNumber(item.rankDelta, 0),
    aqiDelta: item.aqiDelta == null ? null : toNumber(item.aqiDelta, 0),
    name: item.name,
    provinceCode: item.provinceCode || "",
    provinceName: item.provinceName || "",
    areaName: item.areaName || "",
    observedAt: item.observedAt || "",
    aqi: toNumber(item.aqi, 0),
    level: item.level,
    mainPollutant: item.mainPollutant || "-",
    pm25: toNumber(item.pm25, 0),
    pm10: toNumber(item.pm10, 0),
    freshnessMinutes: toNumber(item.freshnessMinutes, 0),
    isStale: Boolean(item.isStale),
    trend: Array.isArray(item.trend) ? item.trend.map((value) => toNumber(value, 0)) : [],
  }));
};

export const toDashboardOverviewResponse = (raw) => ({
  code: raw?.scope?.code || "all",
  name: raw?.scope?.name || "全国",
  ts: toNumber(raw?.ts, Date.now()),
  left: {
    realtime: {
      pm25: toNumber(raw?.panels?.left?.realtime?.pm25, 0),
      pm10: toNumber(raw?.panels?.left?.realtime?.pm10, 0),
      no2: toNumber(raw?.panels?.left?.realtime?.no2, 0),
      so2: toNumber(raw?.panels?.left?.realtime?.so2, 0),
      co: toNumber(raw?.panels?.left?.realtime?.co, 0),
      o3: toNumber(raw?.panels?.left?.realtime?.o3, 0),
    },
    airQualityLevels: raw?.panels?.left?.airQualityLevels || [],
  },
  right: {
    warnings: normalizeWarnings(raw),
    stationRanks: normalizeStationRanks(raw),
  },
  bottom: {
    hourlyPollutant: raw?.panels?.bottom?.hourlyPollutant || [],
    monthlyPollutant: raw?.panels?.bottom?.monthlyPollutant || [],
  },
  cities: raw?.panels?.middle?.cities || [],
});

