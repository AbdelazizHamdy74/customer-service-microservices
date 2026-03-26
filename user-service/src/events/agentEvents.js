const Agent = require("../models/Agent");
const { publishEvent } = require("../config/kafka");
const { validateCreateAgentPayload } = require("../utils/validators/agentValidator");
const logger = require("../utils/logger");

const buildAgentEventPayload = (agent, extra = {}) => ({
  agentId: agent.id,
  authUserId: agent.authUserId || null,
  firstName: agent.firstName,
  lastName: agent.lastName,
  fullName: agent.fullName || `${agent.firstName} ${agent.lastName}`.trim(),
  email: agent.email || "",
  phone: agent.phone,
  role: agent.role,
  status: agent.status,
  team: agent.team || "",
  skills: Array.isArray(agent.skills) ? agent.skills : [],
  performance: agent.performance || {},
  createdAt: agent.createdAt,
  updatedAt: agent.updatedAt,
  ...extra,
});

const handleAgentInvited = async (payload) => {
  const errors = validateCreateAgentPayload(payload || {});
  if (errors.length) {
    logger.warn(`agent.invited validation failed: ${errors.join(", ")}`);
    return;
  }

  if (!payload.authUserId) {
    logger.warn("agent.invited missing authUserId");
    return;
  }

  const existing = await Agent.findOne({ authUserId: payload.authUserId });
  if (existing) {
    logger.info(`agent.invited already provisioned: ${payload.authUserId}`);
    return;
  }

  const agent = await Agent.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email ? payload.email.toLowerCase() : undefined,
    phone: payload.phone,
    role: (payload.role || "AGENT").toUpperCase(),
    status: (payload.status || "ACTIVE").toUpperCase(),
    team: payload.team,
    skills: payload.skills,
    authUserId: payload.authUserId,
    createdBy: payload.createdBy || "auth-service",
  });

  await publishEvent(
    "agent.provisioned",
    buildAgentEventPayload(agent, {
      authUserId: payload.authUserId,
      createdBy: payload.createdBy || "auth-service",
    })
  );

  logger.info(`agent.invited provisioned: ${agent.id}`);
};

module.exports = {
  handleAgentInvited,
};
