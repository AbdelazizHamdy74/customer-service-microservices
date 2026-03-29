const env = require("./env");

module.exports = [
  {
    prefix: "/api/v1/auth",
    serviceName: "auth-service",
    targetBaseUrl: env.services.auth,
  },
  {
    prefix: "/api/v1/customers",
    serviceName: "customer-service",
    targetBaseUrl: env.services.customer,
  },
  {
    prefix: "/api/v1/agents",
    serviceName: "user-service",
    targetBaseUrl: env.services.user,
  },
  {
    prefix: "/api/v1/tickets",
    serviceName: "ticket-service",
    targetBaseUrl: env.services.ticket,
  },
  {
    prefix: "/api/v1/notifications",
    serviceName: "notification-service",
    targetBaseUrl: env.services.notification,
  },
  {
    prefix: "/api/v1/reports",
    serviceName: "report-service",
    targetBaseUrl: env.services.report,
  },
];
