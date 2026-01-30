import { connectDB } from './connection.js';
import mongoose from './connection.js';

async function setupDatabase() {
  try {
    await connectDB();
    console.log('MongoDB connection established');
    console.log('Database setup complete! MongoDB creates collections automatically.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();
