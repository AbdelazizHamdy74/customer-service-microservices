const jwt = require("jsonwebtoken");

const env = require("../config/env");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

const requireAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Authorization token is required");
  }

  const token = authHeader.split(" ")[1];

  let payload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired access token");
  }

  req.user = {
    id: payload.sub,
    role: payload.role,
  };

  next();
});

module.exports = {
  requireAuth,
};

