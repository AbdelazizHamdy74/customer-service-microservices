const express = require("express");
const {
  createTicket,
  updateTicket,
  assignTicket,
  closeTicket,
  reopenTicket,
  addComment,
  getTicket,
  ticketHistory,
  getTickets,
  filterTickets,
} = require("../controller/ticketController");
const {
  listCannedResponses,
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
} = require("../controller/cannedResponseController");
const { listAuditLogs } = require("../controller/auditLogController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireManagement } = require("../middleware/requireManagement");

const router = express.Router();

router.use(requireAuth);

router.get("/filter", filterTickets);
router.get("/canned-responses", listCannedResponses);
router.post("/canned-responses", requireManagement, createCannedResponse);
router.put("/canned-responses/:id", requireManagement, updateCannedResponse);
router.delete("/canned-responses/:id", requireManagement, deleteCannedResponse);
router.get("/audit-logs", requireManagement, listAuditLogs);
router.get("/", getTickets);
router.get("/:id/history", ticketHistory);
router.get("/:id", getTicket);
router.post("/", createTicket);
router.put("/:id", updateTicket);
router.put("/:id/assign", assignTicket);
router.put("/:id/close", closeTicket);
router.put("/:id/reopen", reopenTicket);
router.post("/:id/comments", addComment);

module.exports = router;
