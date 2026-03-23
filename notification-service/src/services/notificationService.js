const Notification = require("../models/Notification");
const ApiError = require("../utils/apiError");
const { sendEmail } = require("./emailProvider");
const { sendSms } = require("./smsProvider");

const ADMIN_ROLES = ["ADMIN", "SUPERVISOR"];
const MANAGED_CHANNELS = ["IN_APP", "EMAIL", "SMS"];

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeRecipient = (recipient = {}) => ({
  recipientType: recipient.recipientType || "SYSTEM",
  recipientId: recipient.recipientId || null,
  email: recipient.email ? String(recipient.email).trim().toLowerCase() : null,
  phone: recipient.phone ? String(recipient.phone).trim() : null,
  displayName: recipient.displayName ? String(recipient.displayName).trim() : null,
});

const buildInitialDeliveries = (channels = []) => {
  const normalizedChannels = Array.from(
    new Set(
      channels
        .map((channel) => String(channel).trim().toUpperCase())
        .filter((channel) => MANAGED_CHANNELS.includes(channel))
    )
  );

  return normalizedChannels.map((channel) => {
    if (channel === "IN_APP") {
      const now = new Date();
      return {
        channel,
        status: "SENT",
        provider: "database",
        attemptedAt: now,
        sentAt: now,
        error: null,
      };
    }

    return {
      channel,
      status: "PENDING",
      provider: null,
      attemptedAt: null,
      sentAt: null,
      error: null,
    };
  });
};

const buildEmailHtml = ({ title, message }) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
    <h2 style="margin-bottom: 12px;">${title}</h2>
    <p style="margin: 0;">${message}</p>
  </div>
