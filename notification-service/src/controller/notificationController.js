const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const {
  createNotification,
  createManyNotifications,
  listNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} = require("../services/notificationService");
const {
  validateSendNotificationPayload,
  validateSendEmailPayload,
  validateSendSmsPayload,
  validateSendTicketUpdatePayload,
  validateNotificationListQuery,
} = require("../utils/validators/notificationValidator");

const STAFF_ROLES = ["ADMIN", "SUPERVISOR", "AGENT"];

const buildEntity = (entityType, entityId) => {
  if (!entityType && !entityId) return null;

  return {
    entityType: entityType ? entityType.trim().toUpperCase() : "GENERIC",
    entityId: entityId ? entityId.trim() : null,
  };
};

const buildActor = (user) => ({
  actorId: user.id,
  actorRole: user.role || user.userType || "SYSTEM",
});

const sendNotification = asyncHandler(async (req, res) => {
  if (!STAFF_ROLES.includes(req.user?.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const errors = validateSendNotificationPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const notification = await createNotification({
    topic: "notification.manual",
    sourceService: "notification-service",
    category: "MANUAL",
    notificationType: "MANUAL",
    title: req.body.title.trim(),
    message: req.body.message.trim(),
    recipient: {
      recipientType: req.body.recipientType.toUpperCase(),
      recipientId: req.body.recipientId.trim(),
      email: req.body.email,
      phone: req.body.phone,
      displayName: req.body.displayName,
    },
    entity: buildEntity(req.body.entityType, req.body.entityId),
    actor: buildActor(req.user),
    metadata: req.body.metadata || null,
    channels: ["IN_APP"],
  });

  res.status(201).json({
    success: true,
    message: "Notification sent successfully",
    data: notification,
  });
});

const sendEmailNotification = asyncHandler(async (req, res) => {
  if (!STAFF_ROLES.includes(req.user?.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const errors = validateSendEmailPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const notification = await createNotification({
    topic: "notification.email",
    sourceService: "notification-service",
    category: "EMAIL",
    notificationType: "EMAIL",
    title: req.body.subject.trim(),
    message: req.body.message.trim(),
    recipient: {
      recipientType: req.body.recipientType.toUpperCase(),
      recipientId: req.body.recipientId.trim(),
      email: req.body.email,
      displayName: req.body.displayName,
    },
    entity: buildEntity(req.body.entityType, req.body.entityId),
    actor: buildActor(req.user),
    metadata: req.body.metadata || null,
    channels: ["IN_APP", "EMAIL"],
    emailContent: {
      subject: req.body.subject.trim(),
      html: req.body.html,
      text: req.body.message.trim(),
    },
  });

  const delivery = notification.deliveries.find((item) => item.channel === "EMAIL");
  const message =
    delivery && delivery.status === "FAILED"
      ? "Email notification stored but delivery failed"
      : "Email notification sent successfully";

  res.status(201).json({
    success: true,
    message,
    data: notification,
  });
});

const sendSmsNotification = asyncHandler(async (req, res) => {
  if (!STAFF_ROLES.includes(req.user?.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const errors = validateSendSmsPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const notification = await createNotification({
    topic: "notification.sms",
    sourceService: "notification-service",
    category: "SMS",
    notificationType: "SMS",
    title: req.body.title ? req.body.title.trim() : "SMS Notification",
    message: req.body.message.trim(),
    recipient: {
      recipientType: req.body.recipientType.toUpperCase(),
      recipientId: req.body.recipientId.trim(),
      phone: req.body.phone,
      displayName: req.body.displayName,
    },
    entity: buildEntity(req.body.entityType, req.body.entityId),
    actor: buildActor(req.user),
    metadata: req.body.metadata || null,
    channels: ["IN_APP", "SMS"],
    smsContent: {
      message: req.body.message.trim(),
    },
  });

  const delivery = notification.deliveries.find((item) => item.channel === "SMS");
  const message =
    delivery && delivery.status === "FAILED"
      ? "SMS notification stored but delivery failed"
      : "SMS notification sent successfully";

  res.status(201).json({
    success: true,
    message,
    data: notification,
  });
});

const sendTicketUpdate = asyncHandler(async (req, res) => {
  if (!STAFF_ROLES.includes(req.user?.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const errors = validateSendTicketUpdatePayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const channels =
    Array.isArray(req.body.channels) && req.body.channels.length
      ? req.body.channels.map((channel) => String(channel).trim().toUpperCase())
      : ["IN_APP"];

  const notifications = [];

  if (req.body.customerId) {
    notifications.push({
      topic: "notification.ticket-update",
      sourceService: "notification-service",
      category: "TICKET",
      notificationType: "TICKET_UPDATE",
      title: req.body.title ? req.body.title.trim() : "Ticket Update",
      message: req.body.message.trim(),
      recipient: {
        recipientType: "CUSTOMER",
        recipientId: req.body.customerId.trim(),
        email: req.body.customerEmail,
        phone: req.body.customerPhone,
      },
      entity: {
        entityType: "TICKET",
        entityId: req.body.ticketId.trim(),
      },
      actor: buildActor(req.user),
      metadata: {
        ...(req.body.metadata || {}),
        status: req.body.status ? req.body.status.trim().toUpperCase() : undefined,
      },
      channels,
      emailContent: {
        subject: req.body.emailSubject || req.body.title || "Ticket Update",
        text: req.body.message.trim(),
      },
      smsContent: {
        message: req.body.message.trim(),
      },
    });
  }

  if (req.body.assignedAgentId) {
    notifications.push({
      topic: "notification.ticket-update",
      sourceService: "notification-service",
      category: "TICKET",
      notificationType: "TICKET_UPDATE",
      title: req.body.title ? req.body.title.trim() : "Ticket Update",
      message: req.body.message.trim(),
      recipient: {
        recipientType: "AGENT",
        recipientId: req.body.assignedAgentId.trim(),
        email: req.body.agentEmail,
        phone: req.body.agentPhone,
      },
      entity: {
        entityType: "TICKET",
        entityId: req.body.ticketId.trim(),
      },
      actor: buildActor(req.user),
      metadata: {
        ...(req.body.metadata || {}),
        status: req.body.status ? req.body.status.trim().toUpperCase() : undefined,
      },
      channels,
      emailContent: {
        subject: req.body.emailSubject || req.body.title || "Ticket Update",
        text: req.body.message.trim(),
      },
      smsContent: {
        message: req.body.message.trim(),
      },
    });
  }

  const created = await createManyNotifications(notifications);

  res.status(201).json({
    success: true,
    message: "Ticket update notifications processed successfully",
    data: created,
  });
});

const getNotifications = asyncHandler(async (req, res) => {
  const errors = validateNotificationListQuery(req.query);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const result = await listNotifications({
    user: req.user,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    message: "Notifications fetched successfully",
    data: result,
  });
});

const getNotification = asyncHandler(async (req, res) => {
  const notification = await getNotificationById(req.params.id, req.user);
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  res.status(200).json({
    success: true,
    message: "Notification fetched successfully",
    data: notification,
  });
});

const readNotification = asyncHandler(async (req, res) => {
  const notification = await markNotificationAsRead(req.params.id, req.user);

  res.status(200).json({
    success: true,
    message: "Notification marked as read",
    data: notification,
  });
});

const readAllNotifications = asyncHandler(async (req, res) => {
  const result = await markAllNotificationsAsRead(req.user);

  res.status(200).json({
    success: true,
    message: "Notifications marked as read",
    data: result,
  });
});

module.exports = {
  sendNotification,
  sendEmailNotification,
  sendSmsNotification,
  sendTicketUpdate,
  getNotifications,
  getNotification,
  readNotification,
  readAllNotifications,
};
