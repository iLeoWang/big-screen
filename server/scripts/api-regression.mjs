import assert from "node:assert/strict";

const PORT = Number(process.env.TEST_PORT || 18080);
const HOST = process.env.TEST_HOST || "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;
const STARTUP_TIMEOUT_MS = 15000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForHealth = async () => {
  const start = Date.now();
  while (Date.now() - start < STARTUP_TIMEOUT_MS) {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) return;
    } catch {
      // keep polling
    }
    await sleep(300);
  }
  throw new Error("Server health check timeout");
};

const getJson = async (path) => {
  const response = await fetch(`${BASE_URL}${path}`);
  const body = await response.json();
  return { status: response.status, body };
};

const assertMapPayload = (data) => {
  assert.ok(Array.isArray(data.provinces), "provinces should be array");
  assert.ok(data.provinces.length >= 34, `expected >=34 provinces, got ${data.provinces.length}`);
  for (const p of data.provinces) {
    assert.ok(typeof p.code === "string" && p.code.length > 0, "province code missing");
    assert.ok(typeof p.name === "string" && p.name.length > 0, "province name missing");
    assert.ok(Number.isFinite(Number(p.aqi)), `invalid aqi for ${p.code}`);
  }
};

const assertOverviewPayload = (data, expectedScope) => {
  assert.equal(data.scope, expectedScope, `scope mismatch: ${data.scope} !== ${expectedScope}`);
  assert.ok(typeof data.scopeName === "string" && data.scopeName.length > 0, "scopeName missing");
  assert.ok(Number.isFinite(data.ts), "ts should be a number");

  // summary
  assert.ok(data.summary, "summary missing");
  assert.ok(Number.isFinite(data.summary.aqi), "summary.aqi invalid");
  assert.ok(typeof data.summary.level === "string", "summary.level invalid");
  assert.ok(Number.isFinite(data.summary.stationCount), "summary.stationCount invalid");
  assert.ok(Number.isFinite(data.summary.warningCount), "summary.warningCount invalid");

  // realtime
  assert.ok(data.realtime, "realtime missing");
  for (const key of ["pm25", "pm10", "no2", "so2", "co", "o3"]) {
    assert.ok(Number.isFinite(data.realtime[key]), `realtime.${key} invalid`);
  }

  // arrays
  assert.ok(Array.isArray(data.airQualityLevels), "airQualityLevels missing");
  assert.ok(Array.isArray(data.warnings), "warnings missing");
  assert.ok(Array.isArray(data.stationRanks), "stationRanks missing");
  assert.ok(Array.isArray(data.hourlyPollutant), "hourlyPollutant missing");
  assert.equal(data.hourlyPollutant.length, 24, "hourlyPollutant should have 24 items");
  assert.ok(Array.isArray(data.monthlyPollutant), "monthlyPollutant missing");
  assert.equal(data.monthlyPollutant.length, 12, "monthlyPollutant should have 12 items");
  assert.ok(Array.isArray(data.cities), "cities missing");

  // consistency
  assert.equal(data.summary.stationCount, data.stationRanks.length, "stationCount mismatch");
  assert.equal(data.summary.warningCount, data.warnings.length, "warningCount mismatch");
};

const closeServerSafely = async (server) => {
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (typeof server.closeAllConnections === "function") {
        server.closeAllConnections();
      }
      resolve();
    }, 3000);

    server.close(() => {
      clearTimeout(timeout);
      resolve();
    });
  });
};

const run = async () => {
  process.env.DEMO_SYNC_ENABLED = "false";
  process.env.DASHBOARD_AGG_SYNC_ENABLED = "false";
  const { startServer } = await import("../src/app.js");
  const server = startServer({ port: PORT, host: HOST });

  try {
    await waitForHealth();

    // ── /meta/provinces ──
    const provincesResp = await getJson("/meta/provinces");
    assert.equal(provincesResp.status, 200);
    assert.equal(provincesResp.body.success, true);
    const provinceCodes = (provincesResp.body.data?.provinces || []).map((item) => item.code);
    assert.ok(provinceCodes.length >= 30, `expected >=30 provinces, got ${provinceCodes.length}`);

    // ── /dashboard/map ──
    const mapResp = await getJson("/dashboard/map");
    assert.equal(mapResp.status, 200);
    assert.equal(mapResp.body.success, true);
    assertMapPayload(mapResp.body.data);

    // ── /dashboard/overview?scope=ALL ──
    const allOverview = await getJson("/dashboard/overview?scope=ALL");
    assert.equal(allOverview.status, 200);
    assert.equal(allOverview.body.success, true);
    assertOverviewPayload(allOverview.body.data, "ALL");

    // ── /dashboard/overview per province ──
    for (const provinceCode of provinceCodes) {
      const resp = await getJson(`/dashboard/overview?scope=${provinceCode}`);
      assert.equal(resp.status, 200, `province ${provinceCode} returned ${resp.status}`);
      assert.equal(resp.body.success, true);
      assertOverviewPayload(resp.body.data, provinceCode);

      // station ranks should only contain stations from this province
      assert.ok(
        resp.body.data.stationRanks.every((item) => item.provinceCode === provinceCode),
        `station ranks contain wrong province for ${provinceCode}`
      );
    }

    // ── error cases ──
    const invalidProvince = await getJson("/dashboard/overview?scope=999999");
    assert.equal(invalidProvince.status, 404);
    assert.equal(invalidProvince.body.success, false);

    // ── old endpoints should be gone ──
    const oldBootstrap = await getJson("/dashboard/bootstrap");
    assert.equal(oldBootstrap.status, 404, "/dashboard/bootstrap should be 404");

    const oldMetrics = await getJson("/dashboard/metrics");
    assert.equal(oldMetrics.status, 404, "/dashboard/metrics should be 404");

    console.log("\nAPI regression checks passed.");
  } finally {
    await closeServerSafely(server);
  }
};

run().catch((error) => {
  console.error("\nAPI regression checks failed:", error);
  process.exitCode = 1;
}).finally(() => {
  process.exit(process.exitCode || 0);
});
