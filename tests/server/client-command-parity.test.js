import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonicalCommand } from '../../src/server/canonicalCommand.js';
import { decodeFrames } from '../../src/server/protocol.js';
import { Game } from '../../src/game/Game.js';
import { buildIssuedState } from '../../src/server/runContract.js';
import { simulate, DT } from '../../src/sim/simulate.js';
import { verifyStateHash } from '../../src/sim/hash.js';
import { issueBoss } from '../bossLog.js';
import { CrashGuard } from '../../src/core/crashGuard.js';

afterEach(() => vi.unstubAllGlobals());

const command = (extra = {}) => ({ tick: 999, yaw: 0.1234567, pitch: 0.424242,
  moveX: 0.23125, moveZ: -0.8947, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...extra });
const issuedState = () => buildIssuedState(issueBoss('sahil', 7));
function localGame(raw, state = issuedState()) {
  const game = Object.create(Game.prototype);
  Object.assign(game, { state, playing: true, pvpActive: false, onSimCommand: null,
    canonicalRewardRecorder: null, canonicalRewardOnError: null, canonicalRewardFailure: null,
    last: 0, acc: 0, timeScale: 1, settings: { hitstop: false, shake: 0 },
    feel: { scaleFrame: (ft) => ft }, nav: { setRoot() {}, sync() {} }, pad: { frame() {} },
    screen: { hidden: true }, ui: { menuOpen: false, update: vi.fn() },
    input: { buildCommand: () => raw, frame() {}, zoomLevel: 1, liveLook: () => ({}), dropAim() {} },
    renderer: { render: vi.fn(), takeGpuMs: () => 0 }, perfCounters: { push() {} }, statsOn: false });
  return game;
}

describe('canonical reward command bytes', () => {
  for (const [name, raw] of [
    ['mouse wrap/pitch', command({ yaw: Math.PI * 8 + 0.1234567, pitch: -1.49999 })],
    ['controller analog', command({ moveX: 0.33333, moveZ: -0.77777, held: { fire: true, zoom: true, sprint: true, grapple: true } })],
    ['held and pressed', command({ held: { fire: true, sprint: true }, pressed: { jump: true, dash: true, reload: true, medkit: true, chainZap: true } })],
    ['legendary slot and wheel', command({ slot: 4, wheel: -4 })],
    ['transition action', command({ actions: [{ type: 'transitionDone' }] })],
  ]) {
    it(`decodes precisely what it records: ${name}`, () => {
      const before = JSON.stringify(raw);
      const packet = canonicalCommand(raw);
      expect(packet.frame.n).toBe(1);
      expect(packet.frame.frames).toHaveLength(16);
      expect(packet.command).toEqual(decodeFrames(packet.frame.frames, 1, packet.frame.actions).commands[0]);
      expect(JSON.stringify(raw)).toBe(before);
      expect(Object.isFrozen(packet.command)).toBe(true);
      expect(Object.isFrozen(packet.command.held)).toBe(true);
      expect(Object.isFrozen(packet.command.pressed)).toBe(true);
      expect(Object.isFrozen(packet.command.actions)).toBe(true);
      expect(Object.isFrozen(packet.frame)).toBe(true);
      expect(Object.isFrozen(packet.frame.actions)).toBe(true);
      expect(packet.command.moveX).toBeCloseTo(raw.moveX, 2);
      expect(packet.command.moveZ).toBeCloseTo(raw.moveZ, 2);
      expect(packet.command.slot).toBe(raw.slot);
      expect(packet.command.wheel).toBe(raw.wheel);
    });
  }

  it('preserves button edges separately from held state and quantizes look within codec resolution', () => {
    const first = canonicalCommand(command({ held: { fire: true, grapple: true }, pressed: { jump: true }, yaw: 0.345678, pitch: 0.765432 }));
    const next = canonicalCommand(command({ held: { fire: true, grapple: true }, pressed: {} }));
    expect(first.command.pressed.jump).toBe(true);
    expect(next.command.pressed.jump).toBeUndefined();
    expect(next.command.held).toEqual(first.command.held);
    expect(Math.abs(first.command.yaw - 0.345678)).toBeLessThanOrEqual(Math.PI / 32767 / 2 + 1e-12);
    expect(Math.abs(first.command.pitch - 0.765432)).toBeLessThanOrEqual(1.5 / 32767 / 2 + 1e-12);
    const transition = canonicalCommand(command({ actions: [{ type: 'transitionDone' }] }));
    expect(transition.frame.actions).toEqual([[0, 1]]);
    expect(Object.isFrozen(transition.frame.actions[0])).toBe(true);
    expect(() => { first.command.moveX = 1; }).toThrow();
  });

  it('rejects unsupported UI/debug actions without extending the reward codec', () => {
    for (const action of [{ type: 'pickupGun', pickupId: 4 }, { type: 'craft', recipeId: 'anything' },
      { type: 'dropGun', slot: 0 }, { type: 'startMode', mode: 'campaign' }, { type: 'debug', op: 'toggleGod' }]) {
      expect(() => canonicalCommand(command({ actions: [action] }))).toThrow();
    }
    expect(canonicalCommand(command({ pressed: { interact: true } })).command.pressed.interact).toBe(true);
  });
});

