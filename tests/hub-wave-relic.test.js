import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHubSdk, memoryKeyValue, mintMockTicket } from '@metaverse/hub-sdk';
import { HUB_GAME_ID } from '../src/hub/config.js';
import { HubLink, WAVE_CLEAR_EVENT, connectHub } from '../src/hub/link.js';
import { createWaveRelicReporter, relicName } from '../src/hub/waveRelic.js';
import { createEventBus } from '../src/core/eventBus.js';
import { cmd, createGameState, simulate } from './helpers.js';

afterEach(() => {
  delete globalThis.localStorage;
  vi.restoreAllMocks();
});

/** A HubLink with a hub session whose SDK records every reportEvent call. */
function sessionLink(answer = async () => ({ granted: 'dragon_scale' })) {
  const calls = [];
  const link = new HubLink({
    exit() {},
    async getTicketBalance() { return { balance: 0 }; },
    async reportEvent(eventId, data, key) {
      calls.push({ eventId, data, key });
      return answer(eventId, data, key);
    },
  });
  link.adopt({ playerId: 'player-1' }, 'ann');
  return { link, calls };
}

/** Game.js wiring: the reporter listens to modeStart and waveCleared on the presentation bus. */
function wire(hub, state) {
  const bus = createEventBus();
  const granted = [];
  const jobs = [];
  let n = 0;
  const reporter = createWaveRelicReporter({ hub, onGranted: (id) => granted.push(id), newId: () => `run-${++n}` });
  bus.on('modeStart', (ev) => reporter.modeStart(ev));
  bus.on('waveCleared', (ev) => { const job = reporter.waveCleared(ev, state); if (job) jobs.push(job); });
  return { bus, granted, settle: () => Promise.all(jobs) };
}

function wavesState(godMode = false) {
  return { mode: 'waves', tuning: { godMode } };
}

