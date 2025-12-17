import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude e2e tests from vitest (they run with Playwright)
    exclude: [
      '**/node_modules/**',
      '**/tests/e2e/**',
    ],
    // Include patterns for vitest
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        '**/node_modules/**',
        '**/tests/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/vite.config*.ts',
        '**/vitest.config.ts',
        '**/scripts/**',
      ],
      // Thresholds - start moderate, tighten over time
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
});
