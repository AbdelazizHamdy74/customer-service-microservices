const logger = require("../utils/logger");
const { buildNotificationsFromEvent } = require("../services/eventNotificationFactory");
const { createManyNotifications } = require("../services/notificationService");

const handleEventNotification = async (topic, payload) => {
  const notifications = buildNotificationsFromEvent(topic, payload);
  if (!notifications.length) {
    logger.warn(`No notification mapping found for topic ${topic}`);
    return;
  }

  await createManyNotifications(notifications);
  logger.info(`Stored ${notifications.length} notification(s) for topic ${topic}`);
};

module.exports = {
  handleEventNotification,
};
