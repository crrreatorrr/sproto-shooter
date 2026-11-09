import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { createDirector } from '../src/sim/pvp/director.js';
import { createLoopbackTable, createPvpClient, sampleSnapshots } from '../src/net/client.js';
import { encodeInput } from '../src/net/inputCodec.js';
import { CONTENT, OP, PROTOCOL, SIM_VERSION } from '../src/net/protocol.js';
import { INPUT_LIMITS, STALL_MS } from '../src/sim/pvp/rules.js';

function hello(id, extra = {}) {
  return { accountId: id, protocol: PROTOCOL, sim: SIM_VERSION, content: CONTENT, ...extra };
}

function wish(seq, frame, extra = {}) {
  return { seq, frame, yaw: 0.2, pitch: 0, moveX: 0, moveZ: 0, fire: false, slot: -1, ...extra };
}

function boot(now = 0) {
  const director = createDirector({ seed: 3, matchId: 'm' });
  const ada = director.hello({ presenceUserId: 'ada', sessionId: 'sa', body: hello('ada'), now });
  const bea = director.hello({ presenceUserId: 'bea', sessionId: 'sb', body: hello('bea'), now });
  expect(ada.ok).toBe(true);
  expect(bea.ok).toBe(true);
  expect(ada.seat).not.toBe(bea.seat);
  director.ready({ presenceUserId: 'ada', sessionId: 'sa', now });
  director.ready({ presenceUserId: 'bea', sessionId: 'sb', now });
  expect(director.phase).toBe('live');
  return director;
}

function send(director, who, packet, now) {
  const sessionId = who === 'ada' ? 'sa' : 'sb';
  return director.input({ presenceUserId: who, sessionId, packet, now });
}

