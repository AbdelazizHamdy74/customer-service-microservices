const http = require("http");

const app = require("./app");
const env = require("./config/env");
const { connectKafkaConsumer, disconnectKafkaConsumer } = require("./config/kafka");
const { handleCustomerInvited, handleAgentInvited } = require("./events/emailEvents");
const logger = require("./utils/logger");

let server;

const start = async () => {
  try {
    await connectKafkaConsumer({
      clientId: env.kafkaClientId,
      brokers: env.kafkaBrokers,
      groupId: `${env.kafkaClientId}-email`,
      topics: ["customer.invited", "agent.invited"],
      onMessage: async (topic, payload) => {
        if (topic === "customer.invited") {
          await handleCustomerInvited(payload);
        }
        if (topic === "agent.invited") {
          await handleAgentInvited(payload);
        }
      },
    });

    server = http.createServer(app);
    server.listen(env.port, () => {
      logger.info(`Email service listening on port ${env.port}`);
    });
  } catch (error) {
    logger.error(`Failed to start email service: ${error.message}`);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down email service...`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  try {
    await disconnectKafkaConsumer();
  } catch (error) {
    logger.warn(`Kafka consumer close warning: ${error.message}`);
  }

  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
