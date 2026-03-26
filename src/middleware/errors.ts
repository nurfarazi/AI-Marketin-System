import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found.' });
}

export function errorHandler(error: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) {
  const status = error.statusCode || 500;
  logger.error('Unhandled request error.', {
    statusCode: status,
    name: error.name,
    message: error.message,
  });
  res.status(status).json({
    error: error.message || 'Internal Server Error',
  });
}
