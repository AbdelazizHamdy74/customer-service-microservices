const express = require("express");
const {
  ticketsPerDay,
  agentPerformance,
  customerSatisfaction,
  ticketStatusReport,
} = require("../controller/reportController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.get("/tickets-per-day", ticketsPerDay);
router.get("/agent-performance", agentPerformance);
router.get("/customer-satisfaction", customerSatisfaction);
router.get("/ticket-status-report", ticketStatusReport);

module.exports = router;
