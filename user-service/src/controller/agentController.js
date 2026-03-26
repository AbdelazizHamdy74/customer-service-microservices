const Agent = require("../models/Agent");
const { publishEvent } = require("../config/kafka");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { getCache, setCache, deleteCache } = require("../utils/cache");
const {
  validateCreateAgentPayload,
  validateUpdateAgentPayload,
  validateAssignRolePayload,
} = require("../utils/validators/agentValidator");

const STAFF_ROLES = ["ADMIN", "SUPERVISOR"];
const isStaff = (user) => STAFF_ROLES.includes(user?.role);
const isSelfAgent = (user, agentId) => user?.userType === "AGENT" && user?.linkedId === agentId;
const buildAgentEventPayload = (agent, extra = {}) => ({
  agentId: agent.id,
  authUserId: agent.authUserId || null,
  firstName: agent.firstName,
  lastName: agent.lastName,
  fullName: agent.fullName || `${agent.firstName} ${agent.lastName}`.trim(),
  email: agent.email || "",
  phone: agent.phone,
  role: agent.role,
  status: agent.status,
  team: agent.team || "",
  skills: Array.isArray(agent.skills) ? agent.skills : [],
  performance: agent.performance || {},
  createdAt: agent.createdAt,
  updatedAt: agent.updatedAt,
  ...extra,
});

