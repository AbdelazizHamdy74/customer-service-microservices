const mongoose = require("mongoose");

const cannedResponseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    category: { type: String, default: "general", trim: true },
    createdBy: { type: String, default: null },
  },
  { timestamps: true }
);

cannedResponseSchema.index({ category: 1, title: 1 });

module.exports = mongoose.model("CannedResponse", cannedResponseSchema);
