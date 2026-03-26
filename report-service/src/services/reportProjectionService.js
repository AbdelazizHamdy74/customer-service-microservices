const crypto = require("crypto");

const ReportAgent = require("../models/ReportAgent");
const ReportCustomer = require("../models/ReportCustomer");
const ReportEventLog = require("../models/ReportEventLog");
const ReportTicket = require("../models/ReportTicket");
const { deleteByPattern } = require("../utils/cache");

const toDate = (value, fallback = null) => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildFullName = (firstName = "", lastName = "") => `${firstName} ${lastName}`.trim();

const normalizePerformanceSnapshot = (performance = {}) => ({
  ticketsHandled: Math.max(0, toNumber(performance.ticketsHandled, 0)),
  ticketsResolved: Math.max(0, toNumber(performance.ticketsResolved, 0)),
  avgResponseTimeMinutes: Math.max(0, toNumber(performance.avgResponseTimeMinutes, 0)),
  avgResolutionTimeMinutes: Math.max(0, toNumber(performance.avgResolutionTimeMinutes, 0)),
  customerSatisfaction: Math.min(5, Math.max(0, toNumber(performance.customerSatisfaction, 0))),
  lastActiveAt: toDate(performance.lastActiveAt),
  lastUpdatedAt: toDate(performance.lastUpdatedAt),
});

const extractEntityIds = (payload = {}) => ({
  ticketId: payload.ticketId || null,
  agentId: payload.agentId || payload.assignedAgentId || null,
  customerId: payload.customerId || null,
});

const recordIncomingEvent = async (topic, payload = {}) => {
  const fingerprint = crypto.createHash("sha256").update(`${topic}:${JSON.stringify(payload)}`).digest("hex");
  const occurredAt = toDate(payload.emittedAt, new Date());
  const entityIds = extractEntityIds(payload);

  try {
    await ReportEventLog.create({
      fingerprint,
      topic,
      occurredAt,
      payload,
      ...entityIds,
    });

    return { inserted: true, occurredAt };
  } catch (error) {
    if (error?.code === 11000) {
      return { inserted: false, occurredAt };
    }

    throw error;
  }
};

