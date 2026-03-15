export const API_SUCCESS_CODE = 200;

export const sendSuccess = (res, data, message = "成功") => {
  return res.json({
    code: API_SUCCESS_CODE,
    message,
    data,
    success: true,
  });
};

export const sendError = (res, statusCode = 500, message = "请求失败", data = null) => {
  return res.status(statusCode).json({
    code: statusCode,
    message,
    data,
    success: false,
  });
};

export const asyncHandler = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};
