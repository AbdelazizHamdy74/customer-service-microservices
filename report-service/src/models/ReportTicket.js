const mongoose = require("mongoose");

const reportTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    subject: {
      type: String,
      default: "",
      trim: true,
    },
    customerId: {
      type: String,
      default: null,
      index: true,
    },
    assignedAgentId: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      default: "OPEN",
      index: true,
      trim: true,
    },
    createdBy: {
      type: String,
      default: null,
    },
    lastUpdatedBy: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastUpdatedAt: {
      type: Date,
      default: null,
      index: true,
    },
    closedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastClosedAt: {
      type: Date,
      default: null,
    },
    latestResolutionTimeMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    assignmentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    closedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reopenedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalComments: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastCommentAt: {
      type: Date,
      default: null,
    },
    lastEventAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: "projectionCreatedAt",
      updatedAt: "projectionUpdatedAt",
    },
  }
);

module.exports = mongoose.model("ReportTicket", reportTicketSchema);
