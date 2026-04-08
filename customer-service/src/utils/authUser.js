const axios = require("axios");
// const env = require("./env");
const env = require("../config/env");
const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:4001/api/v1";
const AUTH_INTERNAL_KEY = process.env.INTERNAL_SERVICE_KEY;

const createCustomerUser = async (customer) => {
  try {
    const res = await axios.post(
      `${AUTH_SERVICE_URL}/internal/users`,
      {
        name: `${customer.firstName} ${customer.lastName}`.trim(),
        email: customer.email,
        password: "Customer@123",
        role: "CUSTOMER",
        userType: "CUSTOMER",
        linkedId: customer.id,
        isActive: true,
      },
      {
        headers: {
          "x-internal-key": AUTH_INTERNAL_KEY,
        },
        timeout: 5000,
      },
    );
    return res.data;
  } catch (err) {
    console.error(
      "Failed to create auth user for customer:",
      err?.response?.data || err.message,
    );
    throw new Error(
      `Failed to create auth user: ${err?.response?.data?.message || err.message}`,
    );
  }
};

module.exports = { createCustomerUser };
