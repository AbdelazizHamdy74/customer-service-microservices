const AuditLog = require("../models/AuditLog");
const asyncHandler = require("../utils/asyncHandler");

const getPagination = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(200, Number(query.limit) || 50));

  return { page, limit };
};

const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit } = getPagination(req.query);
  const filter = {};

  if (req.query.action) {
    filter.action = String(req.query.action).trim();
  }
  if (req.query.resourceType) {
    filter.resourceType = String(req.query.resourceType).trim();
  }
  if (req.query.actorId) {
    filter.actorId = String(req.query.actorId).trim();
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    message: "Audit logs retrieved",
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

module.exports = { listAuditLogs };
