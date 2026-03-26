const Ticket = require("../models/Ticket");
const { publishEvent } = require("../config/kafka");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { getCache, setCache, deleteCache, deleteByPattern } = require("../utils/cache");
const {
  validateCreateTicketPayload,
  validateUpdateTicketPayload,
  validateAssignTicketPayload,
  validateCommentPayload,
  validateActionPayload,
  validateListTicketsQuery,
  validateFilterTicketsQuery,
  buildTicketFilter,
} = require("../utils/validators/ticketValidator");

const STAFF_ROLES = ["ADMIN", "SUPERVISOR", "AGENT"];
const MANAGEMENT_ROLES = ["ADMIN", "SUPERVISOR"];
const REOPENABLE_STATUSES = ["RESOLVED", "CLOSED"];

const isStaff = (user) => STAFF_ROLES.includes(user?.role);
const isManagement = (user) => MANAGEMENT_ROLES.includes(user?.role);
const calculateResolutionTimeMinutes = (ticket) => {
  if (!ticket?.createdAt || !ticket?.closedAt) {
    return 0;
  }

  return Number((((new Date(ticket.closedAt) - new Date(ticket.createdAt)) / 60000) || 0).toFixed(2));
};
const buildTicketEventPayload = (ticket, extra = {}) => ({
  ticketId: ticket.id,
  subject: ticket.subject,
  customerId: ticket.customerId,
  assignedAgentId: ticket.assignedAgentId,
  status: ticket.status,
  createdBy: ticket.createdBy || null,
  lastUpdatedBy: ticket.lastUpdatedBy || null,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  closedAt: ticket.closedAt,
  totalComments: Array.isArray(ticket.comments) ? ticket.comments.length : 0,
  totalHistoryEntries: Array.isArray(ticket.history) ? ticket.history.length : 0,
  ...extra,
});
const getUserEntityIds = (user) => Array.from(new Set([user?.linkedId, user?.id].filter(Boolean)));
const matchesUserEntityId = (value, user) => getUserEntityIds(user).includes(value);
const buildUserEntityFilter = (field, user) => {
  const entityIds = getUserEntityIds(user);
  if (!entityIds.length) {
    return null;
  }

  if (entityIds.length === 1) {
    return { [field]: entityIds[0] };
  }

  return { [field]: { $in: entityIds } };
};

const isCustomerOwner = (user, ticket) =>
  user?.userType === "CUSTOMER" && matchesUserEntityId(ticket?.customerId, user);
const isAssignedAgent = (user, ticket) =>
  user?.userType === "AGENT" && matchesUserEntityId(ticket?.assignedAgentId, user);

const canAccessTicket = (user, ticket) =>
  isManagement(user) || isAssignedAgent(user, ticket) || isCustomerOwner(user, ticket);

const canUpdateTicket = (user, ticket) =>
  isManagement(user) || isAssignedAgent(user, ticket) || isCustomerOwner(user, ticket);

const canCloseTicket = (user, ticket) => isManagement(user) || isAssignedAgent(user, ticket);

const canReopenTicket = (user, ticket) =>
  isManagement(user) || isAssignedAgent(user, ticket) || isCustomerOwner(user, ticket);

const buildActor = (user) => ({
  actorId: user?.id || null,
  actorRole: user?.role || user?.userType || "SYSTEM",
});

const appendHistory = (ticket, action, user, extra = {}) => {
  ticket.history.push({
    action,
    ...buildActor(user),
    ...extra,
    createdAt: new Date(),
  });
};

const invalidateTicketCaches = async (ticketId) => {
  await deleteCache(`ticket:history:${ticketId}`);
  await deleteByPattern("ticket:list:*");
  await deleteByPattern("ticket:filter:*");
};

const buildVisibilityFilter = (user) => {
  if (isManagement(user)) {
    return {};
  }

  if (user?.userType === "AGENT") {
    const agentFilter = buildUserEntityFilter("assignedAgentId", user);
    if (agentFilter) {
      return agentFilter;
    }
  }

  if (user?.userType === "CUSTOMER") {
    const customerFilter = buildUserEntityFilter("customerId", user);
    if (customerFilter) {
      return customerFilter;
    }
  }

  throw new ApiError(403, "Insufficient permissions");
};