describe('input rejection', () => {
  it('rejects the wrong sender, a stale session, and a third account', () => {
    const director = boot();
    expect(send(director, 'ada', wish(1, 0), 0).ok).toBe(true);
    expect(director.input({ presenceUserId: 'ada', sessionId: 'sb', packet: wish(2, 0), now: 0 }).reason).toBe('wrong_sender');
    expect(director.input({ presenceUserId: 'cy', sessionId: 'sc', packet: wish(1, 0), now: 0 }).reason).toBe('wrong_sender');
    director.hello({ presenceUserId: 'ada', sessionId: 'sa2', body: hello('ada'), now: 10 });
    expect(director.seatOf('ada')).toBe(0);
    expect(director.occupied()).toBe(2);
    expect(director.input({ presenceUserId: 'ada', sessionId: 'sa', packet: wish(2, 0), now: 10 }).reason).toBe('wrong_sender');
    expect(director.input({ presenceUserId: 'ada', sessionId: 'sa2', packet: wish(2, 0), now: 10 }).ok).toBe(true);
    const full = createDirector({ seed: 1, matchId: 'full' });
    full.hello({ presenceUserId: 'ada', sessionId: 'sa', body: hello('ada'), now: 0 });
    full.hello({ presenceUserId: 'ada', sessionId: 'other', body: hello('ada'), now: 0 });
    expect(full.occupied()).toBe(1);
    full.hello({ presenceUserId: 'bea', sessionId: 'sb', body: hello('bea'), now: 0 });
    expect(full.hello({ presenceUserId: 'cy', sessionId: 'sc', body: hello('cy'), now: 0 }).reason).toBe('match_full');
  });

  it('rejects NaN, a repeated sequence, a frame past the window, and too many frames', () => {
    const director = boot();
    expect(send(director, 'ada', wish(1, 0, { yaw: NaN }), 0).reason).toBe('nan');
    expect(send(director, 'ada', wish(1, 0, { moveX: NaN }), 0).reason).toBe('nan');
    expect(() => encodeInput({ seq: 1, frame: 0, yaw: 0, pitch: Infinity, moveX: 0, moveZ: 0 })).toThrow(/nan/);
    expect(send(director, 'ada', wish(1, 0), 0).ok).toBe(true);
    // Protocol 2: a sequence must rise, but gaps are fine.
    expect(send(director, 'ada', wish(1, 0), 0).reason).toBe('sequence');
    expect(send(director, 'ada', wish(3, 1), 0).ok).toBe(true);
    expect(send(director, 'ada', wish(2, 2), 0).reason).toBe('sequence');
    expect(send(director, 'ada', wish(4, 80), 0).reason).toBe('frame');
    expect(send(director, 'ada', wish(4, -1), 0).reason).toBe('frame');
    const ahead = director.sim.tick + INPUT_LIMITS.futureFrames;
    expect(send(director, 'ada', wish(4, ahead), 0).ok).toBe(true);
    expect(send(director, 'ada', wish(5, ahead + 1), 0).reason).toBe('frame');

    const rated = boot();
    let seq = 0;
    for (let n = 0; n < INPUT_LIMITS.maxFramesPerCursor; n++) {
      seq += 1;
      expect(send(rated, 'ada', wish(seq, n), 0).ok, `tick input ${n}`).toBe(true);
    }
    expect(send(rated, 'ada', wish(seq + 1, 7), 0).reason).toBe('rate');
  });

  it('cancels an unready lobby, forfeits one stall, and draws when both stall', () => {
    const solo = createDirector({ seed: 1, matchId: 'solo' });
    solo.hello({ presenceUserId: 'ada', sessionId: 'sa', body: hello('ada'), now: 0 });
    expect(solo.advance(30000).result).toMatchObject({ outcome: 'cancel', winner: null, reason: 'ready_timeout', ticketsMinted: 0 });

    const waiting = createDirector({ seed: 1, matchId: 'wait' });
    waiting.hello({ presenceUserId: 'ada', sessionId: 'sa', body: hello('ada'), now: 0 });
    waiting.hello({ presenceUserId: 'bea', sessionId: 'sb', body: hello('bea'), now: 0 });
    waiting.ready({ presenceUserId: 'ada', sessionId: 'sa', now: 0 });
    expect(waiting.advance(30000).result.reason).toBe('ready_timeout');

    // The stall clock starts at tick 0, after the lead-in.
    const both = boot(0);
    const start = both.liveStart;
    expect(start).toBeGreaterThan(0);
    expect(both.advance(start + STALL_MS - 1).result).toBeNull();
    expect(both.advance(start + STALL_MS).result).toMatchObject({ outcome: 'draw', winner: null, reason: 'both_stall', ticketsMinted: 0 });

    const one = boot(0);
    send(one, 'ada', wish(1, 0), 0);
    send(one, 'bea', wish(1, 0), 0);
    one.advance(5000);
    const cursor = one.sim.tick;
    expect(send(one, 'ada', wish(2, cursor), 9000).ok).toBe(true);
    expect(one.advance(one.liveStart + STALL_MS).result).toMatchObject({ outcome: 'forfeit', winner: 0, reason: 'stall', ticketsMinted: 0 });
  });

  it('ignores a client result and keeps version mismatches out', () => {
    const director = boot();
    const forged = director.handle({ userId: 'ada', sessionId: 'sa' }, OP.RESULT, JSON.stringify({ winner: 1 }), 0);
    expect(forged.reason).toBe('client_result');
    expect(director.result).toBeNull();
    expect(director.phase).toBe('live');
    const stale = createDirector({ seed: 9, matchId: 'ver' });
    expect(stale.hello({
      presenceUserId: 'ada', sessionId: 'sa', body: hello('ada', { protocol: 1 }), now: 0,
    }).reason).toBe('version');
    expect(stale.hello({
      presenceUserId: 'ada', sessionId: 'sa', body: hello('ada', { content: 'deadbeef' }), now: 0,
    }).reason).toBe('version');
    expect(stale.hello({
      presenceUserId: 'ada', sessionId: 'sa', body: hello('ada', { stake: 10 }), now: 0,
    }).reason).toBe('client_result');
    expect(stale.hello({
      presenceUserId: 'ada', sessionId: 'sa', body: hello('ada', { winner: 0 }), now: 0,
    }).reason).toBe('client_result');
    expect(stale.result).toBeNull();
  });
});

