const cors = require("cors");
const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");

const env = require("./config/env");
const authRoutes = require("./routes/authRoutes");
const internalRoutes = require("./routes/internalRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

const corsOptions = {
  origin(origin, callback) {
    if (
      !origin ||
      env.allowedOrigins.includes("*") ||
      env.allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, service: "auth-service" });
});

app.use(express.static(path.join(__dirname, "public")));
app.get("/set-password", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "set-password.html"));
});

app.use("/api/v1/internal", internalRoutes); // Internal service-to-service endpoints
app.use("/api/v1/auth", authRoutes); // For direct service access
app.use(authRoutes); // For API Gateway proxy (receives only /endpoint)

app.use(notFound);
app.use(errorHandler);

module.exports = app;
