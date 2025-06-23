/**
 * Request Logger Middleware
 * Logs incoming requests with detailed information
 */

import { Request, Response, NextFunction } from 'express';
import { loggerHelpers } from '@/shared/utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = new Date();
  
  // Add start time to request for duration calculation
  (req as any).startTime = startTime;

  // Log request
  loggerHelpers.logRequest(req, startTime);

  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    // Log response
    loggerHelpers.logResponse(req, res, startTime);
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};