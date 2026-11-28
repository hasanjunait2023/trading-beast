import { defineConfig } from 'vitest/config';
import path from 'path';

// Mirrors the vite.config @shared alias so tests can import the shared
// Radar adapter exactly as the app does.
export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
