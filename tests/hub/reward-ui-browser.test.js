// Actual Game/DOM flow, trusted mocked Hub transport. Short fault cases halt
// automatic RAF and manually call actual Game.step; only the named full failure
// case uses ordinary real RAF. None establish human control feel. Real service/retained
// artifact verification and the full real-wall Sahil clear are separate PR18.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { buildIssuance } from '../../src/server/runContract.js';
import { decodeFrames } from '../../src/server/protocol.js';
import { verifyRun } from '../../src/server/verify.js';
import { owner, session, ack, issued, sealed, snapshot } from './campaign-transport-fixtures.js';
let browser, onServer, offServer, onUrl, offUrl;
const dir = path.resolve('ci-artifacts/reward-ui');
const origin = 'https://campaign.example';
const glArgs = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];
beforeAll(async () => {
  const start = async (enabled) => {
    const server = await createServer({ logLevel: 'error', define: {
      'import.meta.env.VITE_SHOOTER_REWARDED': JSON.stringify(enabled ? 'true' : 'false'),
      'import.meta.env.VITE_NAKAMA_URL': JSON.stringify(origin),
    }, server: { host: '127.0.0.1', port: 0 } });
    await server.listen(); return [server, `http://127.0.0.1:${server.httpServer.address().port}`];
  };
  [onServer, onUrl] = await start(true); [offServer, offUrl] = await start(false);
  browser = await chromium.launch({ headless: true, args: glArgs }); fs.mkdirSync(dir, { recursive: true });
}, 60000);
afterAll(async () => { await browser?.close(); await onServer?.close(); await offServer?.close(); });

