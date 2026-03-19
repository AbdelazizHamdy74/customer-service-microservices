const { getRedisClient } = require("../config/redis");

const getCache = async (key) => {
  const redis = getRedisClient();
  if (!redis) return null;
  return redis.get(key);
};

const setCache = async (key, value, ttlInSeconds = 300) => {
  const redis = getRedisClient();
  if (!redis) return;
  await redis.set(key, value, { EX: ttlInSeconds });
};

const deleteCache = async (key) => {
  const redis = getRedisClient();
  if (!redis) return;
  await redis.del(key);
};

const deleteByPattern = async (pattern) => {
  const redis = getRedisClient();
  if (!redis) return;

  const keys = [];
  for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: 50 })) {
    keys.push(key);
  }
  if (keys.length > 0) {
    await redis.del(keys);
  }
};

module.exports = {
  getCache,
  setCache,
  deleteCache,
  deleteByPattern,
};
