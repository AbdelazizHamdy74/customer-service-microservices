const dotenv = require("dotenv");

dotenv.config();

const requiredVars = [
  "PORT",
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "REDIS_URL",
  "KAFKA_BROKERS",
  "KAFKA_CLIENT_ID",
  "INTERNAL_SERVICE_KEY",
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
  redisUrl: process.env.REDIS_URL,
  kafkaBrokers: process.env.KAFKA_BROKERS.split(",").map((broker) => broker.trim()),
  kafkaClientId: process.env.KAFKA_CLIENT_ID,
  internalServiceKey: process.env.INTERNAL_SERVICE_KEY,
  allowedOrigins: parseAllowedOrigins(process.env.CORS_ORIGINS),
};
