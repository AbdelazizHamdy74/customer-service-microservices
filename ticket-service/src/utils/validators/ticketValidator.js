const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"];
const MUTABLE_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const isValidDate = (value) => !Number.isNaN(Date.parse(value));

const validateCreateTicketPayload = (payload = {}) => {
  const errors = [];

  if (!isNonEmptyString(payload.subject) || payload.subject.trim().length < 3) {
    errors.push("subject is required and must be at least 3 characters");
  }

  if (!isNonEmptyString(payload.description) || payload.description.trim().length < 10) {
    errors.push("description is required and must be at least 10 characters");
  }

  if (!isNonEmptyString(payload.customerId)) {
    errors.push("customerId is required");
  }

  if (
    payload.assignedAgentId !== undefined &&
    payload.assignedAgentId !== null &&
    !isNonEmptyString(payload.assignedAgentId)
  ) {
    errors.push("assignedAgentId must be a non-empty string");
  }

  if (
    payload.status !== undefined &&
    (!isNonEmptyString(payload.status) || !MUTABLE_STATUSES.includes(payload.status.toUpperCase()))
  ) {
    errors.push(`status must be one of: ${MUTABLE_STATUSES.join(", ")}`);
  }

  if (
    payload.priority !== undefined &&
    payload.priority !== null &&
    (!isNonEmptyString(payload.priority) || !PRIORITIES.includes(String(payload.priority).trim().toUpperCase()))
  ) {
    errors.push(`priority must be one of: ${PRIORITIES.join(", ")}`);
  }

  return errors;
};

const validateUpdateTicketPayload = (payload = {}) => {
  const errors = [];

  if (payload.subject !== undefined && (!isNonEmptyString(payload.subject) || payload.subject.trim().length < 3)) {
    errors.push("subject must be at least 3 characters");
  }

  if (
    payload.description !== undefined &&
    (!isNonEmptyString(payload.description) || payload.description.trim().length < 10)
  ) {
    errors.push("description must be at least 10 characters");
  }

  if (payload.customerId !== undefined && !isNonEmptyString(payload.customerId)) {
    errors.push("customerId must be a non-empty string");
  }

  if (
    payload.status !== undefined &&
    (!isNonEmptyString(payload.status) || !MUTABLE_STATUSES.includes(payload.status.toUpperCase()))
  ) {
    errors.push(`status must be one of: ${MUTABLE_STATUSES.join(", ")}`);
  }

  if (
    payload.priority !== undefined &&
    payload.priority !== null &&
    (!isNonEmptyString(payload.priority) || !PRIORITIES.includes(String(payload.priority).trim().toUpperCase()))
  ) {
    errors.push(`priority must be one of: ${PRIORITIES.join(", ")}`);
  }

  return errors;
};

const validateAssignTicketPayload = (payload = {}) => {
  const errors = [];

  if (!isNonEmptyString(payload.assignedAgentId)) {
    errors.push("assignedAgentId is required");
  }

  if (payload.note !== undefined && !isNonEmptyString(payload.note)) {
    errors.push("note must be a non-empty string when provided");
  }

  return errors;
};

const validateCommentPayload = (payload = {}) => {
  const errors = [];

  if (!isNonEmptyString(payload.message)) {
    errors.push("message is required");
  }

  return errors;
};

const validateActionPayload = (payload = {}) => {
  const errors = [];

  if (payload.note !== undefined && !isNonEmptyString(payload.note)) {
    errors.push("note must be a non-empty string when provided");
  }

  return errors;
};

const validateListTicketsQuery = (query = {}) => {
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

  return errors;
};

const validateFilterTicketsQuery = (query = {}) => {
  const errors = validateListTicketsQuery(query);

  if (query.status !== undefined) {
    const statuses = String(query.status)
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);

    if (!statuses.length || statuses.some((status) => !TICKET_STATUSES.includes(status))) {
      errors.push(`status must be one of: ${TICKET_STATUSES.join(", ")}`);
    }
  }

  if (query.customerId !== undefined && !isNonEmptyString(query.customerId)) {
    errors.push("customerId must be a non-empty string");
  }

  if (query.assignedAgentId !== undefined && !isNonEmptyString(query.assignedAgentId)) {
    errors.push("assignedAgentId must be a non-empty string");
  }

  if (query.createdBy !== undefined && !isNonEmptyString(query.createdBy)) {
    errors.push("createdBy must be a non-empty string");
  }

  if (query.fromDate !== undefined && !isValidDate(query.fromDate)) {
    errors.push("fromDate must be a valid date");
  }

  if (query.toDate !== undefined && !isValidDate(query.toDate)) {
    errors.push("toDate must be a valid date");
  }

  if (query.priority !== undefined && String(query.priority).trim()) {
    const priorities = String(query.priority)
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
    if (priorities.some((p) => !PRIORITIES.includes(p))) {
      errors.push(`priority must be one of: ${PRIORITIES.join(", ")}`);
    }
  }

  if (
    query.overdue !== undefined &&
    String(query.overdue).trim() !== "" &&
    !["true", "false", "1", "0"].includes(String(query.overdue).toLowerCase())
  ) {
    errors.push("overdue must be true or false");
  }

  return errors;
};

const buildTicketFilter = ({
  q,
  status,
  customerId,
  assignedAgentId,
  createdBy,
  fromDate,
  toDate,
  unassigned,
  priority,
  overdue,
}) => {
  const andConditions = [];

  if (q) {
    andConditions.push({
      $or: [
        { subject: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ],
    });
  }

  if (status) {
    const statuses = String(status)
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);

    if (statuses.length === 1) {
      andConditions.push({ status: statuses[0] });
    } else if (statuses.length > 1) {
      andConditions.push({ status: { $in: statuses } });
    }
  }

  if (customerId) {
    andConditions.push({ customerId: customerId.trim() });
  }

  if (assignedAgentId) {
    andConditions.push({ assignedAgentId: assignedAgentId.trim() });
  }

  if (createdBy) {
    andConditions.push({ createdBy: createdBy.trim() });
  }

  if (String(unassigned).toLowerCase() === "true") {
    andConditions.push({
      $or: [{ assignedAgentId: null }, { assignedAgentId: "" }],
    });
  }

  if (priority) {
    const priorities = String(priority)
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
    if (priorities.length === 1) {
      andConditions.push({ priority: priorities[0] });
    } else if (priorities.length > 1) {
      andConditions.push({ priority: { $in: priorities } });
    }
  }

  if (["true", "1"].includes(String(overdue).toLowerCase())) {
    andConditions.push({
      $and: [{ slaDueAt: { $ne: null } }, { slaDueAt: { $lt: new Date() } }],
      status: { $nin: ["RESOLVED", "CLOSED"] },
    });
  }

  const createdAt = {};
  if (fromDate) {
    createdAt.$gte = new Date(fromDate);
  }
  if (toDate) {
    createdAt.$lte = new Date(toDate);
  }
  if (Object.keys(createdAt).length > 0) {
    andConditions.push({ createdAt });
  }

  if (andConditions.length === 0) return {};
  if (andConditions.length === 1) return andConditions[0];

  return { $and: andConditions };
};

module.exports = {
  TICKET_STATUSES,
  PRIORITIES,
  validateCreateTicketPayload,
  validateUpdateTicketPayload,
  validateAssignTicketPayload,
  validateCommentPayload,
  validateActionPayload,
  validateListTicketsQuery,
  validateFilterTicketsQuery,
  buildTicketFilter,
};
