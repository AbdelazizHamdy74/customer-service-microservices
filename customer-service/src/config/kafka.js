const { Kafka, logLevel } = require("kafkajs");
const logger = require("../utils/logger");

let producer;

const connectKafkaProducer = async ({ clientId, brokers }) => {
  if (!producer) {
    const kafka = new Kafka({
      clientId,
      brokers,
      logLevel: logLevel.NOTHING,
    });
    producer = kafka.producer();
  }

  await producer.connect();
  logger.info("Kafka producer connected for customer-service");
};

const publishEvent = async (topic, payload) => {
  if (!producer) return;
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify({ ...payload, emittedAt: new Date().toISOString() }) }],
  });
};

const disconnectKafkaProducer = async () => {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
};

module.exports = {
  connectKafkaProducer,
  publishEvent,
  disconnectKafkaProducer,
};

