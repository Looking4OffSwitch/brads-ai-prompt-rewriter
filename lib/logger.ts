/**
 * Simple structured logging utility
 * Provides consistent log format with request tracking
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  requestId?: string;
  ip?: string;
  [key: string]: any;
}

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format a structured log entry
 */
function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...context,
  };
  return JSON.stringify(logEntry);
}

/**
 * Log an info message
 */
export function logInfo(message: string, context?: LogContext): void {
  console.log(formatLog('info', message, context));
}

/**
 * Log a warning message
 */
export function logWarn(message: string, context?: LogContext): void {
  console.warn(formatLog('warn', message, context));
}

/**
 * Log an error message
 */
export function logError(message: string, error?: Error, context?: LogContext): void {
  const errorContext = {
    ...context,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  };
  console.error(formatLog('error', message, errorContext));
}

/**
 * Log a debug message (only in development)
 */
export function logDebug(message: string, context?: LogContext): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug(formatLog('debug', message, context));
  }
}

/**
 * Log request timing
 */
export function logTiming(operation: string, durationMs: number, context?: LogContext): void {
  logInfo(`${operation} completed`, {
    ...context,
    durationMs,
    duration: `${durationMs}ms`,
  });
}
