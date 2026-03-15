import { Router } from "express";
import { asyncHandler, sendError, sendSuccess } from "../utils/response.js";
import { query } from "../db.js";
import { getAllDicts, getDictByType } from "../services/dictService.js";

const router = Router();

router.get(
  "/provinces",
  asyncHandler(async (_req, res) => {
    const rows = await query(
      `
        SELECT code, name, longitude, latitude
        FROM provinces
        ORDER BY code ASC
      `
    );
    const provinces = rows.map((row) => ({
      code: row.code,
      name: row.name,
      longitude: Number(row.longitude),
      latitude: Number(row.latitude),
    }));
    sendSuccess(res, { provinces });
  })
);

router.get(
  "/dicts",
  asyncHandler(async (_req, res) => {
    const dicts = await getAllDicts();
    sendSuccess(res, dicts);
  })
);

router.get(
  "/dicts/:type",
  asyncHandler(async (req, res) => {
    const data = await getDictByType(req.params.type);
    if (!data) {
      return sendError(res, 404, `字典不存在: ${req.params.type}`);
    }
    return sendSuccess(res, data);
  })
);

export default router;
