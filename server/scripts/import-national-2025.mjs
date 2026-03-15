import { query, pool } from "../src/db.js";

const NATIONAL_MONTHLY_2025_ROWS = [
  [1, 53.1, 50.7, 80.0, 74.0],
  [2, 37.3, 44.6, 58.0, 63.0],
  [3, 31.5, 33.9, 54.0, 61.0],
  [4, 28.1, 28.2, 56.0, 53.0],
  [5, 24.5, 22.5, 46.0, 44.0],
  [6, 16.3, 17.1, 33.0, 35.0],
  [7, 14.5, 15.8, 28.0, 29.0],
  [8, 13.9, 16.7, 27.0, 31.0],
  [9, 16.0, 18.7, 31.0, 35.0],
  [10, 23.5, 28.5, 39.0, 48.0],
  [11, 33.9, 32.4, 59.0, 54.0],
  [12, 44.6, 43.1, 71.0, 66.0],
];

const UPSERT_SQL = `
  INSERT INTO aq_pollutant_monthly (
    scope_type,
    scope_code,
    stat_year,
    stat_month,
    current_pm25,
    previous_pm25,
    current_pm10,
    previous_pm10
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
    current_pm25 = VALUES(current_pm25),
    previous_pm25 = VALUES(previous_pm25),
    current_pm10 = VALUES(current_pm10),
    previous_pm10 = VALUES(previous_pm10)
`;

const main = async () => {
  try {
    for (const [month, currentPm25, previousPm25, currentPm10, previousPm10] of NATIONAL_MONTHLY_2025_ROWS) {
      await query(UPSERT_SQL, [
        "national",
        "all",
        2025,
        month,
        currentPm25,
        previousPm25,
        currentPm10,
        previousPm10,
      ]);
    }

    const rows = await query(
      `
        SELECT
          stat_month,
          current_pm25,
          previous_pm25,
          current_pm10,
          previous_pm10
        FROM aq_pollutant_monthly
        WHERE scope_type = 'national'
          AND scope_code = 'all'
          AND stat_year = 2025
        ORDER BY stat_month ASC
      `
    );

    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
