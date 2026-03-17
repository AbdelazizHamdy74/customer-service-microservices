const User = require("../models/User");
const logger = require("../utils/logger");

const handleCustomerProvisioned = async (payload) => {
  const { authUserId, customerId } = payload || {};
  if (!authUserId || !customerId) {
    logger.warn("customer.provisioned missing authUserId or customerId");
    return;
  }

  const user = await User.findById(authUserId);
  if (!user) {
    logger.warn(`Auth user not found for customer.provisioned: ${authUserId}`);
    return;
  }

  if (user.linkedId === customerId) return;

  user.linkedId = customerId;
  await user.save();
  logger.info(`Linked customer ${customerId} to auth user ${authUserId}`);
};

const handleAgentProvisioned = async (payload) => {
  const { authUserId, agentId } = payload || {};
  if (!authUserId || !agentId) {
    logger.warn("agent.provisioned missing authUserId or agentId");
    return;
  }

  const user = await User.findById(authUserId);
  if (!user) {
    logger.warn(`Auth user not found for agent.provisioned: ${authUserId}`);
    return;
  }

  if (user.linkedId === agentId) return;

  user.linkedId = agentId;
  await user.save();
  logger.info(`Linked agent ${agentId} to auth user ${authUserId}`);
};

module.exports = {
  handleCustomerProvisioned,
  handleAgentProvisioned,
};
