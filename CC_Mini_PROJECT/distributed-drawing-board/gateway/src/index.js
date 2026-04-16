/**
 * GATEWAY SERVER
 *
 * - Accepts WebSocket connections from browser clients
 * - Discovers the current RAFT leader by polling replicas
 * - Forwards drawing strokes to the leader
 * - Broadcasts committed strokes to all connected clients
 *
 * Env vars:
 *   PORT     — WebSocket + HTTP port (default 3000)
 *   REPLICAS — comma-separated replica base URLs
 */

const express   = require("express");
const http      = require("http");
const WebSocket = require("ws");
const axios     = require("axios");
const cors      = require("cors");
const { log }   = require("./logger");

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

const PORT     = process.env.PORT || 3000;
const REPLICAS = (process.env.REPLICAS || "http://replica1:4001,http://replica2:4002,http://replica3:4003")
  .split(",")
  .filter(Boolean);

// ─── Leader Discovery ──────────────────────────────────────────────────────────

let currentLeaderUrl = null;
let connectedClients = 0;

/**
 * Poll all replicas every 500ms to find the current LEADER.
 * Updates currentLeaderUrl so stroke forwarding always hits the right node.
 */
async function discoverLeader() {
  for (const url of REPLICAS) {
    try {
      const res = await axios.get(`${url}/status`, { timeout: 300 });
      if (res.data.state === "LEADER") {
        if (currentLeaderUrl !== url) {
          log.leader(`👑 New leader: ${url} (term ${res.data.currentTerm})`);
          currentLeaderUrl = url;
        }
        return;
      }
    } catch {
      // Replica unreachable — try next
    }
  }

  if (currentLeaderUrl !== null) {
    log.leader(`⚠️  No leader found — election in progress`);
    currentLeaderUrl = null;
  }
}

setInterval(discoverLeader, 500);
discoverLeader();

// ─── WebSocket Handling ────────────────────────────────────────────────────────

// Track connected users: wsClientId → { userId, color, label }
let clientIdCounter = 0;
const clientMeta = new Map();

/** Broadcast to all clients, optionally excluding one sender */
function broadcast(data, excludeWs = null) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      client.send(message);
    }
  });
}

// Assign a distinct color to each user so their cursors/strokes are identifiable
const USER_COLORS = ["#e94560","#4ade80","#60a5fa","#f59e0b","#a78bfa","#f472b6"];

wss.on("connection", (ws) => {
  connectedClients += 1;
  const userId = `user_${++clientIdCounter}`;
  const userColor = USER_COLORS[(clientIdCounter - 1) % USER_COLORS.length];
  const userLabel = `User ${clientIdCounter}`;
  clientMeta.set(ws, { userId, color: userColor, label: userLabel });

  log.client(`🔌 ${userLabel} connected (total: ${connectedClients})`);

  // Tell this client who they are
  ws.send(JSON.stringify({ type: "identity", userId, color: userColor, label: userLabel }));

  // Tell everyone a new user joined
  broadcast({ type: "user_joined", userId, color: userColor, label: userLabel }, ws);

  // Send the new user the current online list
  const onlineList = [...clientMeta.values()].map(m => ({ userId: m.userId, color: m.color, label: m.label }));
  ws.send(JSON.stringify({ type: "online_list", users: onlineList }));

  ws.on("message", async (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch {
      return ws.send(JSON.stringify({ error: "Invalid JSON" }));
    }

    const meta = clientMeta.get(ws);

    switch (msg.type) {
      case "stroke":
        // Attach sender identity so other clients can color-code it
        await handleStroke(ws, { ...msg.data, userId: meta.userId, userColor: meta.color });
        break;

      case "cursor":
        // Relay cursor position to all OTHER clients (no RAFT needed — ephemeral)
        broadcast({ type: "cursor", userId: meta.userId, label: meta.label,
                    color: meta.color, x: msg.x, y: msg.y }, ws);
        break;

      case "chat":
        // Relay chat message to everyone including sender
        broadcast({ type: "chat", userId: meta.userId, label: meta.label,
                    color: meta.color, text: msg.text, ts: Date.now() });
        log.info(`💬 ${meta.label}: ${msg.text}`);
        break;

      case "clear":
        // Broadcast clear to all clients (no RAFT replication for simplicity)
        broadcast({ type: "clear" });
        log.info(`🗑️  Canvas cleared by ${meta.label}`);
        break;

      case "undo":
        broadcast({ type: "undo", userId: meta.userId });
        break;

      case "redo":
        broadcast({ type: "redo", userId: meta.userId });
        break;

      case "reaction":
        // Floating emoji reaction — broadcast to all including sender
        broadcast({ type: "reaction", userId: meta.userId, label: meta.label,
                    color: meta.color, emoji: msg.emoji, x: msg.x, y: msg.y, id: msg.id });
        log.info(`${meta.label} reacted ${msg.emoji}`);
        break;
    }
  });

  ws.on("close", () => {
    const meta = clientMeta.get(ws);
    connectedClients -= 1;
    log.client(`🔌 ${meta?.label} disconnected (total: ${connectedClients})`);
    broadcast({ type: "user_left", userId: meta?.userId });
    clientMeta.delete(ws);
  });

  ws.on("error", (err) => log.error(`WebSocket error: ${err.message}`));
});

