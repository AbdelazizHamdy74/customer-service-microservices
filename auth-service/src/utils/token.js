const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");

const createAccessToken = ({ userId, role, tokenVersion }, secret, expiresIn) =>
  jwt.sign(
    {
      sub: userId,
      role,
      tokenVersion,
      type: "access",
    },
    secret,
    { expiresIn }
  );

const createRefreshToken = ({ userId, role, tokenVersion }, secret, expiresIn) => {
  const jti = randomUUID();
  const token = jwt.sign(
    {
      sub: userId,
      role,
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

