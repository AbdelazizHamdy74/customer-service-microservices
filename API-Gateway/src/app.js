const env = require("./config/env");
const routes = require("./config/routes");
const { createProxyMiddleware } = require("./middlewares/proxy.middleware");

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const applyCors = (req, res) => {
  const origin = req.headers.origin;
  const isAllowed = !origin || env.allowedOrigins.includes("*") || env.allowedOrigins.includes(origin);

  if (!isAllowed) {
    sendJson(res, 403, {
      success: false,
      message: "Origin is not allowed by CORS",
    });
    return false;
  }

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  return true;
};

const matchRoute = (url) =>
  routes.find(
    (route) => url === route.prefix || url.startsWith(`${route.prefix}/`) || url.startsWith(`${route.prefix}?`)
  );

const requestHandler = async (req, res) => {
  if (!applyCors(req, res)) {
    return;
  }

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.url === "/health") {
    sendJson(res, 200, {
      success: true,
      service: "api-gateway",
      routes: routes.map((route) => ({
        prefix: route.prefix,
        target: route.serviceName,
      })),
    });
    return;
  }

  const matchedRoute = matchRoute(req.url || "");
  if (!matchedRoute) {
    sendJson(res, 404, {
      success: false,
      message: "Gateway route not found",
    });
    return;
  }

  const proxy = createProxyMiddleware(matchedRoute);
  await proxy(req, res);
};

module.exports = { requestHandler };
