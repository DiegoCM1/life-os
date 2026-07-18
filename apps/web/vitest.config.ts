import { defineConfig } from 'vitest/config';

// The units under test (lib/time, features/topics/stats) are pure server modules
// with no DOM, so the plain node environment is enough. `resolve.tsconfigPaths`
// resolves the `@/…` alias from tsconfig natively (no plugin needed).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
