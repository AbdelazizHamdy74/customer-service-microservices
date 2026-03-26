const dotenv = require("dotenv");

dotenv.config();

const requiredVars = [
  "PORT",
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "REDIS_URL",
  "KAFKA_BROKERS",
  "KAFKA_CLIENT_ID",
];

for (const key of requiredVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const defaultReportTopics = [
  "customer.created",
  "customer.updated",
  "customer.deleted",
  "customer.provisioned",
  "agent.created",
  "agent.updated",
  "agent.deleted",
  "agent.provisioned",
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
  redisUrl: process.env.REDIS_URL,
  kafkaBrokers: process.env.KAFKA_BROKERS.split(",").map((broker) => broker.trim()),
  kafkaClientId: process.env.KAFKA_CLIENT_ID,
  reportTopics: (process.env.REPORT_TOPICS || defaultReportTopics.join(","))
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean),
};
