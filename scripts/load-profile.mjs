// Cold/warm network waterfall and a frame sample from window.__sproto.perf.
// Byte totals are hardware-independent. Frame times are advisory: a software
// GL context is not a GPU benchmark and must not fail CI.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { percentile } from '../src/render/debug/perfCounters.js';
import { BASELINE_COMMIT, repoRoot } from './asset-report.mjs';
import { CRITICAL_ASSETS, GATE, MEASURED, criticalTransferBytes } from './check-budgets.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
};

const SYNTHETIC = {
  name: 'plan-10mbps-100ms-cpu4x',
  downMbps: 10,
  rttMs: 100,
  cpuSlowdown: 4,
  downloadBytesPerSec: 10_000_000 / 8,
  uploadBytesPerSec: 2_000_000 / 8,
};

function gitRev(root) {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function p50(values) {
  const nums = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!nums.length) return null;
  return percentile(nums, 0.5);
}

function sideSummary(sides) {
  const pick = (read) => p50(sides.map(read));
  return {
    requestCount: pick((side) => side.requestCount),
    firstPartyRequestCount: pick((side) => side.firstPartyRequestCount),
    transferBytes: pick((side) => side.transferBytes),
    firstPartyTransferBytes: pick((side) => side.firstPartyTransferBytes),
    ttfbMs: pick((side) => side.navigation.ttfbMs),
    loadMs: pick((side) => side.navigation.loadMs),
    titleVisibleMs: pick((side) => side.titleVisibleMs),
    perf: {
      frames: pick((side) => side.perf?.frames),
      avgFps: pick((side) => side.perf?.avgFps),
      avgMs: pick((side) => side.perf?.avgMs),
      p95Ms: pick((side) => side.perf?.p95Ms),
      p99Ms: pick((side) => side.perf?.p99Ms),
      maxMs: pick((side) => side.perf?.maxMs),
      simAvgMs: pick((side) => side.perf?.simAvgMs),
      renderAvgMs: pick((side) => side.perf?.renderAvgMs),
      gpuAvgMs: pick((side) => side.perf?.gpuAvgMs),
      drawCalls: pick((side) => side.perf?.drawCalls),
      triangles: pick((side) => side.perf?.triangles),
    },
  };
}

export function summarizeRuns(runs) {
  return {
    runs: runs.length,
    aggregator: 'perfCounters.percentile nearest-rank p50',
    cold: sideSummary(runs.map((run) => run.cold)),
    warm: sideSummary(runs.map((run) => run.warm)),
  };
}

function serve(dist) {
  const root = path.resolve(dist);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const decoded = decodeURIComponent(url.pathname);
    const rel = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
    const file = path.resolve(root, rel);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403).end('forbidden');
      return;
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end('not found');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'public, max-age=3600' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

function partyOf(target) {
  const host = new URL(target).hostname;
  return host === '127.0.0.1' || host === 'localhost' ? 'first' : 'third';
}

function assetKey(target) {
  const pathname = decodeURIComponent(new URL(target).pathname);
  const marker = '/assets/';
  const at = pathname.indexOf(marker);
  if (at === -1) return null;
  return pathname.slice(at + marker.length);
}

async function applyProfile(page, { throttle, cacheDisabled }) {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled });
  if (throttle) {
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: SYNTHETIC.rttMs,
      downloadThroughput: SYNTHETIC.downloadBytesPerSec,
      uploadThroughput: SYNTHETIC.uploadBytesPerSec,
    });
    await client.send('Emulation.setCPUThrottlingRate', { rate: SYNTHETIC.cpuSlowdown });
  }
  return client;
}

