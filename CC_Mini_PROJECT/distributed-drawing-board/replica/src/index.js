/**
 * REPLICA NODE — Mini-RAFT Implementation
 *
 * States: FOLLOWER → CANDIDATE → LEADER
 * Env vars (set in docker-compose):
 *   NODE_ID  — e.g. "replica1"
 *   PORT     — HTTP port
 *   PEERS    — comma-separated URLs of the other two replicas
 */

const express = require("express");
const axios   = require("axios");
const cors    = require("cors");
const fs      = require("fs");
const path    = require("path");
const { createLogger } = require("./logger");

const app = express();
app.use(express.json());
app.use(cors());

// ─── Config ────────────────────────────────────────────────────────────────────

const NODE_ID = process.env.NODE_ID || "replica1";
const PORT    = process.env.PORT    || 4001;
const PEERS   = (process.env.PEERS  || "").split(",").filter(Boolean);

const log = createLogger(NODE_ID);

// Persistent log file — survives container restarts via Docker volume
const LOG_FILE = path.join("/tmp", `${NODE_ID}-log.json`);

function saveLogToDisk() {
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify({ raftLog, commitIndex }));
  } catch { /* non-fatal */ }
}

function loadLogFromDisk() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const data = JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
      if (Array.isArray(data.raftLog)) {
        raftLog.push(...data.raftLog);
        commitIndex = data.commitIndex ?? -1;
        log.sync(`📂 Loaded ${raftLog.length} entries from disk`);
      }
    }
  } catch { /* corrupt file — start fresh */ }
}

const STATES = { FOLLOWER: "FOLLOWER", CANDIDATE: "CANDIDATE", LEADER: "LEADER" };

// ─── RAFT State ────────────────────────────────────────────────────────────────

let state        = STATES.FOLLOWER;
let currentTerm  = 0;
let votedFor     = null;
let leaderId     = null;
let raftLog      = [];   // [{ term, index, stroke }]
let commitIndex  = -1;

let electionTimer     = null;
let heartbeatInterval = null;

// ─── Timers ────────────────────────────────────────────────────────────────────

function randomElectionTimeout() {
  return Math.floor(Math.random() * 300) + 500; // 500–800 ms
}

function resetElectionTimer() {
  clearTimeout(electionTimer);
  electionTimer = setTimeout(startElection, randomElectionTimeout());
}

function stopHeartbeat() {
  clearInterval(heartbeatInterval);
  heartbeatInterval = null;
}

// ─── Leader Election ───────────────────────────────────────────────────────────

async function startElection() {
  state       = STATES.CANDIDATE;
  currentTerm += 1;
  votedFor    = NODE_ID;
  leaderId    = null;

  log.election(`⚡ Starting election — term ${currentTerm}`);

  let votes = 1; // self-vote

  await Promise.all(
    PEERS.map(async (peer) => {
      try {
        const res = await axios.post(
          `${peer}/request-vote`,
          {
            term: currentTerm,
            candidateId: NODE_ID,
            lastLogIndex: raftLog.length - 1,
            lastLogTerm: raftLog.length > 0 ? raftLog[raftLog.length - 1].term : -1,
          },
          { timeout: 300 }
        );
        const granted = res.data.voteGranted;
        log.vote(`Vote from ${peer}: ${granted ? "✅ GRANTED" : "❌ DENIED"}`);
        if (granted) votes += 1;
      } catch {
        log.vote(`Vote request to ${peer} failed (unreachable)`);
      }
    })
  );

  log.election(`Election result — term ${currentTerm}: ${votes}/3 votes`);

  if (votes >= 2 && state === STATES.CANDIDATE) {
    becomeLeader();
  } else {
    log.election(`Lost election for term ${currentTerm} — reverting to FOLLOWER`);
    state = STATES.FOLLOWER;
    resetElectionTimer();
  }
}

function becomeLeader() {
  state    = STATES.LEADER;
  leaderId = NODE_ID;
  log.leader(`👑 Became LEADER — term ${currentTerm}`);
  clearTimeout(electionTimer);
  sendHeartbeats();
  heartbeatInterval = setInterval(sendHeartbeats, 150);
}

async function sendHeartbeats() {
  PEERS.forEach(async (peer) => {
    try {
      await axios.post(
        `${peer}/heartbeat`,
        { term: currentTerm, leaderId: NODE_ID },
        { timeout: 200 }
      );
      // Uncomment below to see every heartbeat (very verbose):
      // log.heartbeat(`💓 Sent heartbeat to ${peer}`);
    } catch {
      log.heartbeat(`💔 Heartbeat to ${peer} failed (peer down?)`);
    }
  });
}

// ─── Log Replication ───────────────────────────────────────────────────────────

async function replicateStroke(stroke) {
  if (state !== STATES.LEADER) throw new Error("Not the leader");

  const entry = { term: currentTerm, index: raftLog.length, stroke };
  raftLog.push(entry);

  log.replicate(`📝 Replicating entry #${entry.index} to peers`);

  let acks = 1; // self-ack

  await Promise.all(
    PEERS.map(async (peer) => {
      try {
        const res = await axios.post(
          `${peer}/append-entries`,
          { term: currentTerm, leaderId: NODE_ID, entry },
          { timeout: 300 }
        );
        if (res.data.success) {
          acks += 1;
          log.replicate(`✅ Ack from ${peer} for entry #${entry.index}`);
        }
      } catch {
        log.replicate(`⚠️  No ack from ${peer} — will sync later`);
      }
    })
  );

  if (acks >= 2) {
    commitIndex = entry.index;
    log.commit(`✔️  Committed entry #${commitIndex} (${acks}/3 acks)`);
    saveLogToDisk();
    return { committed: true, entry };
  }

  log.replicate(`⚠️  Entry #${entry.index} not committed yet (only ${acks}/3 acks)`);
  return { committed: false, entry };
}

