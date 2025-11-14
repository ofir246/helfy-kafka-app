// consumer-app.js
const express = require("express");
const { Kafka } = require("kafkajs");

const app = express();
const PORT = process.env.PORT || 3000;

// Basic in-memory metrics
let messagesConsumed = 0;
let lastMessage = null;
let lastError = null;

// ---------- Kafka Consumer ----------
const kafka = new Kafka({
  clientId: "helfy-consumer",
  brokers: (process.env.KAFKA_BROKERS || "kafka:9092").split(",")
});

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || "helfy-group"
});

async function startConsumer() {
  try {
    await consumer.connect();
    await consumer.subscribe({
      topic: process.env.KAFKA_TOPIC || "test-topic",
      fromBeginning: true
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = message.value.toString();
        messagesConsumed++;
        lastMessage = { topic, value, ts: new Date() };
        console.log("Kafka message:", value);
      }
    });
  } catch (err) {
    lastError = err.message;
    console.error("Kafka error:", err);
  }
}
startConsumer();

// ---------- HTTP Routes ----------
app.get("/", (req, res) => {
  res.send(`
    <h1>Helfy Consumer</h1>
    <ul>
      <li><a href="/health">/health</a></li>
      <li><a href="/metrics">/metrics</a></li>
      <li><a href="/last-message">/last-message</a></li>
    </ul>
  `);
});

app.get("/health", (req, res) => {
  res.json({
    status: lastError ? "degraded" : "ok",
    kafkaError: lastError,
    timestamp: new Date()
  });
});

app.get("/metrics", (req, res) => {
  res.json({
    messagesConsumed,
    lastMessage,
    lastError
  });
});

app.get("/last-message", (req, res) => {
  res.json({ lastMessage });
});

app.listen(PORT, () => {
  console.log("Consumer server running on port", PORT);
});
