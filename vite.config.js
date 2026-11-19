import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

// The browser build loads campaign level bodies on demand (src/game/campaignLevels.js). Vitest,
// Node and the server bundles (esbuild, scripts/build-server-sim.mjs) keep the eager list.
const CAMPAIGN_FILE = fileURLToPath(new URL('./src/data/levels/campaign.js', import.meta.url));
const CAMPAIGN_STUBS = fileURLToPath(new URL('./src/game/campaignLevelStubs.js', import.meta.url));
const lazyCampaignLevels = {
  name: 'lazy-campaign-levels',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (process.env.VITEST || !importer || !source.endsWith('campaign.js')) return null;
    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
    return resolved && resolved.id === CAMPAIGN_FILE ? CAMPAIGN_STUBS : null;
  },
};

const HTTP_KEY = /http[_-]?key|defaulthttpkey|NAKAMA_HTTP_KEY\s*=\s*['"][^'"]+['"]/i;

export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
  plugins: [lazyCampaignLevels, {
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
          // Three.js changes far less often than the game: its own chunk stays cached across deploys.
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return 'three';
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
