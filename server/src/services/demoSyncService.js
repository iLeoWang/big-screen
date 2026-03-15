import { query } from "../db.js";
import { getAirQualityLevel } from "../utils/airQuality.js";

const DEFAULT_SYNC_INTERVAL_MS = Number(process.env.DEMO_SYNC_INTERVAL_MS || 10_000);
const DEFAULT_START_DELAY_MS = Number(process.env.DEMO_SYNC_START_DELAY_MS || 2_000);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const round = (value, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const PROVINCE_BASELINE_AQI = {
  "460000": 58, // 海南
  "530000": 72, // 云南
  "450000": 74, // 广西
  "440000": 78, // 广东
  "350000": 76, // 福建
};

const getProvinceBaselineAqi = (provinceCode) => {
  if (PROVINCE_BASELINE_AQI[provinceCode]) {
    return PROVINCE_BASELINE_AQI[provinceCode];
  }
  const prefix = Number(String(provinceCode || "").slice(0, 2));
  return 68 + ((prefix * 7) % 32);
};

export const createNextObservedAt = (latestObservedAt, now = new Date()) => {
  const latestTime = new Date(latestObservedAt).getTime();
  const nextTime = Math.max(latestTime + 1000, now.getTime());
  return new Date(nextTime);
};

const createDelta = (seed, scale) => {
  const normalized = Math.sin(seed) * 0.5 + Math.cos(seed / 3) * 0.35 + Math.sin(seed / 7) * 0.15;
  return normalized * scale;
};

export const createNextStationRecord = (station, observedAt) => {
  const baseSeed = Number(station.stationId || 0) * 97 + observedAt.getTime() / 60_000;
  const baselineAqi = getProvinceBaselineAqi(station.provinceCode);
  const previousAqi = Number.isFinite(Number(station.aqi)) ? Number(station.aqi) : baselineAqi;
  const aqi = clamp(
    Math.round(previousAqi * 0.88 + baselineAqi * 0.12 + createDelta(baseSeed + 71, 7)),
    25,
    185
  );

  const targetPm25 = aqi * 0.88;
  const targetPm10 = aqi * 1.22;
  const targetNo2 = aqi * 0.42;
  const targetSo2 = aqi * 0.16;
  const targetCo = aqi * 0.015;
  const targetO3 = aqi * 0.9;

  const pm25 = clamp(round(Number(station.pm25) * 0.7 + targetPm25 * 0.3 + createDelta(baseSeed, 3.5), 1), 6, 240);
  const pm10 = clamp(round(Number(station.pm10) * 0.7 + targetPm10 * 0.3 + createDelta(baseSeed + 11, 4.2), 1), 12, 320);
  const no2 = clamp(round(Number(station.no2) * 0.72 + targetNo2 * 0.28 + createDelta(baseSeed + 23, 2.8), 1), 4, 130);
  const so2 = clamp(round(Number(station.so2) * 0.72 + targetSo2 * 0.28 + createDelta(baseSeed + 37, 1.5), 1), 1, 55);
  const co = clamp(round(Number(station.co) * 0.72 + targetCo * 0.28 + createDelta(baseSeed + 41, 0.07), 2), 0.15, 4.6);
  const o3 = clamp(round(Number(station.o3) * 0.72 + targetO3 * 0.28 + createDelta(baseSeed + 53, 3.8), 1), 10, 210);

  return {
    stationId: station.stationId,
    provinceCode: station.provinceCode,
    stationCode: station.stationCode,
    stationName: station.stationName,
    areaName: station.areaName,
    longitude: station.longitude,
    latitude: station.latitude,
    observedAt: observedAt.toISOString(),
    pm25,
    pm10,
    no2,
    so2,
    co,
    o3,
    aqi,
    level: getAirQualityLevel(aqi),
    mainPollutant: pm25 >= pm10 ? "PM2.5" : "PM10",
  };
};

export const buildProvinceRecords = (stationRecords, observedAt) => {
  const grouped = new Map();

  for (const record of stationRecords) {
    const current = grouped.get(record.provinceCode) || [];
    current.push(record);
    grouped.set(record.provinceCode, current);
  }

  return Array.from(grouped.entries()).map(([provinceCode, records]) => {
    const average = (key, digits = 1) =>
      round(records.reduce((sum, item) => sum + Number(item[key] || 0), 0) / records.length, digits);
    const aqi = round(records.reduce((sum, item) => sum + Number(item.aqi || 0), 0) / records.length, 0);

    return {
      provinceCode,
      observedAt: observedAt.toISOString(),
      pm25: average("pm25", 1),
      pm10: average("pm10", 1),
      no2: average("no2", 1),
      so2: average("so2", 1),
      co: average("co", 2),
      o3: average("o3", 1),
      aqi,
      level: getAirQualityLevel(aqi),
    };
  });
};

const getLatestStationSnapshots = async () => {
  return query(
    `
      SELECT
        d.id AS station_id,
        d.station_code,
        d.station_name,
        d.province_code,
        d.area_name,
        d.longitude,
        d.latitude,
        s.observed_at,
        s.aqi,
        s.pm25,
        s.pm10,
        s.no2,
        s.so2,
        s.co,
        s.o3
      FROM aq_station_dim d
      INNER JOIN (
        SELECT station_id, MAX(observed_at) AS observed_at
        FROM aq_station_realtime_snapshots
        GROUP BY station_id
      ) latest
        ON latest.station_id = d.id
      INNER JOIN aq_station_realtime_snapshots s
        ON s.station_id = latest.station_id
       AND s.observed_at = latest.observed_at
      WHERE d.status = 'active'
      ORDER BY d.station_code ASC
    `
  );
};

export const runDemoSyncOnce = async () => {
  const latestStations = await getLatestStationSnapshots();
  if (latestStations.length === 0) {
    return { stationCount: 0, provinceCount: 0, observedAt: null };
  }

  const latestObservedAt = latestStations[0].observed_at;
  const observedAt = createNextObservedAt(latestObservedAt);
  const stationRecords = latestStations.map((station) =>
    createNextStationRecord(
      {
        stationId: Number(station.station_id),
        stationCode: station.station_code,
        stationName: station.station_name,
        provinceCode: station.province_code,
        areaName: station.area_name,
        longitude: station.longitude == null ? null : Number(station.longitude),
        latitude: station.latitude == null ? null : Number(station.latitude),
        pm25: Number(station.pm25),
        pm10: Number(station.pm10),
        no2: Number(station.no2),
        so2: Number(station.so2),
        co: Number(station.co),
        o3: Number(station.o3),
        aqi: Number(station.aqi),
      },
      observedAt
    )
  );
  const provinceRecords = buildProvinceRecords(stationRecords, observedAt);
  for (const record of stationRecords) {
    if (!record.stationId) continue;

    await query(
      `
        INSERT INTO aq_station_realtime_snapshots (
          station_id, observed_at, aqi, level, main_pollutant, pm25, pm10, no2, so2, co, o3
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          aqi = VALUES(aqi),
          level = VALUES(level),
          main_pollutant = VALUES(main_pollutant),
          pm25 = VALUES(pm25),
          pm10 = VALUES(pm10),
          no2 = VALUES(no2),
          so2 = VALUES(so2),
          co = VALUES(co),
          o3 = VALUES(o3)
      `,
      [
        record.stationId,
        observedAt,
        record.aqi,
        record.level,
        record.mainPollutant,
        record.pm25,
        record.pm10,
        record.no2,
        record.so2,
        record.co,
        record.o3,
      ]
    );
  }

  for (const record of provinceRecords) {
    await query(
      `
        INSERT INTO aq_province_realtime_snapshots (
          province_code, observed_at, pm25, pm10, no2, so2, co, o3, aqi, level, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          pm25 = VALUES(pm25),
          pm10 = VALUES(pm10),
          no2 = VALUES(no2),
          so2 = VALUES(so2),
          co = VALUES(co),
          o3 = VALUES(o3),
          aqi = VALUES(aqi),
          level = VALUES(level),
          source = VALUES(source)
      `,
      [
        record.provinceCode,
        observedAt,
        record.pm25,
        record.pm10,
        record.no2,
        record.so2,
        record.co,
        record.o3,
        record.aqi,
        record.level,
        "demo-sync",
      ]
    );
  }

  return {
    stationCount: stationRecords.length,
    provinceCount: provinceRecords.length,
    observedAt: observedAt.toISOString(),
  };
};

export const startDemoSync = ({
  intervalMs = DEFAULT_SYNC_INTERVAL_MS,
  startDelayMs = DEFAULT_START_DELAY_MS,
} = {}) => {
  let timer = null;
  let bootstrapTimer = null;
  let stopped = false;
  let running = false;

  const tick = async () => {
    if (stopped || running) return;
    running = true;
    try {
      const result = await runDemoSyncOnce();
      if (result.stationCount > 0) {
        console.log(
          `[demo-sync] synced ${result.stationCount} stations / ${result.provinceCount} provinces at ${result.observedAt}`
        );
      }
    } catch (error) {
      console.error("[demo-sync] sync failed:", error);
    } finally {
      running = false;
    }
  };

  bootstrapTimer = setTimeout(() => {
    void tick();
  }, startDelayMs);

  timer = setInterval(() => {
    void tick();
  }, intervalMs);

  return () => {
    stopped = true;
    if (bootstrapTimer) {
      clearTimeout(bootstrapTimer);
      bootstrapTimer = null;
    }
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
};
