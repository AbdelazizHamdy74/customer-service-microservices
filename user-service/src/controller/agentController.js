const Agent = require("../models/Agent");
const env = require("../config/env");
const { publishEvent } = require("../config/kafka");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { provisionAuthUser } = require("../utils/provisionAuthUser");
const { getCache, setCache, deleteCache, deleteByPattern } = require("../utils/cache");
const {
  validateCreateAgentPayload,
  validateUpdateAgentPayload,
  validateAssignRolePayload,
  validateAgentListQuery,
  buildAgentSearchFilter,
} = require("../utils/validators/agentValidator");

const STAFF_ROLES = ["ADMIN", "SUPERVISOR"];
const MANAGEMENT_ROLES = ["ADMIN", "SUPERVISOR"];
const isStaff = (user) => STAFF_ROLES.includes(user?.role);
const isManagement = (user) => MANAGEMENT_ROLES.includes(user?.role);
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
const getPagination = (query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

  return { page, limit };
};
const invalidateAgentCaches = async (agentId) => {
  await deleteCache(`agent:${agentId}`);
  await deleteCache(`agent:performance:${agentId}`);
  await deleteByPattern("agent:list:*");
};

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
  if (payload.authUserId == null || String(payload.authUserId).trim() === "") {
    delete payload.authUserId;
  }

  let agent = await Agent.create(payload);

  if (env.authServiceUrl && agent.email) {
    const authUserId = await provisionAuthUser(env, agent);
    if (authUserId) {
      agent.authUserId = authUserId;
      await agent.save();
    }
  }

  await deleteByPattern("agent:list:*");

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

  await invalidateAgentCaches(agent.id);

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

  await invalidateAgentCaches(agent.id);

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

const listAgents = asyncHandler(async (req, res) => {
  if (!isManagement(req.user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const errors = validateAgentListQuery(req.query);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const { page, limit } = getPagination(req.query);
  const searchQuery = {
    q: req.query.q || "",
    role: req.query.role || "",
    status: req.query.status || "",
    team: req.query.team || "",
    skill: req.query.skill || "",
    page,
    limit,
  };

  const cacheKey = `agent:list:${JSON.stringify(searchQuery)}`;
  const cached = await getCache(cacheKey);

  if (cached) {
    return res.status(200).json({
      success: true,
      message: "Agents fetched from cache",
      data: JSON.parse(cached),
    });
  }

  const filter = buildAgentSearchFilter(req.query);
  const [agents, total] = await Promise.all([
    Agent.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Agent.countDocuments(filter),
  ]);

  const result = {
    items: agents,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    filters: {
      q: searchQuery.q,
      role: searchQuery.role,
      status: searchQuery.status,
      team: searchQuery.team,
      skill: searchQuery.skill,
    },
  };

  await setCache(cacheKey, JSON.stringify(result), 120);

  res.status(200).json({
    success: true,
    message: "Agents fetched successfully",
    data: result,
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

  await invalidateAgentCaches(agent.id);

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

  await deleteByPattern("agent:list:*");
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

const getAgentInternal = asyncHandler(async (req, res) => {
  const agent = await Agent.findById(req.params.id);
  if (!agent) {
    throw new ApiError(404, "Agent not found");
  }

  res.status(200).json({
    success: true,
    message: "Agent fetched successfully",
    data: {
      id: agent.id,
      email: agent.email || "",
      firstName: agent.firstName,
      lastName: agent.lastName,
    },
  });
});

/** Round-robin pool: active profiles with role AGENT only */
const getAssignableAgentIds = asyncHandler(async (req, res) => {
  const agents = await Agent.find({ status: "ACTIVE", role: "AGENT" })
    .select("_id")
    .sort({ createdAt: 1 })
    .lean();

  const ids = agents.map((a) => String(a._id));

  res.status(200).json({
    success: true,
    message: "Assignable agents fetched",
    data: { ids },
  });
});

module.exports = {
  createAgent,
  updateAgent,
  deleteAgent,
  getAgent,
  listAgents,
  assignRole,
  agentPerformance,
  createAgentInternal,
  deleteAgentInternal,
  getAgentInternal,
  getAssignableAgentIds,
};
