// utils/logger.js - cleaned for SonarQube
const safeStringify = (val, loggerRef) => {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return val;
  if (val instanceof Error) return val.stack || val.message;
  if (val instanceof Date) return val.toISOString();
  try {
    return JSON.stringify(val, null, 2);
  } catch (e) {
    // 👉 handle exception properly so SonarQube S2486 is satisfied
    if (loggerRef && typeof loggerRef.error === 'function') {
      loggerRef.error('safeStringify circular reference', e);
    } else {
      console.error('safeStringify circular reference:', e);
    }
    return '[Unserializable Object]';
  }
};

let winston;
try {
  winston = require('winston');
} catch {
  winston = null;
}

const makeWinston = () => {
  const { format, transports, createLogger } = winston;
  let loggerInstance;

  const logFormat = format.printf(({ level, message, timestamp }) => {
    const msg = safeStringify(message, loggerInstance);
    const ts  = safeStringify(timestamp, loggerInstance);
    return `${ts} ${level}: ${msg}`;
  });

  loggerInstance = createLogger({
    level : process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      logFormat
    ),
    transports: [
      new transports.Console({ format: format.combine(format.colorize(), logFormat) })
    ],
  });

  if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    loggerInstance.add(new transports.File({ filename: path.join(__dirname, '../logs/error.log'), level: 'error', maxsize: 5 * 1024 * 1024, maxFiles: 3 }));
  }

  return loggerInstance;
};

const consoleLogger = {
  error  : (m) => console.error(`[ERROR] ${safeStringify(m)}`),
  warn   : (m) => console.warn(`[WARN ] ${safeStringify(m)}`),
  info   : (m) => console.info(`[INFO ] ${safeStringify(m)}`),
  debug  : (m) => process.env.NODE_ENV !== 'production' && console.debug(`[DEBUG] ${safeStringify(m)}`),
  verbose: (m) => process.env.NODE_ENV !== 'production' && console.log(`[VERB ] ${safeStringify(m)}`),
};

const logger = winston ? makeWinston() : consoleLogger;

/* ---------- helper wrappers ---------- */
logger.gameEvent = (gameId, event, details = {}) =>
  logger.info({ gameId, event, details });

logger.userAction = (userId, username, action, details = {}) =>
  logger.info({ userId, username, action, details });

logger.performance = (operation, ms) =>
  logger.debug({ perf: operation, ms });

module.exports = logger;
