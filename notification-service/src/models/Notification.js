const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["IN_APP", "EMAIL", "SMS"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED", "SKIPPED"],
      default: "PENDING",
    },
    provider: {
      type: String,
      default: null,
    },
    externalId: {
      type: String,
      default: null,
    },
    attemptedAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sourceService: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["AUTH", "CUSTOMER", "AGENT", "TICKET", "EMAIL", "SMS", "MANUAL", "SYSTEM"],
      default: "SYSTEM",
      index: true,
    },
    notificationType: {
      type: String,
      enum: ["EVENT", "MANUAL", "EMAIL", "SMS", "TICKET_UPDATE"],
      default: "EVENT",
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    recipient: {
      recipientType: {
        type: String,
        enum: ["USER", "CUSTOMER", "AGENT", "SYSTEM"],
        default: "SYSTEM",
        index: true,
      },
      recipientId: {
        type: String,
        default: null,
        index: true,
      },
      email: {
        type: String,
        default: null,
        lowercase: true,
        trim: true,
      },
      phone: {
        type: String,
        default: null,
        trim: true,
      },
      displayName: {
        type: String,
        default: null,
        trim: true,
      },
    },
    actor: {
      actorId: {
        type: String,
        default: null,
      },
      actorRole: {
        type: String,
        default: "SYSTEM",
      },
    },
    entity: {
      entityType: {
        type: String,
        default: null,
        trim: true,
      },
      entityId: {
        type: String,
        default: null,
        trim: true,
      },
    },
    channels: [
      {
        type: String,
        enum: ["IN_APP", "EMAIL", "SMS"],
      },
    ],
    deliveries: [deliverySchema],
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    happenedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ "recipient.recipientType": 1, "recipient.recipientId": 1, createdAt: -1 });
notificationSchema.index({ topic: 1, happenedAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
