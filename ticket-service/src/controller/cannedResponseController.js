const CannedResponse = require("../models/CannedResponse");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { logAudit } = require("../utils/auditLogger");

const isNonEmpty = (v) => typeof v === "string" && v.trim().length > 0;

const listCannedResponses = asyncHandler(async (req, res) => {
  const category = req.query.category ? String(req.query.category).trim() : "";
  const filter = category ? { category } : {};
  const items = await CannedResponse.find(filter).sort({ updatedAt: -1 }).limit(200).lean();

  res.status(200).json({
    success: true,
    message: "Canned responses retrieved",
    data: { items },
  });
});

const createCannedResponse = asyncHandler(async (req, res) => {
  const { title, body, category } = req.body || {};
  if (!isNonEmpty(title) || !isNonEmpty(body)) {
    throw new ApiError(400, "title and body are required");
  }

  const doc = await CannedResponse.create({
    title: title.trim(),
    body: body.trim(),
    category: category ? String(category).trim() : "general",
    createdBy: req.user?.id || null,
  });

  await logAudit({
    actorId: req.user?.id || null,
    actorRole: req.user?.role || req.user?.userType || null,
    action: "CANNED_CREATED",
    resourceType: "cannedResponse",
    resourceId: String(doc.id),
    meta: { title: doc.title },
  });

  res.status(201).json({ success: true, message: "Canned response created", data: doc });
});

const updateCannedResponse = asyncHandler(async (req, res) => {
  const doc = await CannedResponse.findById(req.params.id);
  if (!doc) {
    throw new ApiError(404, "Canned response not found");
  }

  const { title, body, category } = req.body || {};
  if (title !== undefined) {
    if (!isNonEmpty(title)) throw new ApiError(400, "title must be non-empty");
    doc.title = title.trim();
  }
  if (body !== undefined) {
    if (!isNonEmpty(body)) throw new ApiError(400, "body must be non-empty");
    doc.body = body.trim();
  }
  if (category !== undefined) {
    doc.category = String(category).trim() || "general";
  }

  await doc.save();

  await logAudit({
    actorId: req.user?.id || null,
    actorRole: req.user?.role || req.user?.userType || null,
    action: "CANNED_UPDATED",
    resourceType: "cannedResponse",
    resourceId: String(doc.id),
    meta: { title: doc.title },
  });

  res.status(200).json({ success: true, message: "Canned response updated", data: doc });
});

const deleteCannedResponse = asyncHandler(async (req, res) => {
  const doc = await CannedResponse.findByIdAndDelete(req.params.id);
  if (!doc) {
    throw new ApiError(404, "Canned response not found");
  }

  await logAudit({
    actorId: req.user?.id || null,
    actorRole: req.user?.role || req.user?.userType || null,
    action: "CANNED_DELETED",
    resourceType: "cannedResponse",
    resourceId: String(doc.id),
    meta: { title: doc.title },
  });

  res.status(200).json({ success: true, message: "Canned response deleted" });
});

module.exports = {
  listCannedResponses,
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
};
