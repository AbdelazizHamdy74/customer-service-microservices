const express = require("express");

const env = require("./config/env");

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowed = !origin || env.allowedOrigins.includes("*") || env.allowedOrigins.includes(origin);

  if (!isAllowed) {
    return res.status(403).json({
      success: false,
      message: "Origin is not allowed by CORS",
    });
  }

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, service: "email-service" });
});

module.exports = app;
