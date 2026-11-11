// Actual browser Game + native fetch, mocked exact Hub PR07 responses. This
// does not establish real Nakama integration, server authority or control feel.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { decodeFrames } from '../../src/server/protocol.js';
import { verifyRun } from '../../src/server/verify.js';
import { owner, ack, snapshot, issued, sealed } from './campaign-transport-fixtures.js';
let server, browser, url;
const evidenceDir = path.resolve('ci-artifacts/campaign-transport');
beforeAll(async () => {
  server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
  await server.listen(); url = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  fs.mkdirSync(evidenceDir, { recursive: true });
}, 60000);
afterAll(async () => { if (browser) await browser.close(); if (server) await server.close(); });

it('keeps real input/render alive during lost native response, recovers bytes, bounds pressure and ignores logout completion', async () => {
  const page = await browser.newPage();
  const errors = [], requests = [], committed = new Map();
  let releaseFirst, releaseLogout, first = true, firstSeal = true, retrySecond = true, expired = false, holdLogout = false;
  const issuanceDto = issued(); let sealDto = null;
  const serverStatus = (body) => {
    const batches = [...committed.values()];
    const end = batches.reduce((n, b) => n + b.n, 0);
    return snapshot({ state: expired ? 'expired' : sealDto ? 'sealed' : 'open', revision: end ? 1 : 0,
      issuanceAck: issuanceDto, sealAck: sealDto,
      received: { sequence: batches.length - 1, tick: end, bytes: end * 16, actions: 0, batches: batches.length },
      verified: { sequence: -1, tick: end ? 1 : 0, simulationTick: end ? 1 : 0, bytes: end ? 16 : 0, batches: 0 },
      authorization: expired ? 'session_expired' : 'live',
      payment: expired ? { state: 'authorization_denied', reason: 'session_expired' } : { state: 'none', reason: null },
      receivedAck: body.sequence === undefined ? null : committed.has(body.sequence) ? ack(committed.get(body.sequence)) : null });
  };
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(/\/v2\/rpc\/shooter\.run\.(append|status|issue|finish)\?unwrap=true$/, async (route) => {
    const request = route.request(), body = request.postDataJSON();
    const operation = request.url().match(/run\.(append|status|issue|finish)/)[1];
    requests.push({ operation, wire: request.postData() });
    if (operation === 'issue') { await route.fulfill({ json: issuanceDto }); return; }
    if (operation === 'finish') {
      sealDto ||= sealed(body.lastSequence, body.lastTick, { sealedAt: '2026-11-11T00:00:02.250Z' });
      if (firstSeal) { firstSeal = false; await route.abort('failed'); return; }
      await route.fulfill({ json: sealDto }); return;
    }
    if (operation === 'append') {
      if (body.sequence === 1 && retrySecond) {
        retrySecond = false;
        await route.fulfill({ json: { state: 'pending_retryable', reason: 'too_fast', retryAfterMs: 1000 } }); return;
      }
      committed.set(body.sequence, body);
      if (first) {
        first = false;
        await new Promise((resolve) => { releaseFirst = resolve; });
        await route.abort('failed'); return; // server committed, reply lost
      }
      await route.fulfill({ json: ack(body) }); return;
    }
    if (holdLogout) {
      await new Promise((resolve) => { releaseLogout = resolve; });
      // Deliberately malformed adversarial noise, not a valid Hub fixture.
      // It must be ignored before parsing after logout.
      try { await route.fulfill({ json: { ...serverStatus(body), payment: { state: 'paid', tickets: 20 } } }); } catch { /* native request was cancelled */ }
      return;
    }
    await route.fulfill({ json: serverStatus(body) });
  });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__game, null, { timeout: 45000 });
    await page.addScriptTag({ type: 'module', content: `
      import { createCampaignIssuer } from '/src/hub/campaignRewards/transport.js';
      import { createCampaignController } from '/src/hub/campaignRewards/controller.js';
      import { buildIssuedState } from '/src/server/runContract.js';
      import { verifyStateHash } from '/src/sim/hash.js';
      import { DT } from '/src/sim/simulate.js';
      window.__networkFixture = { createCampaignIssuer, createCampaignController, buildIssuedState, verifyStateHash, DT };
    ` });
    await page.waitForFunction(() => !!window.__networkFixture);
    await page.evaluate(async ({ owner, url }) => {
      const { createCampaignIssuer, createCampaignController, buildIssuedState, DT } = window.__networkFixture;
      const token = 'header.' + btoa(JSON.stringify({ uid: owner.accountId,
        vrs: { scope: 'game', game: 'sproto-shooter', sid: owner.sessionId } })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_') + '.signature';
      const session = { token, playerId: owner.accountId, game: 'sproto-shooter' };
      const api = createCampaignIssuer({ enabled: true, ...owner, key: 'browser-issue-key', canonicalBoss: 'sahil',
        serverUrl: url, getSession: () => session });
      const issuanceAck = await api.issue(); const binding = await api.bindIssued(issuanceAck);
      window.__networkEpoch = Date.parse(issuanceAck.issuedAt);
      window.__networkClock = window.__networkEpoch + 1000;
      const controller = createCampaignController({ enabled: true, transport: binding.transport, uploadDeadlineMs: Date.parse(issuanceAck.uploadDeadline),
        now: () => window.__networkClock, random: () => 0,
        recorderOptions: { bufferLimits: { batchFrames: 2, maxFrames: 6 } } });
      const game = window.__game;
      game.crash.halted = true; game.input.buildCommand(game.state.tick);
      game.state = buildIssuedState(issuanceAck.issuance);
      game.playing = true; game.paused = false; game.timeScale = 1; game.settings.hitstop = false;
      game.hideScreen(); game.input.setEnabled(true); game.input.dropAim();
      const player = game.state.players[game.state.localPlayerId]; game.input.setLook(player.yaw, player.pitch);
      const observed = [], failures = [], recordMs = [], stepMs = [];
      let renders = 0; const render = game.renderer.render.bind(game.renderer);
      game.renderer.render = (...args) => { renders++; return render(...args); };
      game.onSimCommand = (command, state) => observed.push({ tick: state.tick, command: structuredClone(command) });
      game.configureCanonicalRewardCommands({ enabled: true, record: (frame, tick) => {
        const before = performance.now(); try { return controller.record(frame, tick); }
        finally { recordMs.push(performance.now() - before); }
      }, onError: (failure) => failures.push({ tick: failure.tick, stage: failure.stage, code: failure.error.code }) });
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      window.__manualStep = () => {
        const now = performance.now(); game.acc = 0; game.last = now - DT * 1000 - 0.001;
        const before = performance.now(); game.step(now); stepMs.push(performance.now() - before);
      };
      window.__controller = controller;
      window.__capture = { issuance: issuanceAck.issuance, issuanceAck, observed, failures, recordMs, stepMs,
        get renders() { return renders; } };
      for (let i = 0; i < 3; i++) window.__manualStep();
      window.__pendingPump = controller.pump();
    }, { owner, url });
    await expect.poll(() => requests.filter((r) => r.operation === 'append').length).toBe(1);
    const waiting = await page.evaluate(() => {
      for (let i = 0; i < 4; i++) window.__manualStep();
      return { tick: window.__game.state.tick, renders: window.__capture.renders, state: window.__controller.status(), failures: window.__capture.failures };
    });
    expect(waiting).toMatchObject({ tick: 6, renders: 7, state: { busy: true,
      recorder: { totalFrames: 6, retainedFrames: 6 }, recordingStopped: 'buffer_pressure' },
      failures: [{ tick: 6, stage: 'recording', code: 'buffer_pressure' }] });
    releaseFirst();
    await page.evaluate(() => window.__pendingPump);
    const recovered = await page.evaluate(async () => {
      window.__networkClock = window.__networkEpoch + 1250; await window.__controller.pump();
      window.__controller.flushTail(); return window.__controller.status();
    });
    expect(recovered).toMatchObject({ accepted: { sequence: 0, tick: 2 },
      progress: { verified: { sequence: -1, tick: 1 }, payment: { state: 'none' } }, recorder: { retainedFrames: 4 } });
    await page.evaluate(() => window.__controller.pump()); // too_fast for seq1
    const beforeMinimum = requests.length;
    await page.evaluate(async () => { window.__networkClock = window.__networkEpoch + 2249; await window.__controller.pump(); });
    expect(requests).toHaveLength(beforeMinimum);
    await page.evaluate(async () => {
      window.__networkClock = window.__networkEpoch + 2250; await window.__controller.pump(); await window.__controller.pump();
    });
    const allReceived = await page.evaluate(() => window.__controller.status());
    expect(allReceived).toMatchObject({ accepted: { sequence: 2, tick: 6 }, recorder: { totalFrames: 6, retainedFrames: 0 } });
    const secondWires = requests.filter((r) => r.operation === 'append' && JSON.parse(r.wire).sequence === 1).map((r) => r.wire);
    expect(secondWires).toHaveLength(2); expect(secondWires[0]).toBe(secondWires[1]);
    const unknownSeal = await page.evaluate(async () => {
      window.__controller.finish(); await window.__controller.pump(); return window.__controller.status();
    });
    expect(unknownSeal).toMatchObject({ finishRequested: true, sealUnknown: true, sealAck: null });
    const recoveredSeal = await page.evaluate(async () => {
      window.__networkClock = window.__networkEpoch + 2500; await window.__controller.pump(); return window.__controller.status();
    });
    expect(recoveredSeal).toMatchObject({ sealAck: { state: 'sealed', lastSequence: 2, lastTick: 6 },
      progress: { payment: { state: 'none' } } });
    expect(requests.filter((r) => r.operation === 'finish')).toHaveLength(1);
    expired = true;
    const denied = await page.evaluate(async () => { window.__networkClock = Date.parse(window.__capture.issuanceAck.uploadDeadline); await window.__controller.pump({ poll: true }); return window.__controller.status(); });
    expect(denied).toMatchObject({ sealAck: { state: 'sealed' }, progress: { authorization: 'session_expired',
      payment: { state: 'authorization_denied', reason: 'session_expired' } } });
    holdLogout = true;
    const beforeLogout = requests.length;
    await page.evaluate(() => { window.__pendingLogout = window.__controller.pump({ poll: true }); });
    await expect.poll(() => requests.length).toBe(beforeLogout + 1);
    await page.evaluate(() => window.__controller.stop('logout'));
    releaseLogout(); await page.evaluate(() => window.__pendingLogout);
    const capture = await page.evaluate(() => {
      const { verifyStateHash } = window.__networkFixture;
      return { ...window.__capture, state: window.__controller.status(), tick: window.__game.state.tick,
        hash: verifyStateHash(window.__game.state), renderer: window.__game.renderer.canvas.getContext('webgl2')?.getParameter(0x1F01) };
    });
    expect(capture.state).toMatchObject({ paused: true, problem: 'logout', progress: { payment: { state: 'authorization_denied' } } });
    expect(capture.tick).toBe(6); expect(errors).toEqual([]);
    const batches = [...committed.values()].sort((a, b) => a.sequence - b.sequence);
    const commands = batches.flatMap((b) => decodeFrames(b.frames, b.n, b.actions).commands);
    expect(commands).toEqual(capture.observed.slice(0, 6).map((o) => o.command));
    expect(commands[0].moveZ).not.toBe(0);
    const { accountId, sessionId, day, runId } = capture.issuance;
    const log = { v: 1, binding: { accountId, sessionId, day, runId }, segments: [{ i: 0, from: null, tick0: 0,
      n: 6, frames: batches.map((b) => b.frames).join(''), actions: [] }] };
    expect(verifyRun(log, { issuance: capture.issuance })).toMatchObject({ ok: true, outcome: 'incomplete', tick: 6, stateHash: capture.hash, ticketsMinted: 0 });
    const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    await page.screenshot({ path: path.join(evidenceDir, 'network-pressure.png') });
    fs.writeFileSync(path.join(evidenceDir, 'recordings.json'), JSON.stringify({ sourceCommit, requests, batches, capture, waiting, recovered, unknownSeal, recoveredSeal, denied }, null, 2));
    fs.writeFileSync(path.join(evidenceDir, 'cpu-advisory.json'), JSON.stringify({ sourceCommit, advisoryOnly: true,
      browser: browser.version(), softwareGL: true, method: '7 manual actual Game.step calls while native append reply was held/dropped; mocked Hub responses',
      note: 'Tiny instrumented fault-case sample; no frame pacing, isolated cost, human feel, regression or capacity conclusion.',
      recordMs: capture.recordMs, stepMs: capture.stepMs }, null, 2));
  } finally { releaseFirst?.(); releaseLogout?.(); await page.close(); }
}, 120000);