const upsertCustomerProjection = async (payload = {}, occurredAt) => {
  const customerId = payload.customerId;
  if (!customerId) return;

  const firstName = (payload.firstName || "").trim();
  const lastName = (payload.lastName || "").trim();

  await ReportCustomer.findOneAndUpdate(
    { customerId },
    {
      $set: {
        authUserId: payload.authUserId || null,
        firstName,
        lastName,
        fullName: (payload.fullName || buildFullName(firstName, lastName)).trim(),
        email: (payload.email || "").toLowerCase().trim(),
        phone: (payload.phone || "").trim(),
        address: payload.address || {
          street: "",
          city: "",
          state: "",
          country: "",
          zipCode: "",
        },
        status: (payload.status || "ACTIVE").toUpperCase(),
        sourceCreatedAt: toDate(payload.createdAt),
        sourceUpdatedAt: toDate(payload.updatedAt, occurredAt),
        isDeleted: false,
        deletedAt: null,
      },
      $setOnInsert: {
        customerId,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
};

const markCustomerDeleted = async (payload = {}, occurredAt) => {
  if (!payload.customerId) return;

  await ReportCustomer.findOneAndUpdate(
    { customerId: payload.customerId },
    {
      $set: {
        isDeleted: true,
        deletedAt: occurredAt,
        sourceUpdatedAt: occurredAt,
      },
      $setOnInsert: {
        customerId: payload.customerId,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
};

const upsertAgentProjection = async (payload = {}, occurredAt) => {
  const agentId = payload.agentId;
  if (!agentId) return;

  const firstName = (payload.firstName || "").trim();
  const lastName = (payload.lastName || "").trim();

  await ReportAgent.findOneAndUpdate(
    { agentId },
    {
      $set: {
        authUserId: payload.authUserId || null,
        firstName,
        lastName,
        fullName: (payload.fullName || buildFullName(firstName, lastName)).trim(),
        email: (payload.email || "").toLowerCase().trim(),
        phone: (payload.phone || "").trim(),
        role: (payload.role || "AGENT").toUpperCase(),
        status: (payload.status || "ACTIVE").toUpperCase(),
        team: (payload.team || "").trim(),
        skills: Array.isArray(payload.skills) ? payload.skills.filter(Boolean) : [],
        performanceSnapshot: normalizePerformanceSnapshot(payload.performance),
        sourceCreatedAt: toDate(payload.createdAt),
        sourceUpdatedAt: toDate(payload.updatedAt, occurredAt),
        isDeleted: false,
        deletedAt: null,
      },
      $setOnInsert: {
        agentId,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
};

const markAgentDeleted = async (payload = {}, occurredAt) => {
  if (!payload.agentId) return;

  await ReportAgent.findOneAndUpdate(
    { agentId: payload.agentId },
    {
      $set: {
        isDeleted: true,
        deletedAt: occurredAt,
        sourceUpdatedAt: occurredAt,
      },
      $setOnInsert: {
        agentId: payload.agentId,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
};

const ensureTicketProjection = async (ticketId, occurredAt) => {
  return ReportTicket.findOneAndUpdate(
    { ticketId },
    {
      $setOnInsert: {
        ticketId,
        status: "OPEN",
        createdAt: occurredAt,
        lastUpdatedAt: occurredAt,
        lastEventAt: occurredAt,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
};

const cleanUpdateSet = (updates) =>
  Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined));

const handleTicketCreated = async (payload = {}, occurredAt) => {
  if (!payload.ticketId) return;

  await ReportTicket.findOneAndUpdate(
    { ticketId: payload.ticketId },
    {
      $set: {
        subject: (payload.subject || "").trim(),
        customerId: payload.customerId || null,
        assignedAgentId: payload.assignedAgentId || null,
        status: (payload.status || "OPEN").toUpperCase(),
        createdBy: payload.createdBy || null,
        lastUpdatedBy: payload.createdBy || null,
        createdAt: toDate(payload.createdAt, occurredAt),
        lastUpdatedAt: toDate(payload.updatedAt, toDate(payload.createdAt, occurredAt)),
        lastEventAt: occurredAt,
      },
      $setOnInsert: {
        ticketId: payload.ticketId,
      },
      $inc: {
        assignmentCount: payload.assignedAgentId ? 1 : 0,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );
};

const handleTicketUpdated = async (payload = {}, occurredAt) => {
  if (!payload.ticketId) return;

  await ensureTicketProjection(payload.ticketId, occurredAt);
  await ReportTicket.findOneAndUpdate(
    { ticketId: payload.ticketId },
    {
      $set: cleanUpdateSet({
        subject: payload.subject !== undefined ? (payload.subject || "").trim() : undefined,
        customerId: payload.customerId !== undefined ? payload.customerId || null : undefined,
        assignedAgentId: payload.assignedAgentId !== undefined ? payload.assignedAgentId || null : undefined,
        status: payload.status ? payload.status.toUpperCase() : undefined,
        lastUpdatedBy: payload.updatedBy || null,
        lastUpdatedAt: toDate(payload.updatedAt, occurredAt),
        lastEventAt: occurredAt,
      }),
    }
  );
};

const handleTicketAssigned = async (payload = {}, occurredAt) => {
  if (!payload.ticketId) return;

  await ensureTicketProjection(payload.ticketId, occurredAt);
  await ReportTicket.findOneAndUpdate(
    { ticketId: payload.ticketId },
    {
      $set: cleanUpdateSet({
        subject: payload.subject !== undefined ? (payload.subject || "").trim() : undefined,
        customerId: payload.customerId !== undefined ? payload.customerId || null : undefined,
        assignedAgentId: payload.assignedAgentId || null,
        status: payload.status ? payload.status.toUpperCase() : undefined,
        lastUpdatedBy: payload.assignedBy || null,
        lastUpdatedAt: toDate(payload.updatedAt, occurredAt),
        lastEventAt: occurredAt,
      }),
      $inc: {
        assignmentCount: 1,
      },
    }
  );
};

const handleTicketClosed = async (payload = {}, occurredAt) => {
  if (!payload.ticketId) return;

  await ensureTicketProjection(payload.ticketId, occurredAt);
  await ReportTicket.findOneAndUpdate(
    { ticketId: payload.ticketId },
    {
      $set: cleanUpdateSet({
        subject: payload.subject !== undefined ? (payload.subject || "").trim() : undefined,
        customerId: payload.customerId !== undefined ? payload.customerId || null : undefined,
        assignedAgentId: payload.assignedAgentId !== undefined ? payload.assignedAgentId || null : undefined,
        status: "CLOSED",
        closedAt: toDate(payload.closedAt, occurredAt),
        lastClosedAt: toDate(payload.closedAt, occurredAt),
        latestResolutionTimeMinutes: Math.max(0, toNumber(payload.resolutionTimeMinutes, 0)),
        lastUpdatedBy: payload.closedBy || null,
        lastUpdatedAt: toDate(payload.closedAt, occurredAt),
        lastEventAt: occurredAt,
      }),
      $inc: {
        closedCount: 1,
      },
    }
  );
};

const handleTicketReopened = async (payload = {}, occurredAt) => {
  if (!payload.ticketId) return;

  await ensureTicketProjection(payload.ticketId, occurredAt);
  await ReportTicket.findOneAndUpdate(
    { ticketId: payload.ticketId },
    {
      $set: cleanUpdateSet({
        subject: payload.subject !== undefined ? (payload.subject || "").trim() : undefined,
        customerId: payload.customerId !== undefined ? payload.customerId || null : undefined,
        assignedAgentId: payload.assignedAgentId !== undefined ? payload.assignedAgentId || null : undefined,
        status: (payload.status || "OPEN").toUpperCase(),
        closedAt: null,
        lastUpdatedBy: payload.reopenedBy || null,
        lastUpdatedAt: toDate(payload.reopenedAt, occurredAt),
        lastEventAt: occurredAt,
      }),
      $inc: {
        reopenedCount: 1,
      },
    }
  );
};

const handleTicketCommented = async (payload = {}, occurredAt) => {
  if (!payload.ticketId) return;

  await ensureTicketProjection(payload.ticketId, occurredAt);
  await ReportTicket.findOneAndUpdate(
    { ticketId: payload.ticketId },
    {
      $set: cleanUpdateSet({
        subject: payload.subject !== undefined ? (payload.subject || "").trim() : undefined,
        customerId: payload.customerId !== undefined ? payload.customerId || null : undefined,
        assignedAgentId: payload.assignedAgentId !== undefined ? payload.assignedAgentId || null : undefined,
        status: payload.status ? payload.status.toUpperCase() : undefined,
        lastUpdatedBy: payload.commentedBy || null,
        lastUpdatedAt: toDate(payload.commentedAt, occurredAt),
        lastCommentAt: toDate(payload.commentedAt, occurredAt),
        lastEventAt: occurredAt,
      }),
      $inc: {
        totalComments: 1,
      },
    }
  );
};

const applyReportEvent = async (topic, payload = {}) => {
  const { inserted, occurredAt } = await recordIncomingEvent(topic, payload);
  if (!inserted) {
    return false;
  }

  if (topic.startsWith("customer.")) {
    if (topic === "customer.deleted") {
      await markCustomerDeleted(payload, occurredAt);
    } else {
      await upsertCustomerProjection(payload, occurredAt);
    }
  }

  if (topic.startsWith("agent.")) {
    if (topic === "agent.deleted") {
      await markAgentDeleted(payload, occurredAt);
    } else {
      await upsertAgentProjection(payload, occurredAt);
    }
  }

  if (topic === "ticket.created") {
    await handleTicketCreated(payload, occurredAt);
  }
  if (topic === "ticket.updated") {
    await handleTicketUpdated(payload, occurredAt);
  }
  if (topic === "ticket.assigned") {
    await handleTicketAssigned(payload, occurredAt);
  }
  if (topic === "ticket.closed") {
    await handleTicketClosed(payload, occurredAt);
  }
  if (topic === "ticket.reopened") {
    await handleTicketReopened(payload, occurredAt);
  }
  if (topic === "ticket.commented") {
    await handleTicketCommented(payload, occurredAt);
  }

  await deleteByPattern("report:*");

  return true;
};

module.exports = {
  applyReportEvent,
};
