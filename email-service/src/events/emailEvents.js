const { sendEmail } = require("../services/brevoMailer");
const { buildInviteEmail } = require("../templates/inviteTemplate");
const logger = require("../utils/logger");

const handleCustomerInvited = async (payload) => {
  if (!payload?.email || !payload?.inviteToken) {
    logger.warn("customer.invited missing email or inviteToken");
    return;
  }

  const name = `${payload.firstName || ""} ${payload.lastName || ""}`.trim() || payload.email;
  const { subject, html } = buildInviteEmail({
    name,
    role: "Customer",
    inviteToken: payload.inviteToken,
    inviteTokenExpiresAt: payload.inviteTokenExpiresAt,
  });

  await sendEmail({ to: payload.email, subject, html });
  logger.info(`Invite email sent to customer: ${payload.email}`);
};

const handleAgentInvited = async (payload) => {
  if (!payload?.email || !payload?.inviteToken) {
    logger.warn("agent.invited missing email or inviteToken");
    return;
  }

  const name = `${payload.firstName || ""} ${payload.lastName || ""}`.trim() || payload.email;
  const role = payload.role || "Agent";
  const { subject, html } = buildInviteEmail({
    name,
    role,
    inviteToken: payload.inviteToken,
    inviteTokenExpiresAt: payload.inviteTokenExpiresAt,
  });

  await sendEmail({ to: payload.email, subject, html });
  logger.info(`Invite email sent to agent: ${payload.email}`);
};

module.exports = {
  handleCustomerInvited,
  handleAgentInvited,
};