`;

const dispatchDelivery = async (notification, delivery, extra = {}) => {
  const attemptTime = new Date();

  if (delivery.channel === "EMAIL") {
    if (!notification.recipient.email) {
      delivery.status = "FAILED";
      delivery.provider = "brevo";
      delivery.attemptedAt = attemptTime;
      delivery.error = "Recipient email is required";
      return;
    }

    const result = await sendEmail({
      to: notification.recipient.email,
      subject: extra.emailContent?.subject || notification.title,
      html: extra.emailContent?.html || buildEmailHtml(notification),
      text: extra.emailContent?.text || notification.message,
    });

    delivery.attemptedAt = attemptTime;
    delivery.provider = result.provider;
    delivery.status = result.ok ? "SENT" : "FAILED";
    delivery.sentAt = result.ok ? new Date() : null;
    delivery.externalId = result.externalId || null;
    delivery.error = result.ok ? null : result.error || "Email delivery failed";
    return;
  }

  if (delivery.channel === "SMS") {
    if (!notification.recipient.phone) {
      delivery.status = "FAILED";
      delivery.provider = "sms";
      delivery.attemptedAt = attemptTime;
      delivery.error = "Recipient phone is required";
      return;
    }

    const result = await sendSms({
      to: notification.recipient.phone,
      message: extra.smsContent?.message || notification.message,
    });

    delivery.attemptedAt = attemptTime;
    delivery.provider = result.provider;
    delivery.status = result.ok ? "SENT" : "FAILED";
    delivery.sentAt = result.ok ? new Date() : null;
    delivery.externalId = result.externalId || null;
    delivery.error = result.ok ? null : result.error || "SMS delivery failed";
  }
};

const createNotification = async (payload = {}) => {
  const channels = Array.isArray(payload.channels) && payload.channels.length ? payload.channels : ["IN_APP"];
  const notification = await Notification.create({
    topic: normalizeText(payload.topic) || "notification.manual",
    sourceService: normalizeText(payload.sourceService) || "notification-service",
    category: normalizeText(payload.category || "SYSTEM").toUpperCase(),
    notificationType: normalizeText(payload.notificationType || "EVENT").toUpperCase(),
    title: normalizeText(payload.title),
    message: normalizeText(payload.message),
    recipient: normalizeRecipient(payload.recipient),
    actor: payload.actor || {
      actorId: null,
      actorRole: "SYSTEM",
    },
    entity: payload.entity || {
      entityType: null,
      entityId: null,
    },
    channels: Array.from(new Set(channels.map((channel) => String(channel).trim().toUpperCase()))),
    deliveries: buildInitialDeliveries(channels),
    metadata: payload.metadata || null,
    happenedAt: payload.happenedAt || new Date(),
  });

  let shouldSave = false;
  for (const delivery of notification.deliveries) {
    if (delivery.channel !== "IN_APP" && delivery.status === "PENDING") {
      await dispatchDelivery(notification, delivery, payload);
      shouldSave = true;
    }
  }

  if (shouldSave) {
    await notification.save();
  }

  return notification;
};

const createManyNotifications = async (items = []) => {
  const result = [];
  for (const item of items) {
    result.push(await createNotification(item));
  }
  return result;
};

const buildOwnFilter = (user) => {
  const filters = [
    {
      "recipient.recipientType": "USER",
      "recipient.recipientId": user.id,
    },
  ];

  if (user?.linkedId && user?.userType === "CUSTOMER") {
    filters.push({
      "recipient.recipientType": "CUSTOMER",
      "recipient.recipientId": user.linkedId,
    });
  }

  if (user?.linkedId && user?.userType === "AGENT") {
    filters.push({
      "recipient.recipientType": "AGENT",
      "recipient.recipientId": user.linkedId,
    });
  }

  if (ADMIN_ROLES.includes(user?.role)) {
    filters.push({
      "recipient.recipientType": "SYSTEM",
    });
  }

  return { $or: filters };
};

const buildListFilter = (user, query = {}) => {
  const wantsAll = String(query.all).toLowerCase() === "true";
  const filter = wantsAll && ADMIN_ROLES.includes(user?.role) ? {} : buildOwnFilter(user);

  if (query.topic) {
    filter.topic = query.topic.trim();
  }

  if (query.category) {
    filter.category = query.category.trim().toUpperCase();
  }

  if (query.notificationType) {
    filter.notificationType = query.notificationType.trim().toUpperCase();
  }

  if (query.channel) {
    filter.channels = query.channel.trim().toUpperCase();
  }

  if (query.isRead !== undefined) {
    filter.isRead = String(query.isRead).toLowerCase() === "true";
  }

  return filter;
};

const listNotifications = async ({ user, query = {} }) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
  const filter = buildListFilter(user, query);

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ happenedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({
      ...filter,
      isRead: false,
    }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    unreadCount,
  };
};

const userCanAccessNotification = (notification, user) => {
  if (!notification) return false;

  if (ADMIN_ROLES.includes(user?.role)) {
    return true;
  }

  const recipientType = notification.recipient?.recipientType;
  const recipientId = notification.recipient?.recipientId;

  if (recipientType === "USER" && recipientId === user.id) {
    return true;
  }

  if (recipientType === "CUSTOMER" && user?.userType === "CUSTOMER" && recipientId === user.linkedId) {
    return true;
  }

  if (recipientType === "AGENT" && user?.userType === "AGENT" && recipientId === user.linkedId) {
    return true;
  }

  return false;
};

const getNotificationById = async (id, user) => {
  const notification = await Notification.findById(id);
  if (!notification) {
    return null;
  }

  if (!userCanAccessNotification(notification, user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  return notification;
};

const markNotificationAsRead = async (id, user) => {
  const notification = await Notification.findById(id);
  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  if (!userCanAccessNotification(notification, user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
};

const markAllNotificationsAsRead = async (user) => {
  const filter = {
    ...buildOwnFilter(user),
    isRead: false,
  };

  const result = await Notification.updateMany(filter, {
    $set: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    matchedCount: result.matchedCount || 0,
    modifiedCount: result.modifiedCount || 0,
  };
};

module.exports = {
  createNotification,
  createManyNotifications,
  listNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
