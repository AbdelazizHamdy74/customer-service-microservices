const express = require("express");
const { requireServiceKey } = require("../middleware/serviceKeyMiddleware");
const { createCustomerInternal, deleteCustomerInternal } = require("../controller/customerController");

const router = express.Router();

router.use(requireServiceKey);
router.post("/customers", createCustomerInternal);
router.delete("/customers/:id", deleteCustomerInternal);

module.exports = router;
