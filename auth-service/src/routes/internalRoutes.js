const express = require("express");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const internalKey = require("../middleware/internalKey");

const router = express.Router();

// POST /internal/users
router.post(
  "/users",
  internalKey,
  asyncHandler(async (req, res) => {
    const { name, email, password, role, userType, linkedId, isActive } =
      req.body;
    if (!name || !email || !password || !role || !userType) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Email already in use" });
    }
    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      role,
      userType,
      linkedId: linkedId || null,
      isActive: isActive !== undefined ? isActive : true,
    });
    await user.save();
    res.status(201).json({ success: true, data: { userId: user.id } });
  }),
);

module.exports = router;