// ─── HTTP Endpoints ────────────────────────────────────────────────────────────

// POST /request-vote — a CANDIDATE is asking for our vote
app.post("/request-vote", (req, res) => {
  const { term, candidateId, lastLogIndex, lastLogTerm } = req.body;

  if (term > currentTerm) {
    currentTerm = term;
    state       = STATES.FOLLOWER;
    votedFor    = null;
    stopHeartbeat();
  }

  const myLastLogTerm  = raftLog.length > 0 ? raftLog[raftLog.length - 1].term : -1;
  const myLastLogIndex = raftLog.length - 1;

  const logOk =
    lastLogTerm > myLastLogTerm ||
    (lastLogTerm === myLastLogTerm && lastLogIndex >= myLastLogIndex);

  const voteGranted =
    term >= currentTerm &&
    (votedFor === null || votedFor === candidateId) &&
    logOk;

  if (voteGranted) {
    votedFor    = candidateId;
    currentTerm = term;
    resetElectionTimer();
    log.vote(`🗳️  Voted for ${candidateId} in term ${term}`);
  } else {
    log.vote(`🚫 Denied vote to ${candidateId} in term ${term} (votedFor=${votedFor})`);
  }

  res.json({ term: currentTerm, voteGranted });
});

// POST /heartbeat — LEADER asserting authority
app.post("/heartbeat", (req, res) => {
  const { term, leaderId: newLeader } = req.body;

  if (term >= currentTerm) {
    const leaderChanged = leaderId !== newLeader;
    currentTerm = term;
    state       = STATES.FOLLOWER;
    leaderId    = newLeader;
    votedFor    = null;
    stopHeartbeat();
    resetElectionTimer();

    if (leaderChanged) {
      log.heartbeat(`💓 Accepted ${newLeader} as leader (term ${term})`);
    }
  }

  res.json({ success: true, term: currentTerm });
});

// POST /append-entries — LEADER replicating a log entry
app.post("/append-entries", (req, res) => {
  const { term, leaderId: newLeader, entry } = req.body;

  if (term < currentTerm) {
    return res.json({ success: false, term: currentTerm });
  }

  currentTerm = term;
  state       = STATES.FOLLOWER;
  leaderId    = newLeader;
  stopHeartbeat();
  resetElectionTimer();

  if (entry && !raftLog.find((e) => e.index === entry.index && e.term === entry.term)) {
    raftLog.push(entry);
    commitIndex = entry.index;
    log.replicate(`📥 Appended & committed entry #${entry.index} from leader`);
    saveLogToDisk();
  }

  res.json({ success: true, term: currentTerm });
});

// POST /stroke — GATEWAY sends a drawing stroke (only leader handles this)
app.post("/stroke", async (req, res) => {
  if (state !== STATES.LEADER) {
    return res.status(403).json({ error: "Not the leader", leaderId });
  }
  try {
    const result = await replicateStroke(req.body);
    res.json(result);
  } catch (err) {
    log.error(`Stroke replication failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /sync-log?fromIndex=N — restarted replica catches up
app.get("/sync-log", (req, res) => {
  const fromIndex = parseInt(req.query.fromIndex || "0", 10);
  const missing   = raftLog.filter((e) => e.index >= fromIndex);
  res.json({ entries: missing, commitIndex });
});

// GET /status — gateway uses this to discover the leader
app.get("/status", (req, res) => {
  res.json({
    nodeId:      NODE_ID,
    state,
    currentTerm,
    leaderId,
    logLength:   raftLog.length,
    commitIndex,
  });
});

// POST /self-destruct — chaos mode: gracefully exit so Docker restarts us
app.post("/self-destruct", (req, res) => {
  log.error(`💥 Self-destruct triggered by chaos mode`);
  res.json({ bye: true });
  setTimeout(() => process.exit(1), 100);
});

// ─── Startup ───────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  log.startup(`🚀 ${NODE_ID} started on port ${PORT} | peers: ${PEERS.join(", ")}`);
  loadLogFromDisk();
  await syncOnStartup();
  resetElectionTimer();
});

async function syncOnStartup() {
  log.sync(`🔄 Checking for missed log entries...`);
  for (const peer of PEERS) {
    try {
      const statusRes = await axios.get(`${peer}/status`, { timeout: 500 });
      if (statusRes.data.state === "LEADER") {
        const fromIndex = raftLog.length;
        const syncRes   = await axios.get(`${peer}/sync-log?fromIndex=${fromIndex}`, { timeout: 500 });
        const entries   = syncRes.data.entries;

        entries.forEach((entry) => {
          if (!raftLog.find((e) => e.index === entry.index)) raftLog.push(entry);
        });
        commitIndex = syncRes.data.commitIndex;

        if (entries.length > 0) {
          log.sync(`✅ Synced ${entries.length} missing entries from ${peer} (commitIndex=${commitIndex})`);
        } else {
          log.sync(`✅ Already up-to-date (no missing entries)`);
        }
        break;
      }
    } catch {
      // Peer not ready — fine, election will sort it out
    }
  }
}
