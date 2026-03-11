const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "test-producer",
  brokers: ["localhost:9092"],
});

const producer = kafka.producer();

async function run() {
  await producer.connect();
  await producer.send({
    topic: "test-topic",
    messages: [{ value: "Hello Kafka" }],
  });
  console.log("Message sent");
}

run();
