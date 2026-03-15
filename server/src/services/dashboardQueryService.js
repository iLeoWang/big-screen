import { query } from "../db.js";
import {
  AIR_QUALITY_LEVELS,
  getAirQualityLevel,
  getWarningLevelByAqi,
  isPollutedAqi,
} from "../utils/airQuality.js";

const STATION_LATEST_LOOKBACK_MINUTES = 30;
const STATION_PREVIOUS_LOOKBACK_MINUTES = 120;
const STATION_STALE_THRESHOLD_MINUTES = 10;
const STATION_TREND_POINTS = 6;
const STATION_RANK_LIMIT = 60;

const pad = (value) => String(value).padStart(2, "0");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeScope = async (scopeTypeInput, scopeCodeInput) => {
  const scopeType = typeof scopeTypeInput === "string" ? scopeTypeInput.trim() : "national";
  const scopeCode = typeof scopeCodeInput === "string" ? scopeCodeInput.trim() : "all";

  if (!scopeType || scopeType === "national") {
    return {
      type: "national",
      code: "all",
      name: "全国",
    };
  }

  if (scopeType !== "province") {
    throw createHttpError(400, `不支持的 scopeType: ${scopeType}`);
  }

  const provinceCode = scopeCode || "all";
  if (provinceCode === "all") {
    return {
      type: "national",
      code: "all",
      name: "全国",
    };
  }

  const rows = await query(
    `
      SELECT code, name
      FROM provinces
      WHERE code = ?
      LIMIT 1
    `,
    [provinceCode]
  );

  if (!rows[0]) {
    throw createHttpError(404, `未找到省份: ${provinceCode}`);
  }

  return {
    type: "province",
    code: rows[0].code,
    name: rows[0].name,
  };
};

const getLatestProvinceRealtimeRows = async () => {
  const rows = await query(
    `
      SELECT
        r.province_code,
        p.name AS province_name,
        p.longitude,
        p.latitude,
        r.observed_at,
        r.pm25,
        r.pm10,
        r.no2,
        r.so2,
        r.co,
        r.o3,
        r.aqi,
        r.level
      FROM aq_province_realtime_snapshots r
      INNER JOIN (
        SELECT province_code, MAX(observed_at) AS observed_at
        FROM aq_province_realtime_snapshots
        GROUP BY province_code
      ) latest
        ON latest.province_code = r.province_code
       AND latest.observed_at = r.observed_at
      INNER JOIN provinces p ON p.code = r.province_code
      ORDER BY r.province_code ASC
    `
  );

  return rows.map((row) => ({
    code: row.province_code,
    name: row.province_name,
    longitude: Number(row.longitude),
    latitude: Number(row.latitude),
    observedAt: row.observed_at,
    pm25: Number(row.pm25),
    pm10: Number(row.pm10),
    no2: Number(row.no2),
    so2: Number(row.so2),
    co: Number(row.co),
    o3: Number(row.o3),
    aqi: Number(row.aqi),
    level: row.level,
    type: "province",
  }));
};

