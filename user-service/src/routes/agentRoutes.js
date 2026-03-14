const express = require("express");
const {
  createAgent,
  updateAgent,
  deleteAgent,
  getAgent,
  assignRole,
  agentPerformance,
} = require("../controller/agentController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.post("/", createAgent);
router.get("/:id/performance", agentPerformance);
router.put("/:id/role", assignRole);
router.get("/:id", getAgent);
router.put("/:id", updateAgent);
router.delete("/:id", deleteAgent);

module.exports = router;
