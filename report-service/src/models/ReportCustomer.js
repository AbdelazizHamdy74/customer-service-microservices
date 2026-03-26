const mongoose = require("mongoose");

const reportCustomerSchema = new mongoose.Schema(
  {
    customerId: {
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
    address: {
      street: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      country: { type: String, trim: true, default: "" },
      zipCode: { type: String, trim: true, default: "" },
    },
    status: {
      type: String,
      default: "ACTIVE",
      trim: true,
      index: true,
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

module.exports = mongoose.model("ReportCustomer", reportCustomerSchema);
