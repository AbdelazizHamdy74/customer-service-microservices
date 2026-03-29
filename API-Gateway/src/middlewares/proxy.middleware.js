const { proxyRequest } = require("../utils/proxyRequest");

const createProxyMiddleware = ({ targetBaseUrl, serviceName }) => async (req, res) => {
  try {
    await proxyRequest({
      req,
      res,
      targetBaseUrl,
      targetPath: req.url,
    });
  } catch (error) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        message: `${serviceName} is unavailable`,
        error: error.message,
      })
    );
  }
};

module.exports = { createProxyMiddleware };
