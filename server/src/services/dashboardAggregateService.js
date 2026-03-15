import { pool, query } from "../db.js";
import { getDashboardOverview } from "./dashboardQueryService.js";
import { toDashboardOverviewResponse } from "./dashboardPresenter.js";

const AGG_REFRESH_INTERVAL_MS = Math.max(
  15_000,
  Number(process.env.DASHBOARD_AGG_REFRESH_INTERVAL_MS || 60_000)
);

const OVERVIEW_DELETE_SQL = `
  DELETE FROM agg_scope_overview
  WHERE scope_type = ? AND scope_code = ?
`;

const CHILD_TABLES = [
  "agg_scope_air_levels",
  "agg_scope_station_ranks",
  "agg_scope_warnings",
  "agg_scope_hourly",
  "agg_scope_monthly",
  "agg_scope_cities",
];

const HOURS_24 = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MONTHS_12 = Array.from({ length: 12 }, (_, index) => `${index + 1}月`);

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const coerceScope = (scopeTypeInput, scopeCodeInput) => {
  const scopeTypeRaw =
    typeof scopeTypeInput === "string" ? scopeTypeInput.trim() : "national";
  if (!scopeTypeRaw || scopeTypeRaw === "national") {
    return { scopeType: "national", scopeCode: "all" };
  }

  if (scopeTypeRaw !== "province") {
    throw createHttpError(400, `不支持的 scopeType: ${scopeTypeRaw}`);
  }

  const scopeCodeRaw = typeof scopeCodeInput === "string" ? scopeCodeInput.trim() : "all";
  if (!scopeCodeRaw || scopeCodeRaw === "all") {
    return { scopeType: "national", scopeCode: "all" };
  }
  return { scopeType: "province", scopeCode: scopeCodeRaw };
};

const ensureProvinceExists = async (scopeCode) => {
  const rows = await query(
    `
      SELECT code
      FROM provinces
      WHERE code = ?
      LIMIT 1
    `,
    [scopeCode]
  );
  if (!rows[0]) {
    throw createHttpError(404, `未找到省份: ${scopeCode}`);
  }
};