describe('client adapter', () => {
  it('interpolates snapshots and does not invent a winner', () => {
    const sample = sampleSnapshots([
      { tick: 0, phase: 'live', outcome: null, winner: null, players: [{ x: 0, y: 0, z: 0, yaw: 0, pitch: 0, hp: 1000 }] },
      { tick: 4, phase: 'live', outcome: null, winner: null, players: [{ x: 4, y: 0, z: 8, yaw: 0, pitch: 0, hp: 500 }] },
    ], 3);
    expect(sample.tick).toBe(1);
    expect(sample.players[0].x).toBeCloseTo(1);
    expect(sample.players[0].z).toBeCloseTo(2);
    expect(sample.players[0].hp).toBe(500);

    const director = createDirector({ seed: 4, matchId: 'loop' });
    let now = 0;
    const table = createLoopbackTable(director, () => now);
    const ada = createPvpClient({ accountId: 'ada', match: table.open('ada', 'sa') });
    const bea = createPvpClient({ accountId: 'bea', match: table.open('bea', 'sb') });
    ada.ready();
    bea.ready();
    for (let i = 0; i < 40; i++) {
      now += 34;
      table.advance(now);
      const view = ada.sample();
      if (ada.phase === 'live' && view && view.players) {
        ada.submit({ yaw: view.players[0].yaw, pitch: 0, moveZ: 1, fire: false, zoom: false, slot: 0 });
        bea.submit({ yaw: view.players[1].yaw, pitch: 0, moveZ: 1, fire: false, zoom: false, slot: 0 });
      }
    }
    expect(ada.phase).toBe('live');
    expect(ada.result).toBeNull();
    expect(bea.result).toBeNull();
    expect(ada.viewState(now).ticketsMinted).toBe(0);
    expect(ada.sample().players[0].x).not.toBe(ada.sample().players[1].x);
  });
});

describe('browser mock', () => {
  let server;
  let url;
  const shots = [];

  beforeAll(async () => {
    server = await createServer({ server: { port: 4187, strictPort: true }, logLevel: 'error' });
    await server.listen();
    url = server.resolvedUrls?.local?.[0] || 'http://127.0.0.1:4187/';
  }, 60000);

  afterAll(async () => {
    if (server) await server.close();
  });

  it('shows two clients, then the reconnect grace', async () => {
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
    } catch {
      execFileSync('npx', ['playwright', 'install', 'chromium'], { stdio: 'inherit' });
      browser = await chromium.launch({ headless: true });
    }
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const dir = '/opt/cursor/artifacts';
    fs.mkdirSync(dir, { recursive: true });
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-go="pvp"]', { timeout: 45000 });
      await page.click('[data-go="pvp"]');
      await page.waitForSelector('[data-pvp-lobby]');
      const lobby = path.join(dir, 'pvp-lobby.png');
      await page.screenshot({ path: lobby });
      shots.push(lobby);
      await page.click('[data-pvp-go="queue"]');
      await page.waitForSelector('text=No Tickets');
      await page.click('[data-pvp-go="mock"]');
      await page.waitForSelector('[data-pvp-mock]');
      await page.waitForSelector('[data-seat="0"] [data-pvp-ready]');
      const ready = path.join(dir, 'pvp-ready.png');
      await page.screenshot({ path: ready });
      shots.push(ready);
      await page.click('[data-seat="0"] [data-pvp-ready]');
      await page.click('[data-seat="1"] [data-pvp-ready]');
      await page.waitForSelector('[data-pvp-phase="live"]', { timeout: 10000 });
      await page.waitForFunction(() => {
        const tick = document.querySelector('[data-seat="0"]')?.dataset.pvpTick;
        return Number(tick) > 8;
      });
      const live = path.join(dir, 'pvp-live.png');
      await page.screenshot({ path: live });
      shots.push(live);
      await page.evaluate(() => window.__pvp.drop('bea'));
      await page.waitForSelector('[data-pvp-reconnect]:not([hidden])', { timeout: 10000 });
      const reconnect = path.join(dir, 'pvp-reconnect.png');
      await page.screenshot({ path: reconnect });
      shots.push(reconnect);
      const text = await page.locator('[data-pvp-reconnect]:not([hidden])').first().innerText();
      expect(text).toMatch(/Reconnecting/);
      expect(text).toMatch(/10s/);
      expect(text).toMatch(/No Tickets/);
      for (const file of shots) expect(fs.statSync(file).size).toBeGreaterThan(1000);
    } finally {
      await browser.close();
    }
  }, 120000);
});
