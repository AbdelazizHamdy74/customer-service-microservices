const ReportAgent = require("../models/ReportAgent");
const ReportEventLog = require("../models/ReportEventLog");
const ReportTicket = require("../models/ReportTicket");

const STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"];

const formatDay = (date) => date.toISOString().slice(0, 10);

const buildDateKeys = (startDate, endDate) => {
  const keys = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    keys.push(formatDay(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return keys;
};

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundTwo = (value) => Number(toFiniteNumber(value, 0).toFixed(2));

const buildTicketsPerDayReport = async (filters) => {
  const match = {
    createdAt: {
      $gte: filters.startDate,
      $lte: filters.endDate,
    },
  };

  if (filters.assignedAgentId) {
    match.assignedAgentId = filters.assignedAgentId;
  }
  if (filters.customerId) {
    match.customerId = filters.customerId;
  }
  if (filters.status) {
    match.status = filters.status;
  }

  const rows = await ReportTicket.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const countsByDay = new Map(rows.map((row) => [row._id, row.count]));
  const items = buildDateKeys(filters.startDate, filters.endDate).map((day) => ({
    day,
    count: countsByDay.get(day) || 0,
  }));

  return {
    report: "ticketsPerDay",
    period: {
      startDate: formatDay(filters.startDate),
      endDate: formatDay(filters.endDate),
    },
    filters: {
      assignedAgentId: filters.assignedAgentId || null,
      customerId: filters.customerId || null,
      status: filters.status || null,
    },
    totalTickets: items.reduce((sum, item) => sum + item.count, 0),
    items,
    generatedAt: new Date().toISOString(),
  };
};

const buildAgentPerformanceReport = async (filters) => {
  const eventLogs = await ReportEventLog.find({
    topic: {
      $in: ["ticket.created", "ticket.assigned", "ticket.closed", "ticket.reopened"],
    },
    occurredAt: {
      $gte: filters.startDate,
      $lte: filters.endDate,
    },
  }).lean();

  const metricsByAgentId = new Map();
  const ensureMetric = (agentId) => {
    if (!agentId) return null;

    if (!metricsByAgentId.has(agentId)) {
      metricsByAgentId.set(agentId, {
        ticketsAssigned: 0,
        ticketsClosed: 0,
        ticketsReopened: 0,
        resolutionSamples: [],
      });
    }

    return metricsByAgentId.get(agentId);
  };

  for (const eventLog of eventLogs) {
    const payload = eventLog.payload || {};

    if (eventLog.topic === "ticket.created" && payload.assignedAgentId) {
      const metric = ensureMetric(payload.assignedAgentId);
      if (metric) metric.ticketsAssigned += 1;
    }

    if (eventLog.topic === "ticket.assigned" && payload.assignedAgentId) {
      const metric = ensureMetric(payload.assignedAgentId);
      if (metric) metric.ticketsAssigned += 1;
    }

    if (eventLog.topic === "ticket.closed" && payload.assignedAgentId) {
      const metric = ensureMetric(payload.assignedAgentId);
      if (metric) {
        metric.ticketsClosed += 1;
        const resolutionTimeMinutes = toFiniteNumber(payload.resolutionTimeMinutes, null);
        if (resolutionTimeMinutes !== null) {
          metric.resolutionSamples.push(Math.max(0, resolutionTimeMinutes));
        }
      }
    }

    if (eventLog.topic === "ticket.reopened" && payload.assignedAgentId) {
      const metric = ensureMetric(payload.assignedAgentId);
      if (metric) metric.ticketsReopened += 1;
    }
  }

  const agentIdsFromEvents = Array.from(metricsByAgentId.keys());
  const activeAgentIds = filters.agentId
    ? []
    : (await ReportAgent.find({ isDeleted: false }).select("agentId").lean()).map((agent) => agent.agentId);
  const agentIds = filters.agentId
    ? [filters.agentId]
    : Array.from(new Set([...activeAgentIds, ...agentIdsFromEvents]));

  const [agents, openTicketRows] = await Promise.all([
    ReportAgent.find({ agentId: { $in: agentIds } }).lean(),
    ReportTicket.aggregate([
      {
        $match: {
          assignedAgentId: { $in: agentIds },
          status: { $ne: "CLOSED" },
        },
      },
      {
        $group: {
          _id: "$assignedAgentId",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const agentById = new Map(agents.map((agent) => [agent.agentId, agent]));
  const openTicketsByAgentId = new Map(openTicketRows.map((row) => [row._id, row.count]));

  const items = agentIds
    .map((agentId) => {
      const agent = agentById.get(agentId);
      const metric = metricsByAgentId.get(agentId) || {
        ticketsAssigned: 0,
        ticketsClosed: 0,
        ticketsReopened: 0,
        resolutionSamples: [],
      };

      const averageResolutionTimeMinutes = metric.resolutionSamples.length
        ? roundTwo(
            metric.resolutionSamples.reduce((sum, value) => sum + value, 0) / metric.resolutionSamples.length
          )
        : 0;

      return {
        agentId,
        name: agent?.fullName || "Unknown Agent",
        role: agent?.role || "AGENT",
        status: agent?.status || "UNKNOWN",
        team: agent?.team || "",
        isDeleted: Boolean(agent?.isDeleted),
        ticketsAssigned: metric.ticketsAssigned,
        ticketsClosed: metric.ticketsClosed,
        ticketsReopened: metric.ticketsReopened,
        currentOpenTickets: openTicketsByAgentId.get(agentId) || 0,
        resolutionRate: metric.ticketsAssigned
          ? roundTwo((metric.ticketsClosed / metric.ticketsAssigned) * 100)
          : 0,
        averageResolutionTimeMinutes,
        snapshotPerformance: {
          ticketsHandled: agent?.performanceSnapshot?.ticketsHandled || 0,
          ticketsResolved: agent?.performanceSnapshot?.ticketsResolved || 0,
          avgResponseTimeMinutes: agent?.performanceSnapshot?.avgResponseTimeMinutes || 0,
          avgResolutionTimeMinutes: agent?.performanceSnapshot?.avgResolutionTimeMinutes || 0,
          customerSatisfaction: agent?.performanceSnapshot?.customerSatisfaction || 0,
          lastActiveAt: agent?.performanceSnapshot?.lastActiveAt || null,
          lastUpdatedAt: agent?.performanceSnapshot?.lastUpdatedAt || null,
        },
      };
    })
    .sort((left, right) => {
      if (right.ticketsClosed !== left.ticketsClosed) {
        return right.ticketsClosed - left.ticketsClosed;
      }
      return left.name.localeCompare(right.name);
    });

  return {
    report: "agentPerformance",
    period: {
      startDate: formatDay(filters.startDate),
      endDate: formatDay(filters.endDate),
    },
    filters: {
      agentId: filters.agentId || null,
    },
    summary: {
      totalAgents: items.length,
      totalAssignedTickets: items.reduce((sum, item) => sum + item.ticketsAssigned, 0),
      totalClosedTickets: items.reduce((sum, item) => sum + item.ticketsClosed, 0),
      totalOpenTickets: items.reduce((sum, item) => sum + item.currentOpenTickets, 0),
    },
    items,
    generatedAt: new Date().toISOString(),
  };
};

const buildCustomerSatisfactionReport = async (filters) => {
  const agents = await ReportAgent.find({ isDeleted: false }).lean();

  const filteredItems = agents
    .map((agent) => ({
      agentId: agent.agentId,
      name: agent.fullName || "Unknown Agent",
      role: agent.role || "AGENT",
      team: agent.team || "",
      customerSatisfaction: roundTwo(agent.performanceSnapshot?.customerSatisfaction || 0),
      ticketsHandled: agent.performanceSnapshot?.ticketsHandled || 0,
      ticketsResolved: agent.performanceSnapshot?.ticketsResolved || 0,
      lastUpdatedAt: agent.performanceSnapshot?.lastUpdatedAt || agent.sourceUpdatedAt || null,
    }))
    .filter((item) => item.customerSatisfaction >= filters.minScore && item.customerSatisfaction <= filters.maxScore)
    .sort((left, right) => {
      if (right.customerSatisfaction !== left.customerSatisfaction) {
        return right.customerSatisfaction - left.customerSatisfaction;
      }
      return left.name.localeCompare(right.name);
    });

  const ratedItems = filteredItems.filter((item) => item.customerSatisfaction > 0);
  const averageScore = ratedItems.length
    ? roundTwo(ratedItems.reduce((sum, item) => sum + item.customerSatisfaction, 0) / ratedItems.length)
    : 0;

  const topRatedAgents = filteredItems.slice(0, filters.limit);
  const lowestRatedAgents = [...ratedItems]
    .sort((left, right) => {
      if (left.customerSatisfaction !== right.customerSatisfaction) {
        return left.customerSatisfaction - right.customerSatisfaction;
      }
      return left.name.localeCompare(right.name);
    })
    .slice(0, filters.limit);

  return {
    report: "customerSatisfaction",
    filters: {
      minScore: filters.minScore,
      maxScore: filters.maxScore,
      limit: filters.limit,
    },
    summary: {
      totalAgents: filteredItems.length,
      ratedAgents: ratedItems.length,
      unratedAgents: filteredItems.length - ratedItems.length,
      averageScore,
      highestScore: ratedItems.length ? ratedItems[0].customerSatisfaction : 0,
      lowestScore: lowestRatedAgents.length ? lowestRatedAgents[0].customerSatisfaction : 0,
    },
    topRatedAgents,
    lowestRatedAgents,
    generatedAt: new Date().toISOString(),
  };
};

const buildTicketStatusReport = async (filters) => {
  const match = {};

  if (filters.startDate && filters.endDate) {
    match.createdAt = {
      $gte: filters.startDate,
      $lte: filters.endDate,
    };
  }

  if (filters.assignedAgentId) {
    match.assignedAgentId = filters.assignedAgentId;
  }
  if (filters.customerId) {
    match.customerId = filters.customerId;
  }

  const tickets = await ReportTicket.find(match).select("status assignedAgentId").lean();
  const countsByStatus = Object.fromEntries(STATUSES.map((status) => [status, 0]));

  let assignedTickets = 0;
  let unassignedTickets = 0;

  for (const ticket of tickets) {
    const status = STATUSES.includes(ticket.status) ? ticket.status : "OPEN";
    countsByStatus[status] += 1;

    if (ticket.assignedAgentId) {
      assignedTickets += 1;
    } else {
      unassignedTickets += 1;
    }
  }

  const items = STATUSES.map((status) => ({
    status,
    count: countsByStatus[status],
  }));

  return {
    report: "ticketStatusReport",
    period:
      filters.startDate && filters.endDate
        ? {
            startDate: formatDay(filters.startDate),
            endDate: formatDay(filters.endDate),
          }
        : null,
    filters: {
      assignedAgentId: filters.assignedAgentId || null,
      customerId: filters.customerId || null,
    },
    totals: {
      totalTickets: tickets.length,
      assignedTickets,
      unassignedTickets,
      activeTickets: tickets.length - countsByStatus.CLOSED,
      closedTickets: countsByStatus.CLOSED,
    },
    items,
    generatedAt: new Date().toISOString(),
  };
};

module.exports = {
  buildTicketsPerDayReport,
  buildAgentPerformanceReport,
  buildCustomerSatisfactionReport,
  buildTicketStatusReport,
};
