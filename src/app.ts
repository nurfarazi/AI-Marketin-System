import express from 'express';
import { createApiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errors';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'ai-marketing-system-api',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/v1', createApiRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

