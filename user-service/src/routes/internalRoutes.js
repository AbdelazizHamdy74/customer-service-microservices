const express = require("express");
const { requireServiceKey } = require("../middleware/serviceKeyMiddleware");
const {
  createAgentInternal,
  deleteAgentInternal,
  getAgentInternal,
  getAssignableAgentIds,
} = require("../controller/agentController");

const router = express.Router();

router.use(requireServiceKey);
router.post("/agents", createAgentInternal);
router.get("/agents/assignable", getAssignableAgentIds);
router.get("/agents/:id", getAgentInternal);
router.delete("/agents/:id", deleteAgentInternal);

module.exports = router;
