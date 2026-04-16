/**
 * Color-coded logger for the Gateway service.
 * Gateway logs in Blue so it's visually distinct from replicas.
 */

const ANSI = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  blue:   "\x1b[34m",
  green:  "\x1b[32m",
  red:    "\x1b[31m",
  yellow: "\x1b[33m",
  gray:   "\x1b[90m",
  white:  "\x1b[37m",
};

const EVENT_COLORS = {
  STARTUP:    ANSI.blue,
  LEADER:     ANSI.green,
  CLIENT:     ANSI.blue,
  STROKE:     ANSI.white,
  RETRY:      ANSI.yellow,
  ERROR:      ANSI.red,
  INFO:       ANSI.white,
};

function timestamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 23);
}

const prefix = `${ANSI.blue}${ANSI.bold}[GATEWAY]${ANSI.reset}`;

function write(eventType, message) {
  const eventColor = EVENT_COLORS[eventType] || ANSI.white;
  const tag = `${eventColor}[${eventType}]${ANSI.reset}`;
  const ts = `${ANSI.gray}${timestamp()}${ANSI.reset}`;
  console.log(`${ts} ${prefix} ${tag} ${message}`);
}

const log = {
  startup: (msg) => write("STARTUP", msg),
  leader:  (msg) => write("LEADER",  msg),
  client:  (msg) => write("CLIENT",  msg),
  stroke:  (msg) => write("STROKE",  msg),
  retry:   (msg) => write("RETRY",   msg),
  info:    (msg) => write("INFO",    msg),
  error:   (msg) => write("ERROR",   msg),
};

module.exports = { log };
