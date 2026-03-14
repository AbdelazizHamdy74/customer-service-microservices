const { createClient } = require("redis");
const logger = require("../utils/logger");

let redisClient;

const getRedisClient = () => redisClient;

const connectRedis = async (redisUrl) => {
  if (!redisClient) {
    redisClient = createClient({ url: redisUrl });
    redisClient.on("error", (error) => {
      logger.error(`Redis error: ${error.message}`);
    });
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
    logger.info("Redis connected for user-service");
  }

  return redisClient;
};

module.exports = { connectRedis, getRedisClient };
