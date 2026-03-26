import 'dotenv/config';
import { createApp } from './app';
import { connectToMongo, disconnectMongo, ensureIndexes } from './db/mongo';
import { createRepositories } from './repositories';
import { readNumberEnv } from './config/env';
import { logger } from './utils/logger';

const port = readNumberEnv('PORT');

async function main() {
  const { db } = await connectToMongo();
  await ensureIndexes();
  const repositories = createRepositories(db);
  const app = createApp(repositories);
  const server = app.listen(port, () => {
    logger.info(`AI Marketing System app is running on port ${port}`);
  });

  const shutdown = async () => {
    logger.info('Shutting down API server.');
    server.close();
    await disconnectMongo();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error('Failed to start API server.', error);
  process.exit(1);
});
