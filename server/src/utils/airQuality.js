export const AIR_QUALITY_LEVELS = [
  "优",
  "良",
  "轻度污染",
  "中度污染",
  "重度污染",
  "严重污染",
];

export const AIR_QUALITY_LEVEL_COLORS = {
  优: "#52C785",
  良: "#9DD852",
  轻度污染: "#FFD166",
  中度污染: "#FF9A6B",
  重度污染: "#FF6B8E",
  严重污染: "#E85D75",
};

export const getAirQualityLevel = (aqi) => {
  if (aqi <= 50) return "优";
  if (aqi <= 100) return "良";
  if (aqi <= 150) return "轻度污染";
  if (aqi <= 200) return "中度污染";
  if (aqi <= 300) return "重度污染";
  return "严重污染";
};

export const getWarningLevelByAqi = (aqi) => {
  if (aqi > 300) return "严重";
  if (aqi > 200) return "重度";
  if (aqi > 150) return "中度";
  return "轻度";
};

export const isPollutedAqi = (aqi) => Number(aqi) > 100;
