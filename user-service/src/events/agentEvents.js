const Agent = require("../models/Agent");
const { publishEvent } = require("../config/kafka");
const { validateCreateAgentPayload } = require("../utils/validators/agentValidator");
const logger = require("../utils/logger");

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

  await publishEvent("agent.provisioned", {
    authUserId: payload.authUserId,
    agentId: agent.id,
  });

  logger.info(`agent.invited provisioned: ${agent.id}`);
};

module.exports = {
  handleAgentInvited,
};
