import 'dotenv/config';
import { createApp } from './app';
import { connectMongo, disconnectMongo, ensureIndexes } from './db/mongo';
import { createRepositories } from './repositories';

const port = Number(process.env.PORT || 3000);

async function main() {
  const { db } = await connectMongo();
  await ensureIndexes();
  const repositories = createRepositories(db);
  const app = createApp(repositories);
  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`AI Marketing System API listening on port ${port}`);
  });

  const shutdown = async () => {
    server.close();
    await disconnectMongo();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start API server:', error);
  process.exit(1);
});
