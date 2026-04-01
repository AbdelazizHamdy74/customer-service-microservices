const cors = require("cors");
const express = require("express");
const morgan = require("morgan");

const env = require("./config/env");
const notificationRoutes = require("./routes/notificationRoutes");
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
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, service: "notification-service" });
});

app.use("/api/v1/notifications", notificationRoutes);
app.use("/", notificationRoutes); // For API Gateway proxy

app.use(notFound);
app.use(errorHandler);

module.exports = app;
