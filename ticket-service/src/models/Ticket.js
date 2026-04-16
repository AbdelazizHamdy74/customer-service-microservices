const mongoose = require("mongoose");

const ticketCommentSchema = new mongoose.Schema(
  {
    authorId: {
      type: String,
      default: null,
    },
    authorRole: {
      type: String,
      default: "SYSTEM",
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ticketHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    actorId: {
      type: String,
      default: null,
    },
    actorRole: {
      type: String,
      default: "SYSTEM",
    },
    fromStatus: {
      type: String,
      default: null,
    },
    toStatus: {
      type: String,
      default: null,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    customerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    assignedAgentId: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"],
      default: "OPEN",
      index: true,
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
      index: true,
    },
    slaDueAt: {
      type: Date,
      default: null,
      index: true,
    },
    comments: [ticketCommentSchema],
    history: [ticketHistorySchema],
    createdBy: {
      type: String,
      default: null,
      index: true,
    },
    lastUpdatedBy: {
      type: String,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ticketSchema.index({
  subject: "text",
  description: "text",
});

module.exports = mongoose.model("Ticket", ticketSchema);
