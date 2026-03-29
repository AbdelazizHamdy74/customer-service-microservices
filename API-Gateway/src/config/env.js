const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const requiredVars = [
  "PORT",
  "AUTH_SERVICE_URL",
  "CUSTOMER_SERVICE_URL",
  "USER_SERVICE_URL",
  "TICKET_SERVICE_URL",
  "NOTIFICATION_SERVICE_URL",
  "REPORT_SERVICE_URL",
];

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const defaultAllowedOrigins = ["http://localhost:4200", "http://127.0.0.1:4200"];
const parseAllowedOrigins = (value) =>
  (value || defaultAllowedOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT),
  allowedOrigins: parseAllowedOrigins(process.env.CORS_ORIGINS),
  services: {
    auth: process.env.AUTH_SERVICE_URL,
    customer: process.env.CUSTOMER_SERVICE_URL,
    user: process.env.USER_SERVICE_URL,
    email: process.env.EMAIL_SERVICE_URL || "",
    ticket: process.env.TICKET_SERVICE_URL,
    notification: process.env.NOTIFICATION_SERVICE_URL,
    report: process.env.REPORT_SERVICE_URL,
  },
};
