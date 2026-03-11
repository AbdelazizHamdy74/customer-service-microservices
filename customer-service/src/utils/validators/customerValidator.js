const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const validateCreateCustomerPayload = (payload) => {
  const errors = [];
  if (!payload.firstName || payload.firstName.trim().length < 2) {
    errors.push("firstName is required and must be at least 2 characters");
  }
  if (!payload.lastName || payload.lastName.trim().length < 2) {
    errors.push("lastName is required and must be at least 2 characters");
  }
  if (!payload.phone || payload.phone.trim().length < 6) {
    errors.push("phone is required and must be at least 6 characters");
  }
  if (payload.email && !isValidEmail(payload.email)) {
    errors.push("email must be valid");
  }
  return errors;
};

const validateUpdateCustomerPayload = (payload) => {
  const errors = [];
  if (payload.firstName !== undefined && payload.firstName.trim().length < 2) {
    errors.push("firstName must be at least 2 characters");
  }
  if (payload.lastName !== undefined && payload.lastName.trim().length < 2) {
    errors.push("lastName must be at least 2 characters");
  }
  if (payload.phone !== undefined && payload.phone.trim().length < 6) {
    errors.push("phone must be at least 6 characters");
  }
  if (payload.email !== undefined && payload.email && !isValidEmail(payload.email)) {
    errors.push("email must be valid");
  }
  return errors;
};

const buildCustomerSearchFilter = ({ q, name, phone, email, status }) => {
  const andConditions = [];

  if (q) {
    andConditions.push({
      $or: [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ],
    });
  }

  if (name) {
    andConditions.push({
      $or: [
        { firstName: { $regex: name, $options: "i" } },
        { lastName: { $regex: name, $options: "i" } },
      ],
    });
  }

  if (phone) {
    andConditions.push({ phone: { $regex: phone, $options: "i" } });
  }

  if (email) {
    andConditions.push({ email: email.toLowerCase() });
  }

  if (status) {
    andConditions.push({ status: status.toUpperCase() });
  }

  if (andConditions.length === 0) return {};
  if (andConditions.length === 1) return andConditions[0];

  return { $and: andConditions };
};

module.exports = {
  validateCreateCustomerPayload,
  validateUpdateCustomerPayload,
  buildCustomerSearchFilter,
};