const ensureAggregateTables = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS agg_scope_overview (
      scope_type ENUM('national', 'province') NOT NULL,
      scope_code VARCHAR(16) NOT NULL,
      scope_name VARCHAR(128) NOT NULL,
      snapshot_version BIGINT NOT NULL,
      updated_at DATETIME NOT NULL,
      summary_aqi INT NOT NULL,
      summary_level VARCHAR(16) NOT NULL,
      realtime_pm25 DECIMAL(8,2) NOT NULL,
      realtime_pm10 DECIMAL(8,2) NOT NULL,
      realtime_no2 DECIMAL(8,2) NOT NULL,
      realtime_so2 DECIMAL(8,2) NOT NULL,
      realtime_co DECIMAL(8,3) NOT NULL,
      realtime_o3 DECIMAL(8,2) NOT NULL,
      station_count INT NOT NULL DEFAULT 0,
      warning_count INT NOT NULL DEFAULT 0,
      PRIMARY KEY (scope_type, scope_code),
      KEY idx_overview_updated_at (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS agg_scope_air_levels (
      scope_type ENUM('national', 'province') NOT NULL,
      scope_code VARCHAR(16) NOT NULL,
      level_name VARCHAR(32) NOT NULL,
      level_value INT NOT NULL DEFAULT 0,
      level_color VARCHAR(32) NULL,
      snapshot_version BIGINT NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (scope_type, scope_code, level_name),
      KEY idx_air_levels_scope (scope_type, scope_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS agg_scope_station_ranks (
      scope_type ENUM('national', 'province') NOT NULL,
      scope_code VARCHAR(16) NOT NULL,
      station_code VARCHAR(64) NOT NULL,
      station_id BIGINT NULL,
      rank_no INT NOT NULL DEFAULT 0,
      prev_rank INT NULL,
      rank_delta INT NULL,
      aqi_delta INT NULL,
      station_name VARCHAR(128) NOT NULL,
      province_code VARCHAR(16) NULL,
      province_name VARCHAR(128) NULL,
      area_name VARCHAR(128) NULL,
      observed_at VARCHAR(48) NULL,
      aqi INT NOT NULL DEFAULT 0,
      level_name VARCHAR(32) NOT NULL,
      main_pollutant VARCHAR(32) NULL,
      pm25 DECIMAL(8,2) NULL,
      pm10 DECIMAL(8,2) NULL,
      freshness_minutes INT NULL,
      is_stale TINYINT(1) NOT NULL DEFAULT 0,
      trend_json TEXT NULL,
      snapshot_version BIGINT NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (scope_type, scope_code, station_code),
      KEY idx_station_rank_scope_rank (scope_type, scope_code, rank_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS agg_scope_warnings (
      scope_type ENUM('national', 'province') NOT NULL,
      scope_code VARCHAR(16) NOT NULL,
      warning_code VARCHAR(128) NOT NULL,
      warning_type VARCHAR(64) NOT NULL,
      warning_level VARCHAR(16) NOT NULL,
      province_code VARCHAR(16) NULL,
      province_name VARCHAR(128) NULL,
      area_name VARCHAR(128) NULL,
      warning_title VARCHAR(256) NULL,
      description_text TEXT NULL,
      status_code VARCHAR(32) NULL,
      status_label VARCHAR(64) NULL,
      display_time VARCHAR(64) NULL,
      start_time_display VARCHAR(64) NULL,
      end_time_display VARCHAR(64) NULL,
      time_range_display VARCHAR(128) NULL,
      main_pollutant VARCHAR(32) NULL,
      station_name VARCHAR(128) NULL,
      snapshot_version BIGINT NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (scope_type, scope_code, warning_code),
      KEY idx_warnings_scope_level (scope_type, scope_code, warning_level)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS agg_scope_hourly (
      scope_type ENUM('national', 'province') NOT NULL,
      scope_code VARCHAR(16) NOT NULL,
      hour_key CHAR(2) NOT NULL,
      pm25 DECIMAL(8,2) NOT NULL DEFAULT 0,
      pm10 DECIMAL(8,2) NOT NULL DEFAULT 0,
      no2 DECIMAL(8,2) NOT NULL DEFAULT 0,
      so2 DECIMAL(8,2) NOT NULL DEFAULT 0,
      co DECIMAL(8,3) NOT NULL DEFAULT 0,
      o3 DECIMAL(8,2) NOT NULL DEFAULT 0,
      aqi INT NOT NULL DEFAULT 0,
      snapshot_version BIGINT NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (scope_type, scope_code, hour_key),
      KEY idx_hourly_scope (scope_type, scope_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS agg_scope_monthly (
      scope_type ENUM('national', 'province') NOT NULL,
      scope_code VARCHAR(16) NOT NULL,
      month_label VARCHAR(16) NOT NULL,
      current_pm25 DECIMAL(8,2) NOT NULL DEFAULT 0,
      previous_pm25 DECIMAL(8,2) NOT NULL DEFAULT 0,
      current_pm10 DECIMAL(8,2) NOT NULL DEFAULT 0,
      previous_pm10 DECIMAL(8,2) NOT NULL DEFAULT 0,
      snapshot_version BIGINT NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (scope_type, scope_code, month_label),
      KEY idx_monthly_scope (scope_type, scope_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS agg_scope_cities (
      scope_type ENUM('national', 'province') NOT NULL,
      scope_code VARCHAR(16) NOT NULL,
      item_type VARCHAR(32) NOT NULL,
      item_code VARCHAR(32) NOT NULL,
      item_name VARCHAR(128) NOT NULL,
      longitude DECIMAL(10,6) NULL,
      latitude DECIMAL(10,6) NULL,
      pm25 DECIMAL(8,2) NOT NULL DEFAULT 0,
      pm10 DECIMAL(8,2) NOT NULL DEFAULT 0,
      no2 DECIMAL(8,2) NOT NULL DEFAULT 0,
      so2 DECIMAL(8,2) NOT NULL DEFAULT 0,
      co DECIMAL(8,3) NOT NULL DEFAULT 0,
      o3 DECIMAL(8,2) NOT NULL DEFAULT 0,
      aqi INT NOT NULL DEFAULT 0,
      level_name VARCHAR(32) NOT NULL,
      snapshot_version BIGINT NOT NULL,
      updated_at DATETIME NOT NULL,
      PRIMARY KEY (scope_type, scope_code, item_type, item_code),
      KEY idx_cities_scope (scope_type, scope_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Backward-compatible schema upgrade for existing environments.
  await query(`
    ALTER TABLE agg_scope_station_ranks
    MODIFY COLUMN observed_at VARCHAR(128) NULL
  `);
};

const deleteScopeChildren = async (connection, scopeType, scopeCode) => {
  for (const tableName of CHILD_TABLES) {
    await connection.execute(
      `DELETE FROM ${tableName} WHERE scope_type = ? AND scope_code = ?`,
      [scopeType, scopeCode]
    );
  }
};

const writeScopeAggregate = async ({
  scopeType,
  scopeCode,
  scopeName,
  snapshotVersion,
  updatedAt,
  overview,
  summary,
  meta,
}) => {
  const formatDateTimeForSql = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 19).replace("T", " ");
  };

  const toSafeHour = (value) => {
    const raw = typeof value === "string" ? value.trim() : String(value ?? "");
    if (/^\d{2}$/.test(raw)) return raw;
    const asNumber = Number(raw);
    if (!Number.isFinite(asNumber)) return "00";
    const normalized = Math.min(23, Math.max(0, Math.floor(asNumber)));
    return String(normalized).padStart(2, "0");
  };

  const normalizeHourly = (input) => {
    const sourceRows = Array.isArray(input) ? input : [];
    const byHour = new Map();
    for (const row of sourceRows) {
      const hour = toSafeHour(row?.hour);
      byHour.set(hour, {
        hour,
        pm25: Number(row?.pm25 || 0),
        pm10: Number(row?.pm10 || 0),
        no2: Number(row?.no2 || 0),
        so2: Number(row?.so2 || 0),
        co: Number(row?.co || 0),
        o3: Number(row?.o3 || 0),
        aqi: Number(row?.aqi || 0),
      });
    }

    return HOURS_24.map((hour) => {
      const row = byHour.get(hour);
      return (
        row || {
          hour,
          pm25: 0,
          pm10: 0,
          no2: 0,
          so2: 0,
          co: 0,
          o3: 0,
          aqi: 0,
        }
      );
    });
  };

  const normalizeMonthly = (input) => {
    const sourceRows = Array.isArray(input) ? input : [];
    const byMonth = new Map();
    for (const row of sourceRows) {
      const monthMatch = String(row?.month || "").match(/\d{1,2}/);
      if (!monthMatch) continue;
      const monthNo = Math.min(12, Math.max(1, Number(monthMatch[0])));
      const month = `${monthNo}月`;
      byMonth.set(month, {
        month,
        currentPM25: Number(row?.currentPM25 || 0),
        previousPM25: Number(row?.previousPM25 || 0),
        currentPM10: Number(row?.currentPM10 || 0),
        previousPM10: Number(row?.previousPM10 || 0),
      });
    }

    return MONTHS_12.map((month) => {
      const row = byMonth.get(month);
      return (
        row || {
          month,
          currentPM25: 0,
          previousPM25: 0,
          currentPM10: 0,
          previousPM10: 0,
        }
      );
    });
  };

  const hourlyRows = normalizeHourly(overview.bottom?.hourlyPollutant);
  const monthlyRows = normalizeMonthly(overview.bottom?.monthlyPollutant);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.execute(OVERVIEW_DELETE_SQL, [scopeType, scopeCode]);
    await deleteScopeChildren(connection, scopeType, scopeCode);

    await connection.execute(
      `
        INSERT INTO agg_scope_overview (
          scope_type, scope_code, scope_name, snapshot_version, updated_at,
          summary_aqi, summary_level,
          realtime_pm25, realtime_pm10, realtime_no2, realtime_so2, realtime_co, realtime_o3,
          station_count, warning_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        scopeType,
        scopeCode,
        scopeName,
        snapshotVersion,
        updatedAt,
        Number(summary.aqi || 0),
        String(summary.level || "优"),
        Number(overview.left?.realtime?.pm25 || 0),
        Number(overview.left?.realtime?.pm10 || 0),
        Number(overview.left?.realtime?.no2 || 0),
        Number(overview.left?.realtime?.so2 || 0),
        Number(overview.left?.realtime?.co || 0),
        Number(overview.left?.realtime?.o3 || 0),
        Number(meta.stationCount || 0),
        Number(meta.warningCount || 0),
      ]
    );

    if (Array.isArray(overview.left?.airQualityLevels)) {
      for (const item of overview.left.airQualityLevels) {
        await connection.execute(
          `
            INSERT INTO agg_scope_air_levels (
              scope_type, scope_code, level_name, level_value, level_color, snapshot_version, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            scopeType,
            scopeCode,
            String(item.name || ""),
            Number(item.value || 0),
            item.color ? String(item.color) : null,
            snapshotVersion,
            updatedAt,
          ]
        );
      }
    }

    if (Array.isArray(overview.right?.stationRanks)) {
      for (const item of overview.right.stationRanks) {
        await connection.execute(
          `
            INSERT INTO agg_scope_station_ranks (
              scope_type, scope_code, station_code, station_id, rank_no, prev_rank,
              rank_delta, aqi_delta, station_name, province_code, province_name, area_name,
              observed_at, aqi, level_name, main_pollutant, pm25, pm10, freshness_minutes,
              is_stale, trend_json, snapshot_version, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            scopeType,
            scopeCode,
            String(item.stationCode || ""),
            item.stationId == null ? null : Number(item.stationId),
            Number(item.rank || 0),
            item.prevRank == null ? null : Number(item.prevRank),
            item.rankDelta == null ? null : Number(item.rankDelta),
            item.aqiDelta == null ? null : Number(item.aqiDelta),
            String(item.name || ""),
            item.provinceCode ? String(item.provinceCode) : null,
            item.provinceName ? String(item.provinceName) : null,
            item.areaName ? String(item.areaName) : null,
            formatDateTimeForSql(item.observedAt),
            Number(item.aqi || 0),
            String(item.level || "优"),
            item.mainPollutant ? String(item.mainPollutant) : null,
            item.pm25 == null ? null : Number(item.pm25),
            item.pm10 == null ? null : Number(item.pm10),
            item.freshnessMinutes == null ? null : Number(item.freshnessMinutes),
            item.isStale ? 1 : 0,
            JSON.stringify(Array.isArray(item.trend) ? item.trend : []),
            snapshotVersion,
            updatedAt,
          ]
        );
      }
    }

    if (Array.isArray(overview.right?.warnings)) {
      for (const item of overview.right.warnings) {
        await connection.execute(
          `
            INSERT INTO agg_scope_warnings (
              scope_type, scope_code, warning_code, warning_type, warning_level, province_code,
              province_name, area_name, warning_title, description_text, status_code, status_label,
              display_time, start_time_display, end_time_display, time_range_display,
              main_pollutant, station_name, snapshot_version, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            scopeType,
            scopeCode,
            String(item.warningCode || ""),
            String(item.type || "空气污染预警"),
            String(item.level || "轻度"),
            item.provinceCode ? String(item.provinceCode) : null,
            item.provinceName ? String(item.provinceName) : null,
            item.area ? String(item.area) : null,
            item.title ? String(item.title) : null,
            item.description ? String(item.description) : null,
            item.status ? String(item.status) : null,
            item.statusLabel ? String(item.statusLabel) : null,
            item.time ? String(item.time) : null,
            item.startTime ? String(item.startTime) : null,
            item.endTime ? String(item.endTime) : null,
            item.timeRange ? String(item.timeRange) : null,
            item.mainPollutant ? String(item.mainPollutant) : null,
            item.stationName ? String(item.stationName) : null,
            snapshotVersion,
            updatedAt,
          ]
        );
      }
    }

    if (hourlyRows.length > 0) {
      for (const item of hourlyRows) {
        await connection.execute(
          `
            INSERT INTO agg_scope_hourly (
              scope_type, scope_code, hour_key, pm25, pm10, no2, so2, co, o3, aqi, snapshot_version, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            scopeType,
            scopeCode,
            String(item.hour || "00"),
            Number(item.pm25 || 0),
            Number(item.pm10 || 0),
            Number(item.no2 || 0),
            Number(item.so2 || 0),
            Number(item.co || 0),
            Number(item.o3 || 0),
            Number(item.aqi || 0),
            snapshotVersion,
            updatedAt,
          ]
        );
      }
    }

    if (monthlyRows.length > 0) {
      for (const item of monthlyRows) {
        await connection.execute(
          `
            INSERT INTO agg_scope_monthly (
              scope_type, scope_code, month_label, current_pm25, previous_pm25,
              current_pm10, previous_pm10, snapshot_version, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            scopeType,
            scopeCode,
            String(item.month || ""),
            Number(item.currentPM25 || 0),
            Number(item.previousPM25 || 0),
            Number(item.currentPM10 || 0),
            Number(item.previousPM10 || 0),
            snapshotVersion,
            updatedAt,
          ]
        );
      }
    }

    if (Array.isArray(overview.cities)) {
      for (const item of overview.cities) {
        await connection.execute(
          `
            INSERT INTO agg_scope_cities (
              scope_type, scope_code, item_type, item_code, item_name, longitude, latitude,
              pm25, pm10, no2, so2, co, o3, aqi, level_name, snapshot_version, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            scopeType,
            scopeCode,
            String(item.type || "province"),
            String(item.code || ""),
            String(item.name || ""),
            item.longitude == null ? null : Number(item.longitude),
            item.latitude == null ? null : Number(item.latitude),
            Number(item.pm25 || 0),
            Number(item.pm10 || 0),
            Number(item.no2 || 0),
            Number(item.so2 || 0),
            Number(item.co || 0),
            Number(item.o3 || 0),
            Number(item.aqi || 0),
            String(item.level || "优"),
            snapshotVersion,
            updatedAt,
          ]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const rebuildScopeAggregate = async (scopeTypeInput, scopeCodeInput) => {
  const { scopeType, scopeCode } = coerceScope(scopeTypeInput, scopeCodeInput);
  if (scopeType === "province") {
    await ensureProvinceExists(scopeCode);
  }
  const raw = await getDashboardOverview(scopeType, scopeCode);
  const overview = toDashboardOverviewResponse(raw);
  const snapshotVersion = Number(raw.ts || Date.now());
  const updatedAt = new Date(snapshotVersion);

  await writeScopeAggregate({
    scopeType,
    scopeCode,
    scopeName: String(raw?.scope?.name || overview.name || "全国"),
    snapshotVersion,
    updatedAt,
    overview,
    summary: {
      aqi: Number(raw?.summary?.aqi || 0),
      level: String(raw?.summary?.level || "优"),
    },
    meta: {
      stationCount: Array.isArray(overview.right?.stationRanks)
        ? overview.right.stationRanks.length
        : Number(raw?.summary?.stationCount || 0),
      warningCount: Array.isArray(overview.right?.warnings)
        ? overview.right.warnings.length
        : Number(raw?.summary?.warningCount || 0),
    },
  });
};

export const rebuildAllAggregates = async () => {
  await ensureAggregateTables();

  await rebuildScopeAggregate("national", "all");
  const provinces = await query(`SELECT code FROM provinces ORDER BY code ASC`);
  for (const row of provinces) {
    await rebuildScopeAggregate("province", row.code);
  }

  return {
    scopeCount: provinces.length + 1,
  };
};

const parseTrend = (value) => {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map((item) => Number(item || 0)) : [];
  } catch {
    return [];
  }
};

export const getAggregateBootstrap = async (scopeTypeInput, scopeCodeInput) => {
  const { scopeType, scopeCode } = coerceScope(scopeTypeInput, scopeCodeInput);
  if (scopeType === "province") {
    await ensureProvinceExists(scopeCode);
  }

  const overviewRows = await query(
    `
      SELECT *
      FROM agg_scope_overview
      WHERE scope_type = ?
        AND scope_code = ?
      LIMIT 1
    `,
    [scopeType, scopeCode]
  );
  const overviewRow = overviewRows[0];
  if (!overviewRow) {
    throw Object.assign(new Error("聚合快照未就绪，请稍后重试"), { statusCode: 503 });
  }

  const [airLevels, stationRanks, warnings, hourly, monthly, cities, mapProvinceRows] =
    await Promise.all([
    query(
      `
        SELECT level_name, level_value, level_color
        FROM agg_scope_air_levels
        WHERE scope_type = ? AND scope_code = ?
        ORDER BY FIELD(level_name, '优', '良', '轻度污染', '中度污染', '重度污染', '严重污染')
      `,
      [scopeType, scopeCode]
    ),
    query(
      `
        SELECT *
        FROM agg_scope_station_ranks
        WHERE scope_type = ? AND scope_code = ?
        ORDER BY rank_no ASC
      `,
      [scopeType, scopeCode]
    ),
    query(
      `
        SELECT *
        FROM agg_scope_warnings
        WHERE scope_type = ? AND scope_code = ?
        ORDER BY warning_level DESC, warning_code ASC
      `,
      [scopeType, scopeCode]
    ),
    query(
      `
        SELECT *
        FROM agg_scope_hourly
        WHERE scope_type = ? AND scope_code = ?
        ORDER BY hour_key ASC
      `,
      [scopeType, scopeCode]
    ),
    query(
      `
        SELECT *
        FROM agg_scope_monthly
        WHERE scope_type = ? AND scope_code = ?
        ORDER BY CAST(REPLACE(month_label, '月', '') AS UNSIGNED) ASC
      `,
      [scopeType, scopeCode]
    ),
    query(
      `
        SELECT *
        FROM agg_scope_cities
        WHERE scope_type = ? AND scope_code = ?
        ORDER BY item_type ASC, item_code ASC
      `,
      [scopeType, scopeCode]
    ),
    query(
      `
        SELECT
          o.scope_code AS province_code,
          p.name AS province_name,
          p.longitude,
          p.latitude,
          o.summary_aqi,
          o.summary_level,
          o.realtime_pm25,
          o.realtime_pm10,
          o.realtime_no2,
          o.realtime_so2,
          o.realtime_co,
          o.realtime_o3
        FROM agg_scope_overview o
        INNER JOIN provinces p ON p.code = o.scope_code
        WHERE o.scope_type = 'province'
        ORDER BY o.scope_code ASC
      `
    ),
  ]);

  const mapProvinces = (mapProvinceRows.length > 0
    ? mapProvinceRows.map((item) => ({
        code: item.province_code,
        name: item.province_name,
        longitude: item.longitude == null ? null : Number(item.longitude),
        latitude: item.latitude == null ? null : Number(item.latitude),
        pm25: Number(item.realtime_pm25 || 0),
        pm10: Number(item.realtime_pm10 || 0),
        no2: Number(item.realtime_no2 || 0),
        so2: Number(item.realtime_so2 || 0),
        co: Number(item.realtime_co || 0),
        o3: Number(item.realtime_o3 || 0),
        aqi: Number(item.summary_aqi || 0),
        level: item.summary_level || "优",
        type: "province",
      }))
    : cities.filter((item) => item.item_type === "province")
  ).map((item) => ({
    code: item.code || item.item_code,
    name: item.name || item.item_name,
    longitude: item.longitude == null ? null : Number(item.longitude),
    latitude: item.latitude == null ? null : Number(item.latitude),
    pm25: Number(item.pm25 || 0),
    pm10: Number(item.pm10 || 0),
    no2: Number(item.no2 || 0),
    so2: Number(item.so2 || 0),
    co: Number(item.co || 0),
    o3: Number(item.o3 || 0),
    aqi: Number(item.aqi || 0),
    level: item.level || item.level_name || "优",
    type: "province",
  }));

  return {
    scopeType,
    scopeCode,
    scopeName: overviewRow.scope_name,
    snapshotVersion: Number(overviewRow.snapshot_version),
    updatedAt: overviewRow.updated_at,
    data: {
      overview: {
        code: overviewRow.scope_code,
        name: overviewRow.scope_name,
        ts: Number(overviewRow.snapshot_version),
        left: {
          realtime: {
            pm25: Number(overviewRow.realtime_pm25),
            pm10: Number(overviewRow.realtime_pm10),
            no2: Number(overviewRow.realtime_no2),
            so2: Number(overviewRow.realtime_so2),
            co: Number(overviewRow.realtime_co),
            o3: Number(overviewRow.realtime_o3),
          },
          airQualityLevels: airLevels.map((item) => ({
            name: item.level_name,
            value: Number(item.level_value || 0),
            color: item.level_color || undefined,
          })),
        },
        right: {
          warnings: warnings.map((item) => ({
            warningCode: item.warning_code || "",
            type: item.warning_type || "空气污染预警",
            level: item.warning_level,
            provinceCode: item.province_code || "",
            provinceName: item.province_name || "",
            area: item.area_name || "",
            title: item.warning_title || "",
            description: item.description_text || "",
            status: item.status_code || "active",
            statusLabel: item.status_label || "",
            time: item.display_time || "",
            startTime: item.start_time_display || "",
            endTime: item.end_time_display || "",
            timeRange: item.time_range_display || "",
            mainPollutant: item.main_pollutant || "-",
            stationName: item.station_name || "",
          })),
          stationRanks: stationRanks.map((item) => ({
            stationId: item.station_id == null ? undefined : Number(item.station_id),
            stationCode: item.station_code || "",
            rank: Number(item.rank_no || 0),
            prevRank: item.prev_rank == null ? null : Number(item.prev_rank),
            rankDelta: item.rank_delta == null ? null : Number(item.rank_delta),
            aqiDelta: item.aqi_delta == null ? null : Number(item.aqi_delta),
            name: item.station_name || "",
            provinceCode: item.province_code || "",
            provinceName: item.province_name || "",
            areaName: item.area_name || "",
            observedAt: item.observed_at || "",
            aqi: Number(item.aqi || 0),
            level: item.level_name || "优",
            mainPollutant: item.main_pollutant || "-",
            pm25: Number(item.pm25 || 0),
            pm10: Number(item.pm10 || 0),
            freshnessMinutes:
              item.freshness_minutes == null ? undefined : Number(item.freshness_minutes),
            isStale: Boolean(item.is_stale),
            trend: parseTrend(item.trend_json),
          })),
        },
        bottom: {
          hourlyPollutant: hourly.map((item) => ({
            hour: item.hour_key,
            pm25: Number(item.pm25 || 0),
            pm10: Number(item.pm10 || 0),
            no2: Number(item.no2 || 0),
            so2: Number(item.so2 || 0),
            co: Number(item.co || 0),
            o3: Number(item.o3 || 0),
            aqi: Number(item.aqi || 0),
          })),
          monthlyPollutant: monthly.map((item) => ({
            month: item.month_label,
            currentPM25: Number(item.current_pm25 || 0),
            previousPM25: Number(item.previous_pm25 || 0),
            currentPM10: Number(item.current_pm10 || 0),
            previousPM10: Number(item.previous_pm10 || 0),
          })),
        },
        cities: cities.map((item) => ({
          code: item.item_code,
          name: item.item_name,
          longitude: item.longitude == null ? null : Number(item.longitude),
          latitude: item.latitude == null ? null : Number(item.latitude),
          pm25: Number(item.pm25 || 0),
          pm10: Number(item.pm10 || 0),
          no2: Number(item.no2 || 0),
          so2: Number(item.so2 || 0),
          co: Number(item.co || 0),
          o3: Number(item.o3 || 0),
          aqi: Number(item.aqi || 0),
          level: item.level_name || "优",
          type: item.item_type || "province",
        })),
      },
      summary: {
        aqi: Number(overviewRow.summary_aqi || 0),
        level: String(overviewRow.summary_level || "优"),
      },
      meta: {
        stationCount: Number(overviewRow.station_count || 0),
        warningCount: Number(overviewRow.warning_count || 0),
      },
      mapProvinces,
    },
  };
};

/**
 * GET /dashboard/map — 地图数据
 * 返回所有省份的 AQI、污染物、坐标，始终全国维度
 */
export const getMapData = async () => {
  const rows = await query(
    `
      SELECT
        o.scope_code AS code,
        p.name,
        p.longitude,
        p.latitude,
        o.summary_aqi AS aqi,
        o.summary_level AS level,
        o.realtime_pm25 AS pm25,
        o.realtime_pm10 AS pm10,
        o.realtime_no2 AS no2,
        o.realtime_so2 AS so2,
        o.realtime_co AS co,
        o.realtime_o3 AS o3
      FROM agg_scope_overview o
      INNER JOIN provinces p ON p.code = o.scope_code
      WHERE o.scope_type = 'province'
      ORDER BY o.scope_code ASC
    `
  );

  if (rows.length === 0) {
    // Fallback: aggregate tables not yet built
    const provinceRows = await query(`SELECT code, name, longitude, latitude FROM provinces ORDER BY code ASC`);
    return {
      provinces: provinceRows.map((p) => ({
        code: p.code,
        name: p.name,
        longitude: p.longitude == null ? null : Number(p.longitude),
        latitude: p.latitude == null ? null : Number(p.latitude),
        aqi: 0,
        level: "优",
        pm25: 0, pm10: 0, no2: 0, so2: 0, co: 0, o3: 0,
      })),
    };
  }

  return {
    provinces: rows.map((item) => ({
      code: item.code,
      name: item.name,
      longitude: item.longitude == null ? null : Number(item.longitude),
      latitude: item.latitude == null ? null : Number(item.latitude),
      aqi: Number(item.aqi || 0),
      level: item.level || "优",
      pm25: Number(item.pm25 || 0),
      pm10: Number(item.pm10 || 0),
      no2: Number(item.no2 || 0),
      so2: Number(item.so2 || 0),
      co: Number(item.co || 0),
      o3: Number(item.o3 || 0),
    })),
  };
};

/**
 * GET /dashboard/overview?scope=ALL|{code} — 聚合面板数据
 * 返回一个大对象，每个属性对应一个 UI 模块
 */
export const getOverviewData = async (scopeInput) => {
  const raw = typeof scopeInput === "string" ? scopeInput.trim() : "ALL";
  const isAll = !raw || raw.toUpperCase() === "ALL";
  const scopeType = isAll ? "national" : "province";
  const scopeCode = isAll ? "all" : raw;

  if (!isAll) {
    await ensureProvinceExists(scopeCode);
  }

  const overviewRows = await query(
    `SELECT * FROM agg_scope_overview WHERE scope_type = ? AND scope_code = ? LIMIT 1`,
    [scopeType, scopeCode]
  );
  const overviewRow = overviewRows[0];
  if (!overviewRow) {
    throw Object.assign(new Error("聚合快照未就绪，请稍后重试"), { statusCode: 503 });
  }

  const [airLevels, stationRanks, warnings, hourly, monthly, cities] = await Promise.all([
    query(
      `SELECT level_name, level_value, level_color FROM agg_scope_air_levels
       WHERE scope_type = ? AND scope_code = ?
       ORDER BY FIELD(level_name, '优', '良', '轻度污染', '中度污染', '重度污染', '严重污染')`,
      [scopeType, scopeCode]
    ),
    query(
      `SELECT * FROM agg_scope_station_ranks WHERE scope_type = ? AND scope_code = ? ORDER BY rank_no ASC`,
      [scopeType, scopeCode]
    ),
    query(
      `SELECT * FROM agg_scope_warnings WHERE scope_type = ? AND scope_code = ?
       ORDER BY warning_level DESC, warning_code ASC`,
      [scopeType, scopeCode]
    ),
    query(
      `SELECT * FROM agg_scope_hourly WHERE scope_type = ? AND scope_code = ? ORDER BY hour_key ASC`,
      [scopeType, scopeCode]
    ),
    query(
      `SELECT * FROM agg_scope_monthly WHERE scope_type = ? AND scope_code = ?
       ORDER BY CAST(REPLACE(month_label, '月', '') AS UNSIGNED) ASC`,
      [scopeType, scopeCode]
    ),
    query(
      `SELECT * FROM agg_scope_cities WHERE scope_type = ? AND scope_code = ?
       ORDER BY item_type ASC, item_code ASC`,
      [scopeType, scopeCode]
    ),
  ]);

  return {
    scope: isAll ? "ALL" : scopeCode,
    scopeName: overviewRow.scope_name,
    ts: Number(overviewRow.snapshot_version),
    updatedAt: overviewRow.updated_at,

    // 摘要信息
    summary: {
      aqi: Number(overviewRow.summary_aqi || 0),
      level: String(overviewRow.summary_level || "优"),
      stationCount: Number(overviewRow.station_count || 0),
      warningCount: Number(overviewRow.warning_count || 0),
    },

    // 实时污染物数据（左上 TopStats）
    realtime: {
      pm25: Number(overviewRow.realtime_pm25),
      pm10: Number(overviewRow.realtime_pm10),
      no2: Number(overviewRow.realtime_no2),
      so2: Number(overviewRow.realtime_so2),
      co: Number(overviewRow.realtime_co),
      o3: Number(overviewRow.realtime_o3),
    },

    // 空气质量等级分布（左下 PieChart）
    airQualityLevels: airLevels.map((item) => ({
      name: item.level_name,
      value: Number(item.level_value || 0),
      color: item.level_color || undefined,
    })),

    // 预警信息（右上 WarningList）
    warnings: warnings.map((item) => ({
      warningCode: item.warning_code || "",
      type: item.warning_type || "空气污染预警",
      level: item.warning_level,
      provinceCode: item.province_code || "",
      provinceName: item.province_name || "",
      area: item.area_name || "",
      title: item.warning_title || "",
      description: item.description_text || "",
      status: item.status_code || "active",
      statusLabel: item.status_label || "",
      time: item.display_time || "",
      startTime: item.start_time_display || "",
      endTime: item.end_time_display || "",
      timeRange: item.time_range_display || "",
      mainPollutant: item.main_pollutant || "-",
      stationName: item.station_name || "",
    })),

    // 站点排名（右下 StationRanks）
    stationRanks: stationRanks.map((item) => ({
      stationId: item.station_id == null ? undefined : Number(item.station_id),
      stationCode: item.station_code || "",
      rank: Number(item.rank_no || 0),
      prevRank: item.prev_rank == null ? null : Number(item.prev_rank),
      rankDelta: item.rank_delta == null ? null : Number(item.rank_delta),
      aqiDelta: item.aqi_delta == null ? null : Number(item.aqi_delta),
      name: item.station_name || "",
      provinceCode: item.province_code || "",
      provinceName: item.province_name || "",
      areaName: item.area_name || "",
      observedAt: item.observed_at || "",
      aqi: Number(item.aqi || 0),
      level: item.level_name || "优",
      mainPollutant: item.main_pollutant || "-",
      pm25: Number(item.pm25 || 0),
      pm10: Number(item.pm10 || 0),
      freshnessMinutes: item.freshness_minutes == null ? undefined : Number(item.freshness_minutes),
      isStale: Boolean(item.is_stale),
      trend: parseTrend(item.trend_json),
    })),

    // 24小时趋势（底部 HourlyPollutantChart）
    hourlyPollutant: hourly.map((item) => ({
      hour: item.hour_key,
      pm25: Number(item.pm25 || 0),
      pm10: Number(item.pm10 || 0),
      no2: Number(item.no2 || 0),
      so2: Number(item.so2 || 0),
      co: Number(item.co || 0),
      o3: Number(item.o3 || 0),
      aqi: Number(item.aqi || 0),
    })),

    // 月度对比（底部 MonthlyPollutantChart）
    monthlyPollutant: monthly.map((item) => ({
      month: item.month_label,
      currentPM25: Number(item.current_pm25 || 0),
      previousPM25: Number(item.previous_pm25 || 0),
      currentPM10: Number(item.current_pm10 || 0),
      previousPM10: Number(item.previous_pm10 || 0),
    })),

    // 站点/城市列表（地图散点用）
    cities: cities.map((item) => ({
      code: item.item_code,
      name: item.item_name,
      longitude: item.longitude == null ? null : Number(item.longitude),
      latitude: item.latitude == null ? null : Number(item.latitude),
      pm25: Number(item.pm25 || 0),
      pm10: Number(item.pm10 || 0),
      no2: Number(item.no2 || 0),
      so2: Number(item.so2 || 0),
      co: Number(item.co || 0),
      o3: Number(item.o3 || 0),
      aqi: Number(item.aqi || 0),
      level: item.level_name || "优",
      type: item.item_type || "province",
    })),
  };
};

export const startDashboardAggregateSync = () => {
  let disposed = false;
  let timer = null;
  let running = false;

  const runOnce = async () => {
    if (disposed || running) return;
    running = true;
    try {
      const result = await rebuildAllAggregates();
      console.log(`[dashboard-aggregate] refreshed scopes=${result.scopeCount}`);
    } catch (error) {
      console.error("[dashboard-aggregate] refresh failed:", error);
    } finally {
      running = false;
    }
  };

  void runOnce();
  timer = setInterval(() => {
    void runOnce();
  }, AGG_REFRESH_INTERVAL_MS);

  return () => {
    disposed = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
};
