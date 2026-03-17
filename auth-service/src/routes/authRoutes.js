const express = require("express");
const {
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  inviteCustomer,
  inviteAgent,
} = require("../controller/authController");
const { requireAuth, requireRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", login);
router.post("/invite/customer", requireAuth, requireRoles("ADMIN", "SUPERVISOR"), inviteCustomer);
router.post("/invite/agent", requireAuth, requireRoles("ADMIN", "SUPERVISOR"), inviteAgent);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
