import { rebuildAllAggregates } from "../src/services/dashboardAggregateService.js";
import { pool } from "../src/db.js";

const run = async () => {
  const startedAt = Date.now();
  const result = await rebuildAllAggregates();
  const costMs = Date.now() - startedAt;
  console.log(`[dashboard-aggregate] rebuild completed scopes=${result.scopeCount} costMs=${costMs}`);
};

run().catch((error) => {
  console.error("[dashboard-aggregate] rebuild failed:", error);
  process.exitCode = 1;
}).finally(async () => {
  await pool.end();
});