const getLatestStationRows = async (scope) => {
  const scopeParams = [];
  let whereClause = "";
  if (scope.type === "province") {
    whereClause = "WHERE d.province_code = ?";
    scopeParams.push(scope.code);
  }

  const latestRows = await query(
    `
      SELECT MAX(s.observed_at) AS latest_observed_at
      FROM aq_station_dim d
      INNER JOIN aq_station_realtime_snapshots s ON s.station_id = d.id
      ${whereClause}
    `,
    scopeParams
  );

  const latestObservedAt = latestRows[0]?.latest_observed_at;
  if (!latestObservedAt) return [];

  const latestWhereClause = whereClause
    ? whereClause.replace(/\bd\./g, "d1.")
    : "";
  const params = [latestObservedAt, latestObservedAt, ...scopeParams];

  const rows = await query(
    `
      SELECT
        s.station_id,
        d.station_code,
        d.station_name,
        d.area_name,
        d.province_code,
        p.name AS province_name,
        d.longitude,
        d.latitude,
        s.observed_at,
        s.aqi,
        s.level,
        s.main_pollutant,
        s.pm25,
        s.pm10,
        s.no2,
        s.so2,
        s.co,
        s.o3
      FROM aq_station_dim d
      INNER JOIN (
        SELECT
          s1.station_id,
          MAX(s1.observed_at) AS observed_at
        FROM aq_station_realtime_snapshots s1
        INNER JOIN aq_station_dim d1 ON d1.id = s1.station_id
        WHERE s1.observed_at BETWEEN DATE_SUB(?, INTERVAL ${STATION_LATEST_LOOKBACK_MINUTES} MINUTE) AND ?
          AND d1.status = 'active'
        ${latestWhereClause ? `AND ${latestWhereClause.replace(/^WHERE\s+/i, "")}` : ""}
        GROUP BY s1.station_id
      ) latest ON latest.station_id = d.id
      INNER JOIN aq_station_realtime_snapshots s
        ON s.station_id = latest.station_id
       AND s.observed_at = latest.observed_at
      INNER JOIN provinces p ON p.code = d.province_code
      WHERE d.status = 'active'
      ORDER BY s.aqi DESC, d.station_code ASC
    `,
    params
  );

  if (rows.length === 0) return [];

  const currentRowIds = rows.map((row) => Number(row.station_id)).filter(Boolean);
  const scopedStationIds = currentRowIds.length > 0 ? currentRowIds : [];

  const previousObservedRows = await query(
    `
      SELECT MAX(s.observed_at) AS previous_observed_at
      FROM aq_station_realtime_snapshots s
      INNER JOIN aq_station_dim d ON d.id = s.station_id
      ${whereClause || "WHERE 1 = 1"}
        AND d.status = 'active'
        AND s.observed_at < ?
        AND s.observed_at >= DATE_SUB(?, INTERVAL ${STATION_PREVIOUS_LOOKBACK_MINUTES} MINUTE)
    `,
    [...scopeParams, latestObservedAt, latestObservedAt]
  );

  const previousObservedAt = previousObservedRows[0]?.previous_observed_at || null;
  let previousRankMap = new Map();
  let previousAqiMap = new Map();

  if (previousObservedAt) {
    const previousParams = [previousObservedAt, previousObservedAt, ...scopeParams];
    const previousRows = await query(
      `
        SELECT
          s.station_id,
          s.aqi
        FROM aq_station_dim d
        INNER JOIN (
          SELECT
            s1.station_id,
            MAX(s1.observed_at) AS observed_at
          FROM aq_station_realtime_snapshots s1
          INNER JOIN aq_station_dim d1 ON d1.id = s1.station_id
          WHERE s1.observed_at BETWEEN DATE_SUB(?, INTERVAL ${STATION_LATEST_LOOKBACK_MINUTES} MINUTE) AND ?
            AND d1.status = 'active'
          ${latestWhereClause ? `AND ${latestWhereClause.replace(/^WHERE\s+/i, "")}` : ""}
          GROUP BY s1.station_id
        ) latest ON latest.station_id = d.id
        INNER JOIN aq_station_realtime_snapshots s
          ON s.station_id = latest.station_id
         AND s.observed_at = latest.observed_at
        WHERE d.status = 'active'
        ORDER BY s.aqi DESC, d.station_code ASC
      `,
      previousParams
    );

    previousRankMap = new Map(
      previousRows.map((row, index) => [Number(row.station_id), index + 1])
    );
    previousAqiMap = new Map(
      previousRows.map((row) => [Number(row.station_id), Number(row.aqi)])
    );
  }

  const trendRows =
    scopedStationIds.length === 0
      ? []
      : await query(
          `
      SELECT
        ranked.station_id,
        CONCAT(
          '[',
          GROUP_CONCAT(ranked.aqi ORDER BY ranked.observed_at ASC SEPARATOR ','),
          ']'
        ) AS trend
      FROM (
        SELECT
          s.station_id,
                s.observed_at,
                s.aqi,
                ROW_NUMBER() OVER (PARTITION BY s.station_id ORDER BY s.observed_at DESC) AS rn
              FROM aq_station_realtime_snapshots s
              WHERE s.station_id IN (${scopedStationIds.map(() => "?").join(", ")})
                AND s.observed_at BETWEEN DATE_SUB(?, INTERVAL 6 HOUR) AND ?
            ) ranked
            WHERE ranked.rn <= ${STATION_TREND_POINTS}
            GROUP BY ranked.station_id
          `,
          [...scopedStationIds, latestObservedAt, latestObservedAt]
        );

  const trendMap = new Map(
    trendRows.map((row) => {
      let trend = [];
      try {
        const parsed = typeof row.trend === "string" ? JSON.parse(row.trend) : row.trend;
        trend = Array.isArray(parsed) ? parsed.map((value) => Number(value)) : [];
      } catch {
        trend = [];
      }
      return [Number(row.station_id), trend];
    })
  );

  return rows.map((row) => ({
    stationId: Number(row.station_id),
    stationCode: row.station_code,
    name: row.station_name,
    areaName: row.area_name || "",
    provinceCode: row.province_code,
    provinceName: row.province_name,
    longitude: row.longitude == null ? null : Number(row.longitude),
    latitude: row.latitude == null ? null : Number(row.latitude),
    observedAt: row.observed_at,
    aqi: Number(row.aqi),
    level: row.level,
    mainPollutant: row.main_pollutant,
    pm25: Number(row.pm25),
    pm10: Number(row.pm10),
    no2: Number(row.no2),
    so2: Number(row.so2),
    co: Number(row.co),
    o3: Number(row.o3),
    freshnessMinutes: Math.max(
      0,
      Math.round((new Date(latestObservedAt).getTime() - new Date(row.observed_at).getTime()) / 60000)
    ),
    isStale:
      Math.round((new Date(latestObservedAt).getTime() - new Date(row.observed_at).getTime()) / 60000) >
      STATION_STALE_THRESHOLD_MINUTES,
    trend: trendMap.get(Number(row.station_id)) || [Number(row.aqi)],
  })).map((row, index) => {
    const prevRank = previousRankMap.get(row.stationId) ?? null;
    const prevAqi = previousAqiMap.get(row.stationId) ?? null;
    return {
      ...row,
      rank: index + 1,
      prevRank,
      rankDelta: prevRank == null ? null : prevRank - (index + 1),
      aqiDelta: prevAqi == null ? null : row.aqi - prevAqi,
    };
  });
};

