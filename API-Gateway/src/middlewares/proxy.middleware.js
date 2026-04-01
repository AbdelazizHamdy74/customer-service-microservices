const { proxyRequest } = require("../utils/proxyRequest");

const createProxyMiddleware =
  ({ targetBaseUrl, serviceName, prefix }) =>
  async (req, res) => {
    try {
      // Strip the prefix from the path to send the correct path to the service
      const pathWithoutPrefix = req.url.replace(prefix, "") || "/";

      await proxyRequest({
        req,
        res,
        targetBaseUrl,
        targetPath: pathWithoutPrefix,
      });
    } catch (error) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          message: `${serviceName} is unavailable`,
          error: error.message,
        }),
      );
    }
  };

module.exports = { createProxyMiddleware };
