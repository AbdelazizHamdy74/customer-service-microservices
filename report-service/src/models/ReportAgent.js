const mongoose = require("mongoose");

const reportAgentSchema = new mongoose.Schema(
  {
    agentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    authUserId: {
      type: String,
      default: null,
      index: true,
    },
    firstName: {
      type: String,
      default: "",
      trim: true,
    },
    lastName: {
      type: String,
      default: "",
      trim: true,
    },
    fullName: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    role: {
      type: String,
      default: "AGENT",
      trim: true,
      index: true,
    },
    status: {
      type: String,
      default: "ACTIVE",
      trim: true,
      index: true,
    },
    team: {
      type: String,
      default: "",
      trim: true,
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    performanceSnapshot: {
      ticketsHandled: { type: Number, default: 0, min: 0 },
      ticketsResolved: { type: Number, default: 0, min: 0 },
      avgResponseTimeMinutes: { type: Number, default: 0, min: 0 },
      avgResolutionTimeMinutes: { type: Number, default: 0, min: 0 },
      customerSatisfaction: { type: Number, default: 0, min: 0, max: 5 },
      lastActiveAt: { type: Date, default: null },
      lastUpdatedAt: { type: Date, default: null },
    },
    sourceCreatedAt: {
      type: Date,
      default: null,
    },
    sourceUpdatedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ReportAgent", reportAgentSchema);
