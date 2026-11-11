// Real browser Game/input/render integration using synthetic device events.
// This is not a human recording, official-client attestation or GPU benchmark.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { decodeFrames } from '../../src/server/protocol.js';
import { verifyRun } from '../../src/server/verify.js';

const args = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];
const evidenceDir = path.resolve('ci-artifacts/canonical-client');
let server, browser, url;

beforeAll(async () => {
  server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen();
  const address = server.httpServer.address();
  url = `http://127.0.0.1:${address.port}/`;
  try { browser = await chromium.launch({ headless: true, args }); }
  catch {
    execFileSync('npx', ['playwright', 'install', 'chromium'], { stdio: 'inherit' });
    browser = await chromium.launch({ headless: true, args });
  }
  fs.mkdirSync(evidenceDir, { recursive: true });
}, 60000);

afterAll(async () => {
  if (browser) await browser.close();
  if (server) await server.close();
});

async function capture(canonical) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__game, null, { timeout: 45000 });
    // A browser module script avoids Vitest SSR rewriting import() inside the
    // function that Playwright serializes into a separate browser realm.
    await page.addScriptTag({ type: 'module', content: `
      import { buildIssuance, buildIssuedState } from '/src/server/runContract.js';
      import { verifyStateHash } from '/src/sim/hash.js';
      import { DT } from '/src/sim/simulate.js';
      window.__canonicalFixture = { buildIssuance, buildIssuedState, verifyStateHash, DT };
    ` });
    await page.waitForFunction(() => !!window.__canonicalFixture);
    const result = await page.evaluate(({ canonical }) => {
      const { buildIssuance, buildIssuedState, verifyStateHash, DT } = window.__canonicalFixture;
      const game = window.__game;
      const defaultOff = game.canonicalRewardRecorder === null;
      // Suspend only automatic scheduling. Manual calls below exercise the
      // actual Game.step, input poll/listeners, simulator, renderer and UI.
      game.crash.halted = true;
      game.input.buildCommand(game.state.tick); // Drain title startMode/debug actions before reward mode.
      const built = buildIssuance({ accountId: 'browser-fixture-account', sessionId: 'browser-fixture-session',
        day: '2026-11-11', runId: 'browser-client-input', seed: 7, canonicalBoss: 'sahil' });
      if (!built.ok) throw new Error(built.reason);
      game.state = buildIssuedState(built.issuance);
      game.playing = true; game.paused = false; game.timeScale = 1; game.settings.hitstop = false;
      game.hideScreen(); game.input.setEnabled(true); game.input.dropAim();
      const player = game.state.players[game.state.localPlayerId];
      game.input.setLook(player.yaw, player.pitch);
      // Test-only pointer-lock getter: physical pointer capture is unrelated to
      // command replay. Mouse events still go through the production listeners.
      Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => game.renderer.canvas });
      const pad = { id: 'Xbox standard synthetic fixture', mapping: 'standard', index: 0, connected: true,
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ value: 0, pressed: false, touched: false })), timestamp: 0 };
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
      const records = [], observed = [], failures = [];
      const cpu = { inputBuildMs: [], commandAndSimMs: [], frameMs: [] };
      const build = game.input.buildCommand.bind(game.input);
      game.input.buildCommand = (tick) => { const t = performance.now(); const cmd = build(tick); cpu.inputBuildMs.push(performance.now() - t); return cmd; };
      const apply = game.applyLocalCommand.bind(game);
      game.applyLocalCommand = (raw) => { const t = performance.now(); const done = apply(raw); cpu.commandAndSimMs.push(performance.now() - t); return done; };
      game.onSimCommand = (cmd, state) => observed.push({ tick: state.tick, device: game.input.device, command: structuredClone(cmd) });
      game.configureCanonicalRewardCommands({ enabled: canonical,
        record: (frame, tick) => { records.push({ tick, ...frame }); },
        onError: (failure) => failures.push({ tick: failure.tick, stage: failure.stage, message: String(failure.error?.message || failure.error) }) });
      const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
      key('keydown', 'KeyW');
      game.renderer.canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true }));
      const base = performance.now();
      for (let frame = 0; frame < 64; frame++) {
        pad.timestamp = frame;
        if (frame < 32) {
          const mouse = new MouseEvent('mousemove', { bubbles: true });
          Object.defineProperties(mouse, { movementX: { value: 12 }, movementY: { value: -5 } });
          document.dispatchEvent(mouse);
        }
        if (frame === 8) key('keydown', 'Space');
        if (frame === 9) key('keyup', 'Space');
        if (frame === 12) key('keydown', 'KeyF');
        if (frame === 13) key('keyup', 'KeyF');
        if (frame === 16) window.dispatchEvent(new WheelEvent('wheel', { deltaY: 1 }));
        if (frame === 32) {
          key('keyup', 'KeyW');
          window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
          pad.axes = [0.4, -0.6, 0.2, -0.15];
          pad.buttons[7] = { value: 1, pressed: true, touched: true }; // RT fire.
        }
        if (frame === 40) pad.buttons[0] = { value: 1, pressed: true, touched: true }; // A jump.
        if (frame === 42) pad.buttons[0] = { value: 0, pressed: false, touched: false };
        if (frame === 44) pad.buttons[3] = { value: 1, pressed: true, touched: true }; // Y swap.
        if (frame === 45) pad.buttons[3] = { value: 0, pressed: false, touched: false };
        const now = base + frame * DT * 1000;
        game.acc = 0; game.last = now - DT * 1000 - 0.001;
        const started = performance.now();
        if (!game.step(now)) throw new Error(`no actual simulation tick at frame ${frame}`);
        cpu.frameMs.push(performance.now() - started);
      }
      const gl = game.renderer.canvas.getContext('webgl2');
      const debug = gl?.getExtension('WEBGL_debug_renderer_info');
      const renderer = gl ? String(gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : null;
      return { canonical, defaultOff, issuance: built.issuance, records, observed, failures, cpu, renderer,
        finalTick: game.state.tick, finalHash: verifyStateHash(game.state), activeFailure: game.canonicalRewardFailure?.stage || null };
    }, { canonical });
    await page.screenshot({ path: path.join(evidenceDir, canonical ? 'canonical-scene.png' : 'raw-scene.png') });
    expect(errors).toEqual([]);
    return result;
  } finally { await page.close(); }
}

