const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");

const createAccessToken = ({ userId, role, tokenVersion, userType, linkedId }, secret, expiresIn) =>
  jwt.sign(
    {
      sub: userId,
      role,
      userType,
      linkedId,
      tokenVersion,
      type: "access",
    },
    secret,
    { expiresIn }
  );

const createRefreshToken = ({ userId, role, tokenVersion, userType, linkedId }, secret, expiresIn) => {
  const jti = randomUUID();
  const token = jwt.sign(
    {
      sub: userId,
      role,
      userType,
      linkedId,
      tokenVersion,
      jti,
      type: "refresh",
    },
    secret,
    { expiresIn }
  );

  return { token, jti };
};

const verifyToken = (token, secret) => jwt.verify(token, secret);

module.exports = {
  createAccessToken,
  createRefreshToken,
  verifyToken,
};
