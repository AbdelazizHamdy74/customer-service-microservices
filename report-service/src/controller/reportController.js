const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { getCache, setCache } = require("../utils/cache");
const {
  validateTicketsPerDayQuery,
  validateAgentPerformanceQuery,
  validateCustomerSatisfactionQuery,
  validateTicketStatusReportQuery,
} = require("../utils/validators/reportValidator");
const {
  buildTicketsPerDayReport,
  buildAgentPerformanceReport,
  buildCustomerSatisfactionReport,
  buildTicketStatusReport,
} = require("../services/reportQueryService");

const MANAGEMENT_ROLES = ["ADMIN", "SUPERVISOR"];

const isManagement = (user) => MANAGEMENT_ROLES.includes(user?.role);
const getAgentIdentityIds = (user) => Array.from(new Set([user?.linkedId, user?.id].filter(Boolean)));

const requireManagement = (user) => {
  if (!isManagement(user)) {
    throw new ApiError(403, "Insufficient permissions");
  }
};

const ticketsPerDay = asyncHandler(async (req, res) => {
  requireManagement(req.user);

  const { errors, filters } = validateTicketsPerDayQuery(req.query);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const cacheKey = `report:tickets-per-day:${JSON.stringify(filters)}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json({
      success: true,
      message: "Tickets per day report fetched from cache",
      data: JSON.parse(cached),
    });
  }

  const result = await buildTicketsPerDayReport(filters);
  await setCache(cacheKey, JSON.stringify(result), 120);

  res.status(200).json({
    success: true,
    message: "Tickets per day report fetched successfully",
    data: result,
  });
});

const agentPerformance = asyncHandler(async (req, res) => {
  const { errors, filters } = validateAgentPerformanceQuery(req.query);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  if (isManagement(req.user)) {
    // Management can query any agent or all agents.
  } else if (req.user?.userType === "AGENT") {
    const allowedIds = getAgentIdentityIds(req.user);
    if (!allowedIds.length) {
      throw new ApiError(403, "Agent account is not linked");
    }

    if (filters.agentId && !allowedIds.includes(filters.agentId)) {
      throw new ApiError(403, "Agents can only view their own performance report");
    }

    filters.agentId = filters.agentId || allowedIds[0];
  } else {
    throw new ApiError(403, "Insufficient permissions");
  }

  const cacheKey = `report:agent-performance:${JSON.stringify(filters)}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json({
      success: true,
      message: "Agent performance report fetched from cache",
      data: JSON.parse(cached),
    });
  }

  const result = await buildAgentPerformanceReport(filters);
  await setCache(cacheKey, JSON.stringify(result), 120);

  res.status(200).json({
    success: true,
    message: "Agent performance report fetched successfully",
    data: result,
  });
});

const customerSatisfaction = asyncHandler(async (req, res) => {
  requireManagement(req.user);

  const { errors, filters } = validateCustomerSatisfactionQuery(req.query);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const cacheKey = `report:customer-satisfaction:${JSON.stringify(filters)}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json({
      success: true,
      message: "Customer satisfaction report fetched from cache",
      data: JSON.parse(cached),
    });
  }

  const result = await buildCustomerSatisfactionReport(filters);
  await setCache(cacheKey, JSON.stringify(result), 120);

  res.status(200).json({
    success: true,
    message: "Customer satisfaction report fetched successfully",
    data: result,
  });
});

const ticketStatusReport = asyncHandler(async (req, res) => {
  requireManagement(req.user);

  const { errors, filters } = validateTicketStatusReportQuery(req.query);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const cacheKey = `report:ticket-status:${JSON.stringify(filters)}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json({
      success: true,
      message: "Ticket status report fetched from cache",
      data: JSON.parse(cached),
    });
  }

  const result = await buildTicketStatusReport(filters);
  await setCache(cacheKey, JSON.stringify(result), 120);

  res.status(200).json({
    success: true,
    message: "Ticket status report fetched successfully",
    data: result,
  });
});

module.exports = {
  ticketsPerDay,
  agentPerformance,
  customerSatisfaction,
  ticketStatusReport,
};
