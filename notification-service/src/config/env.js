const dotenv = require("dotenv");

dotenv.config();

const requiredVars = ["PORT", "MONGO_URI", "JWT_ACCESS_SECRET", "KAFKA_BROKERS", "KAFKA_CLIENT_ID"];

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const defaultNotificationTopics = [
  "auth.login",
  "auth.logout",
  "auth.forgot-password",
  "auth.password-reset",
  "customer.invited",
  "customer.provisioned",
  "customer.created",
  "customer.updated",
  "customer.deleted",
  "agent.invited",
  "agent.provisioned",
  "agent.created",
  "agent.updated",
  "agent.deleted",
  "agent.role.assigned",
  "ticket.created",
  "ticket.updated",
  "ticket.assigned",
  "ticket.closed",
  "ticket.reopened",
  "ticket.commented",
];

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT),
  mongoUri: process.env.MONGO_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  kafkaBrokers: process.env.KAFKA_BROKERS.split(",").map((broker) => broker.trim()),
  kafkaClientId: process.env.KAFKA_CLIENT_ID,
  notificationTopics: (process.env.NOTIFICATION_TOPICS || defaultNotificationTopics.join(","))
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean),
  brevoApiKey: process.env.BREVO_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "",
  smsProvider: (process.env.SMS_PROVIDER || "mock").toUpperCase(),
  smsFrom: process.env.SMS_FROM || "",
};
