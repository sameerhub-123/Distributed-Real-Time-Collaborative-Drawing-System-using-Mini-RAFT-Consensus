/**
 * Color-coded logger for replica nodes.
 *
 * Each NODE_ID gets a distinct ANSI color so logs from different
 * replicas are instantly distinguishable in `docker compose up` output.
 *
 * Colors:
 *   replica1 → Cyan
 *   replica2 → Yellow
 *   replica3 → Magenta
 *   unknown  → White
 */

const ANSI = {
  reset:   "\x1b[0m",
  bold:    "\x1b[1m",
  cyan:    "\x1b[36m",
  yellow:  "\x1b[33m",
  magenta: "\x1b[35m",
  green:   "\x1b[32m",
  red:     "\x1b[31m",
  white:   "\x1b[37m",
  gray:    "\x1b[90m",
};

const NODE_COLORS = {
  replica1: ANSI.cyan,
  replica2: ANSI.yellow,
  replica3: ANSI.magenta,
};

// Event-type colors
const EVENT_COLORS = {
  ELECTION:     ANSI.yellow,
  VOTE:         ANSI.cyan,
  LEADER:       ANSI.green,
  HEARTBEAT:    ANSI.gray,
  REPLICATE:    ANSI.white,
  COMMIT:       ANSI.green,
  SYNC:         ANSI.magenta,
  STARTUP:      ANSI.cyan,
  ERROR:        ANSI.red,
  INFO:         ANSI.white,
};

function timestamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 23);
}

/**
 * Creates a logger bound to a specific NODE_ID.
 *
 * Usage:
 *   const log = createLogger("replica1");
 *   log.election("Starting election for term 3");
 *   log.leader("Became LEADER");
 *   log.vote("Voted for replica2 in term 3");
 */
function createLogger(nodeId) {
  const nodeColor = NODE_COLORS[nodeId] || ANSI.white;
  const prefix = `${nodeColor}${ANSI.bold}[${nodeId.toUpperCase()}]${ANSI.reset}`;

  function write(eventType, message) {
    const eventColor = EVENT_COLORS[eventType] || ANSI.white;
    const tag = `${eventColor}[${eventType}]${ANSI.reset}`;
    const ts = `${ANSI.gray}${timestamp()}${ANSI.reset}`;
    console.log(`${ts} ${prefix} ${tag} ${message}`);
  }

  return {
    startup:   (msg) => write("STARTUP",   msg),
    election:  (msg) => write("ELECTION",  msg),
    vote:      (msg) => write("VOTE",      msg),
    leader:    (msg) => write("LEADER",    msg),
    heartbeat: (msg) => write("HEARTBEAT", msg),
    replicate: (msg) => write("REPLICATE", msg),
    commit:    (msg) => write("COMMIT",    msg),
    sync:      (msg) => write("SYNC",      msg),
    info:      (msg) => write("INFO",      msg),
    error:     (msg) => write("ERROR",     msg),
  };
}

module.exports = { createLogger };
