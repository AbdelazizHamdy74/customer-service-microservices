const dotenv = require("dotenv");

dotenv.config();

const requiredVars = [
  "PORT",
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "ACCESS_TOKEN_EXPIRES_IN",
  "REFRESH_TOKEN_EXPIRES_IN",
  "OTP_TTL_MINUTES",
  "REDIS_URL",
  "KAFKA_BROKERS",
  "KAFKA_CLIENT_ID",
];

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const defaultAllowedOrigins = ["http://localhost:4200", "http://127.0.0.1:4200", "http://localhost:4000"];
const parseAllowedOrigins = (value) =>
  (value || defaultAllowedOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT),
  mongoUri: process.env.MONGO_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
  inviteTokenTtlMinutes: Number(process.env.OTP_TTL_MINUTES),
  redisUrl: process.env.REDIS_URL,
  kafkaBrokers: process.env.KAFKA_BROKERS.split(",").map((broker) => broker.trim()),
  kafkaClientId: process.env.KAFKA_CLIENT_ID,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:4200",
  allowedOrigins: parseAllowedOrigins(process.env.CORS_ORIGINS || process.env.FRONTEND_URL),
  /** Used when admin/supervisor invites an agent (auth invite flow). Override in production. */
  defaultAgentInvitePassword: process.env.DEFAULT_AGENT_INVITE_PASSWORD || "password123",
};
