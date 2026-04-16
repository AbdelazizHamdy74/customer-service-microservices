const logger = require("./logger");

/**
 * Creates an auth User for a newly created Agent so they can log in (direct create flow).
 * Requires AUTH_SERVICE_URL and the same INTERNAL_SERVICE_KEY as auth-service.
 */
const provisionAuthUser = async (env, agent) => {
  const base = env.authServiceUrl;
  if (!base || !agent?.email) {
    return null;
  }

  const url = `${String(base).replace(/\/$/, "")}/api/v1/internal/users`;
  const password = env.defaultNewAgentPassword || "password123";
  const name =
    agent.fullName || `${agent.firstName || ""} ${agent.lastName || ""}`.trim() || agent.email;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": env.internalServiceKey,
      },
      body: JSON.stringify({
        name,
        email: agent.email,
        password,
        role: agent.role || "AGENT",
        userType: "AGENT",
        linkedId: agent.id,
        isActive: true,
      }),
    });

    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = {};
    }

    if (res.status === 201 && json.data?.userId) {
      return json.data.userId;
    }

    if (res.status === 409) {
      logger.warn(
        `provisionAuthUser: email already registered in auth (${agent.email}). Use Invite flow or link manually.`,
      );
      return null;
    }

    logger.warn(`provisionAuthUser failed: ${res.status} ${text}`);
    return null;
  } catch (err) {
    logger.warn(`provisionAuthUser error: ${err?.message || err}`);
    return null;
  }
};

module.exports = { provisionAuthUser };
