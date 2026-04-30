/**
 * Structured JSON logger.
 *
 * One log line = one JSON object so log aggregators (Datadog, Loki, CloudWatch)
 * can parse them without regex. Levels: debug | info | warn | error.
 *
 * In dev we pretty-print to stderr for readability; in prod we emit one
 * compact JSON per line.
 */

type Level = "debug" | "info" | "warn" | "error";

interface LogFields {
  [k: string]: unknown;
}

const isProd = process.env.NODE_ENV === "production";

function emit(level: Level, msg: string, fields?: LogFields) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(fields ?? {}),
  };
  // Always to stderr to avoid mixing with API stdout responses.
  if (isProd) {
    process.stderr.write(JSON.stringify(payload) + "\n");
  } else {
    const colour =
      level === "error"
        ? "\x1b[31m"
        : level === "warn"
        ? "\x1b[33m"
        : level === "debug"
        ? "\x1b[90m"
        : "\x1b[36m";
    process.stderr.write(
      `${colour}[${level}]\x1b[0m ${msg} ${
        fields ? JSON.stringify(fields) : ""
      }\n`
    );
  }
}

export const log = {
  debug: (msg: string, fields?: LogFields) => emit("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => emit("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => emit("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => emit("error", msg, fields),
};

/**
 * Build a child logger with bound fields — used at the start of an API
 * route handler so every line for that request shares correlation ids.
 */
export function withFields(bound: LogFields) {
  return {
    debug: (msg: string, f?: LogFields) =>
      log.debug(msg, { ...bound, ...f }),
    info: (msg: string, f?: LogFields) => log.info(msg, { ...bound, ...f }),
    warn: (msg: string, f?: LogFields) => log.warn(msg, { ...bound, ...f }),
    error: (msg: string, f?: LogFields) => log.error(msg, { ...bound, ...f }),
  };
}
