const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const validateLoginPayload = ({ email, password }) => {
  const errors = [];
  if (!email || !isEmail(email)) errors.push("A valid email is required");
  if (!password || password.length < 8) errors.push("Password must be at least 8 characters");
  return errors;
};

const validateForgotPasswordPayload = ({ email }) => {
  const errors = [];
  if (!email || !isEmail(email)) errors.push("A valid email is required");
  return errors;
};

const validateResetPasswordPayload = ({ token, newPassword }) => {
  const errors = [];
  if (!token) errors.push("Reset token is required");
  if (!newPassword || newPassword.length < 8) {
    errors.push("New password must be at least 8 characters");
  }
  return errors;
};

module.exports = {
  validateLoginPayload,
  validateForgotPasswordPayload,
  validateResetPasswordPayload,
};

