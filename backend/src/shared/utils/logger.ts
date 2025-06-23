/**
 * Logger Utility
 * Centralized logging configuration using Winston
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { config } from '@/shared/config/environment';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    if (info.stack) {
      return `${info.timestamp} ${info.level}: ${info.message}\n${info.stack}`;
    }
    return `${info.timestamp} ${info.level}: ${info.message}`;
  })
);

// Console transport
const consoleTransport = new winston.transports.Console({
  format: logFormat,
});

// File transport for errors
const errorFileTransport = new DailyRotateFile({
  filename: 'logs/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  handleExceptions: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
});

// File transport for all logs
const combinedFileTransport = new DailyRotateFile({
  filename: 'logs/combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
});

// HTTP logs transport
const httpFileTransport = new DailyRotateFile({
  filename: 'logs/http-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'http',
  maxSize: '20m',
  maxFiles: '7d',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
});

// Create transports array based on environment
const transports: winston.transport[] = [consoleTransport];

// Add file transports in production or when explicitly enabled
if (config.app.environment === 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
  transports.push(errorFileTransport);
  transports.push(combinedFileTransport);
  transports.push(httpFileTransport);
}

// Create logger instance
const logger = winston.createLogger({
  level: config.app.environment === 'production' ? 'warn' : 'debug',
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
  exitOnError: false,
});

// Stream for Morgan HTTP logger
export const morganStream = {
  write: (message: string) => {
    logger.http(message.substring(0, message.lastIndexOf('\n')));
  },
};

// Helper functions for structured logging
export const loggerHelpers = {
  // Log API request
  logRequest: (req: any, startTime: Date) => {
    const duration = Date.now() - startTime.getTime();
    logger.http('API Request', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      duration: `${duration}ms`,
    });
  },

  // Log API response
  logResponse: (req: any, res: any, startTime: Date) => {
    const duration = Date.now() - startTime.getTime();
    logger.http('API Response', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      ip: req.ip,
      userId: req.user?.id,
      duration: `${duration}ms`,
    });
  },

  // Log database operations
  logDatabase: (operation: string, table: string, duration?: number, error?: Error) => {
    if (error) {
      logger.error('Database Error', {
        operation,
        table,
        duration: duration ? `${duration}ms` : undefined,
        error: error.message,
        stack: error.stack,
      });
    } else {
      logger.debug('Database Operation', {
        operation,
        table,
        duration: duration ? `${duration}ms` : undefined,
      });
    }
  },

  // Log authentication events
  logAuth: (event: string, userId?: string, email?: string, ip?: string, details?: any) => {
    logger.info('Authentication Event', {
      event,
      userId,
      email,
      ip,
      ...details,
    });
  },

  // Log file operations
  logFile: (operation: string, filename: string, size?: number, error?: Error) => {
    if (error) {
      logger.error('File Operation Error', {
        operation,
        filename,
        size,
        error: error.message,
      });
    } else {
      logger.info('File Operation', {
        operation,
        filename,
        size,
      });
    }
  },

  // Log payment events
  logPayment: (event: string, userId: string, amount: number, currency: string, provider: string, details?: any) => {
    logger.info('Payment Event', {
      event,
      userId,
      amount,
      currency,
      provider,
      ...details,
    });
  },

  // Log security events
  logSecurity: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any) => {
    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 
                    severity === 'medium' ? 'warn' : 'info';
    
    logger[logLevel]('Security Event', {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },

  // Log performance metrics
  logPerformance: (metric: string, value: number, unit: string, tags?: Record<string, any>) => {
    logger.debug('Performance Metric', {
      metric,
      value,
      unit,
      ...tags,
    });
  },
};

export { logger };