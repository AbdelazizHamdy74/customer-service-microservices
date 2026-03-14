const mongoose = require("mongoose");

const agentSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["ADMIN", "SUPERVISOR", "AGENT"],
      default: "AGENT",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    team: {
      type: String,
      trim: true,
      default: "",
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    performance: {
      ticketsHandled: {
        type: Number,
        default: 0,
        min: 0,
      },
      ticketsResolved: {
        type: Number,
        default: 0,
        min: 0,
      },
      avgResponseTimeMinutes: {
        type: Number,
        default: 0,
        min: 0,
      },
      avgResolutionTimeMinutes: {
        type: Number,
        default: 0,
        min: 0,
      },
      customerSatisfaction: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      lastActiveAt: {
        type: Date,
        default: null,
      },
      lastUpdatedAt: {
        type: Date,
        default: null,
      },
    },
    createdBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

agentSchema.index({
  firstName: "text",
  lastName: "text",
  email: "text",
  phone: "text",
});

agentSchema.virtual("fullName").get(function fullName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

module.exports = mongoose.model("Agent", agentSchema);
