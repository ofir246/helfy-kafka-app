// producer-app.js
const express = require("express");
const { Kafka } = require("kafkajs");

const app = express();
const PORT = process.env.PORT || 4000; // שונה מה־consumer

app.use(express.json()); // to parse JSON bodies

// ---------- Kafka Producer ----------
const kafka = new Kafka({
  clientId: "helfy-producer",
  brokers: (process.env.KAFKA_BROKERS || "kafka:9092").split(",")
});

const producer = kafka.producer();

async function startProducer() {
  try {
    await producer.connect();
    console.log("Kafka producer connected");
  } catch (err) {
    console.error("Kafka producer error:", err);
  }
}
startProducer();

// ---------- HTTP Routes ----------
app.get("/", (req, res) => {
  res.send(`
    <h1>Helfy Producer</h1>
    <p>Send messages to Kafka using POST /send</p>
    <pre>
POST /send
{
  "message": "hello from producer"
}
    </pre>
  `);
});

// Endpoint to send message to Kafka
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

    console.log("Sent message to Kafka:", message);

    res.json({
      status: "sent",
      topic: process.env.KAFKA_TOPIC || "test-topic",
      message
    });
  } catch (err) {
    console.error("Error sending message:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log("Producer server running on port", PORT);
});