const createAgent = asyncHandler(async (req, res) => {
  if (!isStaff(req.user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const errors = validateCreateAgentPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const payload = {
    ...req.body,
    email: req.body.email ? req.body.email.toLowerCase() : undefined,
    createdBy: req.user?.id || null,
  };
  if (payload.role) payload.role = payload.role.toUpperCase();
  if (payload.status) payload.status = payload.status.toUpperCase();

  const agent = await Agent.create(payload);

  await publishEvent("agent.created", buildAgentEventPayload(agent, { createdBy: req.user?.id || null }));

  res.status(201).json({
    success: true,
    message: "Agent created successfully",
    data: agent,
  });
});

const updateAgent = asyncHandler(async (req, res) => {
  if (!isStaff(req.user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const errors = validateUpdateAgentPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const agent = await Agent.findById(req.params.id);
  if (!agent) {
    throw new ApiError(404, "Agent not found");
  }

  const updates = { ...req.body };
  if (updates.email) updates.email = updates.email.toLowerCase();
  if (updates.role) updates.role = updates.role.toUpperCase();
  if (updates.status) updates.status = updates.status.toUpperCase();
  Object.assign(agent, updates);
  await agent.save();

  await deleteCache(`agent:${agent.id}`);
  await deleteCache(`agent:performance:${agent.id}`);

  await publishEvent("agent.updated", buildAgentEventPayload(agent, { updatedBy: req.user?.id || null }));

  res.status(200).json({
    success: true,
    message: "Agent updated successfully",
    data: agent,
  });
});

const deleteAgent = asyncHandler(async (req, res) => {
  if (!isStaff(req.user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const agent = await Agent.findByIdAndDelete(req.params.id);
  if (!agent) {
    throw new ApiError(404, "Agent not found");
  }

  await deleteCache(`agent:${agent.id}`);
  await deleteCache(`agent:performance:${agent.id}`);

  await publishEvent("agent.deleted", buildAgentEventPayload(agent, { deletedBy: req.user?.id || null }));

  res.status(200).json({
    success: true,
    message: "Agent deleted successfully",
  });
});

const getAgent = asyncHandler(async (req, res) => {
  const isSelf = isSelfAgent(req.user, req.params.id);
  if (!isSelf && !isStaff(req.user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const cacheKey = `agent:${req.params.id}`;
  const cached = await getCache(cacheKey);

  if (cached) {
    return res.status(200).json({
      success: true,
      message: "Agent fetched from cache",
      data: JSON.parse(cached),
    });
  }

  const agent = await Agent.findById(req.params.id);
  if (!agent) {
    throw new ApiError(404, "Agent not found");
  }

  await setCache(cacheKey, JSON.stringify(agent), 300);

  res.status(200).json({
    success: true,
    message: "Agent fetched successfully",
    data: agent,
  });
});

const assignRole = asyncHandler(async (req, res) => {
  if (!isStaff(req.user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const errors = validateAssignRolePayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const agent = await Agent.findById(req.params.id);
  if (!agent) {
    throw new ApiError(404, "Agent not found");
  }

  agent.role = req.body.role.toUpperCase();
  await agent.save();

  await deleteCache(`agent:${agent.id}`);
  await deleteCache(`agent:performance:${agent.id}`);

  await publishEvent("agent.role.assigned", buildAgentEventPayload(agent, { assignedBy: req.user?.id || null }));

  res.status(200).json({
    success: true,
    message: "Agent role updated successfully",
    data: agent,
  });
});

const agentPerformance = asyncHandler(async (req, res) => {
  const isSelf = isSelfAgent(req.user, req.params.id);
  if (!isSelf && !isStaff(req.user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const cacheKey = `agent:performance:${req.params.id}`;
  const cached = await getCache(cacheKey);

  if (cached) {
    return res.status(200).json({
      success: true,
      message: "Agent performance fetched from cache",
      data: JSON.parse(cached),
    });
  }

  const agent = await Agent.findById(req.params.id);
  if (!agent) {
    throw new ApiError(404, "Agent not found");
  }

  const perf = agent.performance || {};
  const performance = {
    ticketsHandled: perf.ticketsHandled || 0,
    ticketsResolved: perf.ticketsResolved || 0,
    avgResponseTimeMinutes: perf.avgResponseTimeMinutes || 0,
    avgResolutionTimeMinutes: perf.avgResolutionTimeMinutes || 0,
    customerSatisfaction: perf.customerSatisfaction || 0,
    lastActiveAt: perf.lastActiveAt || null,
    lastUpdatedAt: perf.lastUpdatedAt || null,
  };

  const resolutionRate = performance.ticketsHandled
    ? Number(((performance.ticketsResolved / performance.ticketsHandled) * 100).toFixed(2))
    : 0;

  const payload = {
    agentId: agent.id,
    name: agent.fullName || `${agent.firstName} ${agent.lastName}`.trim(),
    role: agent.role,
    performance: {
      ...performance,
      resolutionRate,
    },
  };

  await setCache(cacheKey, JSON.stringify(payload), 120);

  res.status(200).json({
    success: true,
    message: "Agent performance fetched successfully",
    data: payload,
  });
});

const createAgentInternal = asyncHandler(async (req, res) => {
  const errors = validateCreateAgentPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  if (!req.body.authUserId) {
    throw new ApiError(400, "authUserId is required");
  }

  const payload = {
    ...req.body,
    email: req.body.email ? req.body.email.toLowerCase() : undefined,
  };
  if (payload.role) payload.role = payload.role.toUpperCase();
  if (payload.status) payload.status = payload.status.toUpperCase();

  const agent = await Agent.create({
    ...payload,
    authUserId: req.body.authUserId,
    createdBy: req.body.createdBy || "auth-service",
  });

  await publishEvent("agent.created", buildAgentEventPayload(agent, { createdBy: req.body.createdBy || "auth-service" }));

  res.status(201).json({
    success: true,
    message: "Agent created successfully",
    data: agent,
  });
});

const deleteAgentInternal = asyncHandler(async (req, res) => {
  const agent = await Agent.findByIdAndDelete(req.params.id);
  if (!agent) {
    throw new ApiError(404, "Agent not found");
  }

  await deleteCache(`agent:${agent.id}`);
  await deleteCache(`agent:performance:${agent.id}`);

  await publishEvent("agent.deleted", buildAgentEventPayload(agent, { deletedBy: "auth-service" }));

  res.status(200).json({
    success: true,
    message: "Agent deleted successfully",
  });
});

module.exports = {
  createAgent,
  updateAgent,
  deleteAgent,
  getAgent,
  assignRole,
  agentPerformance,
  createAgentInternal,
  deleteAgentInternal,
};
