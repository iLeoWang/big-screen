import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { pingDatabase } from "./db.js";
import { sendError, sendSuccess } from "./utils/response.js";
import dashboardRouter from "./routes/dashboard.js";
import metaRouter from "./routes/meta.js";
import ingestRouter from "./routes/ingest.js";
import { startDemoSync } from "./services/demoSyncService.js";
import { startDashboardAggregateSync } from "./services/dashboardAggregateService.js";

dotenv.config();

export const createApp = () => {
  const app = express();
  // Realtime dashboard APIs should always return fresh payloads and avoid 304 flows.
  app.set("etag", false);

  app.use(cors());
  app.use(express.json());
  app.use((req, res, next) => {
    if (req.path.startsWith("/dashboard")) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
    }
    next();
  });

  app.get("/health", async (_req, res) => {
    try {
      const dbOk = await pingDatabase();
      sendSuccess(res, {
        status: "ok",
        db: dbOk ? "up" : "down",
        ts: Date.now(),
      });
    } catch (error) {
      sendError(res, 500, "健康检查失败", {
        status: "error",
        ts: Date.now(),
      });
    }
  });

  app.use("/dashboard", dashboardRouter);
  app.use("/meta", metaRouter);
  app.use("/ingest", ingestRouter);

  app.use((req, res) => {
    sendError(res, 404, `接口不存在: ${req.method} ${req.path}`);
  });

  app.use((error, _req, res, _next) => {
    const statusCode = Number(error?.statusCode) || 500;
    if (statusCode >= 500) {
      console.error("Unhandled server error:", error);
    }
    sendError(res, statusCode, error.message || "服务器内部错误");
  });

  return app;
};

export const createServer = () => http.createServer(createApp());

export const startServer = ({
  port = Number(process.env.PORT || 8080),
  host = process.env.HOST || "127.0.0.1",
} = {}) => {
  const server = createServer();
  const demoSyncEnabled = process.env.DEMO_SYNC_ENABLED === "true";
  const aggregateSyncEnabled = process.env.DASHBOARD_AGG_SYNC_ENABLED !== "false";
  const stopDemoSync = demoSyncEnabled ? startDemoSync() : null;
  const stopAggregateSync = aggregateSyncEnabled ? startDashboardAggregateSync() : null;

  server.listen(port, host, () => {
    console.log(`Air-quality server started: http://${host}:${port}`);
  });

  if (stopDemoSync) {
    server.on("close", () => {
      stopDemoSync();
    });
  }

  if (stopAggregateSync) {
    server.on("close", () => {
      stopAggregateSync();
    });
  }

  return server;
};

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  startServer();
}