const toWarningPollutant = (row) => {
  const pm25 = Number(row.pm25 || 0);
  const pm10 = Number(row.pm10 || 0);
  const o3 = Number(row.o3 || 0);
  if (pm25 >= pm10 && pm25 >= o3) return "PM2.5";
  if (pm10 >= pm25 && pm10 >= o3) return "PM10";
  return "O3";
};

const buildRealtimeWarnings = (scope, provinceRows, stationRows) => {
  const stationByProvince = new Map();
  for (const station of stationRows) {
    const current = stationByProvince.get(station.provinceCode);
    if (!current || station.aqi > current.aqi) {
      stationByProvince.set(station.provinceCode, station);
    }
  }

  return provinceRows
    .filter((row) => (scope.type === "province" ? row.code === scope.code : true))
    .map((row) => {
      const topStation = stationByProvince.get(row.code);
      const effectiveAqi = Math.max(Number(row.aqi || 0), Number(topStation?.aqi || 0));
      return { row, topStation, effectiveAqi };
    })
    .filter((item) => isPollutedAqi(item.effectiveAqi))
    .sort((a, b) => Number(b.effectiveAqi) - Number(a.effectiveAqi))
    .slice(0, 20)
    .map(({ row, topStation, effectiveAqi }) => {
      const startAt = row.observedAt ? new Date(row.observedAt) : new Date();
      const endAt = new Date(startAt.getTime() + 6 * 60 * 60 * 1000);
      const warningLevel = getWarningLevelByAqi(Number(effectiveAqi));
      const mainPollutant = topStation?.mainPollutant || toWarningPollutant(row);
      return {
        warningCode: `RT-W-${row.code}-${new Date(startAt).getTime()}`,
        type: "空气污染预警",
        level: warningLevel,
        title: `${row.name}污染过程预警`,
        description: `${row.name}当前AQI约${effectiveAqi}，主导污染物为${mainPollutant}，建议关注短时污染波动。`,
        mainPollutant,
        startTime: startAt,
        endTime: endAt,
        status: "active",
        stationId: topStation?.stationId ?? null,
        stationName: topStation?.name || null,
        provinceCode: row.code,
        provinceName: row.name,
      };
    });
};

