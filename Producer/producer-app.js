const express = require("express");
const { Kafka } = require("kafkajs");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

const kafka = new Kafka({
  clientId: "helfy-producer",
  brokers: (process.env.KAFKA_BROKERS || "kafka:9092").split(",")
});

const producer = kafka.producer();

async function init() {
  await producer.connect();
  console.log("Producer connected to Kafka");
}

init().catch((err) => {
  console.error("Failed to start producer:", err);
});

// health
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// POST /send { message: "..." }
app.post("/send", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    await producer.send({
      topic: process.env.KAFKA_TOPIC || "test-topic",
      messages: [{ value: message }]
    });

    res.json({
      status: "sent",
      topic: process.env.KAFKA_TOPIC || "test-topic",
      message
    });
  } catch (err) {
    console.error("Failed to send message:", err);
    res.status(500).json({ error: "failed to send message" });
  }
});

app.listen(PORT, () => {
  console.log("Producer server running on port", PORT);
});
