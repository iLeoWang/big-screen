import { query } from "../db.js";
import { getAirQualityLevel } from "../utils/airQuality.js";

const toNumber = (value, fallback = 0) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
};

const normalizeTime = (value) => {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const calcAqi = (record) => {
  if (record.aqi != null) return Math.round(toNumber(record.aqi, 0));
  return Math.round(
    toNumber(record.pm25, 0) * 0.38 +
      toNumber(record.pm10, 0) * 0.17 +
      toNumber(record.no2, 0) * 0.12 +
      toNumber(record.o3, 0) * 0.1 +
      toNumber(record.so2, 0) * 0.05
  );
};

const createBatch = async (source, topic, traceId, totalCount) => {
  const result = await query(
    `
      INSERT INTO aq_ingest_batches (source, topic, trace_id, total_count)
      VALUES (?, ?, ?, ?)
    `,
    [source, topic, traceId, totalCount]
  );
  return result.insertId;
};

const writeRawEvent = async (batchId, eventType, eventTime, payload, accepted, message) => {
  await query(
    `
      INSERT INTO aq_ingest_raw_events (
        batch_id, event_type, event_time, payload_json, parse_status, parse_message
      ) VALUES (?, ?, ?, CAST(? AS JSON), ?, ?)
    `,
    [batchId, eventType, eventTime || new Date(), JSON.stringify(payload), accepted ? "accepted" : "rejected", message || null]
  );
};

const finishBatch = async (batchId, acceptedCount, failedCount) => {
  await query(
    `
      UPDATE aq_ingest_batches
      SET accepted_count = ?, failed_count = ?
      WHERE id = ?
    `,
    [acceptedCount, failedCount, batchId]
  );
};

const ensureStationDim = async (record) => {
  const stationCode =
    typeof record.stationCode === "string" && record.stationCode.trim()
      ? record.stationCode.trim()
      : `${record.provinceCode}-${record.stationName}`;

  await query(
    `
      INSERT INTO aq_station_dim (
        station_code, province_code, station_name, area_name, longitude, latitude, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'active')
      ON DUPLICATE KEY UPDATE
        province_code = VALUES(province_code),
        station_name = VALUES(station_name),
        area_name = VALUES(area_name),
        longitude = VALUES(longitude),
        latitude = VALUES(latitude),
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      stationCode,
      record.provinceCode,
      record.stationName,
      record.areaName || record.stationName,
      record.longitude == null ? null : toNumber(record.longitude),
      record.latitude == null ? null : toNumber(record.latitude),
    ]
  );

  const rows = await query("SELECT id FROM aq_station_dim WHERE station_code = ? LIMIT 1", [stationCode]);
  return rows[0]?.id || null;
};

const buildResult = (topic, source, traceId, received, accepted, rejected, batchId) => ({
  topic,
  source,
  traceId,
  batchId,
  received,
  accepted: accepted.length,
  rejected: rejected.length,
  acceptedItems: accepted,
  rejectedItems: rejected,
});

const handleRecords = async (payload, topic, processOne) => {
  const source = payload?.source || "collector";
  const traceId = payload?.traceId || null;
  const records = Array.isArray(payload?.records) ? payload.records : [];
  const batchId = await createBatch(source, topic, traceId, records.length);
  const accepted = [];
  const rejected = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    try {
      await processOne(record);
      accepted.push({ index });
      await writeRawEvent(batchId, topic, record?.observedAt || record?.startTime || new Date(), record, true);
    } catch (error) {
      const reason = error?.message || "invalid_record";
      rejected.push({ index, reason });
      await writeRawEvent(batchId, topic, record?.observedAt || record?.startTime || new Date(), record, false, reason);
    }
  }

  await finishBatch(batchId, accepted.length, rejected.length);
  return buildResult(topic, source, traceId, records.length, accepted, rejected, batchId);
};

export const ingestProvinceRealtime = async (payload) => {
  return handleRecords(payload, "realtime.province", async (record) => {
    if (!record?.provinceCode) throw new Error("missing_provinceCode");
    const observedAt = normalizeTime(record.observedAt);
    if (!observedAt) throw new Error("invalid_observedAt");

    const aqi = calcAqi(record);
    const level = record.level || getAirQualityLevel(aqi);
    await query(
      `
        INSERT INTO aq_province_realtime_snapshots (
          province_code, observed_at, pm25, pm10, no2, so2, co, o3, aqi, level, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          pm25 = VALUES(pm25), pm10 = VALUES(pm10), no2 = VALUES(no2), so2 = VALUES(so2),
          co = VALUES(co), o3 = VALUES(o3), aqi = VALUES(aqi), level = VALUES(level), source = VALUES(source)
      `,
      [
        record.provinceCode,
        observedAt,
        toNumber(record.pm25),
        toNumber(record.pm10),
        toNumber(record.no2),
        toNumber(record.so2),
        toNumber(record.co),
        toNumber(record.o3),
        aqi,
        level,
        payload?.source || "collector",
      ]
    );
  });
};

export const ingestStationRealtime = async (payload) => {
  return handleRecords(payload, "realtime.station", async (record) => {
    if (!record?.provinceCode) throw new Error("missing_provinceCode");
    if (!record?.stationName) throw new Error("missing_stationName");
    const observedAt = normalizeTime(record.observedAt);
    if (!observedAt) throw new Error("invalid_observedAt");

    const stationId = await ensureStationDim(record);
    if (!stationId) throw new Error("station_dim_upsert_failed");

    const aqi = calcAqi(record);
    const level = record.level || getAirQualityLevel(aqi);
    await query(
      `
        INSERT INTO aq_station_realtime_snapshots (
          station_id, observed_at, aqi, level, main_pollutant, pm25, pm10, no2, so2, co, o3
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          aqi = VALUES(aqi), level = VALUES(level), main_pollutant = VALUES(main_pollutant),
          pm25 = VALUES(pm25), pm10 = VALUES(pm10), no2 = VALUES(no2), so2 = VALUES(so2), co = VALUES(co), o3 = VALUES(o3)
      `,
      [
        stationId,
        observedAt,
        aqi,
        level,
        record.mainPollutant || "PM2.5",
        toNumber(record.pm25),
        toNumber(record.pm10),
        toNumber(record.no2),
        toNumber(record.so2),
        toNumber(record.co),
        toNumber(record.o3),
      ]
    );
  });
};

export const ingestWarnings = async (payload) => {
  return handleRecords(payload, "warnings", async (record) => {
    if (!record?.provinceCode) throw new Error("missing_provinceCode");
    const startTime = normalizeTime(record.startTime);
    if (!startTime) throw new Error("invalid_startTime");
    const endTime = record.endTime ? normalizeTime(record.endTime) : null;
    if (record.endTime && !endTime) throw new Error("invalid_endTime");

    const warningCode =
      typeof record.warningCode === "string" && record.warningCode.trim()
        ? record.warningCode.trim()
        : `W-${record.provinceCode}-${startTime.getTime()}`;

    await query(
      `
        INSERT INTO aq_warning_events (
          warning_code, province_code, station_id, warning_type, warning_level, title,
          description, main_pollutant, start_time, end_time, status
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          warning_level = VALUES(warning_level),
          title = VALUES(title),
          description = VALUES(description),
          main_pollutant = VALUES(main_pollutant),
          start_time = VALUES(start_time),
          end_time = VALUES(end_time),
          status = VALUES(status),
          updated_at = CURRENT_TIMESTAMP
      `,
      [
        warningCode,
        record.provinceCode,
        record.warningType || "空气污染预警",
        record.warningLevel || "轻度",
        record.title || `${record.provinceCode}污染预警`,
        record.description || "",
        record.mainPollutant || "PM2.5",
        startTime,
        endTime,
        record.status || "active",
      ]
    );
  });
};
