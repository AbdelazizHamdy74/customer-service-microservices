const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async (mongoUri) => {
  await mongoose.connect(mongoUri);
  logger.info("MongoDB connected for notification-service");
};

module.exports = { connectDB };
