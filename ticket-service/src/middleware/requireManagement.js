const ApiError = require("../utils/apiError");

const MANAGEMENT_ROLES = ["ADMIN", "SUPERVISOR"];

const requireManagement = (req, res, next) => {
  if (!MANAGEMENT_ROLES.includes(req.user?.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }
  next();
};

module.exports = { requireManagement };
