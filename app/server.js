// app/server.js - API + login + DB + log4js + DB-change events to Kafka

const express = require("express");
const cors = require("cors");
const path = require("path");
const log4js = require("log4js");
const mysql = require("mysql2/promise");
const crypto = require("crypto");
const { Kafka } = require("kafkajs");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- log4js ----------
log4js.configure({
  appenders: {
    out: { type: "stdout" }
  },
  categories: {
    default: { appenders: ["out"], level: "info" }
  }
});
const logger = log4js.getLogger("auth");

// ---------- DB pool (TiDB) ----------
const pool = mysql.createPool({
  host: process.env.DB_HOST || "tidb",
  port: process.env.DB_PORT || 4000,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "helfy",
  waitForConnections: true,
  connectionLimit: 10
});

// ---------- Kafka producer for DB change events ----------
const kafkaBrokers = (process.env.KAFKA_BROKERS || "kafka:9092").split(",");
const kafkaDbChangesTopic =
  process.env.KAFKA_DB_CHANGES_TOPIC || "db-changes";

const kafka = new Kafka({
  clientId: "helfy-api-cdc-producer",
  brokers: kafkaBrokers
});

const cdcProducer = kafka.producer();

async function initKafkaProducer() {
  try {
    await cdcProducer.connect();
    console.log("API CDC Kafka producer connected");
  } catch (err) {
    console.error("Failed to connect CDC producer:", err);
  }
}

initKafkaProducer();

// helper: send DB change event to Kafka
async function sendDbChangeEvent(event) {
  const payload = {
    timestamp: new Date().toISOString(),
    ...event
  };

  try {
    await cdcProducer.send({
      topic: kafkaDbChangesTopic,
      messages: [
        {
          value: JSON.stringify(payload)
        }
      ]
    });
  } catch (err) {
    console.error("Failed to send DB change event:", err);
  }
}

// ---------- middlewares ----------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static files (frontend)
app.use(express.static(path.join(__dirname, "public")));

// ---------- health ----------
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Health error:", err.message);
    res.status(500).json({ status: "error", error: err.message });
  }
});

// ---------- login endpoint ----------
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "username and password are required" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, username FROM users WHERE username = ? AND password_hash = SHA2(?, 256)",
      [username, password]
    );

    if (rows.length === 0) {
      // log failed login (user activity logging)
      logger.info(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          userId: null,
          username,
          action: "login_failed",
          ip: req.ip
        })
      );
      return res.status(401).json({ error: "invalid credentials" });
    }

    const user = rows[0];

    // generate token and store in DB
    const token = crypto.randomBytes(32).toString("hex");

    await pool.query(
      "INSERT INTO tokens (user_id, token) VALUES (?, ?)",
      [user.id, token]
    );

    // log successful login (user activity)
    logger.info(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        userId: user.id,
        username: user.username,
        action: "login_success",
        ip: req.ip
      })
    );

    // send DB change event to Kafka (simulating CDC)
    await sendDbChangeEvent({
      source: "api",
      eventType: "TOKEN_CREATED",
      table: "tokens",
      userId: user.id,
      username: user.username,
      token
    });

    res.json({
      userId: user.id,
      username: user.username,
      token
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "internal server error" });
  }
});

// ---------- protected example endpoint ----------
app.get("/api/profile", async (req, res) => {
  const token = req.header("x-auth-token");

  if (!token) {
    return res.status(401).json({ error: "missing token" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.created_at
       FROM tokens t
       JOIN users u ON t.user_id = u.id
       WHERE t.token = ?
       ORDER BY t.created_at DESC
       LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "invalid token" });
    }

    res.json({ user: rows[0] });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
