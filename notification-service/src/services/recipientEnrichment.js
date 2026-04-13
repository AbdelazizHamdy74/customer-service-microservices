const logger = require("../utils/logger");
const env = require("../config/env");

const fetchAgentEmail = async (agentId) => {
  if (!agentId || !env.userServiceUrl || !env.internalServiceKey) {
    return null;
  }

  const base = env.userServiceUrl.replace(/\/$/, "");
  const url = `${base}/api/v1/internal/agents/${encodeURIComponent(agentId)}`;

  try {
    const res = await fetch(url, {
      headers: { "x-service-key": env.internalServiceKey },
    });
    if (!res.ok) {
      logger.warn(`Agent lookup failed: ${res.status} ${url}`);
      return null;
    }
    const json = await res.json();
    const email = json?.data?.email;
    return typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
  } catch (err) {
    logger.warn(`Agent email fetch error: ${err?.message || err}`);
    return null;
  }
};

/**
 * Ensures EMAIL channel is only kept when a recipient email can be resolved (e.g. agent profile).
 */
const enrichNotificationsForDelivery = async (notifications = []) => {
  for (const n of notifications) {
    const channels = Array.isArray(n.channels) ? n.channels : ["IN_APP"];
    if (!channels.map((c) => String(c).toUpperCase()).includes("EMAIL")) {
      continue;
    }

    if (n.recipient?.email) {
      continue;
    }

    const type = n.recipient?.recipientType;
    const id = n.recipient?.recipientId;

    if (type === "AGENT" && id) {
      const email = await fetchAgentEmail(id);
      if (email) {
        n.recipient = { ...n.recipient, email };
      } else {
        n.channels = channels.filter((c) => String(c).toUpperCase() !== "EMAIL");
      }
    } else {
      n.channels = channels.filter((c) => String(c).toUpperCase() !== "EMAIL");
    }
  }
};

module.exports = {
  enrichNotificationsForDelivery,
  fetchAgentEmail,
};
