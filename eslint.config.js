import js from '@eslint/js';
import globals from 'globals';

const simDataFiles = ['src/sim/**/*.js', 'src/data/**/*.js'];

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',
      'docs/**',
      '.qa-build/**',
      'coverage/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Existing code uses intentional unused catch bindings and short names.
      // The milestone gate is the sim/data boundary, not a style rewrite.
      'no-unused-vars': ['error', {
        args: 'none',
        caughtErrors: 'none',
        varsIgnorePattern: '^_',
      }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-constant-condition': 'off',
      'no-prototype-builtins': 'off',
      'preserve-caught-error': 'off',
    },
  },
  {
    files: simDataFiles,
    rules: {
      'no-restricted-imports': ['error', {
        paths: ['three'],
        patterns: [
          { group: ['three', 'three/*'], message: 'sim/data stay free of three.' },
          { group: ['**/render', '**/render/**', '**/ui', '**/ui/**', '**/audio', '**/audio/**', '**/game', '**/game/**'], message: 'sim/data must not import presentation.' },
        ],
      }],
      'no-restricted-globals': ['error',
        { name: 'window', message: 'sim/data must not touch the DOM.' },
        { name: 'document', message: 'sim/data must not touch the DOM.' },
      ],
      'no-restricted-properties': ['error',
        { object: 'Math', property: 'random', message: 'Use state.rng. Presentation randomness belongs in render/core/fxRandom.js.' },
        { object: 'Date', property: 'now', message: 'sim/data must not read the wall clock.' },
        { object: 'performance', property: 'now', message: 'sim/data must not read the wall clock.' },
      ],
    },
  },
];
