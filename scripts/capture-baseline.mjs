// B-M0 temporary CDP measurement harness; does not modify game source or mechanics.
// Run against a production build: npm run build && node scripts/capture-baseline.mjs
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir, cpus, platform, release } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { summarizeFrames, summarizeNetwork } from './baseline-metrics.mjs';

const out = 'docs/baseline';
await mkdir(out, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), 'sproto-baseline-'));
const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], { stdio: 'inherit' });
let chrome, socket;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function poll(fn, label, timeout = 90000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { const value = await fn(); if (value) return value; } catch { /* wait for startup */ }
    await delay(100);
  }
  throw new Error(`Timed out: ${label}`);
}
try {
  await poll(async () => (await fetch('http://127.0.0.1:4174')).ok, 'preview');
  chrome = spawn(process.env.CHROME_BIN || 'google-chrome', [
    '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--mute-audio',
    '--remote-debugging-port=9223', `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  let launchError;
  chrome.on('error', (e) => { launchError = e; });
  const tabs = await poll(async () => {
    if (launchError) throw launchError;
    const t = await (await fetch('http://127.0.0.1:9223/json')).json();
    return t.some((x) => x.type === 'page') && t;
  }, 'Chrome CDP');
  socket = new WebSocket(tabs.find((x) => x.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let seq = 0;
  const pending = new Map(), requests = new Map();
  let responses = [], errors = [];
  socket.addEventListener('message', ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.id) {
      const p = pending.get(msg.id); if (!p) return;
      pending.delete(msg.id); clearTimeout(p.timer);
      if (msg.error) p.reject(new Error(JSON.stringify(msg.error))); else p.resolve(msg.result);
    }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
    if (msg.method === 'Network.responseReceived') {
      const r = msg.params.response;
      requests.set(msg.params.requestId, { url: r.url, status: r.status });
      if (r.status >= 400) errors.push({ url: r.url, status: r.status });
    }
    if (msg.method === 'Network.loadingFinished') {
      const r = requests.get(msg.params.requestId);
      if (r) responses.push({ ...r, bytes: msg.params.encodedDataLength });
    }
    if (msg.method === 'Network.loadingFailed' && !msg.params.canceled) errors.push(msg.params);
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++seq;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 120000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 800, height: 450, deviceScaleFactor: 1, mobile: false });
  async function load(query) {
    responses = []; errors = []; requests.clear();
    await send('Page.navigate', { url: `http://127.0.0.1:4174/?seed=123&${query}` });
    await poll(() => evaluate('Boolean(window.__game && window.__game.state.tick > 2)'), 'game ticks');
    await poll(() => evaluate('window.__game.renderer.pendingDownloads() === 0'), 'assets');
    await delay(1000);
  }
  async function screenshot(name) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(out, `${name}.png`), Buffer.from(shot.data, 'base64'));
  }
  async function sample() {
    return evaluate(`new Promise(resolve => {
      const frames = []; let last; const start = performance.now();
      function frame(t) {
        if (last !== undefined) frames.push(t-last); last=t;
        if (t-start < 8000) requestAnimationFrame(frame);
        else { const g=window.__game, i=g.renderer.info(); resolve({frames, calls:i.render.calls, triangles:i.render.triangles, programs:i.programs.length, textures:i.memory.textures, geometries:i.memory.geometries, enemies:g.state.enemies.filter(e=>!e.dead).length, pendingDownloads:g.renderer.pendingDownloads(), tick:g.state.tick, renderer:g.renderer.canvas.getContext('webgl2').getParameter(7937)}); }
      } requestAnimationFrame(frame);
    })`);
  }
  await load('');
  await screenshot('title');
  const titleNetwork = summarizeNetwork(responses);
  if (errors.length) throw new Error(`Title errors: ${JSON.stringify(errors)}`);
  await load('mode=waves');
  const wave1Network = summarizeNetwork(responses);
  await screenshot('wave1');
  if (errors.length) throw new Error(`Wave errors: ${JSON.stringify(errors)}`);
  await load('mode=sandbox&debug=1');
  await evaluate(`(() => { const g=window.__game;
    g.queue({type:'debug',op:'setTuning',args:{key:'godMode',value:true}});
    g.queue({type:'debug',op:'setTuning',args:{key:'freezeEnemies',value:true}});
    g.queue({type:'debug',op:'clearEnemies'});
    for(let i=0;i<6;i++) g.queue({type:'debug',op:'spawnEnemy',args:{type:'midget',count:10,tier:1}});
    g.input.setLook(0,-0.05);
  })()`);
  await poll(() => evaluate('window.__game.state.enemies.filter(e=>!e.dead).length === 60 && window.__game.renderer.pendingDownloads() === 0'), '60 midgets');
  await delay(2000);
  const stress = await sample();
  if (stress.enemies !== 60) throw new Error(`Expected 60 midgets, got ${stress.enemies}`);
  await screenshot('stress-60-midgets');
  if (errors.length) throw new Error(`Stress errors: ${JSON.stringify(errors)}`);
  const { frames, ...counts } = stress;
  const chunks = [];
  for (const dir of ['assets','build']) {
    for (const name of await readdir(`dist/${dir}`).catch(() => [])) {
      if (!/\.(js|css)$/.test(name)) continue;
      const b = await readFile(`dist/${dir}/${name}`);
      chunks.push({ path: `${dir}/${name}`, bytes: b.length, gzipBytes: gzipSync(b).length });
    }
  }
  const report = { commit: execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(), capturedAt: new Date().toISOString(), environment: {node:process.version, platform:platform(), release:release(), cpu:cpus()[0].model, chrome:execFileSync(process.env.CHROME_BIN || 'google-chrome',['--version'],{encoding:'utf8'}).trim(), viewport:[800,450], gpu:'SwiftShader'}, chunks, titleNetwork, wave1Network, stress: {...counts,...summarizeFrames(frames)}, errors };
  await writeFile(join(out,'metrics.json'), JSON.stringify(report,null,2)+'\n');
  console.log('BASELINE_RESULT\n'+JSON.stringify(report,null,2));
} finally {
  socket?.close(); chrome?.kill(); preview.kill();
  await Promise.all([chrome,preview].filter(Boolean).map(p => p.exitCode !== null ? Promise.resolve() : new Promise(resolve => {p.once('exit',resolve); setTimeout(resolve,3000).unref();})));
  await rm(profile, { recursive: true, force: true });
}