const getWarnings = async (scope, provinceRows, stationRows) => {
  const realtimeWarnings = buildRealtimeWarnings(scope, provinceRows, stationRows);
  if (realtimeWarnings.length === 0) return [];

  const params = [];
  let whereClause =
    "WHERE w.status IN ('active', 'published') AND NOW() BETWEEN w.start_time AND w.end_time";
  if (scope.type === "province") {
    whereClause += " AND w.province_code = ?";
    params.push(scope.code);
  }

  const rows = await query(
    `
      SELECT
        w.warning_code,
        w.warning_type,
        w.title,
        w.description,
        w.main_pollutant,
        w.start_time,
        w.end_time,
        w.status,
        w.station_id,
        w.province_code,
        s.station_name
      FROM aq_warning_events w
      LEFT JOIN aq_station_dim s ON s.id = w.station_id
      ${whereClause}
    `,
    params
  );

  const persistedByProvince = new Map(
    rows.map((row) => [
      row.province_code,
      {
        warningCode: row.warning_code,
        type: row.warning_type,
        title: row.title,
        description: row.description,
        mainPollutant: row.main_pollutant,
        startTime: row.start_time,
        endTime: row.end_time,
        status: row.status,
        stationId: row.station_id == null ? null : Number(row.station_id),
        stationName: row.station_name || null,
      },
    ])
  );

  return realtimeWarnings.map((warning) => {
    const persisted = persistedByProvince.get(warning.provinceCode);
    if (!persisted) return warning;
    return {
      ...warning,
      warningCode: persisted.warningCode || warning.warningCode,
      type: persisted.type || warning.type,
      title: persisted.title || warning.title,
      description: persisted.description || warning.description,
      mainPollutant: persisted.mainPollutant || warning.mainPollutant,
      startTime: persisted.startTime || warning.startTime,
      endTime: persisted.endTime || warning.endTime,
      status: persisted.status || warning.status,
      stationId: persisted.stationId ?? warning.stationId,
      stationName: persisted.stationName || warning.stationName,
    };
  });
};