describe('Dragon Scale wave-clear report', () => {
  it('reports a wave 1 clear in Wave Mode once per run, with wave 1 and a per-run key', async () => {
    const { link, calls } = sessionLink();
    const state = wavesState();
    const { bus, granted, settle } = wire(link, state);
    bus.emit({ type: 'modeStart', mode: 'waves', tier: 1 });
    bus.emit({ type: 'waveCleared', waveIndex: 0, tickets: 50 });
    bus.emit({ type: 'waveCleared', waveIndex: 0, tickets: 50 });
    await settle();
    expect(calls).toEqual([
      { eventId: 'shooter.wave_clear', data: { wave: 1, godMode: false }, key: 'shooter.wave_clear:1:run-1' },
    ]);
    expect(granted).toEqual(['dragon_scale']);
    expect(relicName('dragon_scale')).toBe('Dragon Scale');

    // The next tier is a new run with its own key.
    bus.emit({ type: 'modeStart', mode: 'waves', tier: 2 });
    bus.emit({ type: 'waveCleared', waveIndex: 0, tickets: 50 });
    await settle();
    expect(calls.map((c) => c.key)).toEqual(['shooter.wave_clear:1:run-1', 'shooter.wave_clear:1:run-2']);
  });

  it('does not report wave 2 or wave 3 clears', async () => {
    const { link, calls } = sessionLink();
    const { bus, settle } = wire(link, wavesState());
    bus.emit({ type: 'modeStart', mode: 'waves', tier: 1 });
    bus.emit({ type: 'waveCleared', waveIndex: 1, tickets: 80 });
    bus.emit({ type: 'waveCleared', waveIndex: 2, tickets: 120 });
    await settle();
    expect(calls).toEqual([]);
  });

  it('does not report a campaign, boss fight or sandbox clear', async () => {
    const { link, calls } = sessionLink();
    for (const mode of ['campaign', 'boss', 'sandbox']) {
      const state = { mode, tuning: { godMode: false } };
      const { bus, settle } = wire(link, state);
      bus.emit({ type: 'modeStart', mode, tier: 1 });
      bus.emit({ type: 'waveCleared', waveIndex: 0, tickets: 50 });
      await settle();
    }
    expect(calls).toEqual([]);
  });

  it('does nothing without a hub session', async () => {
    const reportEvent = vi.fn(async () => ({ granted: 'dragon_scale' }));
    const offline = new HubLink({ exit() {}, async getTicketBalance() { return null; }, reportEvent });
    offline.markOffline();
    const { bus, granted, settle } = wire(offline, wavesState());
    bus.emit({ type: 'modeStart', mode: 'waves', tier: 1 });
    bus.emit({ type: 'waveCleared', waveIndex: 0, tickets: 50 });
    await settle();
    expect(await offline.reportEvent(WAVE_CLEAR_EVENT, { wave: 1, godMode: false }, 'k')).toEqual({});
    expect(reportEvent).not.toHaveBeenCalled();
    expect(granted).toEqual([]);

    // Game's stand-in hub (no HubLink at all) is also a no-op.
    const stub = { status: 'offline', connected: false, bankable: false };
    const bare = wire(stub, wavesState());
    bare.bus.emit({ type: 'modeStart', mode: 'waves', tier: 1 });
    expect(() => bare.bus.emit({ type: 'waveCleared', waveIndex: 0, tickets: 50 })).not.toThrow();
  });

  it('still reports in God Mode, with godMode true', async () => {
    const { link, calls } = sessionLink();
    const { bus, granted, settle } = wire(link, wavesState(true));
    bus.emit({ type: 'modeStart', mode: 'waves', tier: 1 });
    bus.emit({ type: 'waveCleared', waveIndex: 0, tickets: 50 });
    await settle();
    expect(calls).toHaveLength(1);
    expect(calls[0].data).toEqual({ wave: 1, godMode: true });
    expect(granted).toEqual(['dragon_scale']);
  });

  it('never throws into the game when the hub refuses, and shows no toast for an empty answer', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing = sessionLink(async () => { throw Object.assign(new Error('idempotency_mismatch'), { code: 'idempotency_mismatch' }); });
    const a = wire(failing.link, wavesState());
    a.bus.emit({ type: 'modeStart', mode: 'waves', tier: 1 });
    a.bus.emit({ type: 'waveCleared', waveIndex: 0, tickets: 50 });
    await expect(a.settle()).resolves.toEqual([{}]);
    expect(a.granted).toEqual([]);
    expect(failing.link.bankable).toBe(true);

    const owned = sessionLink(async () => ({}));
    const b = wire(owned.link, wavesState());
    b.bus.emit({ type: 'modeStart', mode: 'waves', tier: 1 });
    b.bus.emit({ type: 'waveCleared', waveIndex: 0, tickets: 50 });
    await b.settle();
    expect(owned.calls).toHaveLength(1);
    expect(b.granted).toEqual([]);
  });

  it('only sends shooter.wave_clear through HubLink', async () => {
    const { link, calls } = sessionLink();
    for (const id of ['shooter.boss_clear', 'tickets.earn', 'coop.stage_clear', 'fighter.story_level_complete']) {
      expect(await link.reportEvent(id, { wave: 1 }, `${id}:k`)).toEqual({});
    }
    expect(calls).toEqual([]);
    expect(WAVE_CLEAR_EVENT).toBe('shooter.wave_clear');
  });

  it('grants the Dragon Scale once through the hub SDK mock, God Mode included', async () => {
    const box = { hash: '', now: Date.now() };
    const sdk = createHubSdk({
      useMock: true,
      session: memoryKeyValue(),
      local: memoryKeyValue(),
      now: () => box.now,
      readHash: () => box.hash,
      writeHash: (next) => { box.hash = next; },
      hubUrl: 'https://hub.example/hub/',
      assign() {},
    });
    box.hash = `#t=${await mintMockTicket({ game: HUB_GAME_ID, playerId: 'player-1', now: box.now, jti: 'relic' })}`;
    const link = await connectHub(sdk);
    expect(link.bankable).toBe(true);
    const { bus, granted, settle } = wire(link, wavesState(true));
    bus.emit({ type: 'modeStart', mode: 'waves', tier: 1 });
    bus.emit({ type: 'waveCleared', waveIndex: 0, tickets: 50 });
    bus.emit({ type: 'modeStart', mode: 'waves', tier: 2 });
    bus.emit({ type: 'waveCleared', waveIndex: 0, tickets: 50 });
    const results = await settle();
    expect(results).toEqual([{ granted: 'dragon_scale' }, {}]);
    expect(granted).toEqual(['dragon_scale']);
  });

  it('fires from the real Wave Mode sim when wave 1 is cleared', async () => {
    const { link, calls } = sessionLink();
    const s = createGameState({ seed: 11 });
    const { bus, settle } = wire(link, s);
    const step = (c) => { simulate(s, { [s.localPlayerId]: c }); bus.emitAll(s.events); };
    step(cmd({ actions: [
      { type: 'startMode', mode: 'waves', tier: 1 },
      { type: 'debug', op: 'setTuning', args: { key: 'godMode', value: true } },
      { type: 'debug', op: 'setTuning', args: { key: 'infiniteAmmo', value: true } },
    ] }));
    // Clear wave 1 (boss included) with the debug kill; stop at the intermission.
    for (let i = 0; i < 60 * 60 * 4 && s.wave.phase !== 'intermission'; i++) {
      step(cmd(i % 30 === 0 ? { actions: [{ type: 'debug', op: 'killAll' }] } : {}));
    }
    expect(s.wave.index).toBe(0);
    expect(s.wave.phase).toBe('intermission');
    await settle();
    expect(calls).toEqual([{ eventId: 'shooter.wave_clear', data: { wave: 1, godMode: true }, key: 'shooter.wave_clear:1:run-1' }]);
  });
});
