const express = require("express");
const { requireServiceKey } = require("../middleware/serviceKeyMiddleware");
const { createAgentInternal, deleteAgentInternal } = require("../controller/agentController");

const router = express.Router();

router.use(requireServiceKey);
router.post("/agents", createAgentInternal);
router.delete("/agents/:id", deleteAgentInternal);

module.exports = router;
