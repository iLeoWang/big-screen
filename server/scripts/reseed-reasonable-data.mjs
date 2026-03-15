import { pool } from "../src/db.js";

const STATION_SEEDS = [
  { seq: 1, suffix: "中心站", area: "中心城区", lng: 0, lat: 0, bias: 10 },
  { seq: 2, suffix: "东部站", area: "东部片区", lng: 0.24, lat: 0.12, bias: 6 },
  { seq: 3, suffix: "西部站", area: "西部片区", lng: -0.22, lat: -0.11, bias: 4 },
  { seq: 4, suffix: "南部站", area: "南部片区", lng: 0.06, lat: -0.2, bias: 8 },
  { seq: 5, suffix: "北部站", area: "北部片区", lng: -0.04, lat: 0.2, bias: 2 },
  { seq: 6, suffix: "高新区站", area: "高新区", lng: 0.16, lat: 0.05, bias: 12 },
  { seq: 7, suffix: "产业园站", area: "产业园区", lng: 0.28, lat: -0.08, bias: 14 },
  { seq: 8, suffix: "城郊站", area: "城郊结合部", lng: -0.18, lat: -0.06, bias: 0 },
  { seq: 9, suffix: "大学城站", area: "大学城", lng: 0.12, lat: 0.18, bias: -4 },
  { seq: 10, suffix: "湿地公园站", area: "生态湿地区", lng: -0.12, lat: 0.16, bias: -8 },
  { seq: 11, suffix: "交通枢纽站", area: "交通枢纽区", lng: 0.08, lat: -0.14, bias: 16 },
  { seq: 12, suffix: "背景站", area: "生态背景区", lng: -0.28, lat: 0.24, bias: -12 },
];