async function readPage(page, meta) {
  let bootError = null;
  let titleVisibleMs = null;
  try {
    await page.waitForSelector('#screen .title h1', { timeout: 30000 });
    titleVisibleMs = Date.now() - meta.started;
  } catch (err) {
    titleVisibleMs = Date.now() - meta.started;
    bootError = err instanceof Error ? err.message : String(err);
  }
  try {
    await page.waitForFunction(() => window.__sproto && typeof window.__sproto.perf === 'function', { timeout: 30000 });
    await page.waitForFunction(() => window.__sproto.game.renderer.pendingDownloads() === 0, { timeout: 60000 });
    await page.waitForFunction((assets) => {
      const names = performance.getEntriesByType('resource').map((entry) => entry.name);
      return assets.every((asset) => names.some((name) => name.includes(asset)));
    }, CRITICAL_ASSETS, { timeout: 60000 });
    // perf(5) is the same counter the F3 overlay reads. Five seconds keeps a slow
    // software frame inside the window; two seconds can report zero samples.
    await page.waitForFunction(() => window.__sproto.perf(5).frames >= 3, { timeout: 20000 });
  } catch (err) {
    bootError = bootError || (err instanceof Error ? err.message : String(err));
  }
  const measured = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource').map((entry) => ({
      name: entry.name,
      startTime: entry.startTime,
      duration: entry.duration,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      initiatorType: entry.initiatorType,
    }));
    const canvas = document.querySelector('#view canvas');
    const gl = canvas && canvas.getContext('webgl2');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    let perf = null;
    let perfError = null;
    try {
      perf = window.__sproto && typeof window.__sproto.perf === 'function' ? window.__sproto.perf(5) : null;
    } catch (err) {
      perfError = err instanceof Error ? err.message : String(err);
    }
    return {
      navigation: nav ? {
        ttfbMs: nav.responseStart,
        domContentLoadedMs: nav.domContentLoadedEventEnd,
        loadMs: nav.loadEventEnd,
        responseEndMs: nav.responseEnd,
      } : null,
      resources,
      perf,
      perfError,
      pendingDownloads: window.__sproto?.game?.renderer?.pendingDownloads?.() ?? null,
      webgl: {
        vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : (gl ? gl.getParameter(gl.VENDOR) : null),
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : (gl ? gl.getParameter(gl.RENDERER) : null),
      },
      device: {
        userAgent: navigator.userAgent,
        hardwareConcurrency: navigator.hardwareConcurrency ?? null,
        deviceMemory: navigator.deviceMemory ?? null,
      },
      titleText: document.querySelector('#screen .title h1')?.innerText || null,
    };
  });
  const waterfall = measured.resources.map((entry) => {
    const key = assetKey(entry.name);
    return {
      url: entry.name,
      path: key,
      party: partyOf(entry.name),
      status: meta.statuses.get(entry.name) ?? null,
      startTime: entry.startTime,
      duration: entry.duration,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      initiatorType: entry.initiatorType,
      cached: entry.transferSize === 0 && entry.encodedBodySize > 0,
    };
  }).sort((a, b) => a.startTime - b.startTime);
  const first = waterfall.filter((entry) => entry.party === 'first');
  return {
    condition: meta.condition,
    cache: meta.cache,
    throttled: meta.throttled,
    bootError,
    titleVisibleMs,
    titleText: measured.titleText,
    navigation: measured.navigation || { ttfbMs: null, domContentLoadedMs: null, loadMs: null, responseEndMs: null },
    requestCount: waterfall.length,
    firstPartyRequestCount: first.length,
    transferBytes: waterfall.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
    firstPartyTransferBytes: first.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
    pendingDownloads: measured.pendingDownloads,
    webgl: measured.webgl,
    device: measured.device,
    perf: measured.perf,
    perfError: measured.perfError,
    waterfall,
  };
}

async function openPage(browser, origin, { throttle, cacheDisabled, condition, cache }) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const statuses = new Map();
  const pageErrors = [];
  page.on('response', (res) => { statuses.set(res.url(), res.status()); });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await applyProfile(page, { throttle, cacheDisabled });
  const started = Date.now();
  await page.goto(`${origin}/?stats=1&seed=1`, { waitUntil: 'load', timeout: 90000 });
  const sample = await readPage(page, { condition, cache, throttled: throttle, statuses, started });
  sample.pageErrors = pageErrors;
  return { context, page, sample };
}

