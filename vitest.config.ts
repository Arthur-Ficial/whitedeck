import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    /* Two test files driving Keynote.app at once corrupt each other's documents
       (one deletes/saves while the other still builds). Run files one at a time. */
    fileParallelism: false,
  },
});
