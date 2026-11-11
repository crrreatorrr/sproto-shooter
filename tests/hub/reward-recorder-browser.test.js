// Actual browser/Game integration. Synthetic controls and software GL; no human
// feel, frame pacing, isolated recorder cost or deployment capacity claim.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { decodeFrames } from '../../src/server/protocol.js';
import { verifyRun } from '../../src/server/verify.js';

let server, browser, url;
const evidenceDir = path.resolve('ci-artifacts/reward-recorder');
beforeAll(async () => {
  server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen(); url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  fs.mkdirSync(evidenceDir, { recursive: true });
}, 60000);
afterAll(async () => { if (browser) await browser.close(); if (server) await server.close(); });

it('rolls real Game frames, retains quota-failed evidence and refuses account/reload continuation', async () => {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__game, null, { timeout: 45000 });
    await page.addScriptTag({ type: 'module', content: `
      import { createRewardRecorder } from '/src/hub/campaignRewards/recorder.js';
      import { buildIssuance, buildIssuedState } from '/src/server/runContract.js';
      import { verifyStateHash } from '/src/sim/hash.js';
      import { DT } from '/src/sim/simulate.js';
      window.__recorderFixture = { createRewardRecorder, buildIssuance, buildIssuedState, verifyStateHash, DT };
    ` });
    await page.waitForFunction(() => !!window.__recorderFixture);
    const result = await page.evaluate(() => {
      const { createRewardRecorder, buildIssuance, buildIssuedState, verifyStateHash, DT } = window.__recorderFixture;
      const owner = { accountId: 'recorder-browser-account', runId: 'recorder-browser-run' };
      const recorder = createRewardRecorder({ enabled: true, ...owner,
        bufferLimits: { batchFrames: 2, maxFrames: 6 }, storageLimits: { maxBatches: 1 },
        acceptReceipt: (receipt) => receipt.testAuthenticated === true });
      const game = window.__game;
      game.crash.halted = true;
      game.input.buildCommand(game.state.tick);
      const built = buildIssuance({ ...owner, sessionId: 'recorder-browser-session', day: '2026-11-11', seed: 7, canonicalBoss: 'sahil' });
      if (!built.ok) throw new Error(built.reason);
      game.state = buildIssuedState(built.issuance);
      game.playing = true; game.paused = false; game.timeScale = 1; game.settings.hitstop = false;
      game.hideScreen(); game.input.setEnabled(true); game.input.dropAim();
      const player = game.state.players[game.state.localPlayerId];
      game.input.setLook(player.yaw, player.pitch);
      const observed = [], failures = [], recordMs = [], stepMs = [], batches = [];
      let renders = 0;
      const render = game.renderer.render.bind(game.renderer);
      game.renderer.render = (...args) => { renders++; return render(...args); };
      game.onSimCommand = (command, state) => observed.push({ tick: state.tick, command: structuredClone(command) });
      game.configureCanonicalRewardCommands({ enabled: true, record: (frame, tick) => {
        const start = performance.now();
        try { return recorder.record(frame, tick); } finally { recordMs.push(performance.now() - start); }
      }, onError: (error) => failures.push({ stage: error.stage, tick: error.tick, code: error.error.code }) });
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      let quotaCode = null;
      for (let i = 0; i < 7; i++) {
        const now = performance.now(); game.acc = 0; game.last = now - DT * 1000 - 0.001;
        const started = performance.now(); game.step(now); stepMs.push(performance.now() - started);
        if (i === 1) batches.push(recorder.finalizeNext({ tail: true }));
        if (i === 3) {
          try { recorder.finalizeNext({ tail: true }); } catch (error) { quotaCode = error.code; }
        }
      }
      const stopped = { tick: game.state.tick, hash: verifyStateHash(game.state), renders,
        status: { ...recorder.status(), failure: recorder.status().failure?.code } };
      let isolationCode;
      try { recorder.pending({ ...owner, accountId: 'other-account' }); } catch (error) { isolationCode = error.code; }
      const first = batches[0];
      let unconfirmedCode;
      try { recorder.acknowledge({ protocol: 2, runId: owner.runId, sequence: 0, tick0: 0, n: 2, status: 'received' }, owner); }
      catch (error) { unconfirmedCode = error.code; }
      recorder.acknowledge({ protocol: 2, runId: owner.runId, sequence: first.sequence,
        tick0: first.tick0, n: first.n, status: 'received', testAuthenticated: true }, owner);
      batches.push(recorder.finalizeNext());
      recorder.suspend();
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
      const gl = game.renderer.canvas.getContext('webgl2');
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return { sourceCommit: null, owner, issuance: built.issuance, stopped, batches, observed,
        failures, quotaCode, isolationCode, unconfirmedCode,
        recordMs, stepMs, renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown',
        afterDrain: { ...recorder.status(), failure: recorder.status().failure?.code } };
    });
    expect(errors).toEqual([]);
    expect(result.quotaCode).toBe('storage_quota');
    expect(result.isolationCode).toBe('identity_mismatch');
    expect(result.unconfirmedCode).toBe('unconfirmed_receipt');
    expect(result.stopped).toMatchObject({ tick: 4, renders: 7,
      status: { totalFrames: 4, retainedFrames: 4, readyBatches: 1, queuedBatches: 1, failure: 'storage_quota' } });
    expect(result.failures).toEqual([{ stage: 'recording', tick: 4, code: 'storage_quota' }]);
    expect(result.afterDrain).toMatchObject({ totalFrames: 4, retainedFrames: 2, readyBatches: 1,
      persistedBytes: 0, persistedBatches: 0, suspended: true, failure: 'storage_quota' });
    expect(result.batches.map((b) => [b.sequence, b.tick0, b.n])).toEqual([[0, 0, 2], [1, 2, 2]]);
    const commands = result.batches.flatMap((b) => decodeFrames(b.frames, b.n, b.actions).commands);
    expect(commands).toEqual(result.observed.slice(0, 4).map((r) => r.command));
    expect(commands[0].moveZ).not.toBe(0);
    const { accountId, sessionId, day, runId } = result.issuance;
    const actions = result.batches.flatMap((batch) => batch.actions.map(([offset, id]) => [batch.tick0 + offset, id]));
    const log = { v: 1, binding: { accountId, sessionId, day, runId }, segments: [{ i: 0, from: null, tick0: 0,
      n: 4, frames: result.batches.map((batch) => batch.frames).join(''), actions }] };
    const replay = verifyRun(log, { issuance: result.issuance });
    expect(replay).toMatchObject({ ok: true, outcome: 'incomplete', tick: 4, frames: 4, ticketsMinted: 0, stateHash: result.stopped.hash });
    await page.screenshot({ path: path.join(evidenceDir, 'quota-stopped-game.png') });
    // New browser document: this memory-only implementation cannot recover the
    // old tail, import checkpoints, guess a cursor or continue rewarded play.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.addScriptTag({ type: 'module', content: `
      import { createRewardRecorder } from '/src/hub/campaignRewards/recorder.js';
      import { canonicalCommand } from '/src/server/canonicalCommand.js';
      const recorder = createRewardRecorder({ enabled: true, accountId: 'recorder-browser-account', runId: 'recorder-browser-run' });
      let code;
      try { recorder.record(canonicalCommand({}).frame, 4); } catch (error) { code = error.code; }
      window.__reloadResult = { code, status: { ...recorder.status(), failure: recorder.status().failure?.code } };
    ` });
    await page.waitForFunction(() => !!window.__reloadResult);
    const reload = await page.evaluate(() => window.__reloadResult);
    expect(reload).toMatchObject({ code: 'tick_discontinuity', status: { totalFrames: 0, retainedFrames: 0,
      persistedBytes: 0, persistedBatches: 0 } });
    result.sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const metrics = { sourceCommit: result.sourceCommit, advisoryOnly: true,
      softwareGL: true, browser: browser.version(), renderer: result.renderer,
      method: '7 manual actual Game.step calls; 4 accepted frames then quota failure; DOM keyboard input',
      note: 'Tiny fault-case sample, instrumented software GL; no frame pacing, human feel, isolated cost, regression or capacity conclusion.',
      recordMs: result.recordMs, stepMs: result.stepMs };
    fs.writeFileSync(path.join(evidenceDir, 'recordings.json'), JSON.stringify({ ...result, reload }, null, 2));
    fs.writeFileSync(path.join(evidenceDir, 'cpu-advisory.json'), JSON.stringify(metrics, null, 2));
    expect(result.recordMs.every(Number.isFinite)).toBe(true);
    expect(result.stepMs.every(Number.isFinite)).toBe(true);
  } finally { await page.close(); }
}, 120000);
