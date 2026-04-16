# Distributed-Real-Time-Collaborative-Drawing-System-using-Mini-RAFT-Consensus
Fault-tolerant real-time collaborative drawing board built using a custom Mini-RAFT consensus algorithm. Supports multi-user drawing, automatic leader election, log replication, and seamless recovery from server failures with zero data loss using Docker-based distributed architecture

#  Distributed Real-Time Drawing Board using Mini-RAFT Consensus

##  Overview
This project is a fault-tolerant real-time collaborative drawing system that allows multiple users to draw simultaneously while ensuring data consistency even if servers fail.

It is built using a custom implementation of the RAFT consensus algorithm, similar to systems like Kubernetes (etcd).

---

##  Problem
Most real-time apps depend on a single server:
- Server crash → system failure
- Users lose connection
- Possible data loss

---

##  Solution
We built a distributed system with:
- Multiple replica servers
- Automatic leader election
- Real-time synchronization
- Fault tolerance with zero data loss

---

##  Architecture

Frontend (React Canvas) → Gateway → 3 Replica Servers

- **Gateway**: Handles WebSocket connections and routes requests
- **Leader Replica**: Processes all writes
- **Follower Replicas**: Maintain consistent copies

---

## How It Works

1. User draws on canvas
2. Stroke sent to Gateway via WebSocket
3. Gateway forwards to Leader
4. Leader replicates to Followers
5. Majority (2/3) confirms → commit
6. Broadcast to all users

---

##  RAFT Features Implemented

- Leader election
- Heartbeats
- Log replication
- Majority consensus (2/3)
- Failure detection & recovery

---

##  Fault Tolerance

| Failure | Behavior |
|--------|--------|
| Leader crash | New leader elected automatically |
| Replica restart | Syncs logs and rejoins |
| Network delay | Retry mechanism |
| 2 nodes down | System pauses safely |

---

##  Tech Stack

- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express
- Real-time: WebSockets (ws)
- Consensus: Custom Mini-RAFT
- Deployment: Docker, Docker Compose

---

##  Run the Project

```bash
cd distributed-drawing-board
docker compose up --build

