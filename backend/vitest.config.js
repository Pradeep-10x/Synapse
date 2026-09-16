import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Integration tests spin up an in-memory MongoDB; give them room.
    testTimeout: 30000,
    hookTimeout: 60000,
    include: ['tests/**/*.test.js'],
  },
});
