import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'vendor/**', 'public/**', 'art/**'],
  },
  {
    files: [
      'eslint.config.js',
      'scripts/**/*.mjs',
      'tests/architecture.test.js',
      'tests/asset-manifest.test.js',
      'tests/performance-baseline.test.js',
      'tests/net/**/*.js',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/load-profile.mjs'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
];