const HOURLY_WINDOW = 24;
const DAILY_WINDOW = 14;
const MONTHLY_PROFILE_PM25 = [68, 61, 54, 46, 39, 31, 27, 26, 30, 38, 52, 64];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round1 = (value) => Math.round(value * 10) / 10;
const round2 = (value) => Math.round(value * 100) / 100;
const chunk = (items, size) => {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

const aqiToLevel = (aqi) => {
  if (aqi <= 50) return "优";
  if (aqi <= 100) return "良";
  if (aqi <= 150) return "轻度污染";
  if (aqi <= 200) return "中度污染";
  if (aqi <= 300) return "重度污染";
  return "严重污染";
};

const warningLevelFromAqi = (aqi) => {
  if (aqi > 300) return "严重";
  if (aqi > 200) return "重度";
  if (aqi > 150) return "中度";
  return "轻度";
};

const formatDateTime = (date) => date.toISOString().slice(0, 19).replace("T", " ");
const formatDate = (date) => date.toISOString().slice(0, 10);

const baseProvinceAqi = (provinceCode) => {
  const overrides = {
    "460000": 56, // 海南
    "530000": 70, // 云南
    "450000": 74, // 广西
    "440000": 76, // 广东
    "350000": 74, // 福建
  };
  if (overrides[provinceCode]) return overrides[provinceCode];
  const prefix = Number(provinceCode.slice(0, 2));
  return 56 + ((prefix * 7) % 36);
};

const provinceFactor = (provinceCode) => {
  const prefix = Number(provinceCode.slice(0, 2));
  return 0.84 + (prefix % 8) * 0.045;
};

const noise = (...values) => {
  const seed = values.reduce((acc, value, index) => acc + Number(value || 0) * (index + 3) * 17, 0);
  return (seed % 11) - 5;
};

const buildMetrics = ({ aqi, seedBias, hour, stationId, provinceCode }) => {
  const rushBoost = hour >= 7 && hour <= 9 ? 8 : hour >= 17 && hour <= 20 ? 10 : 0;
  const ozoneBoost = hour >= 12 && hour <= 16 ? 16 : 0;
  const pm25 = clamp(round1(aqi * 0.46 + 7 + seedBias * 0.4 + noise(stationId, hour, 1) * 0.8), 8, 180);
  const pm10 = clamp(round1(pm25 * 1.48 + 9 + noise(stationId, hour, 2)), 18, 260);
  const no2 = clamp(round1(14 + aqi * 0.19 + rushBoost + noise(stationId, hour, 3) * 0.7), 6, 110);
  const so2 = clamp(round1(5 + aqi * 0.06 + noise(stationId, hour, 4) * 0.4), 2, 42);
  const co = clamp(round2(0.3 + aqi * 0.0045 + noise(stationId, hour, 5) * 0.01), 0.2, 3.2);
  const o3 = clamp(round1(38 + aqi * 0.31 + ozoneBoost + noise(stationId, hour, 6)), 18, 230);

  let mainPollutant = "PM2.5";
  if (o3 > pm25 * 1.38 && hour >= 11 && hour <= 16) {
    mainPollutant = "O3";
  } else if (pm10 > pm25 * 1.52 && aqi >= 120) {
    mainPollutant = "PM10";
  } else if (no2 >= 72 && (hour <= 9 || hour >= 18)) {
    mainPollutant = "NO2";
  }

  return {
    provinceCode,
    aqi,
    level: aqiToLevel(aqi),
    mainPollutant,
    pm25,
    pm10,
    no2,
    so2,
    co,
    o3,
  };
};

const insertMany = async (conn, sqlPrefix, rows, columnCount, chunkSize = 500, sqlSuffix = "") => {
  for (const rowsChunk of chunk(rows, chunkSize)) {
    const placeholders = rowsChunk.map(() => `(${Array(columnCount).fill("?").join(",")})`).join(",");
    const values = rowsChunk.flat();
    await conn.query(`${sqlPrefix} VALUES ${placeholders}${sqlSuffix}`, values);
  }
};

const main = async () => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [provinces] = await conn.query(
      `
        SELECT code, name, longitude, latitude
        FROM provinces
        ORDER BY code ASC
      `
    );

    const stationUpserts = [];
    for (const province of provinces) {
      for (const seed of STATION_SEEDS) {
        stationUpserts.push([
          `${province.code}-S${String(seed.seq).padStart(3, "0")}`,
          province.code,
          `${province.name}${seed.suffix}`,
          `${province.name}${seed.area}`,
          round1(Number(province.longitude) + seed.lng),
          round1(Number(province.latitude) + seed.lat),
          "active",
        ]);
      }
    }

    await insertMany(
      conn,
      `
        INSERT INTO aq_station_dim (
          station_code, province_code, station_name, area_name, longitude, latitude, status
        )
      `,
      stationUpserts,
      7,
      500,
      `
        ON DUPLICATE KEY UPDATE
          province_code = VALUES(province_code),
          station_name = VALUES(station_name),
          area_name = VALUES(area_name),
          longitude = VALUES(longitude),
          latitude = VALUES(latitude),
          status = VALUES(status),
          updated_at = CURRENT_TIMESTAMP
      `
    );

    await conn.query(`
      UPDATE aq_station_dim
      SET status = 'inactive'
      WHERE station_code NOT REGEXP '-S(001|002|003|004|005|006|007|008|009|010|011|012)$'
    `);

    const [stations] = await conn.query(
      `
        SELECT
          d.id,
          d.station_code,
          d.station_name,
          d.province_code,
          d.area_name,
          d.longitude,
          d.latitude,
          p.name AS province_name
        FROM aq_station_dim d
        INNER JOIN provinces p ON p.code = d.province_code
        WHERE d.status = 'active'
        ORDER BY d.province_code, d.station_code
      `
    );

    await conn.query("DELETE FROM aq_station_realtime_snapshots");
    await conn.query("DELETE FROM aq_province_realtime_snapshots");
    await conn.query("DELETE FROM aq_warning_events");
    await conn.query("DELETE FROM aq_pollutant_hourly");
    await conn.query("DELETE FROM aq_pollutant_monthly");

    const now = new Date();
    now.setMinutes(0, 0, 0);

    const stationSnapshots = [];
    const latestByProvince = new Map();
    const provinceHourlyMap = new Map();

    for (const station of stations) {
      const seq = Number(String(station.station_code).slice(-3));
      const seed = STATION_SEEDS.find((item) => item.seq === seq);
      const seedBias = seed?.bias ?? 0;
      const provinceBase = baseProvinceAqi(station.province_code);

      for (let hourOffset = HOURLY_WINDOW - 1; hourOffset >= 0; hourOffset -= 1) {
        const observedAt = new Date(now);
        observedAt.setHours(now.getHours() - hourOffset);
        const hour = observedAt.getHours();
        const diurnal =
          Math.sin(((hour - 7) / 24) * Math.PI * 2) * 8 +
          (hour >= 18 && hour <= 21 ? 11 : 0) +
          (hour >= 7 && hour <= 9 ? 7 : 0);
        const computedAqi = clamp(
          Math.round(provinceBase + seedBias + diurnal + noise(station.id, hourOffset, seq)),
          28,
          212
        );
        const metrics = buildMetrics({
          aqi: computedAqi,
          seedBias,
          hour,
          stationId: station.id,
          provinceCode: station.province_code,
        });

        stationSnapshots.push([
          station.id,
          formatDateTime(observedAt),
          metrics.aqi,
          metrics.level,
          metrics.mainPollutant,
          metrics.pm25,
          metrics.pm10,
          metrics.no2,
          metrics.so2,
          metrics.co,
          metrics.o3,
        ]);

        const hourKey = `${station.province_code}|${formatDateTime(observedAt)}`;
        const provinceHour = provinceHourlyMap.get(hourKey) || {
          provinceCode: station.province_code,
          observedAt: formatDateTime(observedAt),
          rows: [],
        };
        provinceHour.rows.push(metrics);
        provinceHourlyMap.set(hourKey, provinceHour);

        if (hourOffset === 0) {
          const provinceLatest = latestByProvince.get(station.province_code) || [];
          provinceLatest.push({
            stationId: station.id,
            stationCode: station.station_code,
            stationName: station.station_name,
            provinceCode: station.province_code,
            provinceName: station.province_name,
            areaName: station.area_name,
            ...metrics,
          });
          latestByProvince.set(station.province_code, provinceLatest);
        }
      }

      for (let dayOffset = DAILY_WINDOW + 1; dayOffset >= 2; dayOffset -= 1) {
        const observedAt = new Date(now);
        observedAt.setDate(now.getDate() - dayOffset);
        observedAt.setHours(12, 0, 0, 0);
        const seasonal = Math.sin(((observedAt.getMonth() + 1) / 12) * Math.PI * 2) * 6;
        const trend = dayOffset * -0.5;
        const computedAqi = clamp(
          Math.round(provinceBase + seedBias + seasonal + trend + noise(station.id, dayOffset, seq)),
          26,
          205
        );
        const metrics = buildMetrics({
          aqi: computedAqi,
          seedBias,
          hour: 12,
          stationId: station.id,
          provinceCode: station.province_code,
        });

        stationSnapshots.push([
          station.id,
          formatDateTime(observedAt),
          metrics.aqi,
          metrics.level,
          metrics.mainPollutant,
          metrics.pm25,
          metrics.pm10,
          metrics.no2,
          metrics.so2,
          metrics.co,
          metrics.o3,
        ]);
      }
    }

    await insertMany(
      conn,
      `
        INSERT INTO aq_station_realtime_snapshots (
          station_id, observed_at, aqi, level, main_pollutant, pm25, pm10, no2, so2, co, o3
        )
      `,
      stationSnapshots,
      11,
      400
    );

    const provinceRealtimeRows = [];
    const warningRows = [];

    for (const province of provinces) {
      const latestRows = latestByProvince.get(province.code) || [];
      if (latestRows.length === 0) {
        continue;
      }

      const avg = (field, digits = 1) => {
        const sum = latestRows.reduce((acc, item) => acc + Number(item[field] || 0), 0);
        const result = sum / latestRows.length;
        return digits === 2 ? round2(result) : round1(result);
      };

      const aqi = Math.round(avg("aqi", 0));
      provinceRealtimeRows.push([
        province.code,
        formatDateTime(now),
        avg("pm25"),
        avg("pm10"),
        avg("no2"),
        avg("so2"),
        avg("co", 2),
        avg("o3"),
        aqi,
        aqiToLevel(aqi),
        "reseed-reasonable",
      ]);

      if (aqi > 100) {
        const topStation = [...latestRows].sort((a, b) => b.aqi - a.aqi)[0];
        const warningLevel = warningLevelFromAqi(aqi);
        const leadPollutant = topStation.mainPollutant || "PM2.5";
        warningRows.push([
          `AUTO-${province.code}-${formatDate(now).replace(/-/g, "")}`,
          province.code,
          topStation.stationId,
          "空气污染预警",
          warningLevel,
          `${province.name}空气质量关注提示`,
          `${province.name}${topStation.areaName || "重点区域"}污染水平偏高，${leadPollutant} 为当前主导污染物，建议持续关注扩散条件变化。`,
          leadPollutant,
          formatDateTime(new Date(now.getTime() - 2 * 60 * 60 * 1000)),
          formatDateTime(new Date(now.getTime() + 10 * 60 * 60 * 1000)),
          "active",
        ]);
      }
    }

    await insertMany(
      conn,
      `
        INSERT INTO aq_province_realtime_snapshots (
          province_code, observed_at, pm25, pm10, no2, so2, co, o3, aqi, level, source
        )
      `,
      provinceRealtimeRows,
      11
    );

    if (warningRows.length > 0) {
      await insertMany(
        conn,
        `
          INSERT INTO aq_warning_events (
            warning_code, province_code, station_id, warning_type, warning_level, title,
            description, main_pollutant, start_time, end_time, status
          )
        `,
        warningRows,
        11
      );
    }

    const provinceHourlySeries = new Map();
    for (const value of provinceHourlyMap.values()) {
      const avg = (field, digits = 1) => {
        const sum = value.rows.reduce((acc, item) => acc + Number(item[field] || 0), 0);
        const result = sum / value.rows.length;
        return digits === 2 ? round2(result) : round1(result);
      };
      const date = new Date(value.observedAt.replace(" ", "T"));
      const aqi = Math.round(avg("aqi", 0));
      const row = [
        "province",
        value.provinceCode,
        formatDate(date),
        date.getHours(),
        avg("pm25"),
        avg("pm10"),
        avg("no2"),
        avg("so2"),
        avg("co", 2),
        avg("o3"),
        aqi,
      ];
      provinceHourlySeries.set(`${value.provinceCode}|${date.getHours()}`, row);
    }

    const nationalHourlyRows = [];
    for (let hourOffset = HOURLY_WINDOW - 1; hourOffset >= 0; hourOffset -= 1) {
      const observedAt = new Date(now);
      observedAt.setHours(now.getHours() - hourOffset);
      const hourRows = [...provinceHourlySeries.values()].filter(
        (item) => item[2] === formatDate(observedAt) && item[3] === observedAt.getHours()
      );
      const avgByIndex = (index, digits = 1) => {
        const sum = hourRows.reduce((acc, item) => acc + Number(item[index] || 0), 0);
        const result = sum / Math.max(hourRows.length, 1);
        return digits === 2 ? round2(result) : round1(result);
      };
      nationalHourlyRows.push([
        "national",
        "all",
        formatDate(observedAt),
        observedAt.getHours(),
        avgByIndex(4),
        avgByIndex(5),
        avgByIndex(6),
        avgByIndex(7),
        avgByIndex(8, 2),
        avgByIndex(9),
        Math.round(avgByIndex(10, 0)),
      ]);
    }

    await insertMany(
      conn,
      `
        INSERT INTO aq_pollutant_hourly (
          scope_type, scope_code, stat_date, stat_hour, pm25, pm10, no2, so2, co, o3, aqi
        )
      `,
      [...provinceHourlySeries.values(), ...nationalHourlyRows],
      11,
      500
    );

    const provinceMonthlyRows = [];
    for (const province of provinces) {
      const factor = provinceFactor(province.code);
      for (let month = 1; month <= 12; month += 1) {
        const currentPm25 = round1(MONTHLY_PROFILE_PM25[month - 1] * factor);
        const previousPm25 = round1(currentPm25 * (0.94 + ((Number(province.code.slice(0, 2)) + month) % 7) * 0.02));
        const currentPm10 = round1(currentPm25 * 1.52);
        const previousPm10 = round1(previousPm25 * 1.5);
        provinceMonthlyRows.push([
          "province",
          province.code,
          now.getFullYear(),
          month,
          currentPm25,
          previousPm25,
          currentPm10,
          previousPm10,
        ]);
      }
    }

    const nationalMonthlyRows = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const rows = provinceMonthlyRows.filter((item) => item[3] === month);
      const avgByIndex = (fieldIndex) =>
        round1(rows.reduce((acc, item) => acc + Number(item[fieldIndex] || 0), 0) / rows.length);
      return [
        "national",
        "all",
        now.getFullYear(),
        month,
        avgByIndex(4),
        avgByIndex(5),
        avgByIndex(6),
        avgByIndex(7),
      ];
    });

    await insertMany(
      conn,
      `
        INSERT INTO aq_pollutant_monthly (
          scope_type, scope_code, stat_year, stat_month, current_pm25, previous_pm25, current_pm10, previous_pm10
        )
      `,
      [...provinceMonthlyRows, ...nationalMonthlyRows],
      8,
      500
    );

    await conn.commit();

    console.log(
      JSON.stringify(
        {
          provinces: provinces.length,
          activeStations: stations.length,
          stationSnapshots: stationSnapshots.length,
          provinceRealtime: provinceRealtimeRows.length,
          warnings: warningRows.length,
          hourlyRows: provinceHourlySeries.size + nationalHourlyRows.length,
          monthlyRows: provinceMonthlyRows.length + nationalMonthlyRows.length,
        },
        null,
        2
      )
    );
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error("reseed-reasonable-data failed:", error);
  process.exit(1);
});
