import express from 'express';
import { createApiRouter, type Repositories } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errors';

export function createApp(repositories: Repositories) {
  const app = express();

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'ai-marketing-system-api',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/v1', createApiRouter(repositories));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
