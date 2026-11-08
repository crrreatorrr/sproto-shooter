import { defineConfig } from 'vite';

const HTTP_KEY = /http[_-]?key|defaulthttpkey|NAKAMA_HTTP_KEY\s*=\s*['"][^'"]+['"]/i;

export default defineConfig({
  base: './',
  plugins: [{
    name: 'no-http-key',
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk' && HTTP_KEY.test(item.code)) this.error('HTTP key in client bundle');
      }
    },
  }],
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
