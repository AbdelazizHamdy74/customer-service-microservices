const Customer = require("../models/Customer");
const { publishEvent } = require("../config/kafka");
const { validateCreateCustomerPayload } = require("../utils/validators/customerValidator");
const logger = require("../utils/logger");

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

const handleCustomerInvited = async (payload) => {
  const errors = validateCreateCustomerPayload(payload || {});
  if (errors.length) {
    logger.warn(`customer.invited validation failed: ${errors.join(", ")}`);
    return;
  }

  if (!payload.authUserId) {
    logger.warn("customer.invited missing authUserId");
    return;
  }

  const existing = await Customer.findOne({ authUserId: payload.authUserId });
  if (existing) {
    logger.info(`customer.invited already provisioned: ${payload.authUserId}`);
    return;
  }

  const customer = await Customer.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email ? payload.email.toLowerCase() : undefined,
    phone: payload.phone,
    address: payload.address,
    status: (payload.status || "ACTIVE").toUpperCase(),
    authUserId: payload.authUserId,
    createdBy: payload.createdBy || "auth-service",
  });

  await publishEvent(
    "customer.provisioned",
    buildCustomerEventPayload(customer, {
      authUserId: payload.authUserId,
      createdBy: payload.createdBy || "auth-service",
    })
  );

  logger.info(`customer.invited provisioned: ${customer.id}`);
};

module.exports = {
  handleCustomerInvited,
};
