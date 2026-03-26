const Customer = require("../models/Customer");
const { publishEvent } = require("../config/kafka");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { getCache, setCache, deleteCache, deleteByPattern } = require("../utils/cache");
const {
  validateCreateCustomerPayload,
  validateUpdateCustomerPayload,
  buildCustomerSearchFilter,
} = require("../utils/validators/customerValidator");

const STAFF_ROLES = ["ADMIN", "SUPERVISOR", "AGENT"];
const ADMIN_ROLES = ["ADMIN", "SUPERVISOR"];

const isStaff = (user) => STAFF_ROLES.includes(user?.role);
const isAdmin = (user) => ADMIN_ROLES.includes(user?.role);
const isSelfCustomer = (user, customerId) =>
  user?.userType === "CUSTOMER" && user?.linkedId && user.linkedId === customerId;
const buildCustomerEventPayload = (customer, extra = {}) => ({
  customerId: customer.id,
  authUserId: customer.authUserId || null,
  firstName: customer.firstName,
  lastName: customer.lastName,
  fullName: customer.fullName || `${customer.firstName} ${customer.lastName}`.trim(),
  email: customer.email || "",
  phone: customer.phone,
  address: customer.address,
  status: customer.status,
  createdAt: customer.createdAt,
  updatedAt: customer.updatedAt,
  ...extra,
});

const createCustomer = asyncHandler(async (req, res) => {
  if (!isStaff(req.user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const errors = validateCreateCustomerPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const payload = {
    ...req.body,
    email: req.body.email ? req.body.email.toLowerCase() : undefined,
  };
  if (req.body.status) payload.status = req.body.status.toUpperCase();

  const customer = await Customer.create({
    ...payload,
    createdBy: req.user?.id || null,
  });

  await deleteByPattern("customer:search:*");
  await publishEvent("customer.created", buildCustomerEventPayload(customer, { createdBy: req.user?.id || null }));

  res.status(201).json({
    success: true,
    message: "Customer created successfully",
    data: customer,
  });
});

const updateCustomer = asyncHandler(async (req, res) => {
  const errors = validateUpdateCustomerPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  const isSelf = isSelfCustomer(req.user, customer.id);
  if (!isSelf && !isStaff(req.user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const updates = { ...req.body };
  if (updates.email) updates.email = updates.email.toLowerCase();
  if (updates.status) updates.status = updates.status.toUpperCase();
  if (isSelf) {
    const allowedFields = ["firstName", "lastName", "email", "phone", "address"];
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        customer[field] = updates[field];
      }
    }
  } else {
    Object.assign(customer, updates);
  }
  await customer.save();

  await deleteCache(`customer:${customer.id}`);
  await deleteByPattern("customer:search:*");

  await publishEvent("customer.updated", buildCustomerEventPayload(customer, { updatedBy: req.user?.id || null }));

  res.status(200).json({
    success: true,
    message: "Customer updated successfully",
    data: customer,
  });
});

const deleteCustomer = asyncHandler(async (req, res) => {
  if (!isAdmin(req.user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const customer = await Customer.findByIdAndDelete(req.params.id);
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  await deleteCache(`customer:${customer.id}`);
  await deleteByPattern("customer:search:*");

  await publishEvent("customer.deleted", buildCustomerEventPayload(customer, { deletedBy: req.user?.id || null }));

  res.status(200).json({
    success: true,
    message: "Customer deleted successfully",
  });
});

const getCustomer = asyncHandler(async (req, res) => {
  const isSelf = isSelfCustomer(req.user, req.params.id);
  if (!isSelf && !isStaff(req.user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const cacheKey = `customer:${req.params.id}`;
  const cached = await getCache(cacheKey);

  if (cached) {
    return res.status(200).json({
      success: true,
      message: "Customer fetched from cache",
      data: JSON.parse(cached),
    });
  }

  const customer = await Customer.findById(req.params.id);
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  await setCache(cacheKey, JSON.stringify(customer), 300);

  res.status(200).json({
    success: true,
    message: "Customer fetched successfully",
    data: customer,
  });
});

const searchCustomers = asyncHandler(async (req, res) => {
  if (!isStaff(req.user)) {
    throw new ApiError(403, "Insufficient permissions");
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));

  const searchQuery = {
    q: req.query.q || "",
    name: req.query.name || "",
    phone: req.query.phone || "",
    email: req.query.email || "",
    status: req.query.status || "",
    page,
    limit,
  };

  const cacheKey = `customer:search:${JSON.stringify(searchQuery)}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.status(200).json({
      success: true,
      message: "Search fetched from cache",
      data: JSON.parse(cached),
    });
  }

  const filter = buildCustomerSearchFilter(req.query);
  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Customer.countDocuments(filter),
  ]);

  const result = {
    items: customers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };

  await setCache(cacheKey, JSON.stringify(result), 120);

  res.status(200).json({
    success: true,
    message: "Customers fetched successfully",
    data: result,
  });
});

const createCustomerInternal = asyncHandler(async (req, res) => {
  const errors = validateCreateCustomerPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  if (!req.body.authUserId) {
    throw new ApiError(400, "authUserId is required");
  }

  const payload = {
    ...req.body,
    email: req.body.email ? req.body.email.toLowerCase() : undefined,
  };
  if (payload.status) payload.status = payload.status.toUpperCase();

  const customer = await Customer.create({
    ...payload,
    authUserId: req.body.authUserId,
    createdBy: req.body.createdBy || "auth-service",
  });

  await deleteByPattern("customer:search:*");
  await publishEvent(
    "customer.created",
    buildCustomerEventPayload(customer, { createdBy: req.body.createdBy || "auth-service" })
  );

  res.status(201).json({
    success: true,
    message: "Customer created successfully",
    data: customer,
  });
});

const deleteCustomerInternal = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  await deleteCache(`customer:${customer.id}`);
  await deleteByPattern("customer:search:*");

  await publishEvent("customer.deleted", buildCustomerEventPayload(customer, { deletedBy: "auth-service" }));

  res.status(200).json({
    success: true,
    message: "Customer deleted successfully",
  });
});

module.exports = {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomer,
  searchCustomers,
  createCustomerInternal,
  deleteCustomerInternal,
};
