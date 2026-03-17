const env = require("../config/env");
const ApiError = require("../utils/apiError");

const requireServiceKey = (req, res, next) => {
  const key = req.headers["x-service-key"];
  if (!key || key !== env.internalServiceKey) {
    throw new ApiError(401, "Invalid service key");
  }
  next();
};

module.exports = { requireServiceKey };
