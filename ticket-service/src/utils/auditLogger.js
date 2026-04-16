const AuditLog = require("../models/AuditLog");
const logger = require("./logger");

const logAudit = async ({ actorId, actorRole, action, resourceType, resourceId, meta }) => {
  try {
    await AuditLog.create({
      action,
      actorId: actorId || null,
      actorRole: actorRole || null,
      resourceType,
      resourceId: resourceId || null,
      meta: meta || null,
    });
  } catch (err) {
    logger.warn(`audit log failed: ${err?.message || err}`);
  }
};

module.exports = { logAudit };
