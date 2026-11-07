import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'index-[name]-[hash].js',
        chunkFileNames: 'index-[name]-[hash].js',
        assetFileNames: 'index-[name]-[hash][extname]',
        manualChunks(id) {
          if (id.includes('lil-gui')) return 'debug-gui';
        },
      },
    },
  },
  server: {
    proxy: {
      '/v2': { target: 'http://127.0.0.1:7350', changeOrigin: true },
      '/ws': { target: 'http://127.0.0.1:7350', ws: true, changeOrigin: true },
    },
  },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
});
