const dotenv = require("dotenv");

dotenv.config();

const requiredVars = [
  "PORT",
  "KAFKA_BROKERS",
  "KAFKA_CLIENT_ID",
  "BREVO_API_KEY",
  "EMAIL_FROM",
  "FRONTEND_URL",
  "OTP_TTL_MINUTES",
];

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT),
  kafkaBrokers: process.env.KAFKA_BROKERS.split(",").map((broker) => broker.trim()),
  kafkaClientId: process.env.KAFKA_CLIENT_ID,
  brevoApiKey: process.env.BREVO_API_KEY,
  emailFrom: process.env.EMAIL_FROM,
  frontendUrl: process.env.FRONTEND_URL,
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES),
};
