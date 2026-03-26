const mongoose = require("mongoose");

const reportEventLogSchema = new mongoose.Schema(
  {
    fingerprint: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    ticketId: {
      type: String,
      default: null,
      index: true,
    },
    agentId: {
      type: String,
      default: null,
      index: true,
    },
    customerId: {
      type: String,
      default: null,
      index: true,
    },
    occurredAt: {
      type: Date,
      required: true,
      index: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ReportEventLog", reportEventLogSchema);
