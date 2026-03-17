const http = require("http");
const mongoose = require("mongoose");

const app = require("./app");
const env = require("./config/env");
const { connectDB } = require("./config/db");
const { connectRedis, getRedisClient } = require("./config/redis");
const {
  connectKafkaProducer,
  connectKafkaConsumer,
  disconnectKafkaProducer,
  disconnectKafkaConsumer,
} = require("./config/kafka");
const { handleCustomerInvited } = require("./events/customerEvents");
const logger = require("./utils/logger");

let server;

const start = async () => {
  try {
    await connectDB(env.mongoUri);
    await connectRedis(env.redisUrl);
    await connectKafkaProducer({
      clientId: env.kafkaClientId,
      brokers: env.kafkaBrokers,
    });
    await connectKafkaConsumer({
      clientId: env.kafkaClientId,
      brokers: env.kafkaBrokers,
      groupId: `${env.kafkaClientId}-customer`,
      topics: ["customer.invited"],
      onMessage: async (topic, payload) => {
        if (topic === "customer.invited") {
          await handleCustomerInvited(payload);
        }
      },
    });

    server = http.createServer(app);
    server.listen(env.port, () => {
      logger.info(`Customer service listening on port ${env.port}`);
    });
  } catch (error) {
    logger.error(`Failed to start customer service: ${error.message}`);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down customer service...`);

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
    await disconnectKafkaProducer();
  } catch (error) {
    logger.warn(`Kafka close warning: ${error.message}`);
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
