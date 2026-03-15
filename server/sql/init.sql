SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS air_quality
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE air_quality;

CREATE TABLE IF NOT EXISTS provinces (
  code VARCHAR(6) NOT NULL PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  longitude DECIMAL(10,6) NOT NULL,
  latitude DECIMAL(10,6) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO provinces (code, name, longitude, latitude)
VALUES
('110000','北京市',116.405285,39.904989),
('120000','天津市',117.190182,39.125596),
('130000','河北省',114.502461,38.045474),
('140000','山西省',112.549248,37.857014),
('150000','内蒙古自治区',111.670801,40.818311),
('210000','辽宁省',123.429096,41.796767),
('220000','吉林省',125.324500,43.886841),
('230000','黑龙江省',126.642464,45.756967),
('310000','上海市',121.472644,31.231706),
('320000','江苏省',118.767413,32.041544),
('330000','浙江省',120.153576,30.287459),
('340000','安徽省',117.283042,31.861190),
('350000','福建省',119.306239,26.075302),
('360000','江西省',115.892151,28.676493),
('370000','山东省',117.000923,36.675807),
('410000','河南省',113.665412,34.757975),
('420000','湖北省',114.298572,30.584355),
('430000','湖南省',112.982279,28.194090),
('440000','广东省',113.280637,23.125178),
('450000','广西壮族自治区',108.320004,22.824020),
('460000','海南省',110.331190,20.031971),
('500000','重庆市',106.504962,29.533155),
('510000','四川省',104.065735,30.659462),
('520000','贵州省',106.713478,26.578343),
('530000','云南省',102.712251,25.040609),
('540000','西藏自治区',91.132212,29.660361),
('610000','陕西省',108.948024,34.263161),
('620000','甘肃省',103.823557,36.058039),
('630000','青海省',101.778916,36.623178),
('640000','宁夏回族自治区',106.278179,38.466370),
('650000','新疆维吾尔自治区',87.617733,43.792818),
('710000','台湾省',121.509062,25.044332),
('810000','香港特别行政区',114.173355,22.320048),
('820000','澳门特别行政区',113.549090,22.198951)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  longitude = VALUES(longitude),
  latitude = VALUES(latitude),
  updated_at = CURRENT_TIMESTAMP;

-- 破坏性重构：清理旧大屏事实表后重建
DROP TABLE IF EXISTS aq_ingest_raw_events;
DROP TABLE IF EXISTS aq_ingest_batches;
DROP TABLE IF EXISTS aq_dict_item;
DROP TABLE IF EXISTS aq_dict_type;
DROP TABLE IF EXISTS aq_pollutant_monthly;
DROP TABLE IF EXISTS aq_pollutant_hourly;
DROP TABLE IF EXISTS aq_warning_events;
DROP TABLE IF EXISTS aq_province_realtime_snapshots;
DROP TABLE IF EXISTS aq_station_realtime_snapshots;
DROP TABLE IF EXISTS aq_station_dim;

CREATE TABLE aq_dict_type (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type_code VARCHAR(64) NOT NULL,
  type_name VARCHAR(128) NOT NULL,
  description VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_dict_type_code (type_code),
  KEY idx_dict_type_status_sort (status, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE aq_dict_item (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type_code VARCHAR(64) NOT NULL,
  dict_label VARCHAR(128) NOT NULL,
  dict_value VARCHAR(128) NOT NULL,
  item_color VARCHAR(16) NULL,
  item_unit VARCHAR(32) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  status TINYINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_dict_item_type_value (type_code, dict_value),
  KEY idx_dict_item_type_status_sort (type_code, status, sort_order),
  CONSTRAINT fk_dict_item_type FOREIGN KEY (type_code) REFERENCES aq_dict_type(type_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO aq_dict_type (type_code, type_name, description, sort_order, status)
VALUES
('air_quality_level', '空气质量等级', '空气质量等级字典', 10, 1),
('warning_level', '预警等级', '污染预警等级字典', 20, 1),
('pollutant', '污染物', '污染物指标字典', 30, 1);

INSERT INTO aq_dict_item (type_code, dict_label, dict_value, item_color, item_unit, sort_order, status)
VALUES
('air_quality_level', '优', '优', '#3FB96F', NULL, 10, 1),
('air_quality_level', '良', '良', '#A4C639', NULL, 20, 1),
('air_quality_level', '轻度污染', '轻度污染', '#F2C94C', NULL, 30, 1),
('air_quality_level', '中度污染', '中度污染', '#F2994A', NULL, 40, 1),
('air_quality_level', '重度污染', '重度污染', '#EB5757', NULL, 50, 1),
('air_quality_level', '严重污染', '严重污染', '#8E44AD', NULL, 60, 1),

('warning_level', '轻度', '轻度', '#FFD166', NULL, 10, 1),
('warning_level', '中度', '中度', '#FF9A6B', NULL, 20, 1),
('warning_level', '重度', '重度', '#FF6B8E', NULL, 30, 1),
('warning_level', '严重', '严重', '#E85D75', NULL, 40, 1),

('pollutant', 'PM2.5', 'PM2.5', NULL, 'μg/m³', 10, 1),
('pollutant', 'PM10', 'PM10', NULL, 'μg/m³', 20, 1),
('pollutant', 'NO₂', 'NO₂', NULL, 'μg/m³', 30, 1),
('pollutant', 'SO₂', 'SO₂', NULL, 'μg/m³', 40, 1),
('pollutant', 'CO', 'CO', NULL, 'mg/m³', 50, 1),
('pollutant', 'O₃', 'O₃', NULL, 'μg/m³', 60, 1);

CREATE TABLE aq_station_dim (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  station_code VARCHAR(32) NOT NULL,
  province_code VARCHAR(6) NOT NULL,
  station_name VARCHAR(128) NOT NULL,
  area_name VARCHAR(128) NULL,
  longitude DECIMAL(10,6) NULL,
  latitude DECIMAL(10,6) NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_station_code (station_code),
  UNIQUE KEY uk_station_name_scope (province_code, station_name),
  KEY idx_station_dim_province (province_code),
  KEY idx_station_dim_scope_status (province_code, status, id),
  CONSTRAINT fk_station_dim_province FOREIGN KEY (province_code) REFERENCES provinces(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE aq_station_realtime_snapshots (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  station_id BIGINT NOT NULL,
  observed_at DATETIME NOT NULL,
  aqi INT NOT NULL,
  level VARCHAR(16) NOT NULL,
  main_pollutant VARCHAR(16) NOT NULL,
  pm25 DECIMAL(6,1) NOT NULL,
  pm10 DECIMAL(6,1) NOT NULL,
  no2 DECIMAL(6,1) NOT NULL,
  so2 DECIMAL(6,1) NOT NULL,
  co DECIMAL(6,2) NOT NULL,
  o3 DECIMAL(6,1) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_station_observed (station_id, observed_at),
  KEY idx_station_latest (station_id, observed_at),
  KEY idx_station_rank (observed_at, aqi),
  KEY idx_station_observed_station_aqi (observed_at, station_id, aqi),
  CONSTRAINT fk_station_snapshot_station FOREIGN KEY (station_id) REFERENCES aq_station_dim(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE aq_province_realtime_snapshots (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  province_code VARCHAR(6) NOT NULL,
  observed_at DATETIME NOT NULL,
  pm25 DECIMAL(6,1) NOT NULL,
  pm10 DECIMAL(6,1) NOT NULL,
  no2 DECIMAL(6,1) NOT NULL,
  so2 DECIMAL(6,1) NOT NULL,
  co DECIMAL(6,2) NOT NULL,
  o3 DECIMAL(6,1) NOT NULL,
  aqi INT NOT NULL,
  level VARCHAR(16) NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'collector',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_province_observed (province_code, observed_at),
  KEY idx_province_latest (province_code, observed_at),
  CONSTRAINT fk_province_snapshot_province FOREIGN KEY (province_code) REFERENCES provinces(code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE aq_warning_events (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  warning_code VARCHAR(64) NOT NULL,
  province_code VARCHAR(6) NOT NULL,
  station_id BIGINT NULL,
  warning_type VARCHAR(64) NOT NULL,
  warning_level ENUM('轻度', '中度', '重度', '严重') NOT NULL,
  title VARCHAR(128) NOT NULL,
  description VARCHAR(512) NULL,
  main_pollutant VARCHAR(16) NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NULL,
  status ENUM('active', 'resolved', 'published') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_warning_code (warning_code),
  KEY idx_warning_scope_time (province_code, start_time),
  KEY idx_warning_status_time (status, start_time),
  CONSTRAINT fk_warning_events_province FOREIGN KEY (province_code) REFERENCES provinces(code),
  CONSTRAINT fk_warning_events_station FOREIGN KEY (station_id) REFERENCES aq_station_dim(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE aq_pollutant_hourly (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  scope_type ENUM('national', 'province') NOT NULL,
  scope_code VARCHAR(16) NOT NULL,
  stat_date DATE NOT NULL,
  stat_hour TINYINT UNSIGNED NOT NULL,
  pm25 DECIMAL(6,1) NOT NULL,
  pm10 DECIMAL(6,1) NOT NULL,
  no2 DECIMAL(6,1) NOT NULL,
  so2 DECIMAL(6,1) NOT NULL,
  co DECIMAL(6,2) NOT NULL,
  o3 DECIMAL(6,1) NOT NULL,
  aqi INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_scope_hourly (scope_type, scope_code, stat_date, stat_hour),
  KEY idx_scope_hourly_query (scope_type, scope_code, stat_date, stat_hour)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE aq_pollutant_monthly (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  scope_type ENUM('national', 'province') NOT NULL,
  scope_code VARCHAR(16) NOT NULL,
  stat_year SMALLINT NOT NULL,
  stat_month TINYINT UNSIGNED NOT NULL,
  current_pm25 DECIMAL(6,1) NOT NULL,
  previous_pm25 DECIMAL(6,1) NOT NULL,
  current_pm10 DECIMAL(6,1) NOT NULL,
  previous_pm10 DECIMAL(6,1) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_scope_monthly (scope_type, scope_code, stat_year, stat_month),
  KEY idx_scope_monthly_query (scope_type, scope_code, stat_year, stat_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE aq_ingest_batches (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(64) NOT NULL,
  topic VARCHAR(64) NOT NULL,
  trace_id VARCHAR(64) NULL,
  total_count INT NOT NULL DEFAULT 0,
  accepted_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ingest_source_time (source, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE aq_ingest_raw_events (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  batch_id BIGINT NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  event_time DATETIME NOT NULL,
  payload_json JSON NOT NULL,
  parse_status ENUM('accepted', 'rejected') NOT NULL DEFAULT 'accepted',
  parse_message VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ingest_raw_batch (batch_id),
  KEY idx_ingest_event_type_time (event_type, event_time),
  CONSTRAINT fk_ingest_batch FOREIGN KEY (batch_id) REFERENCES aq_ingest_batches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化站点维度：不依赖旧 monitoring_stations，直接按省份生成示例站点
INSERT IGNORE INTO aq_station_dim (station_code, province_code, station_name, area_name, longitude, latitude, status)
SELECT
  CONCAT(p.code, '-S', LPAD(seed.seq, 3, '0')) AS station_code,
  p.code,
  CONCAT(p.name, seed.station_suffix) AS station_name,
  CONCAT(p.name, seed.area_suffix) AS area_name,
  ROUND(p.longitude + seed.lng_offset, 6) AS longitude,
  ROUND(p.latitude + seed.lat_offset, 6) AS latitude,
  'active'
FROM provinces p
CROSS JOIN (
  SELECT 1 AS seq, '中心站' AS station_suffix, '中心城区' AS area_suffix, 0.000000 AS lng_offset, 0.000000 AS lat_offset
  UNION ALL
  SELECT 2 AS seq, '东部站' AS station_suffix, '东部片区' AS area_suffix, 0.350000 AS lng_offset, 0.180000 AS lat_offset
  UNION ALL
  SELECT 3 AS seq, '西部站' AS station_suffix, '西部片区' AS area_suffix, -0.320000 AS lng_offset, -0.160000 AS lat_offset
) seed
;

UPDATE aq_station_dim d
INNER JOIN (
  SELECT
    CONCAT(p.code, '-S', LPAD(seed.seq, 3, '0')) AS station_code,
    CONCAT(p.name, seed.area_suffix) AS area_name,
    ROUND(p.longitude + seed.lng_offset, 6) AS longitude,
    ROUND(p.latitude + seed.lat_offset, 6) AS latitude,
    'active' AS status
  FROM provinces p
  CROSS JOIN (
    SELECT 1 AS seq, '中心城区' AS area_suffix, 0.000000 AS lng_offset, 0.000000 AS lat_offset
    UNION ALL
    SELECT 2 AS seq, '东部片区' AS area_suffix, 0.350000 AS lng_offset, 0.180000 AS lat_offset
    UNION ALL
    SELECT 3 AS seq, '西部片区' AS area_suffix, -0.320000 AS lng_offset, -0.160000 AS lat_offset
  ) seed
) src ON src.station_code = d.station_code
SET
  d.area_name = src.area_name,
  d.longitude = src.longitude,
  d.latitude = src.latitude,
  d.status = src.status,
  d.updated_at = CURRENT_TIMESTAMP;

-- 初始化业务种子数据：让大屏首次启动即可展示完整内容
SET @seed_observed_at = '2025-12-15 12:00:00';
SET @seed_stat_date = DATE(@seed_observed_at);
SET @seed_stat_year = 2025;

INSERT INTO aq_province_realtime_snapshots (
  province_code, observed_at, pm25, pm10, no2, so2, co, o3, aqi, level, source
)
SELECT
  src.province_code,
  @seed_observed_at,
  src.pm25,
  src.pm10,
  src.no2,
  src.so2,
  src.co,
  src.o3,
  src.aqi,
  CASE
    WHEN src.aqi <= 50 THEN '优'
    WHEN src.aqi <= 100 THEN '良'
    WHEN src.aqi <= 150 THEN '轻度污染'
    WHEN src.aqi <= 200 THEN '中度污染'
    WHEN src.aqi <= 300 THEN '重度污染'
    ELSE '严重污染'
  END AS level,
  'init-seed'
FROM (
  SELECT
    staged.province_code,
    ROUND(staged.aqi * (0.40 + staged.dust_factor * 0.03), 1) AS pm25,
    ROUND(staged.aqi * (0.62 + staged.dust_factor * 0.06), 1) AS pm10,
    ROUND(18 + staged.aqi * 0.19 + staged.traffic_factor * 3.2, 1) AS no2,
    ROUND(6 + staged.aqi * 0.055 + staged.coal_factor * 2.4, 1) AS so2,
    ROUND(0.35 + staged.aqi * 0.0052 + staged.coal_factor * 0.08, 2) AS co,
    ROUND(52 + staged.aqi * 0.36 + staged.sun_factor * 6.5 - staged.coastal_factor * 5.2, 1) AS o3,
    CAST(staged.aqi AS UNSIGNED) AS aqi
  FROM (
    SELECT
      p.code AS province_code,
      CASE CAST(LEFT(p.code, 2) AS UNSIGNED)
        WHEN 13 THEN 188 -- 河北
        WHEN 14 THEN 182 -- 山西
        WHEN 37 THEN 171 -- 山东
        WHEN 41 THEN 176 -- 河南
        WHEN 61 THEN 168 -- 陕西
        WHEN 64 THEN 162 -- 宁夏
        WHEN 15 THEN 154 -- 内蒙古
        WHEN 12 THEN 148 -- 天津
        WHEN 62 THEN 150 -- 甘肃
        WHEN 63 THEN 146 -- 青海
        WHEN 65 THEN 142 -- 新疆
        WHEN 11 THEN 132 -- 北京
        WHEN 21 THEN 126 -- 辽宁
        WHEN 22 THEN 122 -- 吉林
        WHEN 23 THEN 118 -- 黑龙江
        WHEN 32 THEN 116 -- 江苏
        WHEN 34 THEN 124 -- 安徽
        WHEN 36 THEN 114 -- 江西
        WHEN 42 THEN 129 -- 湖北
        WHEN 43 THEN 121 -- 湖南
        WHEN 50 THEN 134 -- 重庆
        WHEN 51 THEN 127 -- 四川
        WHEN 31 THEN 92  -- 上海
        WHEN 33 THEN 86  -- 浙江
        WHEN 35 THEN 84  -- 福建
        WHEN 44 THEN 88  -- 广东
        WHEN 45 THEN 90  -- 广西
        WHEN 46 THEN 76  -- 海南
        WHEN 52 THEN 94  -- 贵州
        WHEN 53 THEN 82  -- 云南
        WHEN 54 THEN 79  -- 西藏
        WHEN 71 THEN 83  -- 台湾
        WHEN 81 THEN 74  -- 香港
        WHEN 82 THEN 72  -- 澳门
        ELSE 104
      END AS aqi,
      CASE
        WHEN CAST(LEFT(p.code, 2) AS UNSIGNED) IN (11,12,21,31,32,33,35,37,44,45,46,71,81,82) THEN 1.0
        ELSE 0.2
      END AS coastal_factor,
      CASE
        WHEN CAST(LEFT(p.code, 2) AS UNSIGNED) IN (14,15,61,62,63,64,65) THEN 1.2
        WHEN CAST(LEFT(p.code, 2) AS UNSIGNED) IN (13,37,41) THEN 0.8
        ELSE 0.3
      END AS dust_factor,
      CASE
        WHEN CAST(LEFT(p.code, 2) AS UNSIGNED) IN (11,12,31,44,50,51) THEN 1.0
        ELSE 0.4
      END AS traffic_factor,
      CASE
        WHEN CAST(LEFT(p.code, 2) AS UNSIGNED) IN (13,14,15,37,41,61,64) THEN 1.1
        WHEN CAST(LEFT(p.code, 2) AS UNSIGNED) IN (62,63,65) THEN 0.8
        ELSE 0.3
      END AS coal_factor,
      CASE
        WHEN CAST(LEFT(p.code, 2) AS UNSIGNED) IN (44,45,46,52,53,54,65) THEN 1.0
        ELSE 0.5
      END AS sun_factor
    FROM provinces p
  ) staged
) src
ON DUPLICATE KEY UPDATE
  pm25 = VALUES(pm25),
  pm10 = VALUES(pm10),
  no2 = VALUES(no2),
  so2 = VALUES(so2),
  co = VALUES(co),
  o3 = VALUES(o3),
  aqi = VALUES(aqi),
  level = VALUES(level),
  source = VALUES(source);

INSERT INTO aq_station_realtime_snapshots (
  station_id, observed_at, aqi, level, main_pollutant, pm25, pm10, no2, so2, co, o3
)
SELECT
  src.station_id,
  @seed_observed_at,
  src.aqi,
  CASE
    WHEN src.aqi <= 50 THEN '优'
    WHEN src.aqi <= 100 THEN '良'
    WHEN src.aqi <= 150 THEN '轻度污染'
    WHEN src.aqi <= 200 THEN '中度污染'
    WHEN src.aqi <= 300 THEN '重度污染'
    ELSE '严重污染'
  END AS level,
  'PM2.5',
  src.pm25,
  src.pm10,
  src.no2,
  src.so2,
  src.co,
  src.o3
FROM (
  SELECT
    d.id AS station_id,
    ROUND(24 + MOD(d.id * 7, 45) * 1.1, 1) AS pm25,
    ROUND(42 + MOD(d.id * 5, 50) * 1.0, 1) AS pm10,
    ROUND(16 + MOD(d.id * 3, 28) * 0.8, 1) AS no2,
    ROUND(7 + MOD(d.id * 2, 22) * 0.5, 1) AS so2,
    ROUND(0.4 + MOD(d.id * 9, 21) * 0.04, 2) AS co,
    ROUND(66 + MOD(d.id * 11, 36) * 1.0, 1) AS o3,
    CAST(ROUND(35 + MOD(d.id * 13, 230)) AS UNSIGNED) AS aqi
  FROM aq_station_dim d
) src
ON DUPLICATE KEY UPDATE
  aqi = VALUES(aqi),
  level = VALUES(level),
  main_pollutant = VALUES(main_pollutant),
  pm25 = VALUES(pm25),
  pm10 = VALUES(pm10),
  no2 = VALUES(no2),
  so2 = VALUES(so2),
  co = VALUES(co),
  o3 = VALUES(o3);

INSERT INTO aq_warning_events (
  warning_code, province_code, station_id, warning_type, warning_level, title,
  description, main_pollutant, start_time, end_time, status
)
SELECT
  CONCAT('INIT-W-', p.code) AS warning_code,
  p.code AS province_code,
  NULL AS station_id,
  '空气污染预警' AS warning_type,
  CASE
    WHEN COALESCE(r.aqi, 90) >= 180 THEN '严重'
    WHEN COALESCE(r.aqi, 90) >= 150 THEN '重度'
    WHEN COALESCE(r.aqi, 90) >= 115 THEN '中度'
    ELSE '轻度'
  END AS warning_level,
  CONCAT(p.name, '污染过程预警') AS title,
  CONCAT(
    '当前AQI约', COALESCE(r.aqi, 90),
    '，受静稳天气与局地排放叠加影响，',
    p.name, '未来24小时颗粒物浓度存在上升风险。'
  ) AS description,
  'PM2.5' AS main_pollutant,
  DATE_SUB(@seed_observed_at, INTERVAL MOD(CAST(p.code AS UNSIGNED), 6) HOUR) AS start_time,
  DATE_ADD(@seed_observed_at, INTERVAL 8 HOUR) AS end_time,
  'active' AS status
FROM provinces p
LEFT JOIN aq_province_realtime_snapshots r
  ON r.province_code = p.code
  AND r.observed_at = @seed_observed_at
ON DUPLICATE KEY UPDATE
  warning_level = VALUES(warning_level),
  title = VALUES(title),
  description = VALUES(description),
  main_pollutant = VALUES(main_pollutant),
  start_time = VALUES(start_time),
  end_time = VALUES(end_time),
  status = VALUES(status),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO aq_pollutant_hourly (
  scope_type, scope_code, stat_date, stat_hour, pm25, pm10, no2, so2, co, o3, aqi
)
SELECT
  'national' AS scope_type,
  'all' AS scope_code,
  @seed_stat_date AS stat_date,
  h.stat_hour,
  ROUND(32 + (h.stat_hour * 3 % 19), 1) AS pm25,
  ROUND(58 + (h.stat_hour * 4 % 23), 1) AS pm10,
  ROUND(22 + (h.stat_hour * 2 % 17), 1) AS no2,
  ROUND(10 + (h.stat_hour * 2 % 11), 1) AS so2,
  ROUND(0.65 + (h.stat_hour % 7) * 0.06, 2) AS co,
  ROUND(78 + (h.stat_hour * 5 % 27), 1) AS o3,
  CAST(ROUND(55 + (h.stat_hour * 7 % 85)) AS UNSIGNED) AS aqi
FROM (
  SELECT (t.n * 10 + o.n) AS stat_hour
  FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2) t
  CROSS JOIN (
    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
  ) o
  WHERE (t.n * 10 + o.n) <= 23
) h
WHERE 1 = 1
ON DUPLICATE KEY UPDATE
  pm25 = VALUES(pm25),
  pm10 = VALUES(pm10),
  no2 = VALUES(no2),
  so2 = VALUES(so2),
  co = VALUES(co),
  o3 = VALUES(o3),
  aqi = VALUES(aqi);

INSERT INTO aq_pollutant_hourly (
  scope_type, scope_code, stat_date, stat_hour, pm25, pm10, no2, so2, co, o3, aqi
)
SELECT
  'province' AS scope_type,
  p.code AS scope_code,
  @seed_stat_date AS stat_date,
  h.stat_hour,
  ROUND(26 + MOD(CAST(p.code AS UNSIGNED), 13) * 1.3 + (h.stat_hour * 2 % 11), 1) AS pm25,
  ROUND(46 + MOD(CAST(p.code AS UNSIGNED), 17) * 1.1 + (h.stat_hour * 3 % 12), 1) AS pm10,
  ROUND(16 + MOD(CAST(p.code AS UNSIGNED), 11) * 0.8 + (h.stat_hour % 9), 1) AS no2,
  ROUND(7 + MOD(CAST(p.code AS UNSIGNED), 9) * 0.5 + (h.stat_hour % 6), 1) AS so2,
  ROUND(0.45 + MOD(CAST(p.code AS UNSIGNED), 7) * 0.05 + (h.stat_hour % 5) * 0.03, 2) AS co,
  ROUND(68 + MOD(CAST(p.code AS UNSIGNED), 15) * 1.2 + (h.stat_hour * 2 % 13), 1) AS o3,
  CAST(ROUND(42 + MOD(CAST(p.code AS UNSIGNED), 95) + (h.stat_hour * 3 % 36)) AS UNSIGNED) AS aqi
FROM provinces p
CROSS JOIN (
  SELECT (t.n * 10 + o.n) AS stat_hour
  FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2) t
  CROSS JOIN (
    SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
  ) o
  WHERE (t.n * 10 + o.n) <= 23
) h
WHERE 1 = 1
ON DUPLICATE KEY UPDATE
  pm25 = VALUES(pm25),
  pm10 = VALUES(pm10),
  no2 = VALUES(no2),
  so2 = VALUES(so2),
  co = VALUES(co),
  o3 = VALUES(o3),
  aqi = VALUES(aqi);

INSERT INTO aq_pollutant_monthly (
  scope_type, scope_code, stat_year, stat_month, current_pm25, previous_pm25, current_pm10, previous_pm10
)
SELECT
  'national' AS scope_type,
  'all' AS scope_code,
  src.stat_year,
  src.stat_month,
  src.current_pm25,
  src.previous_pm25,
  src.current_pm10,
  src.previous_pm10
FROM (
  -- 来源：生态环境部“2025年X月全国环境空气质量状况”（1-12月）
  SELECT 2025 AS stat_year, 1 AS stat_month, 53.1 AS current_pm25, 50.7 AS previous_pm25, 80.0 AS current_pm10, 74.0 AS previous_pm10
  UNION ALL SELECT 2025, 2, 37.3, 44.6, 58.0, 63.0
  UNION ALL SELECT 2025, 3, 31.5, 33.9, 54.0, 61.0
  UNION ALL SELECT 2025, 4, 28.1, 28.2, 56.0, 53.0
  UNION ALL SELECT 2025, 5, 24.5, 22.5, 46.0, 44.0
  UNION ALL SELECT 2025, 6, 16.3, 17.1, 33.0, 35.0
  UNION ALL SELECT 2025, 7, 14.5, 15.8, 28.0, 29.0
  UNION ALL SELECT 2025, 8, 13.9, 16.7, 27.0, 31.0
  UNION ALL SELECT 2025, 9, 16.0, 18.7, 31.0, 35.0
  UNION ALL SELECT 2025, 10, 23.5, 28.5, 39.0, 48.0
  UNION ALL SELECT 2025, 11, 33.9, 32.4, 59.0, 54.0
  UNION ALL SELECT 2025, 12, 44.6, 43.1, 71.0, 66.0
) src
WHERE 1 = 1
ON DUPLICATE KEY UPDATE
  current_pm25 = VALUES(current_pm25),
  previous_pm25 = VALUES(previous_pm25),
  current_pm10 = VALUES(current_pm10),
  previous_pm10 = VALUES(previous_pm10);

INSERT INTO aq_pollutant_monthly (
  scope_type, scope_code, stat_year, stat_month, current_pm25, previous_pm25, current_pm10, previous_pm10
)
SELECT
  'province' AS scope_type,
  p.code AS scope_code,
  src.stat_year,
  src.stat_month,
  ROUND(
    src.current_pm25 *
      CASE
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 0 THEN 0.82
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 1 THEN 0.90
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 2 THEN 0.96
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 3 THEN 1.00
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 4 THEN 1.06
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 5 THEN 1.12
        ELSE 1.18
      END,
    1
  ) AS current_pm25,
  ROUND(
    src.previous_pm25 *
      CASE
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 0 THEN 0.82
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 1 THEN 0.90
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 2 THEN 0.96
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 3 THEN 1.00
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 4 THEN 1.06
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 5 THEN 1.12
        ELSE 1.18
      END,
    1
  ) AS previous_pm25,
  ROUND(
    src.current_pm10 *
      CASE
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 0 THEN 0.82
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 1 THEN 0.90
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 2 THEN 0.96
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 3 THEN 1.00
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 4 THEN 1.06
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 5 THEN 1.12
        ELSE 1.18
      END,
    1
  ) AS current_pm10,
  ROUND(
    src.previous_pm10 *
      CASE
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 0 THEN 0.82
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 1 THEN 0.90
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 2 THEN 0.96
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 3 THEN 1.00
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 4 THEN 1.06
        WHEN MOD(CAST(LEFT(p.code, 2) AS UNSIGNED), 7) = 5 THEN 1.12
        ELSE 1.18
      END,
    1
  ) AS previous_pm10
FROM provinces p
CROSS JOIN (
  SELECT 2025 AS stat_year, 1 AS stat_month, 53.1 AS current_pm25, 50.7 AS previous_pm25, 80.0 AS current_pm10, 74.0 AS previous_pm10
  UNION ALL SELECT 2025, 2, 37.3, 44.6, 58.0, 63.0
  UNION ALL SELECT 2025, 3, 31.5, 33.9, 54.0, 61.0
  UNION ALL SELECT 2025, 4, 28.1, 28.2, 56.0, 53.0
  UNION ALL SELECT 2025, 5, 24.5, 22.5, 46.0, 44.0
  UNION ALL SELECT 2025, 6, 16.3, 17.1, 33.0, 35.0
  UNION ALL SELECT 2025, 7, 14.5, 15.8, 28.0, 29.0
  UNION ALL SELECT 2025, 8, 13.9, 16.7, 27.0, 31.0
  UNION ALL SELECT 2025, 9, 16.0, 18.7, 31.0, 35.0
  UNION ALL SELECT 2025, 10, 23.5, 28.5, 39.0, 48.0
  UNION ALL SELECT 2025, 11, 33.9, 32.4, 59.0, 54.0
  UNION ALL SELECT 2025, 12, 44.6, 43.1, 71.0, 66.0
) src
WHERE 1 = 1
ON DUPLICATE KEY UPDATE
  current_pm25 = VALUES(current_pm25),
  previous_pm25 = VALUES(previous_pm25),
  current_pm10 = VALUES(current_pm10),
  previous_pm10 = VALUES(previous_pm10);

-- 初始化采集流水日志，避免 ingest 相关表为空
INSERT INTO aq_ingest_batches (
  source, topic, trace_id, total_count, accepted_count, failed_count
)
VALUES
  ('init-seed', 'realtime.province', 'init-trace-province-001', 3, 3, 0),
  ('init-seed', 'realtime.station', 'init-trace-station-001', 3, 3, 0),
  ('init-seed', 'warnings', 'init-trace-warning-001', 2, 2, 0);

SET @seed_batch_province = (
  SELECT id FROM aq_ingest_batches
  WHERE trace_id = 'init-trace-province-001'
  ORDER BY id DESC LIMIT 1
);
SET @seed_batch_station = (
  SELECT id FROM aq_ingest_batches
  WHERE trace_id = 'init-trace-station-001'
  ORDER BY id DESC LIMIT 1
);
SET @seed_batch_warning = (
  SELECT id FROM aq_ingest_batches
  WHERE trace_id = 'init-trace-warning-001'
  ORDER BY id DESC LIMIT 1
);

INSERT INTO aq_ingest_raw_events (
  batch_id, event_type, event_time, payload_json, parse_status, parse_message
)
VALUES
  (
    @seed_batch_province,
    'realtime.province',
    DATE_SUB(@seed_observed_at, INTERVAL 2 HOUR),
    JSON_OBJECT(
      'provinceCode', '110000',
      'observedAt', DATE_FORMAT(DATE_SUB(@seed_observed_at, INTERVAL 2 HOUR), '%Y-%m-%d %H:%i:%s'),
      'pm25', 62.5,
      'aqi', 118
    ),
    'accepted',
    NULL
  ),
  (
    @seed_batch_province,
    'realtime.province',
    DATE_SUB(@seed_observed_at, INTERVAL 1 HOUR),
    JSON_OBJECT(
      'provinceCode', '310000',
      'observedAt', DATE_FORMAT(DATE_SUB(@seed_observed_at, INTERVAL 1 HOUR), '%Y-%m-%d %H:%i:%s'),
      'pm25', 48.3,
      'aqi', 96
    ),
    'accepted',
    NULL
  ),
  (
    @seed_batch_station,
    'realtime.station',
    DATE_SUB(@seed_observed_at, INTERVAL 30 MINUTE),
    JSON_OBJECT(
      'provinceCode', '440000',
      'stationName', '广东省中心站',
      'observedAt', DATE_FORMAT(DATE_SUB(@seed_observed_at, INTERVAL 30 MINUTE), '%Y-%m-%d %H:%i:%s'),
      'pm25', 71.2,
      'aqi', 132
    ),
    'accepted',
    NULL
  ),
  (
    @seed_batch_station,
    'realtime.station',
    DATE_SUB(@seed_observed_at, INTERVAL 20 MINUTE),
    JSON_OBJECT(
      'provinceCode', '320000',
      'stationName', '江苏省东部站',
      'observedAt', DATE_FORMAT(DATE_SUB(@seed_observed_at, INTERVAL 20 MINUTE), '%Y-%m-%d %H:%i:%s'),
      'pm25', 55.4,
      'aqi', 104
    ),
    'accepted',
    NULL
  ),
  (
    @seed_batch_warning,
    'warnings',
    DATE_SUB(@seed_observed_at, INTERVAL 15 MINUTE),
    JSON_OBJECT(
      'provinceCode', '130000',
      'warningType', '空气污染预警',
      'warningLevel', '中度',
      'startTime', DATE_FORMAT(DATE_SUB(@seed_observed_at, INTERVAL 15 MINUTE), '%Y-%m-%d %H:%i:%s')
    ),
    'accepted',
    NULL
  ),
  (
    @seed_batch_warning,
    'warnings',
    DATE_SUB(@seed_observed_at, INTERVAL 10 MINUTE),
    JSON_OBJECT(
      'provinceCode', '500000',
      'warningType', '空气污染预警',
      'warningLevel', '重度',
      'startTime', DATE_FORMAT(DATE_SUB(@seed_observed_at, INTERVAL 10 MINUTE), '%Y-%m-%d %H:%i:%s')
    ),
    'accepted',
    NULL
  );

SET FOREIGN_KEY_CHECKS = 1;
