-- 监测站点排名联动迁移
-- 目标：
-- 1. 优化站点榜单相关查询索引
-- 2. 适配现网数据库，无需重建表

SET @schema_name = DATABASE();

DROP PROCEDURE IF EXISTS apply_station_rank_linkage_migration;

DELIMITER $$
CREATE PROCEDURE apply_station_rank_linkage_migration()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'aq_station_dim'
      AND index_name = 'idx_station_dim_scope_status'
  ) THEN
    ALTER TABLE aq_station_dim
      ADD INDEX idx_station_dim_scope_status (province_code, status, id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'aq_station_realtime_snapshots'
      AND index_name = 'idx_station_observed_station_aqi'
  ) THEN
    ALTER TABLE aq_station_realtime_snapshots
      ADD INDEX idx_station_observed_station_aqi (observed_at, station_id, aqi);
  END IF;
END $$
DELIMITER ;

CALL apply_station_rank_linkage_migration();
DROP PROCEDURE IF EXISTS apply_station_rank_linkage_migration;
