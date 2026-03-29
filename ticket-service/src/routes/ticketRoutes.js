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
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.get("/filter", filterTickets);
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
