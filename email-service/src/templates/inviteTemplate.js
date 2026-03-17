const env = require("../config/env");

const buildInviteEmail = ({ name, role, inviteToken, inviteTokenExpiresAt }) => {
  const link = `${env.frontendUrl}/set-password?token=${inviteToken}`;
  const ttl = env.otpTtlMinutes;

  return {
    subject: `You're invited to CSM as ${role}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Welcome ${name}</h2>
        <p>You have been invited to the Customer Service Management system.</p>
        <p>Please set your password using the link below:</p>
        <p><a href="${link}">${link}</a></p>
        <p>Invite token: <strong>${inviteToken}</strong></p>
        <p>This invite expires in ${ttl} minutes.</p>
        <p>Expires at: ${inviteTokenExpiresAt}</p>
      </div>
    `,
  };
};

module.exports = { buildInviteEmail };
