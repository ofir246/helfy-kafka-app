# Helfy – SRE Home Assignment

This project is a simple demo showing how an API, a database, and Kafka work together using Docker Compose.  
It demonstrates basic SRE concepts such as containerized services, logging, message queues, and health checks.

The system includes:
- Node.js Login API  
- TiDB SQL database  
- Kafka + Zookeeper  
- Kafka producer and consumer (`test-topic`)  
- “DB Changes” Kafka consumer (listens to login events)  
- Simple HTML login page  
- log4js logging system  

---

## 🚀 How to Run the Project

Make sure **Docker Desktop is running**.  
Then open a terminal inside the project directory and run:

```bash
docker-compose up --build




                 +---------------------+
                 |     HTML Login      |
                 |      Frontend       |
                 |   (localhost:8080)  |
                 +----------+----------+
                            |
                            v
                 +---------------------+
                 |     Node.js API     |
                 |  (login-service)    |
                 +----------+----------+
                            |
                            v
                Writes login events to Kafka
                            |
                            v
        +-------------------------------------------+
        |                   Kafka                    |
        |              +-------------+               |
        |              |  Zookeeper  |               |
        +-------+------+-------------+-------+-------+
                |                            |
                v                            v
     +-------------------+



Admin Username: admin
Admin Password: secret123


Application URL: http://localhost:8080/