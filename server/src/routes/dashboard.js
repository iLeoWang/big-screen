import { Router } from "express";
import { asyncHandler, sendSuccess } from "../utils/response.js";
import { getMapData, getOverviewData } from "../services/dashboardAggregateService.js";

const router = Router();

/**
 * GET /dashboard/map
 * 地图数据：返回所有省份的 AQI、污染物、坐标信息
 * 始终返回全国所有省份，不接受 scope 参数
 */
router.get(
  "/map",
  asyncHandler(async (_req, res) => {
    const data = await getMapData();
    sendSuccess(res, data);
  })
);

/**
 * GET /dashboard/overview?scope=ALL|{provinceCode}
 * 聚合数据：返回一个大对象，包含各面板模块的数据
 * scope=ALL 或不传 → 全国数据
 * scope={provinceCode} → 该省份数据
 */
router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const scope = req.query.scope ? String(req.query.scope).trim() : "ALL";
    const data = await getOverviewData(scope);
    sendSuccess(res, data);
  })
);

export default router;
