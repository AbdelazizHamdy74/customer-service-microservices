const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "test-consumer",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "test-group" });

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: "test-topic" });

  await consumer.run({
    eachMessage: async ({ message }) => {
      console.log(message.value.toString());
    },
  });
}

run();