const getHourly = async (scope) => {
  const scopeType = scope.type === "province" ? "province" : "national";
  const rows = await query(
    `
      SELECT
        stat_hour,
        pm25,
        pm10,
        no2,
        so2,
        co,
        o3,
        aqi
      FROM aq_pollutant_hourly
      WHERE scope_type = ?
        AND scope_code = ?
        AND stat_date = (
          SELECT MAX(stat_date)
          FROM aq_pollutant_hourly
          WHERE scope_type = ?
            AND scope_code = ?
        )
      ORDER BY stat_hour ASC
    `,
    [scopeType, scope.code, scopeType, scope.code]
  );

  const aggregateHourlyFromRealtime = async () => {
    if (scope.type === "province") {
      return query(
        `
          SELECT
            HOUR(s.observed_at) AS stat_hour,
            ROUND(AVG(s.pm25), 1) AS pm25,
            ROUND(AVG(s.pm10), 1) AS pm10,
            ROUND(AVG(s.no2), 1) AS no2,
            ROUND(AVG(s.so2), 1) AS so2,
            ROUND(AVG(s.co), 2) AS co,
            ROUND(AVG(s.o3), 1) AS o3,
            ROUND(AVG(s.aqi), 0) AS aqi
          FROM aq_station_realtime_snapshots s
          INNER JOIN aq_station_dim d ON d.id = s.station_id
          WHERE d.province_code = ?
            AND s.observed_at BETWEEN DATE_SUB(
              (
                SELECT MAX(s2.observed_at)
                FROM aq_station_realtime_snapshots s2
                INNER JOIN aq_station_dim d2 ON d2.id = s2.station_id
                WHERE d2.province_code = ?
              ),
              INTERVAL 24 HOUR
            ) AND (
              SELECT MAX(s3.observed_at)
              FROM aq_station_realtime_snapshots s3
              INNER JOIN aq_station_dim d3 ON d3.id = s3.station_id
              WHERE d3.province_code = ?
            )
          GROUP BY HOUR(s.observed_at)
          ORDER BY stat_hour ASC
        `,
        [scope.code, scope.code, scope.code]
      );
    }

    return query(
      `
        SELECT
          HOUR(r.observed_at) AS stat_hour,
          ROUND(AVG(r.pm25), 1) AS pm25,
          ROUND(AVG(r.pm10), 1) AS pm10,
          ROUND(AVG(r.no2), 1) AS no2,
          ROUND(AVG(r.so2), 1) AS so2,
          ROUND(AVG(r.co), 2) AS co,
          ROUND(AVG(r.o3), 1) AS o3,
          ROUND(AVG(r.aqi), 0) AS aqi
        FROM aq_province_realtime_snapshots r
        WHERE r.observed_at BETWEEN DATE_SUB(
          (SELECT MAX(observed_at) FROM aq_province_realtime_snapshots),
          INTERVAL 24 HOUR
        ) AND (
          SELECT MAX(observed_at) FROM aq_province_realtime_snapshots
        )
        GROUP BY HOUR(r.observed_at)
        ORDER BY stat_hour ASC
      `
    );
  };

  const isInvalidHourlyRows = (hourlyRows) => {
    if (!Array.isArray(hourlyRows) || hourlyRows.length < 24) return true;
    const nonZeroCount = hourlyRows.filter((row) => Number(row.aqi || 0) > 0).length;
    return nonZeroCount < 8;
  };

  const sourceRows = isInvalidHourlyRows(rows) ? await aggregateHourlyFromRealtime() : rows;

  const byHour = new Map(
    sourceRows.map((row) => [
      Number(row.stat_hour),
      {
        hour: pad(row.stat_hour),
        pm25: Number(row.pm25),
        pm10: Number(row.pm10),
        no2: Number(row.no2),
        so2: Number(row.so2),
        co: Number(row.co),
        o3: Number(row.o3),
        aqi: Number(row.aqi),
      },
    ])
  );

  const filled = [];
  let lastKnown = null;
  for (let hour = 0; hour < 24; hour += 1) {
    const current = byHour.get(hour);
    if (current) {
      lastKnown = current;
      filled.push(current);
      continue;
    }

    const fallback = lastKnown || {
      pm25: 0,
      pm10: 0,
      no2: 0,
      so2: 0,
      co: 0,
      o3: 0,
      aqi: 0,
    };
    filled.push({
      hour: pad(hour),
      pm25: Number(fallback.pm25),
      pm10: Number(fallback.pm10),
      no2: Number(fallback.no2),
      so2: Number(fallback.so2),
      co: Number(fallback.co),
      o3: Number(fallback.o3),
      aqi: Number(fallback.aqi),
    });
  }

  return filled;
};

const getMonthly = async (scope) => {
  const scopeType = scope.type === "province" ? "province" : "national";
  const rows = await query(
    `
      SELECT
        stat_month,
        current_pm25,
        previous_pm25,
        current_pm10,
        previous_pm10
      FROM aq_pollutant_monthly
      WHERE scope_type = ?
        AND scope_code = ?
        AND stat_year = (
          SELECT MAX(stat_year)
          FROM aq_pollutant_monthly
          WHERE scope_type = ?
            AND scope_code = ?
        )
      ORDER BY stat_month ASC
    `,
    [scopeType, scope.code, scopeType, scope.code]
  );

  return rows.map((row) => ({
    month: `${row.stat_month}月`,
    currentPM25: Number(row.current_pm25),
    previousPM25: Number(row.previous_pm25),
    currentPM10: Number(row.current_pm10),
    previousPM10: Number(row.previous_pm10),
  }));
};

