import { MongoClient, type Collection, type Db, type Document } from 'mongodb';
import { readTrimmedEnv } from '../config/env';

let client: MongoClient | null = null;
let db: Db | null = null;

function getMongoUri() {
  return readTrimmedEnv('MONGO_URI');
}

function getMongoDbName() {
  return readTrimmedEnv('MONGO_DB_NAME');
}

export async function connectToMongo() {
  if (client && db) return { client, db };

  const uri = getMongoUri();
  client = new MongoClient(uri);
  await client.connect();

  db = client.db(getMongoDbName());
  return { client, db };
}

export function getDb(): Db {
  if (!db) {
    throw new Error('MongoDB connection has not been initialized. Call connectToMongo() first.');
  }
  return db;
}

export async function disconnectMongo() {
  if (client) {
    await client.close();
  }
  client = null;
  db = null;
}

export function getCollection<T extends Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

export async function ensureIndexes() {
  const database = getDb();

  await Promise.all([
    database.collection('projects').createIndex({ id: 1 }, { unique: true }),
    database.collection('ingestions').createIndex({ id: 1 }, { unique: true }),
    database.collection('ingestions').createIndex({ projectId: 1 }),
    database.collection('normalized_sources').createIndex({ id: 1 }, { unique: true }),
    database.collection('normalized_sources').createIndex({ projectId: 1 }),
    database.collection('analyses').createIndex({ id: 1 }, { unique: true }),
    database.collection('analyses').createIndex({ projectId: 1 }),
    database.collection('creatives').createIndex({ id: 1 }, { unique: true }),
    database.collection('creatives').createIndex({ projectId: 1 }),
    database.collection('reports').createIndex({ id: 1 }, { unique: true }),
    database.collection('reports').createIndex({ projectId: 1 }),
    database.collection('jobs').createIndex({ id: 1 }, { unique: true }),
    database.collection('jobs').createIndex({ projectId: 1 }),
  ]);
}

export const connectMongo = connectToMongo;

export type { MongoClient, Db, Collection };
