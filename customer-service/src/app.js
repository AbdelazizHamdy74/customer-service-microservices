const cors = require("cors");
const express = require("express");
const morgan = require("morgan");

const customerRoutes = require("./routes/customerRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, service: "customer-service" });
});

app.use("/api/v1/customers", customerRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

