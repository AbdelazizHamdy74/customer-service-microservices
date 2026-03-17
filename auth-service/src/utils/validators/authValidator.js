const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const validateLoginPayload = ({ email, password }) => {
  const errors = [];
  if (!email || !isEmail(email)) errors.push("A valid email is required");
  if (!password || password.length < 8) errors.push("Password must be at least 8 characters");
  return errors;
};

const validateForgotPasswordPayload = ({ email }) => {
  const errors = [];
  if (!email || !isEmail(email)) errors.push("A valid email is required");
  return errors;
};

const validateResetPasswordPayload = ({ token, newPassword }) => {
  const errors = [];
  if (!token) errors.push("Reset token is required");
  if (!newPassword || newPassword.length < 8) {
    errors.push("New password must be at least 8 characters");
  }
  return errors;
};

const validateInviteCustomerPayload = ({ firstName, lastName, email, phone }) => {
  const errors = [];
  if (!firstName || firstName.trim().length < 2) {
    errors.push("firstName is required and must be at least 2 characters");
  }
  if (!lastName || lastName.trim().length < 2) {
    errors.push("lastName is required and must be at least 2 characters");
  }
  if (!email || !isEmail(email)) errors.push("A valid email is required");
  if (!phone || phone.trim().length < 6) errors.push("phone is required and must be at least 6 characters");
  return errors;
};

const validateInviteAgentPayload = ({ firstName, lastName, email, phone, role, status }) => {
  const errors = [];
  const roles = ["ADMIN", "SUPERVISOR", "AGENT"];
  const statuses = ["ACTIVE", "INACTIVE"];

  if (!firstName || firstName.trim().length < 2) {
    errors.push("firstName is required and must be at least 2 characters");
  }
  if (!lastName || lastName.trim().length < 2) {
    errors.push("lastName is required and must be at least 2 characters");
  }
  if (!email || !isEmail(email)) errors.push("A valid email is required");
  if (!phone || phone.trim().length < 6) errors.push("phone is required and must be at least 6 characters");
  if (role && !roles.includes(role.toUpperCase())) {
    errors.push(`role must be one of: ${roles.join(", ")}`);
  }
  if (status && !statuses.includes(status.toUpperCase())) {
    errors.push(`status must be one of: ${statuses.join(", ")}`);
  }
  return errors;
};

module.exports = {
  validateLoginPayload,
  validateForgotPasswordPayload,
  validateResetPasswordPayload,
  validateInviteCustomerPayload,
  validateInviteAgentPayload,
};
