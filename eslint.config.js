// @ts-check
// ESLint flat config (ESLint 9+).
//
// Run with: `npm run lint` (after `npm install`).
// Auto-fix:  `npm run lint:fix`.
//
// Config intent:
//   - Catch real bugs (unused vars, no-undef) without nitpicking style — Prettier handles style.
//   - Surface stray `console.log` calls in library code so we keep production
//     paths quiet. `console.warn`/`error` are still allowed.
//   - Test files have looser rules: perf specs print tables to console for
//     interactive output.
//
// Globals: D3 is loaded as a script tag and referenced via `d3` in the
// library bundle.

import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'dashboard/dist/**',
      'playwright-report/**',
      'test-results/**',
      'dashboard/data/**',
      '**/*.min.js',
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        d3: 'readonly',
      },
    },
    rules: {
      // The library should not use console.log on production code paths.
      // Diagnostic chatter belongs behind settings.isDebug or the
      // dashboard._debugLog helper.
      'no-console': ['warn', { allow: ['warn', 'error', 'group', 'groupEnd', 'table'] }],
      // Allow throwaway args prefixed with `_`.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Empty catch blocks are sometimes intentional (e.g. SVG quirks); keep
      // it as a warning so they're visible but not blocking.
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // The codebase still uses var in places; flagging without forcing.
      'no-var': 'warn',
      'prefer-const': 'warn',
    },
  },
  {
    files: ['tests/**/*.js', 'tests/**/*.cjs', 'playwright.config.cjs'],
    rules: {
      // Specs print tables to console; that's the intended output.
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
];
