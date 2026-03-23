const http = require("http");
const mongoose = require("mongoose");

const app = require("./app");
const env = require("./config/env");
const { connectDB } = require("./config/db");
const { connectKafkaConsumer, disconnectKafkaConsumer } = require("./config/kafka");
const { handleEventNotification } = require("./events/notificationEvents");
const logger = require("./utils/logger");

let server;

const start = async () => {
  try {
    await connectDB(env.mongoUri);
    await connectKafkaConsumer({
      clientId: env.kafkaClientId,
      brokers: env.kafkaBrokers,
      groupId: `${env.kafkaClientId}-events`,
      topics: env.notificationTopics,
      onMessage: handleEventNotification,
    });

    server = http.createServer(app);
    server.listen(env.port, () => {
      logger.info(`Notification service listening on port ${env.port}`);
    });
  } catch (error) {
    logger.error(`Failed to start notification service: ${error.message}`);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down notification service...`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  try {
    await mongoose.connection.close();
  } catch (error) {
    logger.warn(`Mongo close warning: ${error.message}`);
  }

  try {
    await disconnectKafkaConsumer();
  } catch (error) {
    logger.warn(`Kafka close warning: ${error.message}`);
  }

  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