function dto(actor, runId, boss = 'sahil', seed = 7) {
  const now = Date.now(), day = new Date(now).toISOString().slice(0, 10);
  const built = buildIssuance({ ...actor, runId, canonicalBoss: boss, seed, day });
  if (!built.ok) throw new Error(built.reason);
  return issued({ runId, issuance: built.issuance, issuedAt: new Date(now).toISOString(),
    uploadDeadline: new Date(now + 2700000).toISOString(), sessionLeaseUntil: new Date(now + 1800000).toISOString() });
}
async function fixture({ enabled = true, holdIssue = false, offline = false, lostSeal = false, endOutcome = 'incomplete' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const url = enabled ? onUrl : offUrl, requests = [], errors = [], runs = new Map();
  let releaseIssue = null, currentActor = { ...owner }, serial = 10, sealLost = false;
  const cors = { 'Access-Control-Allow-Origin': url, 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'POST,OPTIONS' };
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route(origin + '/v2/rpc/**', async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: cors }); return; }
    const op = request.url().match(/run\.(issue|append|finish|status)/)[1], body = request.postDataJSON();
    requests.push({ op, body, wire: request.postData() });
    const respond = async (json) => route.fulfill({ json, headers: cors });
    if (op === 'issue') {
      let run = [...runs.values()].find((r) => r.key === body.key && r.actor.accountId === currentActor.accountId);
      if (!run) {
        const runId = `00000000-0000-4000-8000-${String(serial++).padStart(12, '0')}`;
        run = { actor: { ...currentActor }, key: body.key, dto: dto(currentActor, runId, body.canonicalBoss), batches: new Map(), seal: null };
        runs.set(runId, run);
      }
      if (holdIssue && !releaseIssue) await new Promise((resolve) => { releaseIssue = resolve; });
      await respond(run.dto); return;
    }
    const run = runs.get(body.runId);
    if (!run) { await respond({ state: 'invalid', reason: 'unknown_run' }); return; }
    if (op === 'append') {
      if (offline) { await route.abort('failed'); return; }
      run.batches.set(body.sequence, body); await respond(ack(body)); return;
    }
    const n = [...run.batches.values()].reduce((sum, b) => sum + b.n, 0), count = run.batches.size;
    if (op === 'finish') {
      run.seal ||= sealed(body.lastSequence, body.lastTick, { runId: body.runId, sealedAt: new Date().toISOString() });
      if (lostSeal && !sealLost) { sealLost = true; await route.abort('failed'); return; }
      await respond(run.seal); return;
    }
    const finished = !!run.seal;
    await respond({ ...snapshot(), runId: body.runId, state: finished ? 'terminal' : 'open', revision: finished && n ? 1 : 0,
      issuanceAck: run.dto, sealAck: run.seal,
      received: { sequence: count - 1, tick: n, bytes: n * 16, actions: 0, batches: count },
      verified: { sequence: finished ? count - 1 : -1, tick: finished ? n : 0, simulationTick: finished ? n : 0, bytes: finished ? n * 16 : 0, batches: finished ? count : 0 },
      terminal: finished ? { tick: n, outcome: endOutcome, canonicalBoss: run.dto.issuance.canonicalBoss } : null,
      payment: finished ? { state: 'ineligible', reason: 'ineligible' } : { state: 'none', reason: null },
      receivedAck: body.sequence === undefined ? null : run.batches.has(body.sequence) ? ack(run.batches.get(body.sequence)) : null,
    });
  });
  // Trusted fixture bootstraps the ordinary Game + HubLink constructor. It adds
  // no production seed/key or state-import hook. PR18 uses the real boot/service.
  await page.route(url + '/', (route) => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head>
    <link rel="stylesheet" href="/src/styles/game.css"></head><body><div id="app"><div id="view"></div><div id="ui"></div><div id="screen" hidden></div></div>
    <script type="module">
      import { Game } from '/src/game/Game.js'; import { HubLink } from '/src/hub/link.js';
      import { DT } from '/src/sim/simulate.js'; import { verifyStateHash } from '/src/sim/hash.js';
      window.__session = ${JSON.stringify(session())};
      const api = { getSession: () => window.__session, refreshSession: async () => {
        if (window.__holdRefresh) await new Promise((resolve) => { window.__releaseRefresh = resolve; });
        return window.__session;
      }, getTicketBalance: async () => ({ balance: 0 }), loadSave: async () => ({ data: null, updatedAt: 0 }),
        writeSave: async () => ({}), reportEvent: async () => ({}), exit: () => { window.__session = null; } };
      const hub = new HubLink(api); hub.adopt(window.__session, 'Fixture player');
      const game = new Game({ seed: 123, hub }); game.crash.halted = true;
      window.__uiFixture = { DT, verifyStateHash, hub };
      window.__switchIdentity = (next) => { window.__session = next; if (next) hub.adopt(next, 'Fixture player'); else { hub.dropIdentity(); hub.markOffline(); } };
      window.__stepUI = () => { const now = performance.now(); game.acc = 0; game.last = now - DT * 1000 - .001; return game.step(now); };
    </script></body></html>` }));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__uiFixture, null, { timeout: 45000 });
  return { page, requests, errors, runs,
    release: () => releaseIssue?.(),
    swap: async (extra) => { currentActor = { accountId: extra?.playerId || owner.accountId, sessionId: extra?.sid || owner.sessionId };
      await page.evaluate((next) => window.__switchIdentity(next), extra === null ? null : session(extra)); },
    close: async () => { releaseIssue?.(); await page.close(); } };
}
async function startFromUI(f) {
  await f.page.locator('[data-go="rewarded"]').click();
  await f.page.locator('[data-reward-start]').click();
  await f.page.waitForFunction(() => window.__game.rewardedCampaign.snapshot().active);
}

it('default-off keeps the reward entry/gate absent and ordinary casual/PvP controls available', async () => {
  const f = await fixture({ enabled: false });
  try {
    await expect(f.page.locator('[data-go="rewarded"]').count()).resolves.toBe(0);
    expect(await f.page.evaluate(() => window.__game.rewardedCampaign)).toBe(null);
    await f.page.locator('[data-go="waves"]').click();
    await f.page.evaluate(() => window.__stepUI());
    expect(await f.page.evaluate(() => window.__game.state.mode)).toBe('waves');
    await f.page.evaluate(() => window.__game.openPvp({ demo: true }));
    expect(await f.page.evaluate(() => ({ pvp: window.__game.pvpActive, gate: window.__game.canonicalRewardRecorder }))).toEqual({ pvp: true, gate: null });
    expect(f.requests).toEqual([]); expect(f.errors).toEqual([]);
  } finally { await f.close(); }
}, 90000);

it('actual UI drains old actions, records canonical play, pauses hidden/hitstop, blocks unsupported UI and requires explicit unranked continuation', async () => {
  const f = await fixture({ lostSeal: true });
  try {
    await f.page.evaluate(() => {
      const game = window.__game; game.queue({ type: 'debug', op: 'toggleGod' });
      game.timeScale = .2; game.feel.presentScale = .3; game.feel.hitstopMs = 200; game._skip = true;
      game.input.setLook(2.7, -.7); window.__observed = [];
      game.onSimCommand = (command, state) => {
        if (!game.rewardedCampaign.snapshot().active) return;
        if (state.tick === 0) window.__initialHash = window.__uiFixture.verifyStateHash(state);
        window.__observed.push({ tick: state.tick, command: structuredClone(command), frozen: Object.isFrozen(command) });
      };
    });
    await startFromUI(f);
    await f.page.keyboard.down('KeyW');
    await f.page.evaluate(() => { for (let i = 0; i < 6; i++) window.__stepUI(); });
    const before = await f.page.evaluate(() => ({ tick: window.__game.state.tick, hash: window.__uiFixture.verifyStateHash(window.__game.state),
      initial: window.__initialHash, commands: window.__observed, scale: window.__game.timeScale, feel: window.__game.feel.presentScale }));
    const run = [...f.runs.values()][0];
    expect(before).toMatchObject({ tick: 6, initial: run.dto.issuance.initialStateHash, scale: 1, feel: 1 });
    expect(before.commands[0].command.moveZ).not.toBe(0);
    expect(before.commands.every((row) => row.frozen && row.command.actions.length === 0)).toBe(true);
    await f.page.evaluate(() => { window.__game.feel.stop(200); window.__stepUI(); });
    expect(await f.page.evaluate(() => window.__game.state.tick)).toBe(6);
    await f.page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange')); window.__stepUI();
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange')); window.__game.feel.hitstopMs = 0;
    });
    expect(await f.page.evaluate(() => window.__game.state.tick)).toBe(6);
    await f.page.keyboard.press('KeyP'); await f.page.keyboard.press('Backquote'); await f.page.keyboard.press('KeyI');
    expect(await f.page.evaluate(() => ({ god: window.__game.state.tuning.godMode, gui: !!window.__game.gui, menu: window.__game.ui.menuOpen }))).toEqual({ god: false, gui: false, menu: false });
    await f.page.evaluate(() => {
      // Adversarial bypass of the UI boundary: never stripped or simulated.
      window.__game.input.queueAction({ type: 'debug', op: 'toggleGod' }); window.__stepUI();
    });
    await f.page.waitForSelector('[data-reward-panel]');
    expect(await f.page.evaluate(() => window.__game.state.tick)).toBe(6);
    expect(await f.page.locator('[data-reward-action="unranked"]').isVisible()).toBe(true);
    expect(await f.page.evaluate(() => !!window.__game.canonicalRewardFailure)).toBe(true);
    await f.page.locator('[data-reward-action="unranked"]').click();
    expect(await f.page.evaluate(() => ({ active: window.__game.rewardedCampaign.snapshot().active,
      gate: window.__game.canonicalRewardRecorder, scale: window.__game.timeScale, feel: window.__game.feel.presentScale }))).toEqual({ active: false, gate: null, scale: .2, feel: .3 });
    await f.page.evaluate(() => { window.__game.crash.halted = false; });
    await f.page.waitForFunction(() => window.__game.state.tick > 6);
    await expect.poll(() => f.requests.filter((r) => r.op === 'finish').length).toBe(1);
    await expect.poll(() => [...f.runs.values()][0].batches.size).toBe(1);
    await f.page.waitForFunction(() => window.__game.rewardedCampaign.snapshot().reminders > 0, null, { timeout: 15000 });
    const data = [...f.runs.values()][0], batches = [...data.batches.values()];
    expect(batches[0].n).toBe(6);
    const { accountId, sessionId, day, runId } = data.dto.issuance;
    const log = { v: 1, binding: { accountId, sessionId, day, runId }, segments: [{ i: 0, from: null, tick0: 0, n: 6, frames: batches[0].frames, actions: batches[0].actions }] };
    expect(verifyRun(log, { issuance: data.dto.issuance })).toMatchObject({ ok: true, outcome: 'incomplete', stateHash: before.hash, ticketsMinted: 0 });
    expect(decodeFrames(batches[0].frames, 6, batches[0].actions).commands).toEqual(before.commands.map((r) => r.command));
    await f.page.screenshot({ path: path.join(dir, 'explicit-unranked.png') });
    fs.writeFileSync(path.join(dir, 'ui-prefix.json'), JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), requests: f.requests, before, log }, null, 2));
    expect(f.errors).toEqual([]);
  } finally { await f.close(); }
}, 120000);

it('Back during a repeated start keeps one stable key, never installs late gameplay and seals only the empty cancelled run', async () => {
  const f = await fixture({ holdIssue: true });
  try {
    await f.page.locator('[data-go="rewarded"]').click();
    await f.page.evaluate(() => { const b = document.querySelector('[data-reward-start]'); b.click(); b.click(); });
    await expect.poll(() => f.requests.filter((r) => r.op === 'issue').length).toBe(1);
    const key = f.requests.find((r) => r.op === 'issue').body.key;
    await f.page.locator('[data-reward-action="back"]').click(); f.release();
    await f.page.waitForFunction(() => window.__game.rewardedCampaign.snapshot().pendingSlots === 0, null, { timeout: 15000 });
    const result = await f.page.evaluate(() => ({ view: window.__game.rewardedCampaign.snapshot(), seed: window.__game.state.seed,
      gate: window.__game.canonicalRewardRecorder, enabled: window.__game.input.enabled }));
    expect(result).toMatchObject({ seed: 123, gate: null, enabled: true, view: { active: false, reminders: 1 } });
    expect(f.requests.filter((r) => r.op === 'issue').map((r) => r.body.key)).toEqual([key]);
    expect(f.requests.filter((r) => r.op === 'append')).toHaveLength(0);
    expect(f.requests.find((r) => r.op === 'finish').body).toMatchObject({ lastSequence: -1, lastTick: 0 });
    expect(f.errors).toEqual([]);
  } finally { await f.close(); }
}, 90000);

it('login interruption before issuance and transient account switch during issuance cannot install a stale world', async () => {
  const f = await fixture({ holdIssue: true });
  try {
    await f.page.locator('[data-go="rewarded"]').click();
    await f.page.evaluate(() => { window.__holdRefresh = true; });
    await f.page.locator('[data-reward-start]').click();
    await f.swap(null); await f.page.evaluate(() => window.__releaseRefresh());
    await f.page.waitForFunction(() => !window.__game.rewardedCampaign.startBusy);
    expect(f.requests.filter((r) => r.op === 'issue')).toHaveLength(0);
    await f.swap({}); await f.page.locator('[data-reward-action="back"]').click();
    await f.page.evaluate(() => { window.__holdRefresh = false; });
    await f.page.locator('[data-go="rewarded"]').click(); await f.page.locator('[data-reward-start]').click();
    await expect.poll(() => f.requests.filter((r) => r.op === 'issue').length).toBe(1);
    await f.swap({ playerId: owner.runId, sid: owner.accountId }); await f.swap({}); f.release();
    await f.page.waitForFunction(() => !window.__game.rewardedCampaign.startBusy);
    expect(await f.page.evaluate(() => ({ seed: window.__game.state.seed, active: window.__game.rewardedCampaign.snapshot().active,
      gate: window.__game.canonicalRewardRecorder }))).toEqual({ seed: 123, active: false, gate: null });
    await f.page.locator('[data-reward-action="check"]').click();
    await expect.poll(() => f.requests.filter((r) => r.op === 'status').length).toBeGreaterThan(0);
    expect(await f.page.evaluate(() => window.__game.rewardedCampaign.snapshot().active)).toBe(false);
    expect(f.requests.filter((r) => r.op === 'append')).toHaveLength(0);
    expect(f.errors).toEqual([]);
  } finally { await f.close(); }
}, 90000);

it('keeps native keyboard focus inside the reward dialog and leaves normal menus usable after closing', async () => {
  const f = await fixture();
  try {
    await f.page.locator('[data-go="rewarded"]').click();
    await f.page.locator('[data-reward-boss]').focus(); await f.page.keyboard.press('ArrowDown');
    expect(await f.page.locator('[data-reward-boss]').inputValue()).toBe('obama');
    await f.page.keyboard.press('Escape');
    expect(await f.page.locator('[data-go="waves"]').isVisible()).toBe(true);
    await f.page.locator('[data-go="waves"]').click(); await f.page.evaluate(() => window.__stepUI());
    expect(await f.page.evaluate(() => window.__game.input.enabled)).toBe(true);
    expect(f.requests).toEqual([]); expect(f.errors).toEqual([]);
  } finally { await f.close(); }
}, 90000);


it('two unresolved accounts bound retained input globally and a third start cannot evict their proof', async () => {
  const f = await fixture({ offline: true });
  try {
    await startFromUI(f);
    await f.page.evaluate(() => { for (let i = 0; i < 4; i++) window.__stepUI(); window.__game.rewardedCampaign.open(); });
    await f.page.locator('[data-reward-action="back"]').click();
    await f.swap({ playerId: owner.runId, sid: '00000000-0000-4000-8000-000000000200' });
    await startFromUI(f);
    await f.page.evaluate(() => { for (let i = 0; i < 4; i++) window.__stepUI(); window.__game.rewardedCampaign.open(); });
    await f.page.locator('[data-reward-action="back"]').click();
    await f.swap({ playerId: '00000000-0000-4000-8000-000000000300', sid: '00000000-0000-4000-8000-000000000301' });
    await f.page.locator('[data-go="rewarded"]').click();
    expect(await f.page.locator('[data-reward-start]').isDisabled()).toBe(true);
    expect(await f.page.evaluate(() => window.__game.rewardedCampaign.snapshot())).toMatchObject({ pendingSlots: 2, active: false, runId: null, recordedTick: 0 });
    const count = f.requests.filter((r) => r.op === 'issue').length;
    await f.page.evaluate(() => window.__game.rewardedCampaign.start('sahil'));
    expect(f.requests.filter((r) => r.op === 'issue')).toHaveLength(count);
    expect(count).toBe(2); expect(f.errors).toEqual([]);
  } finally { await f.close(); }
}, 120000);

it('real-rAF full frozen1001-tick failure stops the actual Game at its first local candidate and never claims paid', async () => {
  const frozen = JSON.parse(fs.readFileSync('tests/fixtures/replay-corpus/sahil-fail-7.json', 'utf8'));
  const f = await fixture({ endOutcome: 'fail' });
  try {
    await f.page.addScriptTag({ type: 'module', content: `
      import { decodeFrames } from '/src/server/protocol.js'; window.__decodeRewardTrace = decodeFrames;
    ` });
    await f.page.evaluate((log) => {
      const commands = log.segments.flatMap((segment) => window.__decodeRewardTrace(segment.frames, segment.n, segment.actions).commands);
      const g = window.__game, original = g.input.buildCommand.bind(g.input);
      g.input.buildCommand = (tick) => {
        if (!g.rewardedCampaign.snapshot().recording) return original(tick);
        if (!commands[tick]) throw new Error('frozen trace exhausted before local end');
        return commands[tick]; // readonly legal input provider, before canonicalization
      };
    }, frozen.log);
    await startFromUI(f);
    await f.page.evaluate(() => { window.__runWallStart = performance.now(); window.__game.crash.halted = false; });
    await f.page.waitForFunction(() => window.__game.rewardedCampaign.snapshot().phase === 'ended', null, { timeout: 90000 });
    const result = await f.page.evaluate(() => ({ tick: window.__game.state.tick,
      hash: window.__uiFixture.verifyStateHash(window.__game.state), wallMs: performance.now() - window.__runWallStart,
      view: window.__game.rewardedCampaign.snapshot() }));
    expect(result.tick).toBe(1001); expect(result.hash).toBe(frozen.expected.stateHash);
    // Actual scheduling at real wall cadence, never accelerated authoritative dt.
    expect(result.wallMs).toBeGreaterThanOrEqual((1001 - 120) / 60 * 1000);
    await f.page.waitForTimeout(100);
    expect(await f.page.evaluate(() => window.__game.state.tick)).toBe(1001);
    await expect.poll(() => f.requests.filter((r) => r.op === 'finish').length, { timeout: 15000 }).toBe(1);
    const run = [...f.runs.values()][0], batches = [...run.batches.values()].sort((a, b) => a.sequence - b.sequence);
    expect(batches.reduce((n, b) => n + b.n, 0)).toBe(1001);
    expect(batches.map((b) => b.frames).join('')).toBe(frozen.log.segments.map((s) => s.frames).join(''));
    expect(await f.page.locator('[data-reward-title]').textContent()).not.toContain('paid');
    fs.writeFileSync(path.join(dir, 'full-failure-ui.json'), JSON.stringify({ sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      note: 'Actual Game/real-rAF frozen failure trace; mocked service. PR18 supplies real Hub/retained05f oracle and full9634 clear.',
      result, requests: f.requests, expected: frozen.expected }, null, 2));
    expect(f.errors).toEqual([]);
  } finally { await f.close(); }
}, 120000);