const getStationTrendBundle = async (stationCode, scopeCodeInput) => {
  const safeStationCode = typeof stationCode === "string" ? stationCode.trim() : "";
  if (!safeStationCode) {
    throw createHttpError(400, "stationCode 不能为空");
  }

  const stationScopeCode =
    typeof scopeCodeInput === "string" && scopeCodeInput.trim() ? scopeCodeInput.trim() : null;

  const stationRows = await query(
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
      WHERE d.station_code = ?
        ${stationScopeCode ? "AND d.province_code = ?" : ""}
      LIMIT 1
    `,
    stationScopeCode ? [safeStationCode, stationScopeCode] : [safeStationCode]
  );

  const station = stationRows[0];
  if (!station) {
    throw createHttpError(404, `未找到站点: ${safeStationCode}`);
  }

  const latestObservedRows = await query(
    `
      SELECT MAX(observed_at) AS latest_observed_at
      FROM aq_station_realtime_snapshots
      WHERE station_id = ?
    `,
    [station.id]
  );

  const latestObservedAt = latestObservedRows[0]?.latest_observed_at;
  if (!latestObservedAt) {
    return {
      station: {
        stationCode: station.station_code,
        stationName: station.station_name,
        provinceCode: station.province_code,
        provinceName: station.province_name,
        areaName: station.area_name || "",
        longitude: station.longitude == null ? null : Number(station.longitude),
        latitude: station.latitude == null ? null : Number(station.latitude),
      },
      hourly: [],
      dailyComparison: [],
    };
  }

  const hourlyRows = await query(
    `
      SELECT
        DATE_FORMAT(bucket, '%m-%d %H:00') AS hour,
        pm25,
        pm10,
        no2,
        o3
      FROM (
        SELECT
          bucket,
          ROUND(AVG(pm25), 1) AS pm25,
          ROUND(AVG(pm10), 1) AS pm10,
          ROUND(AVG(no2), 1) AS no2,
          ROUND(AVG(o3), 1) AS o3
        FROM (
          SELECT
            STR_TO_DATE(DATE_FORMAT(observed_at, '%Y-%m-%d %H:00:00'), '%Y-%m-%d %H:%i:%s') AS bucket,
            pm25,
            pm10,
            no2,
            o3
          FROM aq_station_realtime_snapshots
          WHERE station_id = ?
            AND observed_at BETWEEN DATE_SUB(?, INTERVAL 24 HOUR) AND ?
        ) raw_hourly
        GROUP BY bucket
        ORDER BY bucket DESC
        LIMIT 24
      ) latest_hourly
      ORDER BY bucket ASC
    `,
    [station.id, latestObservedAt, latestObservedAt]
  );

  const dailyRows = await query(
    `
      SELECT
        DATE_FORMAT(day_bucket, '%m-%d') AS month,
        current_pm25 AS currentPM25,
        COALESCE(LAG(current_pm25) OVER (ORDER BY day_bucket), current_pm25) AS previousPM25,
        current_pm10 AS currentPM10,
        COALESCE(LAG(current_pm10) OVER (ORDER BY day_bucket), current_pm10) AS previousPM10
      FROM (
        SELECT
          day_bucket,
          ROUND(AVG(pm25), 1) AS current_pm25,
          ROUND(AVG(pm10), 1) AS current_pm10
        FROM (
          SELECT
            DATE(observed_at) AS day_bucket,
            pm25,
            pm10
          FROM aq_station_realtime_snapshots
          WHERE station_id = ?
            AND observed_at BETWEEN DATE_SUB(?, INTERVAL 14 DAY) AND ?
        ) raw_daily
        GROUP BY day_bucket
        ORDER BY day_bucket DESC
        LIMIT 7
      ) latest_daily
      ORDER BY day_bucket ASC
    `,
    [station.id, latestObservedAt, latestObservedAt]
  );

  return {
    station: {
      stationCode: station.station_code,
      stationName: station.station_name,
      provinceCode: station.province_code,
      provinceName: station.province_name,
      areaName: station.area_name || "",
      longitude: station.longitude == null ? null : Number(station.longitude),
      latitude: station.latitude == null ? null : Number(station.latitude),
      observedAt: latestObservedAt,
    },
    hourly: hourlyRows.map((row) => ({
      hour: row.hour,
      pm25: Number(row.pm25),
      pm10: Number(row.pm10),
      no2: Number(row.no2),
      o3: Number(row.o3),
    })),
    dailyComparison: dailyRows.map((row) => ({
      month: row.month,
      currentPM25: Number(row.currentPM25),
      previousPM25: Number(row.previousPM25),
      currentPM10: Number(row.currentPM10),
      previousPM10: Number(row.previousPM10),
    })),
  };
};

const calcAverage = (rows, field, digits = 1) => {
  if (rows.length === 0) return 0;
  const sum = rows.reduce((acc, item) => acc + Number(item[field] || 0), 0);
  return Number((sum / rows.length).toFixed(digits));
};

const buildAirQualityLevels = (rows, field = "level") => {
  const levelMap = AIR_QUALITY_LEVELS.reduce((acc, level) => {
    acc[level] = 0;
    return acc;
  }, {});

  rows.forEach((row) => {
    if (levelMap[row[field]] != null) {
      levelMap[row[field]] += 1;
    }
  });

  return AIR_QUALITY_LEVELS.map((level) => ({
    name: level,
    value: levelMap[level],
  }));
};

const buildLeftRealtime = (scope, provinceRows, stationRows) => {
  if (scope.type === "province") {
    const topStation = stationRows
      .filter((item) => item.provinceCode === scope.code)
      .sort((a, b) => Number(b.aqi) - Number(a.aqi))[0];
    if (topStation) {
      return {
        pm25: topStation.pm25,
        pm10: topStation.pm10,
        no2: topStation.no2,
        so2: topStation.so2,
        co: topStation.co,
        o3: topStation.o3,
        aqi: topStation.aqi,
        level: topStation.level,
        observedAt: topStation.observedAt,
      };
    }

    const target = provinceRows.find((item) => item.code === scope.code);
    if (target) {
      return {
        pm25: target.pm25,
        pm10: target.pm10,
        no2: target.no2,
        so2: target.so2,
        co: target.co,
        o3: target.o3,
        aqi: target.aqi,
        level: target.level,
        observedAt: target.observedAt,
      };
    }

    // Last resort: keep API available with a deterministic empty-state payload.
    return {
      pm25: 0,
      pm10: 0,
      no2: 0,
      so2: 0,
      co: 0,
      o3: 0,
      aqi: 0,
      level: getAirQualityLevel(0),
      observedAt: null,
    };
  }

  const aqi = Math.round(calcAverage(provinceRows, "aqi", 0));
  return {
    pm25: calcAverage(provinceRows, "pm25", 1),
    pm10: calcAverage(provinceRows, "pm10", 1),
    no2: calcAverage(provinceRows, "no2", 1),
    so2: calcAverage(provinceRows, "so2", 1),
    co: calcAverage(provinceRows, "co", 2),
    o3: calcAverage(provinceRows, "o3", 1),
    aqi,
    level: getAirQualityLevel(aqi),
    observedAt: stationRows[0]?.observedAt || null,
  };
};

const buildMiddleStats = (cities) => {
  const highRiskCount = cities.filter((item) => item.aqi > 100).length;
  const riskPercentage = cities.length === 0 ? 0 : Number(((highRiskCount / cities.length) * 100).toFixed(1));
  return {
    totalRiskCount: highRiskCount,
    riskPercentage,
  };
};

const buildGauge = (aqi) => ({
  value: Math.max(0, Math.min(100, Math.round((aqi / 300) * 100))),
});

export const getDashboardOverview = async (scopeType, scopeCode) => {
  const scope = await normalizeScope(scopeType, scopeCode);
  const [provinceRows, stationRows, hourly, monthly] = await Promise.all([
    getLatestProvinceRealtimeRows(),
    getLatestStationRows(scope),
    getHourly(scope),
    getMonthly(scope),
  ]);
  const warnings = await getWarnings(scope, provinceRows, stationRows);

  const leftRealtime = buildLeftRealtime(scope, provinceRows, stationRows);
  const airQualityLevels =
    scope.type === "province"
      ? buildAirQualityLevels(stationRows, "level")
      : buildAirQualityLevels(provinceRows, "level");

  const provinceCityRows = provinceRows.map((item) => ({
    code: item.code,
    name: item.name,
    longitude: item.longitude,
    latitude: item.latitude,
    pm25: item.pm25,
    pm10: item.pm10,
    no2: item.no2,
    so2: item.so2,
    co: item.co,
    o3: item.o3,
    aqi: item.aqi,
    level: item.level,
    type: "province",
  }));

  if (scope.type === "province") {
    const targetIndex = provinceCityRows.findIndex((item) => item.code === scope.code);
    if (targetIndex >= 0) {
      provinceCityRows[targetIndex] = {
        ...provinceCityRows[targetIndex],
        pm25: leftRealtime.pm25,
        pm10: leftRealtime.pm10,
        no2: leftRealtime.no2,
        so2: leftRealtime.so2,
        co: leftRealtime.co,
        o3: leftRealtime.o3,
        aqi: leftRealtime.aqi,
        level: leftRealtime.level,
      };
    }
  }

  const stationCityRows = stationRows.map((item) => ({
    code: item.stationCode,
    name: item.name,
    longitude: item.longitude,
    latitude: item.latitude,
    pm25: item.pm25,
    pm10: item.pm10,
    no2: item.no2,
    so2: item.so2,
    co: item.co,
    o3: item.o3,
    aqi: item.aqi,
    level: item.level,
    type: "station",
  }));

  const cities = scope.type === "province" ? [...provinceCityRows, ...stationCityRows] : provinceCityRows;

  const stationRanks = stationRows.slice(0, STATION_RANK_LIMIT).map((item) => ({
    stationId: item.stationId,
    stationCode: item.stationCode,
    rank: item.rank,
    prevRank: item.prevRank,
    rankDelta: item.rankDelta,
    aqiDelta: item.aqiDelta,
    name: item.name,
    areaName: item.areaName,
    aqi: item.aqi,
    level: item.level,
    mainPollutant: item.mainPollutant,
    pm25: item.pm25,
    pm10: item.pm10,
    provinceCode: item.provinceCode,
    provinceName: item.provinceName,
    observedAt: item.observedAt,
    freshnessMinutes: item.freshnessMinutes,
    isStale: item.isStale,
    trend: item.trend,
  }));

  const aqi = leftRealtime.aqi;
  const level = leftRealtime.level;

  return {
    version: "3.0",
    ts: Date.now(),
    scope: {
      type: scope.type,
      code: scope.code,
      name: scope.name,
    },
    summary: {
      aqi,
      level,
      pollutant: {
        pm25: leftRealtime.pm25,
        pm10: leftRealtime.pm10,
        no2: leftRealtime.no2,
        so2: leftRealtime.so2,
        co: leftRealtime.co,
        o3: leftRealtime.o3,
      },
      stationCount: stationRows.length,
      warningCount: warnings.length,
    },
    panels: {
      left: {
        realtime: leftRealtime,
        airQualityLevels,
      },
      right: {
        warnings,
        stationRanks,
      },
      bottom: {
        hourlyPollutant: hourly,
        monthlyPollutant: monthly,
      },
      middle: {
        cities,
        stats: buildMiddleStats(cities),
        gauge: buildGauge(aqi),
      },
    },
  };
};

export { getStationTrendBundle };
