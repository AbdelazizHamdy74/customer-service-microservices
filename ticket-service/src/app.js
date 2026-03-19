const cors = require("cors");
const express = require("express");
const morgan = require("morgan");

const ticketRoutes = require("./routes/ticketRoutes");
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
  res.status(200).json({ success: true, service: "ticket-service" });
});

app.use("/api/v1/tickets", ticketRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
