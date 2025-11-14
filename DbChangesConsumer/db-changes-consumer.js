// db-changes-consumer.js - consume DB change events from Kafka and log them

const { Kafka } = require("kafkajs");

const brokers = (process.env.KAFKA_BROKERS || "kafka:9092").split(",");
const topic = process.env.KAFKA_DB_CHANGES_TOPIC || "db-changes";

const kafka = new Kafka({
  clientId: "db-changes-consumer",
  brokers
});

const consumer = kafka.consumer({ groupId: "db-changes-group" });

async function start() {
  try {
    await consumer.connect();
    console.log("DB changes consumer connected to Kafka");

    await consumer.subscribe({
      topic,
      fromBeginning: true
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = message.value.toString();

        let parsed;
        try {
          parsed = JSON.parse(value);
        } catch (err) {
          console.error("Failed to parse DB change event:", value);
          return;
        }

        // כאן הלוג המאורגן שאתה יכול להראות במטלה
        console.log(
          "[DB CHANGE EVENT]",
          JSON.stringify(
            {
              timestamp: parsed.timestamp,
              source: parsed.source,
              eventType: parsed.eventType,
              table: parsed.table,
              userId: parsed.userId,
              username: parsed.username
            },
            null,
            2
          )
        );
      }
    });
  } catch (err) {
    console.error("DB changes consumer error:", err);
    process.exit(1);
  }
}

start();
