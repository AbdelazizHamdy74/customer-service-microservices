const CHANNELS = ["IN_APP", "EMAIL", "SMS"];
const RECIPIENT_TYPES = ["USER", "CUSTOMER", "AGENT", "SYSTEM"];

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const validateBaseRecipient = (payload = {}) => {
  const errors = [];

  if (!isNonEmptyString(payload.recipientType) || !RECIPIENT_TYPES.includes(payload.recipientType.toUpperCase())) {
    errors.push(`recipientType must be one of: ${RECIPIENT_TYPES.join(", ")}`);
  }

  if (!isNonEmptyString(payload.recipientId)) {
    errors.push("recipientId is required");
  }

  return errors;
};

const validateSendNotificationPayload = (payload = {}) => {
  const errors = validateBaseRecipient(payload);

  if (!isNonEmptyString(payload.title)) {
    errors.push("title is required");
  }

  if (!isNonEmptyString(payload.message)) {
    errors.push("message is required");
  }

  if (payload.email !== undefined && payload.email !== null && !isValidEmail(payload.email)) {
    errors.push("email must be valid");
  }

  return errors;
};

const validateSendEmailPayload = (payload = {}) => {
  const errors = validateBaseRecipient(payload);

  if (!isNonEmptyString(payload.subject)) {
    errors.push("subject is required");
  }

  if (!isNonEmptyString(payload.message)) {
    errors.push("message is required");
  }

  if (!isNonEmptyString(payload.email) || !isValidEmail(payload.email)) {
    errors.push("email is required and must be valid");
  }

  return errors;
};

const validateSendSmsPayload = (payload = {}) => {
  const errors = validateBaseRecipient(payload);

  if (!isNonEmptyString(payload.message)) {
    errors.push("message is required");
  }

  if (!isNonEmptyString(payload.phone)) {
    errors.push("phone is required");
  }

  return errors;
};

const validateSendTicketUpdatePayload = (payload = {}) => {
  const errors = [];

  if (!isNonEmptyString(payload.ticketId)) {
    errors.push("ticketId is required");
  }

  if (!isNonEmptyString(payload.message)) {
    errors.push("message is required");
  }

  if (!isNonEmptyString(payload.customerId) && !isNonEmptyString(payload.assignedAgentId)) {
    errors.push("At least one of customerId or assignedAgentId is required");
  }

  if (payload.customerEmail !== undefined && payload.customerEmail !== null && !isValidEmail(payload.customerEmail)) {
    errors.push("customerEmail must be valid");
  }

  if (payload.agentEmail !== undefined && payload.agentEmail !== null && !isValidEmail(payload.agentEmail)) {
    errors.push("agentEmail must be valid");
  }

  if (payload.channels !== undefined) {
    if (!Array.isArray(payload.channels) || !payload.channels.length) {
      errors.push("channels must be a non-empty array when provided");
    } else {
      const invalidChannels = payload.channels.filter(
        (channel) => !CHANNELS.includes(String(channel).trim().toUpperCase())
      );
      if (invalidChannels.length) {
        errors.push(`channels must contain only: ${CHANNELS.join(", ")}`);
      }
    }
  }

  return errors;
};

const validateNotificationListQuery = (query = {}) => {
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

  if (query.channel !== undefined && !CHANNELS.includes(String(query.channel).trim().toUpperCase())) {
    errors.push(`channel must be one of: ${CHANNELS.join(", ")}`);
  }

  return errors;
};

module.exports = {
  validateSendNotificationPayload,
  validateSendEmailPayload,
  validateSendSmsPayload,
  validateSendTicketUpdatePayload,
  validateNotificationListQuery,
};
