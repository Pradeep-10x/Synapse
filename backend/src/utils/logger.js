/**
 * Minimal leveled logger.
 * Replaces scattered console.log calls so logs can be filtered by level
 * and silenced in test/production as needed. Swap the internals for
 * pino/winston later without touching call sites.
 */
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const configuredLevel =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

const threshold = LEVELS[configuredLevel] ?? LEVELS.debug;

const shouldLog = (level) => LEVELS[level] <= threshold;

const format = (level, args) => [`[${new Date().toISOString()}] ${level.toUpperCase()}:`, ...args];

export const logger = {
  error: (...args) => shouldLog("error") && console.error(...format("error", args)),
  warn: (...args) => shouldLog("warn") && console.warn(...format("warn", args)),
  info: (...args) => shouldLog("info") && console.log(...format("info", args)),
  debug: (...args) => shouldLog("debug") && console.log(...format("debug", args)),
};

export default logger;
