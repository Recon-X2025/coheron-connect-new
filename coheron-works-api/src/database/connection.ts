import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../shared/utils/logger.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/coheron_erp';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('Connected to MongoDB database');
  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection error');
    process.exit(1);
  }
}

mongoose.connection.on('error', (err) => {
  logger.error({ err }, 'MongoDB connection error');
});

mongoose.connection.on('disconnected', () => {
  logger.info('MongoDB disconnected. Attempting reconnection...');
  setTimeout(() => {
    connectDB().catch(err => logger.error({ err }, 'Reconnection failed'));
  }, 5000);
});

export default mongoose;
