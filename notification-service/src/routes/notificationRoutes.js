const express = require("express");
const {
  sendNotification,
  sendEmailNotification,
  sendSmsNotification,
  sendTicketUpdate,
  getNotifications,
  getNotification,
  readNotification,
  readAllNotifications,
} = require("../controller/notificationController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);

router.get("/", getNotifications);
router.get("/:id", getNotification);
router.post("/", sendNotification);
router.post("/email", sendEmailNotification);
router.post("/sms", sendSmsNotification);
router.post("/ticket-update", sendTicketUpdate);
router.patch("/read-all", readAllNotifications);
router.patch("/:id/read", readNotification);

module.exports = router;
