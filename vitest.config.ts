import { defineConfig } from 'vitest/config';

/** Testes de Node (API, pacote compartilhado e scripts). O web tem o seu proprio config. */
export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts', 'packages/**/src/**/*.test.ts', 'apps/api/src/**/*.test.ts'],
    environment: 'node',
  },
});
