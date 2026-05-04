import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests-unit/**/*.test.js'],
    // Most modules are pure JS; the few that touch the DOM (utils.js getTextWidth,
    // geometryManager getBBox usage in places) get jsdom on demand via per-file
    // // @vitest-environment jsdom comments. Keep the default lightweight.
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      include: [
        'js/utilPath.js',
        'js/utils.js',
        'js/configManager.js',
        'js/geometryManager.js',
        'js/nodeRegistry.js',
        'js/statusManager.js',
      ],
      // Starting floor — ratchet upward as the unit-test suite grows.
      thresholds: {
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50,
      },
    },
  },
});
