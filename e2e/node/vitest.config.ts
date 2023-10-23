import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test-setup.ts'],
    testTimeout: 100_000,
  },
});
