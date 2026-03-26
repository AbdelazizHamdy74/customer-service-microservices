const logger = require("../utils/logger");
const { applyReportEvent } = require("../services/reportProjectionService");

const handleReportEvent = async (topic, payload) => {
  const applied = await applyReportEvent(topic, payload);
  if (!applied) {
    logger.info(`Skipped duplicate report event for topic ${topic}`);
    return;
  }

  logger.info(`Applied report projection for topic ${topic}`);
};

module.exports = {
  handleReportEvent,
};
