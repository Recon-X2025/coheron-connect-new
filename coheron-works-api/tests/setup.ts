import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  const uri = replSet.getUri();
  process.env.MONGO_URI = uri;
  process.env.JWT_SECRET = 'test-secret';
  process.env.NODE_ENV = 'test';
  await mongoose.connect(uri);

  // Pre-create collections used by raw db.collection() calls in services
  // to avoid "catalog changes" errors inside transactions on replica sets.
  // Insert and delete a dummy doc to fully initialize each collection.
  const db = mongoose.connection.db;
  if (db) {
    for (const name of ['journal_entries', 'partners', 'credit_notes']) {
      const col = db.collection(name);
      await col.insertOne({ _init: true });
      await col.deleteOne({ _init: true });
    }
  }

  // Initialize app routes so all API endpoints are available
  const { initApp } = await import('../src/app.js');
  await initApp();

  // Wait for Mongoose model indexes to stabilize before running tests
  // This prevents "catalog changes" errors in the first transaction
  await Promise.all(
    Object.values(mongoose.connection.models).map(m =>
      m.init().catch(() => {/* ignore index conflicts */})
    )
  );
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  // Delete documents but preserve indexes (needed for unique constraints)
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map(c => c.deleteMany({}))
  );
  // Also clean raw collections not managed by Mongoose
  const db = mongoose.connection.db;
  if (db) {
    for (const name of ['journal_entries', 'partners', 'credit_notes']) {
      await db.collection(name).deleteMany({});
    }
  }
});
