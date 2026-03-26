const http = require("http");
const mongoose = require("mongoose");

const app = require("./app");
const env = require("./config/env");
const { connectDB } = require("./config/db");
const { connectRedis, getRedisClient } = require("./config/redis");
const { connectKafkaConsumer, disconnectKafkaConsumer } = require("./config/kafka");
const { handleReportEvent } = require("./events/reportEvents");
const logger = require("./utils/logger");

let server;

const start = async () => {
  try {
    await connectDB(env.mongoUri);
    await connectRedis(env.redisUrl);
    await connectKafkaConsumer({
      clientId: env.kafkaClientId,
      brokers: env.kafkaBrokers,
      groupId: `${env.kafkaClientId}-events`,
      topics: env.reportTopics,
      onMessage: handleReportEvent,
    });

    server = http.createServer(app);
    server.listen(env.port, () => {
      logger.info(`Report service listening on port ${env.port}`);
    });
  } catch (error) {
    logger.error(`Failed to start report service: ${error.message}`);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down report service...`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  try {
    await mongoose.connection.close();
  } catch (error) {
    logger.warn(`Mongo close warning: ${error.message}`);
  }

  try {
    const redis = getRedisClient();
    if (redis && redis.isOpen) {
      await redis.quit();
    }
  } catch (error) {
    logger.warn(`Redis close warning: ${error.message}`);
  }

  try {
    await disconnectKafkaConsumer();
  } catch (error) {
    logger.warn(`Kafka consumer close warning: ${error.message}`);
  }

  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
