import assert from "node:assert/strict";
import { query, pool } from "../src/db.js";

const TABLES_WITH_VERSION = [
  "agg_scope_overview",
  "agg_scope_air_levels",
  "agg_scope_station_ranks",
  "agg_scope_warnings",
  "agg_scope_hourly",
  "agg_scope_monthly",
  "agg_scope_cities",
];

const getScopeKey = (scopeType, scopeCode) => `${scopeType}:${scopeCode}`;

const run = async () => {
  const provinceRows = await query(`SELECT code FROM provinces ORDER BY code ASC`);
  const expectedScopes = [
    { scopeType: "national", scopeCode: "all" },
    ...provinceRows.map((row) => ({ scopeType: "province", scopeCode: row.code })),
  ];
  const expectedScopeKeys = new Set(
    expectedScopes.map((item) => getScopeKey(item.scopeType, item.scopeCode))
  );

  const overviewRows = await query(`
    SELECT scope_type, scope_code, snapshot_version
    FROM agg_scope_overview
    ORDER BY scope_type, scope_code
  `);

  assert.equal(overviewRows.length, expectedScopes.length, "agg_scope_overview scope count mismatch");
  for (const row of overviewRows) {
    const scopeKey = getScopeKey(row.scope_type, row.scope_code);
    assert.ok(expectedScopeKeys.has(scopeKey), `unexpected scope in overview: ${scopeKey}`);
    assert.ok(Number.isFinite(Number(row.snapshot_version)), `invalid snapshot_version: ${scopeKey}`);
  }

  const hourlyRows = await query(`
    SELECT scope_type, scope_code, COUNT(*) AS row_count
    FROM agg_scope_hourly
    GROUP BY scope_type, scope_code
  `);
  const hourlyCountByScope = new Map(
    hourlyRows.map((row) => [getScopeKey(row.scope_type, row.scope_code), Number(row.row_count || 0)])
  );
  for (const scope of expectedScopes) {
    const scopeKey = getScopeKey(scope.scopeType, scope.scopeCode);
    assert.equal(hourlyCountByScope.get(scopeKey), 24, `hourly rows != 24 for ${scopeKey}`);
  }

  const monthlyRows = await query(`
    SELECT scope_type, scope_code, COUNT(*) AS row_count
    FROM agg_scope_monthly
    GROUP BY scope_type, scope_code
  `);
  const monthlyCountByScope = new Map(
    monthlyRows.map((row) => [getScopeKey(row.scope_type, row.scope_code), Number(row.row_count || 0)])
  );
  for (const scope of expectedScopes) {
    const scopeKey = getScopeKey(scope.scopeType, scope.scopeCode);
    assert.equal(monthlyCountByScope.get(scopeKey), 12, `monthly rows != 12 for ${scopeKey}`);
  }

  for (const scope of expectedScopes) {
    const scopeKey = getScopeKey(scope.scopeType, scope.scopeCode);
    const versionSet = new Set();

    for (const tableName of TABLES_WITH_VERSION) {
      const rows = await query(
        `
          SELECT DISTINCT snapshot_version
          FROM ${tableName}
          WHERE scope_type = ? AND scope_code = ?
        `,
        [scope.scopeType, scope.scopeCode]
      );

      assert.ok(rows.length <= 1, `multiple snapshot_version in ${tableName} for ${scopeKey}`);
      if (rows.length === 1) {
        versionSet.add(Number(rows[0].snapshot_version));
      }
    }

    assert.equal(versionSet.size, 1, `cross-table snapshot_version mismatch for ${scopeKey}`);
  }

  console.log(
    `[dashboard-aggregate] verify success scopes=${expectedScopes.length} hourly=24 monthly=12 snapshot=consistent`
  );
};

run()
  .catch((error) => {
    console.error("[dashboard-aggregate] verify failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
