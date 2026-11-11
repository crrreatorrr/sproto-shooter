import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Shown in feedback notes: package version plus a short commit (CI's GITHUB_SHA, else git, else "dev").
function buildId() {
  const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
  let commit = (process.env.GITHUB_SHA || '').slice(0, 7);
  if (!commit) {
    try { commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { commit = ''; }
  }
  return `${version}+${/^[0-9a-f]{7,40}$/.test(commit) ? commit : 'dev'}`;
}

const HTTP_KEY = /http[_-]?key|defaulthttpkey|NAKAMA_HTTP_KEY\s*=\s*['"][^'"]+['"]/i;

export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
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
