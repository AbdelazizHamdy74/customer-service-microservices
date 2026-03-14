const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const ROLES = ["ADMIN", "SUPERVISOR", "AGENT"];
const STATUSES = ["ACTIVE", "INACTIVE"];

const validateCreateAgentPayload = (payload) => {
  const errors = [];
  if (!payload.firstName || payload.firstName.trim().length < 2) {
    errors.push("firstName is required and must be at least 2 characters");
  }
  if (!payload.lastName || payload.lastName.trim().length < 2) {
    errors.push("lastName is required and must be at least 2 characters");
  }
  if (!payload.phone || payload.phone.trim().length < 6) {
    errors.push("phone is required and must be at least 6 characters");
  }
  if (payload.email && !isValidEmail(payload.email)) {
    errors.push("email must be valid");
  }
  if (payload.role && (typeof payload.role !== "string" || !ROLES.includes(payload.role.toUpperCase()))) {
    errors.push(`role must be one of: ${ROLES.join(", ")}`);
  }
  if (payload.status && (typeof payload.status !== "string" || !STATUSES.includes(payload.status.toUpperCase()))) {
    errors.push(`status must be one of: ${STATUSES.join(", ")}`);
  }
  return errors;
};

const validateUpdateAgentPayload = (payload) => {
  const errors = [];
  if (payload.firstName !== undefined && payload.firstName.trim().length < 2) {
    errors.push("firstName must be at least 2 characters");
  }
  if (payload.lastName !== undefined && payload.lastName.trim().length < 2) {
    errors.push("lastName must be at least 2 characters");
  }
  if (payload.phone !== undefined && payload.phone.trim().length < 6) {
    errors.push("phone must be at least 6 characters");
  }
  if (payload.email !== undefined && payload.email && !isValidEmail(payload.email)) {
    errors.push("email must be valid");
  }
  if (
    payload.role !== undefined &&
    payload.role &&
    (typeof payload.role !== "string" || !ROLES.includes(payload.role.toUpperCase()))
  ) {
    errors.push(`role must be one of: ${ROLES.join(", ")}`);
  }
  if (
    payload.status !== undefined &&
    payload.status &&
    (typeof payload.status !== "string" || !STATUSES.includes(payload.status.toUpperCase()))
  ) {
    errors.push(`status must be one of: ${STATUSES.join(", ")}`);
  }
  return errors;
};

const validateAssignRolePayload = (payload) => {
  const errors = [];
  if (!payload.role) {
    errors.push("role is required");
  } else if (typeof payload.role !== "string" || !ROLES.includes(payload.role.toUpperCase())) {
    errors.push(`role must be one of: ${ROLES.join(", ")}`);
  }
  return errors;
};

module.exports = {
  validateCreateAgentPayload,
  validateUpdateAgentPayload,
  validateAssignRolePayload,
};
