const jwt = require("jsonwebtoken");

const env = require("../config/env");
const { publishEvent } = require("../config/kafka");
const { getRedisClient } = require("../config/redis");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { createAccessToken, createRefreshToken, verifyToken } = require("../utils/token");
const { generateRandomToken, sha256 } = require("../utils/crypto");
const {
  validateLoginPayload,
  validateForgotPasswordPayload,
  validateResetPasswordPayload,
} = require("../utils/validators/authValidator");

const persistRefreshToken = async (refreshToken, jti, userId, tokenVersion) => {
  const redis = getRedisClient();
  if (!redis) return;

  const decoded = jwt.decode(refreshToken);
  const ttlInSeconds = Math.max(1, decoded.exp - Math.floor(Date.now() / 1000));

  await redis.set(
    `refresh:${jti}`,
    JSON.stringify({
      userId,
      tokenVersion,
    }),
    { EX: ttlInSeconds }
  );
};

const issueTokens = async (user) => {
  const payload = {
    userId: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };

  const accessToken = createAccessToken(payload, env.jwtAccessSecret, env.accessTokenExpiresIn);
  const { token: refreshToken, jti } = createRefreshToken(
    payload,
    env.jwtRefreshSecret,
    env.refreshTokenExpiresIn
  );

  await persistRefreshToken(refreshToken, jti, user.id, user.tokenVersion);

  return { accessToken, refreshToken };
};

const login = asyncHandler(async (req, res) => {
  const errors = validateLoginPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select("+password");
  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isMatch = await user.comparePassword(req.body.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials");
  }

  const tokens = await issueTokens(user);

  await publishEvent("auth.login", {
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new ApiError(400, "refreshToken is required");
  }

  let payload;
  try {
    payload = verifyToken(refreshToken, env.jwtRefreshSecret);
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const redis = getRedisClient();
  if (redis) {
    await redis.del(`refresh:${payload.jti}`);
  }

  await publishEvent("auth.logout", {
    userId: payload.sub,
  });

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: incomingRefreshToken } = req.body;
  if (!incomingRefreshToken) {
    throw new ApiError(400, "refreshToken is required");
  }

  let payload;
  try {
    payload = verifyToken(incomingRefreshToken, env.jwtRefreshSecret);
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const redis = getRedisClient();
  if (!redis) throw new ApiError(503, "Token store is unavailable");

  const storedSession = await redis.get(`refresh:${payload.jti}`);
  if (!storedSession) {
    throw new ApiError(401, "Refresh token has been revoked");
  }

  const session = JSON.parse(storedSession);
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new ApiError(401, "User not found or inactive");
  }

  if (session.userId !== user.id || session.tokenVersion !== user.tokenVersion) {
    throw new ApiError(401, "Session mismatch");
  }

  await redis.del(`refresh:${payload.jti}`);
  const tokens = await issueTokens(user);

  res.status(200).json({
    success: true,
    message: "Token refreshed",
    data: tokens,
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const errors = validateForgotPasswordPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const email = req.body.email.toLowerCase();
  const user = await User.findOne({ email }).select("+resetPasswordToken +resetPasswordExpires");

  if (user) {
    const rawToken = generateRandomToken();
    user.resetPasswordToken = sha256(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await publishEvent("auth.forgot-password", {
      userId: user.id,
      email: user.email,
      resetToken: rawToken,
      resetTokenExpiresAt: user.resetPasswordExpires.toISOString(),
    });
  }

  res.status(200).json({
    success: true,
    message: "If the email exists, a reset link will be sent",
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const errors = validateResetPasswordPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const hashedToken = sha256(req.body.token);
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  }).select("+resetPasswordToken +resetPasswordExpires");

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  user.password = req.body.newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.tokenVersion += 1;
  await user.save();

  await publishEvent("auth.password-reset", {
    userId: user.id,
    email: user.email,
  });

  res.status(200).json({
    success: true,
    message: "Password has been reset successfully",
  });
});

module.exports = {
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
};

