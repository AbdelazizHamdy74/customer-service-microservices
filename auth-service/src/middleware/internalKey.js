// Middleware to protect internal endpoints with a shared key
module.exports = function internalKeyMiddleware(req, res, next) {
  const key = req.headers["x-internal-key"];
  if (!key || key !== process.env.INTERNAL_SERVICE_KEY) {
    return res
      .status(401)
      .json({
        success: false,
        message: "Unauthorized (internal key required)",
      });
  }
  next();
};
