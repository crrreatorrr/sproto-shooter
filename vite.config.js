import { defineConfig } from 'vite';

// Vitest reads the `test` block. e2e specs stay out of the unit run (Playwright, B-M4).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsDir: 'build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/') || id.includes('node_modules\\three\\')) return 'three';
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules/**', 'dist/**', '.claude/**', '.qa-build/**', 'tests/e2e/**'],
  },
});
