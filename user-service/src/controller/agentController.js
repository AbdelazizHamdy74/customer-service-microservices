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

const createAgent = asyncHandler(async (req, res) => {
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

  await publishEvent("agent.created", {
    agentId: agent.id,
    createdBy: req.user?.id || null,
  });

  res.status(201).json({
    success: true,
    message: "Agent created successfully",
    data: agent,
  });
});

const updateAgent = asyncHandler(async (req, res) => {
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

  await publishEvent("agent.updated", {
    agentId: agent.id,
    updatedBy: req.user?.id || null,
  });

  res.status(200).json({
    success: true,
    message: "Agent updated successfully",
    data: agent,
  });
});

const deleteAgent = asyncHandler(async (req, res) => {
  const agent = await Agent.findByIdAndDelete(req.params.id);
  if (!agent) {
    throw new ApiError(404, "Agent not found");
  }

  await deleteCache(`agent:${agent.id}`);
  await deleteCache(`agent:performance:${agent.id}`);

  await publishEvent("agent.deleted", {
    agentId: agent.id,
    deletedBy: req.user?.id || null,
  });

  res.status(200).json({
    success: true,
    message: "Agent deleted successfully",
  });
});

const getAgent = asyncHandler(async (req, res) => {
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

  await publishEvent("agent.role.assigned", {
    agentId: agent.id,
    role: agent.role,
    assignedBy: req.user?.id || null,
  });

  res.status(200).json({
    success: true,
    message: "Agent role updated successfully",
    data: agent,
  });
});

const agentPerformance = asyncHandler(async (req, res) => {
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

module.exports = {
  createAgent,
  updateAgent,
  deleteAgent,
  getAgent,
  assignRole,
  agentPerformance,
};
