const express = require("express");
const {
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
} = require("../controller/authController");

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
