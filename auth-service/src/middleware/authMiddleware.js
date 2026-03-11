const jwt = require("jsonwebtoken");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const User = require("../models/User");

const requireAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Authorization token is required");
  }

  const accessToken = authHeader.split(" ")[1];
  let payload;
  try {
    payload = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired access token");
  }

  const user = await User.findById(payload.sub).select("_id role isActive tokenVersion");
  if (!user || !user.isActive) {
    throw new ApiError(401, "User not found or inactive");
  }

  if (payload.tokenVersion !== user.tokenVersion) {
    throw new ApiError(401, "Session is outdated. Please login again");
  }

  req.user = {
    id: user.id,
    role: user.role,
  };
  next();
});

module.exports = {
  requireAuth,
};

