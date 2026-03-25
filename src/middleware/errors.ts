import type { NextFunction, Request, Response } from 'express';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found.' });
}

export function errorHandler(error: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) {
  const status = error.statusCode || 500;
  res.status(status).json({
    error: error.message || 'Internal Server Error',
  });
}