/**
 * Forward a stroke to the leader.
 * Retries up to 5 times with 200ms delay — covers the election window (~800ms).
 */
async function handleStroke(ws, strokeData, retries = 5) {
  if (!currentLeaderUrl) {
    if (retries > 0) {
      log.retry(`No leader yet — waiting 200ms (${retries} retries left)`);
      await new Promise((r) => setTimeout(r, 200));
      return handleStroke(ws, strokeData, retries - 1);
    }
    log.error(`Stroke dropped — no leader after all retries`);
    return ws.send(JSON.stringify({ error: "No leader available" }));
  }

  try {
    const res = await axios.post(`${currentLeaderUrl}/stroke`, strokeData, { timeout: 500 });
    if (res.data.committed) {
      broadcast({ type: "stroke", data: res.data.entry.stroke });
      log.stroke(`📡 Broadcast stroke #${res.data.entry.index} to ${connectedClients} client(s)`);
    }
  } catch (err) {    log.retry(`Leader ${currentLeaderUrl} unreachable — re-discovering... (${retries} retries left)`);
    currentLeaderUrl = null;
    await discoverLeader();
    if (retries > 0) return handleStroke(ws, strokeData, retries - 1);
    ws.send(JSON.stringify({ error: "Stroke failed after retries" }));
  }
}

// ─── REST Endpoints ────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "ok", leader: currentLeaderUrl, clients: connectedClients });
});

/**
 * GET /cluster-status
 * Returns state of all replicas — great for viva demos.
 * Example: curl http://localhost:3000/cluster-status
 */
app.get("/cluster-status", async (req, res) => {
  const statuses = await Promise.all(
    REPLICAS.map(async (url) => {
      try {
        const r = await axios.get(`${url}/status`, { timeout: 300 });
        return { url, ...r.data };
      } catch {
        return { url, state: "UNREACHABLE" };
      }
    })
  );
  log.info(`Cluster status requested — leader: ${currentLeaderUrl}`);
  res.json(statuses);
});

/**
 * POST /chaos
 * Kills a random alive replica to demo fault tolerance.
 * The replica's Docker container must be named replica1/2/3.
 * We simulate "kill" by sending a process exit signal via HTTP to the replica itself.
 */
app.post("/chaos", async (req, res) => {
  const alive = [];
  for (const url of REPLICAS) {
    try {
      await axios.get(`${url}/status`, { timeout: 300 });
      alive.push(url);
    } catch { /* already down */ }
  }
  if (alive.length === 0) return res.status(400).json({ error: "No replicas alive" });

  const target = alive[Math.floor(Math.random() * alive.length)];
  log.info(`💥 CHAOS: killing ${target}`);

  try {
    // Ask the replica to self-terminate (it will be restarted by Docker restart policy)
    await axios.post(`${target}/self-destruct`, {}, { timeout: 500 });
    res.json({ killed: target });
  } catch {
    // The replica died before responding — that's fine
    res.json({ killed: target });
  }
});

/**
 * GET /online-users
 * Returns list of currently connected users.
 */
app.get("/online-users", (req, res) => {
  const users = [...clientMeta.values()].map(m => ({ userId: m.userId, color: m.color, label: m.label }));
  res.json(users);
});

// ─── Start ─────────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  log.startup(`🚀 Gateway running on port ${PORT}`);
  log.startup(`📡 Watching replicas: ${REPLICAS.join(", ")}`);
});
