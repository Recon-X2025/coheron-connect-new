import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 60000,
    fileParallelism: false,
    hookTimeout: 120000, // 2 minutes for MongoMemoryReplSet + app init
    teardownTimeout: 30000,
  },
});
