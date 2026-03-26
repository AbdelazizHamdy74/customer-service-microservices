const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"];
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const parseDateOnly = (value, endOfDay = false) => {
  if (!DATE_ONLY_REGEX.test(value || "")) {
    return null;
  }

  const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
  const date = new Date(`${value}${suffix}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const defaultDateRange = (days) => {
  const endDate = new Date();
  endDate.setUTCHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
  startDate.setUTCHours(0, 0, 0, 0);

  return { startDate, endDate };
};

const validateDateRange = (query, defaultDays) => {
  const errors = [];
  let startDate = query.startDate ? parseDateOnly(query.startDate) : null;
  let endDate = query.endDate ? parseDateOnly(query.endDate, true) : null;

  if (query.startDate && !startDate) {
    errors.push("startDate must be in YYYY-MM-DD format");
  }
  if (query.endDate && !endDate) {
    errors.push("endDate must be in YYYY-MM-DD format");
  }

  if (!startDate || !endDate) {
    const defaults = defaultDateRange(defaultDays);
    startDate = startDate || defaults.startDate;
    endDate = endDate || defaults.endDate;
  }

  if (startDate > endDate) {
    errors.push("startDate must be less than or equal to endDate");
  }

  return { errors, startDate, endDate };
};

const validateTicketsPerDayQuery = (query) => {
  const { errors, startDate, endDate } = validateDateRange(query, 7);
  const filters = {
    startDate,
    endDate,
    assignedAgentId: query.assignedAgentId ? String(query.assignedAgentId).trim() : "",
    customerId: query.customerId ? String(query.customerId).trim() : "",
    status: query.status ? String(query.status).trim().toUpperCase() : "",
  };

  if (filters.status && !STATUSES.includes(filters.status)) {
    errors.push(`status must be one of: ${STATUSES.join(", ")}`);
  }

  return { errors, filters };
};

const validateAgentPerformanceQuery = (query) => {
  const { errors, startDate, endDate } = validateDateRange(query, 30);
  return {
    errors,
    filters: {
      startDate,
      endDate,
      agentId: query.agentId ? String(query.agentId).trim() : "",
    },
  };
};

const validateCustomerSatisfactionQuery = (query) => {
  const errors = [];
  const filters = {
    minScore: query.minScore !== undefined ? Number(query.minScore) : 0,
    maxScore: query.maxScore !== undefined ? Number(query.maxScore) : 5,
    limit: query.limit !== undefined ? Number(query.limit) : 10,
  };

  if (!Number.isFinite(filters.minScore) || filters.minScore < 0 || filters.minScore > 5) {
    errors.push("minScore must be a number between 0 and 5");
  }
  if (!Number.isFinite(filters.maxScore) || filters.maxScore < 0 || filters.maxScore > 5) {
    errors.push("maxScore must be a number between 0 and 5");
  }
  if (filters.minScore > filters.maxScore) {
    errors.push("minScore must be less than or equal to maxScore");
  }
  if (!Number.isInteger(filters.limit) || filters.limit < 1 || filters.limit > 100) {
    errors.push("limit must be an integer between 1 and 100");
  }

  return { errors, filters };
};

const validateTicketStatusReportQuery = (query) => {
  let errors = [];
  let startDate = null;
  let endDate = null;

  if (query.startDate || query.endDate) {
    const dateValidation = validateDateRange(query, 30);
    errors = dateValidation.errors;
    startDate = dateValidation.startDate;
    endDate = dateValidation.endDate;
  }

  return {
    errors,
    filters: {
      startDate,
      endDate,
      assignedAgentId: query.assignedAgentId ? String(query.assignedAgentId).trim() : "",
      customerId: query.customerId ? String(query.customerId).trim() : "",
    },
  };
};

module.exports = {
  validateTicketsPerDayQuery,
  validateAgentPerformanceQuery,
  validateCustomerSatisfactionQuery,
  validateTicketStatusReportQuery,
};