function requestProblems(sample) {
  const problems = [];
  const seen = new Set();
  for (const entry of sample.waterfall) {
    if (entry.party !== 'first') continue;
    const pathname = new URL(entry.url).pathname;
    if (pathname === '/favicon.ico') continue;
    if (entry.status && entry.status >= 400) problems.push(`${entry.status} ${pathname}`);
    if (!entry.path) continue;
    if (entry.path.startsWith('index-') && (entry.path.endsWith('.js') || entry.path.endsWith('.css'))) continue;
    seen.add(entry.path);
    if (!CRITICAL_ASSETS.includes(entry.path)) problems.push(`unexpected first-party asset ${entry.path}`);
  }
  for (const expected of CRITICAL_ASSETS) {
    if (!seen.has(expected)) problems.push(`missing critical asset ${expected}`);
  }
  return problems;
}

async function launchBrowser() {
  const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];
  return chromium.launch({ headless: true, args });
}

export async function profileDist({ dist, runs, screenshots }) {
  const root = repoRoot();
  const bytes = criticalTransferBytes(dist);
  const { server, port } = await serve(dist);
  const origin = `http://127.0.0.1:${port}`;
  const browser = await launchBrowser();
  const recorded = [];
  let device = null;
  let browserVersion = null;
  try {
    browserVersion = browser.version();
    for (let index = 0; index < runs; index += 1) {
      const cold = await openPage(browser, origin, {
        throttle: true, cacheDisabled: true, condition: 'cold', cache: 'disabled',
      });
      device = device || cold.sample.device;
      if (screenshots && index === 1) {
        fs.mkdirSync(path.dirname(screenshots.cold), { recursive: true });
        await cold.page.screenshot({ path: screenshots.cold });
      }
      await cold.context.close();
      const warmContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      const warmPage = await warmContext.newPage();
      const warmStatuses = new Map();
      warmPage.on('response', (res) => { warmStatuses.set(res.url(), res.status()); });
      await applyProfile(warmPage, { throttle: true, cacheDisabled: false });
      await warmPage.goto(`${origin}/?stats=1&seed=1`, { waitUntil: 'load', timeout: 90000 });
      await warmPage.waitForFunction((assets) => {
        const names = performance.getEntriesByType('resource').map((entry) => entry.name);
        return assets.every((asset) => names.some((name) => name.includes(asset)));
      }, CRITICAL_ASSETS, { timeout: 60000 });
      const warmStarted = Date.now();
      await warmPage.goto(`${origin}/?stats=1&seed=1`, { waitUntil: 'load', timeout: 90000 });
      const warm = await readPage(warmPage, {
        condition: 'warm', cache: 'enabled', throttled: true, statuses: warmStatuses, started: warmStarted,
      });
      if (screenshots && index === 1) await warmPage.screenshot({ path: screenshots.warm });
      await warmContext.close();
      recorded.push({ index: index + 1, cold: cold.sample, warm });
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  return {
    schema: 'sproto-shooter.load-profile.v1',
    source: {
      repo: 'crrreatorrr/sproto-shooter',
      baselineCommit: BASELINE_COMMIT,
      generatedFromCommit: gitRev(root),
    },
    browser: { name: 'chromium', version: browserVersion, headless: true, gl: 'swiftshader' },
    device: device || {},
    syntheticProfile: SYNTHETIC,
    conditions: {
      cold: { cache: 'disabled', label: 'cold' },
      warm: { cache: 'enabled', label: 'warm' },
    },
    hardwareTiming: {
      advisory: true,
      ciGate: false,
      reason: 'Chromium is launched on SwiftShader. Frame samples are window.__sproto.perf(5), then a nearest-rank p50 across runs. They are not a GPU benchmark and not a CI gate.',
    },
    gates: {
      bytes: true,
      frameTimings: false,
    },
    bytes: {
      note: 'Gzip level 6 shell plus raw critical asset bytes. Independent of the timed waterfall.',
      criticalAssets: CRITICAL_ASSETS,
      criticalTransferBytes: bytes.criticalTransferBytes,
      titleShellGzipBytes: bytes.titleShellGzipBytes,
      staticShipBytes: MEASURED.staticShipBytes,
      criticalTransferGate: GATE.criticalTransferBytes,
      titleShellGate: GATE.titleShellGzipBytes,
    },
    screenshots: screenshots ? {
      cold: posixRel(root, screenshots.cold),
      warm: posixRel(root, screenshots.warm),
    } : null,
    summary: summarizeRuns(recorded),
    runs: recorded,
  };
}

function posixRel(root, file) {
  return path.relative(root, file).split(path.sep).join('/');
}

export async function smokeDist(dist) {
  const { server, port } = await serve(dist);
  const origin = `http://127.0.0.1:${port}`;
  const browser = await launchBrowser();
  try {
    const opened = await openPage(browser, origin, {
      throttle: false, cacheDisabled: true, condition: 'cold', cache: 'disabled',
    });
    const problems = requestProblems(opened.sample);
    const report = {
      schema: 'sproto-shooter.load-profile-smoke.v1',
      source: { baselineCommit: BASELINE_COMMIT, generatedFromCommit: gitRev(repoRoot()) },
      browser: { name: 'chromium', version: browser.version(), gl: 'swiftshader' },
      device: opened.sample.device,
      webgl: opened.sample.webgl,
      perf: opened.sample.perf,
      perfError: opened.sample.perfError,
      bootError: opened.sample.bootError,
      pageErrors: opened.sample.pageErrors,
      problems,
      hardwareTiming: { advisory: true, ciGate: false },
      firstPartyRequestCount: opened.sample.firstPartyRequestCount,
      waterfall: opened.sample.waterfall.map((entry) => ({
        path: entry.path,
        party: entry.party,
        status: entry.status,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        cached: entry.cached,
      })),
    };
    await opened.context.close();
    return report;
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function heapOf(sample) {
  const metrics = sample.metrics || {};
  const jsHeap = metrics.JSHeapUsedSize;
  return {
    jsHeapUsed: typeof jsHeap === 'number' ? jsHeap : null,
    documents: metrics.Documents ?? null,
    nodes: metrics.Nodes ?? null,
    jsEventListeners: metrics.JSEventListeners ?? null,
  };
}

/** Wall-clock heap sample of the live title. Not a CI gate. */
export async function soakDist(dist, { minutes = 20, sampleMs = 30000 } = {}) {
  const { server, port } = await serve(dist);
  const origin = `http://127.0.0.1:${port}`;
  const browser = await launchBrowser();
  const samples = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');
    await page.goto(`${origin}/?stats=1&seed=1`, { waitUntil: 'load', timeout: 90000 });
    await page.waitForSelector('#screen .title h1', { timeout: 30000 });
    const deadline = Date.now() + minutes * 60 * 1000;
    while (Date.now() <= deadline) {
      const metrics = await client.send('Performance.getMetrics');
      const row = Object.fromEntries((metrics.metrics || []).map((metric) => [metric.name, metric.value]));
      const perf = await page.evaluate(() => {
        const mem = performance.memory;
        return {
          heap: mem ? mem.usedJSHeapSize : null,
          pending: window.__sproto?.game?.renderer?.pendingDownloads?.() ?? null,
        };
      });
      samples.push({
        atMs: Date.now(),
        ...heapOf({ metrics: row }),
        performanceMemory: perf.heap,
        pendingDownloads: perf.pending,
      });
      if (Date.now() + sampleMs > deadline) break;
      await page.waitForTimeout(sampleMs);
    }
    await context.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  const heaps = samples.map((sample) => sample.jsHeapUsed).filter((value) => typeof value === 'number');
  const first = heaps[0] ?? null;
  const last = heaps[heaps.length - 1] ?? null;
  const max = heaps.length ? Math.max(...heaps) : null;
  return {
    minutes,
    sampleMs,
    samples: samples.length,
    jsHeapUsed: { first, last, max, growthBytes: first != null && last != null ? last - first : null },
    pendingDownloadsEnd: samples.length ? samples[samples.length - 1].pendingDownloads : null,
    series: samples,
  };
}

/** Cold navigation with the network cut, then the same page once the network is back. */
export async function netfailDist(dist) {
  const { server, port } = await serve(dist);
  const origin = `http://127.0.0.1:${port}`;
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    const client = await page.context().newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', {
      offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0,
    });
    let offlineError = null;
    try {
      await page.goto(`${origin}/?stats=1&seed=1`, { waitUntil: 'commit', timeout: 15000 });
    } catch (err) {
      offlineError = err instanceof Error ? err.message : String(err);
    }
    const offlineTitle = await page.locator('#screen .title h1').count();
    await client.send('Network.emulateNetworkConditions', {
      offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1,
    });
    await page.goto(`${origin}/?stats=1&seed=1`, { waitUntil: 'load', timeout: 90000 });
    let recovered = false;
    let recoverError = null;
    try {
      await page.waitForSelector('#screen .title h1', { timeout: 30000 });
      recovered = true;
    } catch (err) {
      recoverError = err instanceof Error ? err.message : String(err);
    }
    await client.send('Network.emulateNetworkConditions', {
      offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0,
    });
    const titleStillThere = await page.locator('#screen .title h1').count();
    let reloadFailed = false;
    try {
      await page.reload({ waitUntil: 'commit', timeout: 10000 });
    } catch {
      reloadFailed = true;
    }
    await context.close();
    return {
      offlineNavigationError: offlineError,
      offlineTitleCount: offlineTitle,
      recovered,
      recoverError,
      titleRemainedAfterLaterOffline: titleStillThere === 1,
      reloadWhileOfflineFailed: reloadFailed,
    };
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

async function main() {
  const root = repoRoot();
  const dist = path.join(root, 'dist');
  const check = process.argv.includes('--check');
  const netfail = process.argv.includes('--netfail');
  const soakIndex = process.argv.indexOf('--soak-minutes');
  const soakMinutes = soakIndex === -1 ? 0 : Number(process.argv[soakIndex + 1]);
  const runsIndex = process.argv.indexOf('--runs');
  const runs = runsIndex === -1 ? 3 : Number(process.argv[runsIndex + 1]);
  const outIndex = process.argv.indexOf('--out');
  const out = outIndex === -1
    ? (process.env.LOAD_PROFILE_OUT || (check
      ? '/tmp/sproto-load-profile-ci.json'
      : path.join(root, 'tests', 'fixtures', 'load-profile.json')))
    : process.argv[outIndex + 1];
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.error('dist/index.html missing. Run npm run build first.');
    process.exit(1);
  }
  if (netfail || soakMinutes > 0) {
    const runtime = {
      schema: 'sproto-shooter.runtime-profile.v1',
      source: { baselineCommit: BASELINE_COMMIT, generatedFromCommit: gitRev(root) },
      hardwareTiming: { advisory: true, ciGate: false },
    };
    if (netfail) runtime.networkFailure = await netfailDist(dist);
    if (soakMinutes > 0) runtime.memorySoak = await soakDist(dist, { minutes: soakMinutes });
    writeJson(out, runtime);
    console.log(`wrote ${out}`);
    if (runtime.networkFailure) {
      console.log(`network failure: offline=${runtime.networkFailure.offlineNavigationError ? 'blocked' : 'unexpected-commit'} recovered=${runtime.networkFailure.recovered}`);
    }
    if (runtime.memorySoak) {
      const heap = runtime.memorySoak.jsHeapUsed;
      console.log(`soak ${runtime.memorySoak.samples} samples heap first=${heap.first} last=${heap.last} max=${heap.max}`);
    }
    return;
  }
  if (check) {
    const fixturePath = path.join(root, 'tests', 'fixtures', 'load-profile.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    if (!fixture.runs || fixture.runs.length < 3 || fixture.gates?.frameTimings !== false) {
      console.error('committed load profile is missing >=3 runs or marks frame timings as a gate');
      process.exit(1);
    }
    const report = await smokeDist(dist);
    writeJson(out, report);
    if (report.problems.length) {
      console.error(report.problems.join('\n'));
      process.exit(1);
    }
    console.log(`load smoke ok (${report.problems.length} problems, perf frames ${report.perf?.frames ?? 'n/a'})`);
    return;
  }
  const screenshots = {
    cold: path.join(root, 'tests', 'fixtures', 'screenshots', 'title-cold.png'),
    warm: path.join(root, 'tests', 'fixtures', 'screenshots', 'title-warm.png'),
  };
  const profile = await profileDist({ dist, runs, screenshots });
  writeJson(out, profile);
  console.log(`wrote ${out} (${profile.runs.length} runs, cold p95 ${profile.summary.cold.perf.p95Ms} ms advisory)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
