import { Router } from "express";
import { asyncHandler, sendSuccess } from "../utils/response.js";
import {
  ingestProvinceRealtime,
  ingestStationRealtime,
  ingestWarnings,
} from "../services/ingestService.js";

const router = Router();

const readPayload = (req) => {
  const source = typeof req.body?.source === "string" && req.body.source.trim() ? req.body.source.trim() : "collector";
  const traceId = typeof req.body?.traceId === "string" && req.body.traceId.trim() ? req.body.traceId.trim() : null;
  const records = Array.isArray(req.body?.records) ? req.body.records : [];
  return { source, traceId, records };
};

router.post(
  "/realtime/province",
  asyncHandler(async (req, res) => {
    const payload = readPayload(req);
    const result = await ingestProvinceRealtime(payload);
    sendSuccess(res, result);
  })
);

router.post(
  "/realtime/station",
  asyncHandler(async (req, res) => {
    const payload = readPayload(req);
    const result = await ingestStationRealtime(payload);
    sendSuccess(res, result);
  })
);

router.post(
  "/warnings",
  asyncHandler(async (req, res) => {
    const payload = readPayload(req);
    const result = await ingestWarnings(payload);
    sendSuccess(res, result);
  })
);

export default router;