describe('real Game local-tick integration', () => {
  it('keeps the default-off local path raw, including observer identity', () => {
    const raw = command(), game = localGame(raw), reference = issuedState();
    game.configureCanonicalRewardCommands();
    game.onSimCommand = vi.fn();
    simulate(reference, { [reference.localPlayerId]: raw }, DT);
    expect(game.applyLocalCommand(raw)).toBe(true);
    expect(game.onSimCommand.mock.calls[0][0]).toBe(raw);
    expect(verifyStateHash(game.state)).toBe(verifyStateHash(reference));
  });

  it('observes/records canonical inputs before simulating exactly the decoded command', () => {
    const raw = command(), game = localGame(raw), reference = issuedState(), rawReference = issuedState();
    const records = [], order = [];
    game.configureCanonicalRewardCommands({ enabled: true,
      record: (frame, tick) => { order.push('record'); records.push({ frame, tick }); expect(game.state.tick).toBe(0); },
      onError: () => { throw new Error('unexpected failure'); } });
    game.onSimCommand = (decoded, state) => { order.push('observe'); expect(state.tick).toBe(0); expect(decoded).toEqual(canonicalCommand(raw).command); };
    expect(game.applyLocalCommand(raw)).toBe(true);
    expect(order).toEqual(['observe', 'record']);
    expect(records).toHaveLength(1);
    expect(records[0].tick).toBe(0); // Local state tick, never the raw command's tick999 metadata.
    const decoded = decodeFrames(records[0].frame.frames, 1, records[0].frame.actions).commands[0];
    simulate(reference, { [reference.localPlayerId]: decoded }, DT);
    simulate(rawReference, { [rawReference.localPlayerId]: raw }, DT);
    expect(verifyStateHash(game.state)).toBe(verifyStateHash(reference));
    expect(verifyStateHash(game.state)).not.toBe(verifyStateHash(rawReference));
  });

  it('lets a read-only bot drive the same canonical client command path', () => {
    const game = localGame(null), replay = issuedState();
    const frames = [];
    game.configureCanonicalRewardCommands({ enabled: true, record: (frame) => { frames.push(frame); }, onError: vi.fn() });
    for (let tick = 0; tick < 64; tick++) {
      const bot = command({ yaw: tick * 0.0123456, pitch: -0.14321, moveX: 0.333333, moveZ: 0.777777,
        held: { fire: true, sprint: tick < 30 }, pressed: tick === 5 ? { jump: true } : {}, slot: tick === 1 ? 0 : -1, wheel: tick === 32 ? 1 : 0 });
      expect(game.applyLocalCommand(bot)).toBe(true);
      const frame = frames[frames.length - 1];
      const decoded = decodeFrames(frame.frames, 1, frame.actions).commands[0];
      simulate(replay, { [replay.localPlayerId]: decoded }, DT);
    }
    expect(frames).toHaveLength(64);
    expect(verifyStateHash(game.state)).toBe(verifyStateHash(replay));
  });

  for (const [name, recorder] of [['throw', () => { throw new Error('buffer_full'); }], ['false', () => false], ['promise', () => Promise.resolve(true)]]) {
    it(`latches ${name} recording failures without raw fallback or stopping rendering`, () => {
      const raw = command(), game = localGame(raw), before = verifyStateHash(game.state), onError = vi.fn(), record = vi.fn(recorder);
      game.configureCanonicalRewardCommands({ enabled: true, record, onError });
      expect(game.step(DT * 1000 + 1)).toBe(false);
      expect(game.step(DT * 2000 + 2)).toBe(false);
      expect(game.renderer.render).toHaveBeenCalledTimes(2);
      expect(record).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(game.canonicalRewardFailure.stage).toBe('recording');
      expect(verifyStateHash(game.state)).toBe(before);
      expect(game.state.tick).toBe(0);
      game.configureCanonicalRewardCommands({ enabled: false });
      expect(game.applyLocalCommand(raw)).toBe(true); // Explicit unranked continuation only.
    });
  }

  it('latches unsupported actions before recording and still renders', () => {
    const game = localGame(command({ actions: [{ type: 'craft', recipeId: 'anything' }] }));
    const record = vi.fn(), onError = vi.fn();
    game.configureCanonicalRewardCommands({ enabled: true, record, onError });
    game.step(DT * 1000 + 1);
    expect(record).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(game.canonicalRewardFailure.stage).toBe('encoding');
    expect(game.state.tick).toBe(0);
    expect(game.renderer.render).toHaveBeenCalledTimes(1);
  });

  it('latches an observer failure before recording or simulation and notifies once', () => {
    const game = localGame(command()), before = verifyStateHash(game.state);
    const observerError = new Error('observer_failed'), record = vi.fn(), onError = vi.fn();
    game.configureCanonicalRewardCommands({ enabled: true, record, onError });
    game.onSimCommand = vi.fn(() => { throw observerError; });
    game.step(DT * 1000 + 1);
    game.step(DT * 2000 + 2);
    expect(record).not.toHaveBeenCalled();
    expect(game.onSimCommand).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(game.canonicalRewardFailure).toMatchObject({ stage: 'observer', tick: 0, error: observerError });
    expect(verifyStateHash(game.state)).toBe(before);
    expect(game.renderer.render).toHaveBeenCalledTimes(2);
  });

  it('retains the primary recording failure and keeps rendering when the error notifier throws', () => {
    const game = localGame(command()), reportError = new Error('notifier_failed');
    const onError = vi.fn(() => { throw reportError; }), record = vi.fn(() => false);
    game.configureCanonicalRewardCommands({ enabled: true, record, onError });
    expect(() => game.step(DT * 1000 + 1)).not.toThrow();
    game.step(DT * 2000 + 2);
    expect(game.canonicalRewardFailure.stage).toBe('recording');
    expect(game.canonicalRewardReportError).toBe(reportError);
    expect(record).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(game.state.tick).toBe(0);
    expect(game.renderer.render).toHaveBeenCalledTimes(2);
  });

  it('ends a partially applied simulation frame through the existing crash guard, then renders without retrying its input', () => {
    const game = localGame(command({ held: { fire: true } }));
    const p = game.state.players[game.state.localPlayerId], guns = p.guns;
    const simError = new Error('simulation_component_failed'), record = vi.fn(), onError = vi.fn();
    // The real simulation must access the equipped gun to fire. Inject a
    // component fault rather than replacing the simulator or the Game loop.
    Object.defineProperty(p, 'guns', { configurable: true, enumerable: true, get() { throw simError; } });
    game.crash = new CrashGuard(3, 5, vi.fn(), null);
    const schedule = vi.fn(); vi.stubGlobal('requestAnimationFrame', schedule);
    game.configureCanonicalRewardCommands({ enabled: true, record, onError });
    game.frame(DT * 1000 + 1);
    expect(game.crash.total).toBe(1);
    expect(game.crash.halted).toBe(false);
    expect(game.canonicalRewardFailure).toMatchObject({ stage: 'simulation', tick: 0, error: simError });
    expect(record).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(game.renderer.render).not.toHaveBeenCalled();
    // Repair only the fixture's throwing accessor so the next frame can draw.
    // The reward failure stays latched; this is not simulation restoration.
    Object.defineProperty(p, 'guns', { value: guns, writable: true, configurable: true, enumerable: true });
    const stoppedTick = game.state.tick;
    game.frame(DT * 2000 + 2);
    expect(game.state.tick).toBe(stoppedTick);
    expect(game.crash.total).toBe(1);
    expect(record).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledTimes(2);
    expect(game.renderer.render).toHaveBeenCalledTimes(1);
  });

  it('does not canonicalize, record, or replace the PvP input path', () => {
    const raw = command(), game = localGame(raw), record = vi.fn();
    game.configureCanonicalRewardCommands({ enabled: true, record, onError: vi.fn() });
    game.pvpActive = true; game.pvp = { frame: vi.fn() };
    game.step(DT * 1000 + 1);
    expect(game.pvp.frame.mock.calls[0][1]).toBe(raw);
    expect(record).not.toHaveBeenCalled();
    expect(game.state.tick).toBe(0);
  });

  it('refuses gate activation outside campaign and requires an explicit synchronous recording/error adapter', () => {
    const game = localGame(command());
    expect(() => game.configureCanonicalRewardCommands({ enabled: true, record: vi.fn() })).toThrow();
    game.pvpActive = true;
    expect(() => game.configureCanonicalRewardCommands({ enabled: true, record: vi.fn(), onError: vi.fn() })).toThrow();
    game.pvpActive = false; game.state.mode = 'sandbox';
    expect(() => game.configureCanonicalRewardCommands({ enabled: true, record: vi.fn(), onError: vi.fn() })).toThrow();
    expect(game.canonicalRewardRecorder).toBeNull();
  });
});
