const { Kafka, logLevel } = require("kafkajs");
const logger = require("../utils/logger");

let producer;
let consumer;

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

const connectKafkaConsumer = async ({ clientId, brokers, groupId, topics, onMessage }) => {
  if (!consumer) {
    const kafka = new Kafka({
      clientId,
      brokers,
      logLevel: logLevel.NOTHING,
    });
    consumer = kafka.consumer({ groupId });
  }

  await consumer.connect();
  for (const topic of topics) {
    await consumer.subscribe({ topic });
  }

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const rawValue = message.value ? message.value.toString() : "";
      if (!rawValue) return;

      let payload;
      try {
        payload = JSON.parse(rawValue);
      } catch (error) {
        logger.warn(`Kafka message parse failed for topic ${topic}`);
        return;
      }

      try {
        await onMessage(topic, payload);
      } catch (error) {
        logger.error(`Kafka handler error on ${topic}: ${error.message}`);
      }
    },
  });

  logger.info("Kafka consumer connected for customer-service");
};

const disconnectKafkaProducer = async () => {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
};

const disconnectKafkaConsumer = async () => {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
  }
};

module.exports = {
  connectKafkaProducer,
  publishEvent,
  connectKafkaConsumer,
  disconnectKafkaProducer,
  disconnectKafkaConsumer,
};
