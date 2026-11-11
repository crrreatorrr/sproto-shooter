// Records quantized campaign boss logs with the real sim. Not a test file.
import { kiteCommand } from '../src/sim/campaign/kiteAim.js';
import { simulate } from '../src/sim/simulate.js';
import { verifyStateHash } from '../src/sim/hash.js';
import { buildIssuance, buildIssuedState } from '../src/server/runContract.js';
import { b64ToBytes, bytesToB64, decodeFrames, dequantizeCommand, encodeQuantized, quantizeCommand } from '../src/server/protocol.js';

const BINDING = {
  accountId: 'acct-shooter-1',
  sessionId: 'sess-shooter-1',
  day: '2026-11-07',
  runId: 'run-shooter-1',
};

export function issueBoss(canonicalBoss, seed, binding = BINDING) {
  const built = buildIssuance({ ...binding, seed, canonicalBoss });
  if (!built.ok) throw new Error(built.reason);
  return built.issuance;
}

function decide(state, mode) {
  return kiteCommand(state, mode);
}

function noteBoss(memory, state, parts) {
  for (const e of state.enemies) {
    if (!e.boss || parts.indexOf(e.type) < 0) continue;
    const prev = memory[e.type] || { dead: false, fled: false };
    if (e.fled) prev.fled = true;
    if (e.dead && e.hp <= 0) prev.dead = true;
    memory[e.type] = prev;
  }
}

function finished(state, mode, parts, memory) {
  const p = state.players[state.localPlayerId];
  if (mode === 'fail') return p.dead;
  noteBoss(memory, state, parts);
  return parts.every((type) => memory[type] && memory[type].dead && !memory[type].fled);
}

/**
 * @returns {{ issuance: object, log: object, verifyStateHash: string, tick: number, outcomeHint: string }}
 */
export function recordBoss(canonicalBoss, seed, mode, maxFrames = 24000, observe = null) {
  const issuance = issueBoss(canonicalBoss, seed, {
    ...BINDING,
    runId: `run-${canonicalBoss}-${mode}`,
  });
  const state = buildIssuedState(issuance);
  const id = state.localPlayerId;
  const qs = [];
  const memory = {};
  let guard = maxFrames;
  while (guard-- > 0) {
    const q = quantizeCommand(decide(state, mode));
    qs.push(q);
    simulate(state, { [id]: dequantizeCommand(q) });
    if (observe) observe(state);
    if (finished(state, mode, issuance.parts, memory)) break;
    if (mode !== 'fail' && state.players[id].dead) break;
  }
  const encoded = encodeQuantized(qs);
  const log = {
    v: 1,
    binding: {
      accountId: issuance.accountId,
      sessionId: issuance.sessionId,
      day: issuance.day,
      runId: issuance.runId,
    },
    segments: [{ i: 0, from: null, tick0: 0, n: encoded.n, frames: encoded.frames, actions: encoded.actions }],
  };
  return {
    issuance,
    log,
    verifyStateHash: verifyStateHash(state),
    tick: state.tick,
    playerDead: state.players[id].dead,
    bosses: state.enemies.filter((e) => e.boss).map((e) => ({
      type: e.type, dead: !!e.dead, fled: !!e.fled, hp: e.hp, sourceKind: e.lastHit && e.lastHit.sourceKind,
    })),
  };
}

export function prefixLog(recorded, n) {
  const seg = recorded.log.segments[0];
  const bytes = b64ToBytes(seg.frames);
  if (!bytes || n < 1 || n > seg.n) throw new Error('bad prefix');
  return {
    v: 1,
    binding: {
      accountId: recorded.log.binding.accountId,
      sessionId: recorded.log.binding.sessionId,
      day: recorded.log.binding.day,
      runId: recorded.log.binding.runId,
    },
    segments: [{ i: 0, from: null, tick0: 0, n, frames: bytesToB64(bytes.slice(0, n * 12)), actions: [] }],
  };
}

export function splitLog(recorded, at) {
  const seg = recorded.log.segments[0];
  const bytes = b64ToBytes(seg.frames);
  if (!bytes || at < 1 || at >= seg.n) throw new Error('bad split');
  const actions = seg.actions || [];
  const leftActions = actions.filter((a) => a[0] < at);
  const rightActions = actions.filter((a) => a[0] >= at).map((a) => [a[0] - at, a[1]]);
  const decoded = decodeFrames(seg.frames, seg.n, actions);
  if (decoded.error) throw new Error(decoded.error);
  const state = buildIssuedState(recorded.issuance);
  const id = state.localPlayerId;
  for (let i = 0; i < at; i++) simulate(state, { [id]: decoded.commands[i] });
  return {
    v: 1,
    binding: recorded.log.binding,
    segments: [
      { i: 0, from: null, tick0: 0, n: at, frames: bytesToB64(bytes.slice(0, at * 12)), actions: leftActions },
      { i: 1, from: verifyStateHash(state), tick0: at, n: seg.n - at, frames: bytesToB64(bytes.slice(at * 12)), actions: rightActions },
    ],
  };
}
