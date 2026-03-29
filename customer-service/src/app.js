const cors = require("cors");
const express = require("express");
const morgan = require("morgan");

const env = require("./config/env");
const customerRoutes = require("./routes/customerRoutes");
const internalRoutes = require("./routes/internalRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.allowedOrigins.includes("*") || env.allowedOrigins.includes(origin)) {
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
  res.status(200).json({ success: true, service: "customer-service" });
});

app.use("/api/v1/internal", internalRoutes);
app.use("/api/v1/customers", customerRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
