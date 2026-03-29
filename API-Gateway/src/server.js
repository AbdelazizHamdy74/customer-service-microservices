const http = require("http");

const env = require("./config/env");
const { requestHandler } = require("./app");

const server = http.createServer((req, res) => {
  Promise.resolve(requestHandler(req, res)).catch((error) => {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        message: "Gateway error",
        error: error.message,
      })
    );
  });
});

server.listen(env.port, () => {
  console.log(`API Gateway listening on port ${env.port}`);
});

const shutdown = (signal) => {
  console.log(`Received ${signal}. Shutting down API Gateway...`);
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
