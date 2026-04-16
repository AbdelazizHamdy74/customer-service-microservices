const logger = require("./logger");
const { getRedisClient } = require("../config/redis");

/**
 * Fetches active AGENT profiles from user-service and picks next id (round-robin).
 */
const fetchAssignableAgentIds = async (env) => {
  const base = env.userServiceUrl;
  if (!base) return [];

  const url = `${String(base).replace(/\/$/, "")}/api/v1/internal/agents/assignable`;
  try {
    const res = await fetch(url, {
      headers: {
        "x-service-key": env.internalServiceKey || "",
      },
    });
    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {};
    }
    if (!res.ok) {
      logger.warn(`assignable agents fetch failed: ${res.status} ${text}`);
      return [];
    }
    const ids = json.data?.ids;
    return Array.isArray(ids) ? ids.filter(Boolean) : [];
  } catch (err) {
    logger.warn(`assignable agents error: ${err?.message || err}`);
    return [];
  }
};

const pickRoundRobinAgentId = async (env) => {
  const ids = await fetchAssignableAgentIds(env);
  if (!ids.length) return null;

  const redis = getRedisClient();
  if (!redis || !redis.isOpen) {
    return ids[0];
  }

  try {
    const n = await redis.incr("ticket:auto-assign:rr");
    const idx = (Number(n) - 1) % ids.length;
    return ids[idx];
  } catch (err) {
    logger.warn(`round-robin redis: ${err?.message || err}`);
    return ids[0];
  }
};

module.exports = { fetchAssignableAgentIds, pickRoundRobinAgentId };