const mergeFilters = (left, right) => {
  const leftHasValues = left && Object.keys(left).length > 0;
  const rightHasValues = right && Object.keys(right).length > 0;

  if (!leftHasValues && !rightHasValues) return {};
  if (!leftHasValues) return right;
  if (!rightHasValues) return left;

  return { $and: [left, right] };
};

const getPagination = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));

  return { page, limit };
};

const createTicket = asyncHandler(async (req, res) => {
  const payload = { ...(req.body || {}) };

  if (req.user?.userType === "CUSTOMER") {
    if (!req.user?.linkedId) {
      throw new ApiError(403, "Customer account is not linked");
    }

    payload.customerId = req.user.linkedId;
    payload.status = "OPEN";
    delete payload.assignedAgentId;
  } else if (!isStaff(req.user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const errors = validateCreateTicketPayload(payload);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  if (payload.assignedAgentId && !isManagement(req.user)) {
    throw new ApiError(403, "Only admin or supervisor can assign a ticket during creation");
  }

  const status = payload.status ? payload.status.toUpperCase() : "OPEN";
  const history = [
    {
      action: "CREATED",
      ...buildActor(req.user),
      toStatus: status,
      note: "Ticket created",
      createdAt: new Date(),
    },
  ];

  if (payload.assignedAgentId) {
    history.push({
      action: "ASSIGNED",
      ...buildActor(req.user),
      note: "Ticket assigned during creation",
      meta: {
        fromAssignedAgentId: null,
        toAssignedAgentId: payload.assignedAgentId.trim(),
      },
      createdAt: new Date(),
    });
  }

  const ticket = await Ticket.create({
    subject: payload.subject.trim(),
    description: payload.description.trim(),
    customerId: payload.customerId.trim(),
    assignedAgentId: payload.assignedAgentId ? payload.assignedAgentId.trim() : null,
    status,
    createdBy: req.user?.id || null,
    lastUpdatedBy: req.user?.id || null,
    history,
  });

  await invalidateTicketCaches(ticket.id);
  await publishEvent("ticket.created", buildTicketEventPayload(ticket, { createdBy: req.user?.id || null }));

  res.status(201).json({
    success: true,
    message: "Ticket created successfully",
    data: ticket,
  });
});

const updateTicket = asyncHandler(async (req, res) => {
  const errors = validateUpdateTicketPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  if (!canUpdateTicket(req.user, ticket)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  if (ticket.status === "CLOSED") {
    throw new ApiError(400, "Closed tickets must be reopened before update");
  }

  const updates = {};

  if (req.body.subject !== undefined) {
    const subject = req.body.subject.trim();
    if (subject !== ticket.subject) {
      updates.subject = subject;
    }
  }

  if (req.body.description !== undefined) {
    const description = req.body.description.trim();
    if (description !== ticket.description) {
      updates.description = description;
    }
  }

  if (req.body.customerId !== undefined) {
    if (!isManagement(req.user)) {
      throw new ApiError(403, "Only admin or supervisor can change customerId");
    }

    const customerId = req.body.customerId.trim();
    if (customerId !== ticket.customerId) {
      updates.customerId = customerId;
    }
  }

  if (req.body.status !== undefined) {
    if (isCustomerOwner(req.user, ticket)) {
      throw new ApiError(403, "Customers cannot change ticket status directly");
    }

    const nextStatus = req.body.status.toUpperCase();
    if (nextStatus === "CLOSED") {
      throw new ApiError(400, "Use closeTicket to move a ticket to CLOSED");
    }
    if (ticket.status === "RESOLVED" && nextStatus !== "RESOLVED") {
      throw new ApiError(400, "Use reopenTicket or closeTicket for resolved tickets");
    }
    if (nextStatus !== ticket.status) {
      updates.status = nextStatus;
    }
  }

  const changedFields = Object.keys(updates);
  if (!changedFields.length) {
    return res.status(200).json({
      success: true,
      message: "No changes were applied",
      data: ticket,
    });
  }

  const previousStatus = ticket.status;
  Object.assign(ticket, updates);
  ticket.lastUpdatedBy = req.user?.id || null;

  if (updates.status) {
    appendHistory(ticket, "STATUS_CHANGED", req.user, {
      fromStatus: previousStatus,
      toStatus: updates.status,
      note: `Status changed to ${updates.status}`,
    });
  }

  const nonStatusFields = changedFields.filter((field) => field !== "status");
  if (nonStatusFields.length) {
    appendHistory(ticket, "UPDATED", req.user, {
      note: "Ticket updated",
      meta: { changedFields: nonStatusFields },
    });
  }

  await ticket.save();
  await invalidateTicketCaches(ticket.id);

  await publishEvent(
    "ticket.updated",
    buildTicketEventPayload(ticket, {
      updatedBy: req.user?.id || null,
      changedFields,
    })
  );

  res.status(200).json({
    success: true,
    message: "Ticket updated successfully",
    data: ticket,
  });
});

const assignTicket = asyncHandler(async (req, res) => {
  if (!isManagement(req.user)) {
    throw new ApiError(403, "Only admin or supervisor can assign tickets");
  }

  const errors = validateAssignTicketPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  if (ticket.status === "CLOSED") {
    throw new ApiError(400, "Closed tickets cannot be reassigned");
  }

  const nextAssignedAgentId = req.body.assignedAgentId.trim();
  const note = req.body.note ? req.body.note.trim() : "Ticket assigned";
  const previousAssignedAgentId = ticket.assignedAgentId;

  ticket.assignedAgentId = nextAssignedAgentId;
  ticket.lastUpdatedBy = req.user?.id || null;

  appendHistory(ticket, "ASSIGNED", req.user, {
    note,
    meta: {
      fromAssignedAgentId: previousAssignedAgentId,
      toAssignedAgentId: nextAssignedAgentId,
    },
  });

  await ticket.save();
  await invalidateTicketCaches(ticket.id);

  await publishEvent(
    "ticket.assigned",
    buildTicketEventPayload(ticket, {
      assignedAgentId: nextAssignedAgentId,
      assignedBy: req.user?.id || null,
      previousAssignedAgentId,
    })
  );

  res.status(200).json({
    success: true,
    message: "Ticket assigned successfully",
    data: ticket,
  });
});

const closeTicket = asyncHandler(async (req, res) => {
  const errors = validateActionPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  if (!canCloseTicket(req.user, ticket)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  if (ticket.status === "CLOSED") {
    throw new ApiError(400, "Ticket is already closed");
  }

  const previousStatus = ticket.status;
  ticket.status = "CLOSED";
  ticket.closedAt = new Date();
  ticket.lastUpdatedBy = req.user?.id || null;

  appendHistory(ticket, "CLOSED", req.user, {
    fromStatus: previousStatus,
    toStatus: "CLOSED",
    note: req.body.note ? req.body.note.trim() : "Ticket closed",
  });

  await ticket.save();
  await invalidateTicketCaches(ticket.id);

  await publishEvent(
    "ticket.closed",
    buildTicketEventPayload(ticket, {
      closedBy: req.user?.id || null,
      previousStatus,
      resolutionTimeMinutes: calculateResolutionTimeMinutes(ticket),
    })
  );

  res.status(200).json({
    success: true,
    message: "Ticket closed successfully",
    data: ticket,
  });
});

const reopenTicket = asyncHandler(async (req, res) => {
  const errors = validateActionPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  if (!canReopenTicket(req.user, ticket)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  if (!REOPENABLE_STATUSES.includes(ticket.status)) {
    throw new ApiError(400, "Only RESOLVED or CLOSED tickets can be reopened");
  }

  const previousStatus = ticket.status;
  ticket.status = "OPEN";
  ticket.closedAt = null;
  ticket.lastUpdatedBy = req.user?.id || null;

  appendHistory(ticket, "REOPENED", req.user, {
    fromStatus: previousStatus,
    toStatus: "OPEN",
    note: req.body.note ? req.body.note.trim() : "Ticket reopened",
  });

  await ticket.save();
  await invalidateTicketCaches(ticket.id);

  await publishEvent(
    "ticket.reopened",
    buildTicketEventPayload(ticket, {
      reopenedBy: req.user?.id || null,
      previousStatus,
      reopenedAt: ticket.updatedAt,
    })
  );

  res.status(200).json({
    success: true,
    message: "Ticket reopened successfully",
    data: ticket,
  });
});

const addComment = asyncHandler(async (req, res) => {
  const errors = validateCommentPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  if (!canAccessTicket(req.user, ticket)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const comment = {
    authorId: req.user?.id || null,
    authorRole: req.user?.role || req.user?.userType || "SYSTEM",
    message: req.body.message.trim(),
    createdAt: new Date(),
  };

  ticket.comments.push(comment);
  ticket.lastUpdatedBy = req.user?.id || null;

  appendHistory(ticket, "COMMENT_ADDED", req.user, {
    note: "Comment added",
    meta: {
      commentPreview: comment.message.slice(0, 120),
    },
  });

  await ticket.save();
  await invalidateTicketCaches(ticket.id);

  await publishEvent(
    "ticket.commented",
    buildTicketEventPayload(ticket, {
      commentPreview: comment.message.slice(0, 120),
      commentedBy: req.user?.id || null,
      commentedAt: comment.createdAt,
    })
  );

  res.status(201).json({
    success: true,
    message: "Comment added successfully",
    data: ticket.comments[ticket.comments.length - 1],
  });
});

const ticketHistory = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    throw new ApiError(404, "Ticket not found");
  }

  if (!canAccessTicket(req.user, ticket)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const cacheKey = `ticket:history:${ticket.id}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json({
      success: true,
      message: "Ticket history fetched from cache",
      data: JSON.parse(cached),
    });
  }

  const timeline = [
    ...ticket.history.map((item) => ({
      type: "HISTORY",
      action: item.action,
      actorId: item.actorId,
      actorRole: item.actorRole,
      fromStatus: item.fromStatus,
      toStatus: item.toStatus,
      note: item.note,
      meta: item.meta,
      occurredAt: item.createdAt,
    })),
    ...ticket.comments.map((comment) => ({
      type: "COMMENT",
      authorId: comment.authorId,
      authorRole: comment.authorRole,
      message: comment.message,
      occurredAt: comment.createdAt,
    })),
  ].sort((left, right) => new Date(left.occurredAt) - new Date(right.occurredAt));

  const result = {
    ticketId: ticket.id,
    status: ticket.status,
    customerId: ticket.customerId,
    assignedAgentId: ticket.assignedAgentId,
    history: ticket.history,
    comments: ticket.comments,
    timeline,
  };

  await setCache(cacheKey, JSON.stringify(result), 300);

  res.status(200).json({
    success: true,
    message: "Ticket history fetched successfully",
    data: result,
  });
});

const getTickets = asyncHandler(async (req, res) => {
  const errors = validateListTicketsQuery(req.query);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const visibilityFilter = buildVisibilityFilter(req.user);
  const { page, limit } = getPagination(req.query);

  const cacheKey = `ticket:list:${req.user?.id}:${JSON.stringify({
    visibilityFilter,
    page,
    limit,
  })}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json({
      success: true,
      message: "Tickets fetched from cache",
      data: JSON.parse(cached),
    });
  }

  const [tickets, total] = await Promise.all([
    Ticket.find(visibilityFilter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Ticket.countDocuments(visibilityFilter),
  ]);

  const result = {
    items: tickets,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };

  await setCache(cacheKey, JSON.stringify(result), 120);

  res.status(200).json({
    success: true,
    message: "Tickets fetched successfully",
    data: result,
  });
});

const filterTickets = asyncHandler(async (req, res) => {
  const errors = validateFilterTicketsQuery(req.query);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const visibilityFilter = buildVisibilityFilter(req.user);
  const queryFilter = buildTicketFilter(req.query);
  const finalFilter = mergeFilters(visibilityFilter, queryFilter);
  const { page, limit } = getPagination(req.query);

  const cacheKey = `ticket:filter:${req.user?.id}:${JSON.stringify({
    visibilityFilter,
    query: req.query,
    page,
    limit,
  })}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json({
      success: true,
      message: "Filtered tickets fetched from cache",
      data: JSON.parse(cached),
    });
  }

  const [tickets, total] = await Promise.all([
    Ticket.find(finalFilter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Ticket.countDocuments(finalFilter),
  ]);

  const result = {
    items: tickets,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    filters: req.query,
  };

  await setCache(cacheKey, JSON.stringify(result), 120);

  res.status(200).json({
    success: true,
    message: "Filtered tickets fetched successfully",
    data: result,
  });
});

module.exports = {
  createTicket,
  updateTicket,
  assignTicket,
  closeTicket,
  reopenTicket,
  addComment,
  ticketHistory,
  getTickets,
  filterTickets,
};
