import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.JWT_SECRET = 'test-secret';
  process.env.NODE_ENV = 'test';
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  // Delete documents but preserve indexes (needed for unique constraints)
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map(c => c.deleteMany({}))
  );
});
