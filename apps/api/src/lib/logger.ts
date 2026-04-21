import winston from 'winston'
import Loki from 'winston-loki'

const lokiUrl = process.env.LOKI_URL || 'http://localhost:3100'
const logLevel = process.env.LOG_LEVEL || 'info'

/**
 * Create Winston logger with Loki transport for centralized logging
 * Supports standard levels: error, warn, info, debug
 * Custom: performance (mapped to info)
 */
export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'lifeos-api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, duration_ms, ...meta }) => {
          let log = `${new Date().toISOString()} [${level}] ${message}`
          if (duration_ms) {
            log += ` (${duration_ms}ms)`
          }
          if (meta.stack) {
            log += `\n${meta.stack}`
          }
          return log
        })
      ),
    }),
    new Loki({
      host: lokiUrl,
      labels: { service: 'lifeos-api' },
      json: true,
      frequency: 5000,
    }),
  ],
})

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context)
}

/**
 * Log performance metrics (duration in ms)
 * Uses info level with duration_ms for filtering
 */
export function logPerformance({
  endpoint,
  method,
  duration_ms,
  correlationId,
}: {
  endpoint: string
  method: string
  duration_ms: number
  correlationId?: string
}) {
  logger.info(`${method} ${endpoint} completed`, {
    endpoint,
    method,
    duration_ms,
    correlationId,
    level: 'performance',
  })
}

/**
 * Log information (startup, CRUD operations, user actions)
 */
export function logInformation(message: string, meta?: Record<string, unknown>) {
  logger.info(message, meta)
}

/**
 * Log warnings (rate limits, retries, session expiring)
 */
export function logWarning(message: string, meta?: Record<string, unknown>) {
  logger.warn(message, meta)
}

/**
 * Log errors with stack trace
 */
export function logError(message: string, meta?: Record<string, unknown>) {
  logger.error(message, meta)
}

export default logger