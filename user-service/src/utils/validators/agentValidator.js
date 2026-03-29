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

const validateAgentListQuery = (query = {}) => {
  const errors = [];

  if (query.page !== undefined && (!Number.isInteger(Number(query.page)) || Number(query.page) < 1)) {
    errors.push("page must be a positive integer");
  }

  if (
    query.limit !== undefined &&
    (!Number.isInteger(Number(query.limit)) || Number(query.limit) < 1 || Number(query.limit) > 100)
  ) {
    errors.push("limit must be an integer between 1 and 100");
  }

  if (query.role !== undefined && (!query.role || !ROLES.includes(String(query.role).trim().toUpperCase()))) {
    errors.push(`role must be one of: ${ROLES.join(", ")}`);
  }

  if (
    query.status !== undefined &&
    (!query.status || !STATUSES.includes(String(query.status).trim().toUpperCase()))
  ) {
    errors.push(`status must be one of: ${STATUSES.join(", ")}`);
  }

  if (query.team !== undefined && !String(query.team).trim()) {
    errors.push("team must be a non-empty string");
  }

  if (query.skill !== undefined && !String(query.skill).trim()) {
    errors.push("skill must be a non-empty string");
  }

  if (query.q !== undefined && !String(query.q).trim()) {
    errors.push("q must be a non-empty string");
  }

  return errors;
};

const buildAgentSearchFilter = ({ q, role, status, team, skill } = {}) => {
  const andConditions = [];

  if (q) {
    andConditions.push({
      $or: [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ],
    });
  }

  if (role) {
    andConditions.push({ role: String(role).trim().toUpperCase() });
  }

  if (status) {
    andConditions.push({ status: String(status).trim().toUpperCase() });
  }

  if (team) {
    andConditions.push({ team: { $regex: String(team).trim(), $options: "i" } });
  }

  if (skill) {
    andConditions.push({ skills: { $regex: String(skill).trim(), $options: "i" } });
  }

  if (andConditions.length === 0) return {};
  if (andConditions.length === 1) return andConditions[0];

  return { $and: andConditions };
};

module.exports = {
  validateCreateAgentPayload,
  validateUpdateAgentPayload,
  validateAssignRolePayload,
  validateAgentListQuery,
  buildAgentSearchFilter,
};