function cpuSummary(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  return { samples: values.length, averageMs: values.reduce((a, b) => a + b, 0) / values.length,
    p95Ms: sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)], maxMs: sorted[sorted.length - 1] };
}

describe('actual browser client input recording', () => {
  it('records real keyboard/mouse listeners and the gamepad polling path, then independently replays the bytes', async () => {
    const raw = await capture(false), rewarded = await capture(true);
    for (const run of [raw, rewarded]) {
      expect(run.defaultOff).toBe(true);
      expect(run.failures).toEqual([]);
      expect(run.activeFailure).toBeNull();
      expect(run.finalTick).toBe(64);
      expect(run.observed).toHaveLength(64);
      expect(run.observed.slice(0, 32).some((row) => row.device === 'kbm' && row.command.held.fire && row.command.moveZ === 1)).toBe(true);
      expect(run.observed.slice(32).some((row) => row.device === 'pad' && row.command.moveX > 0 && row.command.moveX < 1)).toBe(true);
      expect(run.observed.some((row) => row.command.pressed.jump)).toBe(true);
      expect(run.observed.some((row) => row.command.wheel === 1)).toBe(true);
      expect(run.observed[0].command.yaw).not.toBe(run.observed[31].command.yaw);
      for (const values of Object.values(run.cpu)) {
        expect(values).toHaveLength(64);
        expect(values.every((n) => Number.isFinite(n) && n >= 0)).toBe(true);
      }
    }
    expect(raw.records).toEqual([]);
    expect(rewarded.records).toHaveLength(64);
    for (let i = 0; i < rewarded.records.length; i++) {
      const record = rewarded.records[i];
      expect(record.tick).toBe(i);
      expect(decodeFrames(record.frames, 1, record.actions).commands[0]).toEqual(rewarded.observed[i].command);
    }
    const actions = rewarded.records.flatMap((record, offset) => record.actions.map(([at, action]) => [offset + at, action]));
    const { accountId, sessionId, day, runId } = rewarded.issuance;
    const log = { v: 1, binding: { accountId, sessionId, day, runId }, segments: [{ i: 0, from: null, tick0: 0,
      n: 64, frames: rewarded.records.map((record) => record.frames).join(''), actions }] };
    const receipt = verifyRun(log, { issuance: rewarded.issuance });
    expect(receipt).toMatchObject({ ok: true, outcome: 'incomplete', eligible: false, ticketsMinted: 0, tick: 64, frames: 64, stateHash: rewarded.finalHash });
    fs.writeFileSync(path.join(evidenceDir, 'recordings.json'), JSON.stringify({ raw, rewarded, replay: { log,
      stateHash: receipt.stateHash, outcome: receipt.outcome, ticketsMinted: receipt.ticketsMinted } }, null, 2));
    const metrics = { schema: 1, sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      browser: browser.version(), method: '64 manually scheduled real Game.step calls per phase; DOM keyboard/mouse and synthetic navigator.getGamepads',
      advisoryOnly: true, softwareGL: true, framePacingMeasured: false, humanControlFeelMeasured: false,
      note: 'CPU samples include test instrumentation and simulation/render/UI. They do not isolate canonicalization cost or establish performance regression/capacity claims.',
      raw: Object.fromEntries(Object.entries(raw.cpu).map(([key, values]) => [key, cpuSummary(values)])),
      canonical: Object.fromEntries(Object.entries(rewarded.cpu).map(([key, values]) => [key, cpuSummary(values)])),
      renderer: rewarded.renderer };
    fs.writeFileSync(path.join(evidenceDir, 'cpu-advisory.json'), JSON.stringify(metrics, null, 2));
    console.log('canonical client CPU advisory', JSON.stringify(metrics));
  }, 120000);
});
