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

const createCustomer = asyncHandler(async (req, res) => {
  const errors = validateCreateCustomerPayload(req.body);
  if (errors.length) {
    throw new ApiError(400, errors.join(", "));
  }

  const customer = await Customer.create({
    ...req.body,
    email: req.body.email ? req.body.email.toLowerCase() : undefined,
    createdBy: req.user?.id || null,
  });

  await deleteByPattern("customer:search:*");
  await publishEvent("customer.created", {
    customerId: customer.id,
    createdBy: req.user?.id || null,
  });

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

  const updates = { ...req.body };
  if (updates.email) updates.email = updates.email.toLowerCase();
  Object.assign(customer, updates);
  await customer.save();

  await deleteCache(`customer:${customer.id}`);
  await deleteByPattern("customer:search:*");

  await publishEvent("customer.updated", {
    customerId: customer.id,
    updatedBy: req.user?.id || null,
  });

  res.status(200).json({
    success: true,
    message: "Customer updated successfully",
    data: customer,
  });
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndDelete(req.params.id);
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  await deleteCache(`customer:${customer.id}`);
  await deleteByPattern("customer:search:*");

  await publishEvent("customer.deleted", {
    customerId: customer.id,
    deletedBy: req.user?.id || null,
  });

  res.status(200).json({
    success: true,
    message: "Customer deleted successfully",
  });
});

const getCustomer = asyncHandler(async (req, res) => {
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

module.exports = {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomer,
  searchCustomers,
};

