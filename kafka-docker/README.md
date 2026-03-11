# Kafka Docker Project

## Description

This project demonstrates how to set up Kafka using Docker and run a producer and consumer using Node.js.

## Prerequisites

- Docker and Docker Compose installed
- Node.js installed on your machine

## Installation

1. Clone the project or download the files
2. Install the dependencies:

```bash
npm install
```

## Running the Project

### Step 1: Start Kafka Services

```bash
docker-compose up -d
```

This command will start:

- Zookeeper on port 2181
- Kafka on port 9092

### Step 2: Run the Consumer

Open a new terminal and run:

```bash
node consumer.js
```

The consumer will connect to Kafka and subscribe to the `test-topic` topic, waiting for messages.

### Step 3: Run the Producer

Open another terminal and run:

```bash
node producer.js
```

The producer will send a message "Hello Kafka" to the topic.

## Project Structure

| File                 | Description                             |
| -------------------- | --------------------------------------- |
| `docker-compose.yml` | Kafka and Zookeeper services definition |
| `producer.js`        | Code to send messages to Kafka          |
| `consumer.js`        | Code to receive messages from Kafka     |
| `package.json`       | Dependencies definition                 |
| `script.json`        | Quick start steps                       |

## Technical Details

- **Kafka Version**: 7.5.0
- **Zookeeper Version**: 7.5.0
- **KafkaJS Version**: ^2.2.4
- **Topic Name**: test-topic
- **Consumer Group**: test-group
- **Broker Port**: 9092
- **Zookeeper Port**: 2181

## Stopping Services

To stop Kafka services:

```bash
docker-compose down
```

## Troubleshooting

If you encounter issues, make sure:

1. Docker is running properly
2. Ports 9092 or 2181 are not used by other applications
3. Run the consumer before the producer to ensure message reception
