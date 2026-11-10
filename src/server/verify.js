// Replay a server-issued run. The receipt never credits Tickets.
import { simulate } from '../sim/simulate.js';
import { runSahilKiteProbe } from '../sim/campaign/kiteProbe.js';
import { verifyStateHash } from '../sim/hash.js';
import { bossById, contentFingerprint } from '../data/serverManifest.js';
import { ECONOMY, SOURCE_COMMIT, buildIssuedState, buildIssuance, canonicalLoadoutOk } from './runContract.js';
import {
  PROTOCOL_VERSION, LIMITS, preflightLog, decodeFrames, logDigest, bindingHash, movementDelta,
} from './protocol.js';

function pureClone(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    const arr = new Array(value.length);
    for (let i = 0; i < value.length; i++) arr[i] = pureClone(value[i]);
    return arr;
  }
  const out = {};
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i++) out[keys[i]] = pureClone(value[keys[i]]);
  return out;
}

if (typeof globalThis !== 'undefined' && globalThis.__SPROTO_VERIFY_BUNDLE) {
  globalThis.structuredClone = pureClone;
}

function fail(reason, extra = {}) {
  return {
    ok: false,
    reason,
    eligible: false,
    ranked: false,
    ticketsMinted: 0,
    outcome: 'rejected',
    canonicalBoss: null,
    canonicalCount: 0,
    protocol: PROTOCOL_VERSION,
    ...extra,
  };
}

function clockOf(ctx) {
  if (ctx && typeof ctx.clock === 'function') return ctx.clock;
  return () => Date.now();
}

function seen(list, value) {
  return Array.isArray(list) && list.indexOf(value) >= 0;
}

function runtimeCheat(state) {
  const t = state.tuning || {};
  if (t.godMode) return 'god_mode';
  if (t.infiniteAmmo || t.freezeEnemies || t.unlockAllRecipes) return 'debug';
  if (t.enemyHpMult !== 1 || t.enemyDmgMult !== 1) return 'debug';
  if (state.mode !== 'campaign' || state.testMode || state.bossFight) return 'debug';
  return null;
}

const SIM_GUN_SOURCES = { start: 1, world: 1, boss: 1, drop: 1 };

function inventoryCheat(state) {
  const p = state.players[state.localPlayerId];
  if (!p) return 'malformed';
  for (let i = 0; i < p.guns.length; i++) {
    const g = p.guns[i];
    if (g && !SIM_GUN_SOURCES[g.source]) return 'injected_inventory';
  }
  for (let i = 0; i < state.pickups.length; i++) {
    const gun = state.pickups[i].gun;
    if (gun && !SIM_GUN_SOURCES[gun.source]) return 'injected_inventory';
  }
  return null;
}

function emptyPart(type) {
  return { type, spawned: false, dead: false, fled: false, sourceKind: null, sourceId: null };
}

function noteParts(seen, state, boss) {
  for (let i = 0; i < boss.parts.length; i++) {
    const type = boss.parts[i];
    const prev = seen[type] || emptyPart(type);
    const matches = [];
    for (let e = 0; e < state.enemies.length; e++) {
      const enemy = state.enemies[e];
      if (enemy.type === type && enemy.boss) matches.push(enemy);
    }
    const enemy = matches.length ? matches[matches.length - 1] : null;
    if (!enemy) { seen[type] = prev; continue; }
    prev.spawned = true;
    if (enemy.fled) prev.fled = true;
    if (enemy.dead && enemy.hp <= 0) {
      prev.dead = true;
      if (enemy.lastHit) {
        prev.sourceKind = enemy.lastHit.sourceKind;
        prev.sourceId = enemy.lastHit.sourceId;
      }
    }
    seen[type] = prev;
  }
}

function classify(seen, boss, playerDead, playerId) {
  const parts = [];
  for (let i = 0; i < boss.parts.length; i++) parts.push(seen[boss.parts[i]] || emptyPart(boss.parts[i]));
  if (playerDead) return { outcome: 'fail', reason: 'player_down', parts, eligible: false };
  if (parts.some((part) => part.fled)) return { outcome: 'fail', reason: 'boss_fled', parts, eligible: false };
  if (!parts.every((part) => part.dead)) return { outcome: 'incomplete', reason: 'boss_alive', parts, eligible: false };
  const clean = parts.every((part) => (part.sourceKind === 'gun' || part.sourceKind === 'splash') && part.sourceId === playerId);
  if (!clean) return { outcome: 'assisted', reason: 'assisted', parts, eligible: false };
  return { outcome: 'clear', reason: 'boss_clear', parts, eligible: true };
}

function checkpointOf(state, seen) {
  return {
    hash: verifyStateHash(state),
    tick: state.tick,
    state: pureClone(state),
    parts: pureClone(seen),
  };
}

function publicReceipt(receipt) {
  const out = { ...receipt };
  if (out.checkpoint) {
    out.checkpoint = { hash: out.checkpoint.hash, tick: out.checkpoint.tick, parts: out.checkpoint.parts };
  }
  return out;
}

/**
 * @param {object} log client input log
 * @param {object} ctx server context: issuance, caller account/session/day, seen ids, optional resume
 */
export function verifyRun(log, ctx) {
  const started = clockOf(ctx)();
  const pre = preflightLog(log);
  if (pre) return fail(pre);
  if (!ctx || typeof ctx !== 'object' || !ctx.issuance) return fail('malformed');
  const issuance = ctx.issuance;
  if (issuance.v !== PROTOCOL_VERSION || issuance.protocol !== PROTOCOL_VERSION) return fail('unsupported_version');
  const boss = bossById(issuance.canonicalBoss);
  if (!boss) return fail(rejectedOrUnknown(issuance.canonicalBoss));
  const callerAccount = ctx.accountId != null ? ctx.accountId : issuance.accountId;
  const callerSession = ctx.sessionId != null ? ctx.sessionId : issuance.sessionId;
  const callerDay = ctx.day != null ? ctx.day : issuance.day;
  const binding = log.binding;
  if (callerAccount !== issuance.accountId || binding.accountId !== issuance.accountId
    || callerSession !== issuance.sessionId || binding.sessionId !== issuance.sessionId
    || callerDay !== issuance.day || binding.day !== issuance.day
    || binding.runId !== issuance.runId) {
    return fail('rebind', { canonicalBoss: boss.id });
  }
  const digest = logDigest(log);
  if (seen(ctx.seenDigests, digest)) return fail('reused_log', { logDigest: digest, canonicalBoss: boss.id });
  if (seen(ctx.seenRunIds, issuance.runId)) return fail('reused_run', { logDigest: digest, canonicalBoss: boss.id });
  const liveFingerprint = contentFingerprint(PROTOCOL_VERSION);
  if (issuance.contentFingerprint !== liveFingerprint) return fail('fingerprint_mismatch', { logDigest: digest });

  let state;
  let tickBase = 0;
  if (ctx.resume) {
    if (!ctx.resume.state || ctx.resume.hash !== verifyStateHash(ctx.resume.state)) return fail('bad_checkpoint', { logDigest: digest });
    if (log.segments[0].from !== ctx.resume.hash || log.segments[0].tick0 !== ctx.resume.tick) {
      return fail('bad_checkpoint', { logDigest: digest });
    }
    const cheat = runtimeCheat(ctx.resume.state) || inventoryCheat(ctx.resume.state);
    if (cheat) return fail(cheat, { logDigest: digest });
    state = pureClone(ctx.resume.state);
    if (verifyStateHash(state) !== ctx.resume.hash) return fail('bad_checkpoint', { logDigest: digest });
    tickBase = ctx.resume.tick;
  } else {
    if (log.segments[0].from != null || log.segments[0].tick0 !== 0) return fail('bad_checkpoint', { logDigest: digest });
    state = buildIssuedState(issuance);
    if (!canonicalLoadoutOk(state)) return fail('injected_inventory', { logDigest: digest });
    if (issuance.initialStateHash !== verifyStateHash(state)) return fail('bad_start', { logDigest: digest });
  }

  const now = clockOf(ctx);
  let total = 0;
  const playerId = state.localPlayerId;
  const seenParts = {};
  if (ctx.resume && ctx.resume.parts) {
    for (let i = 0; i < boss.parts.length; i++) {
      const type = boss.parts[i];
      if (ctx.resume.parts[type]) seenParts[type] = pureClone(ctx.resume.parts[type]);
    }
  }
  noteParts(seenParts, state, boss);
  for (let s = 0; s < log.segments.length; s++) {
    const seg = log.segments[s];
    if (s > 0 && seg.from !== verifyStateHash(state)) return fail('bad_checkpoint', { logDigest: digest, tick: state.tick });
    if (seg.tick0 !== state.tick) return fail(s === 0 ? 'bad_checkpoint' : 'accelerated', { logDigest: digest, tick: state.tick });
    if (total + seg.n > (issuance.maxFrames || LIMITS.maxTotalFrames)) return fail('oversized', { logDigest: digest });
    const decoded = decodeFrames(seg.frames, seg.n, seg.actions || []);
    if (decoded.error) return fail(decoded.error, { logDigest: digest, tick: state.tick });
    for (let f = 0; f < decoded.commands.length; f++) {
      if ((f & 63) === 0 && now() - started > LIMITS.maxCpuMs) return fail('cpu_budget', { logDigest: digest, tick: state.tick });
      const before = { x: state.players[playerId].pos.x, y: state.players[playerId].pos.y, z: state.players[playerId].pos.z };
      simulate(state, { [playerId]: decoded.commands[f] });
      const moved = movementDelta(before, state.players[playerId].pos);
      if (moved) return fail(moved, { logDigest: digest, tick: state.tick });
      const cheat = runtimeCheat(state) || inventoryCheat(state);
      if (cheat) return fail(cheat, { logDigest: digest, tick: state.tick });
      noteParts(seenParts, state, boss);
      total++;
    }
  }
  if (state.tick !== tickBase + total) return fail('accelerated', { logDigest: digest, tick: state.tick });

  const end = classify(seenParts, boss, state.players[playerId].dead, playerId);
  const checkpoint = checkpointOf(state, seenParts);
  return {
    ok: true,
    reason: end.reason,
    outcome: end.outcome,
    eligible: end.eligible,
    ranked: end.outcome === 'clear',
    ticketsMinted: 0,
    canonicalBoss: boss.id,
    canonicalCount: end.outcome === 'clear' || end.outcome === 'assisted' ? 1 : 0,
    parts: end.parts,
    duelId: boss.duelId,
    distinctFrom: boss.distinctFrom || [],
    stateHash: checkpoint.hash,
    tick: state.tick,
    frames: total,
    protocol: PROTOCOL_VERSION,
    contentFingerprint: liveFingerprint,
    sourceCommit: /^0{40}$/.test(SOURCE_COMMIT) ? null : SOURCE_COMMIT,
    logDigest: digest,
    bindingHash: bindingHash(binding),
    checkpoint,
    cpuMs: now() - started,
    economy: ECONOMY,
  };
}

function rejectedOrUnknown(id) {
  if (id === 'agent' || id === 'glowieAgent') return 'glowie_not_agent';
  if (id === 'obamaDuo' || id === 'midgetDuo') return 'obama_is_one';
  return 'unknown_boss';
}

export function verifyRunJSON(text) {
  if (typeof text !== 'string') return JSON.stringify(fail('malformed'));
  if (/[[,:]\s*-?(?:NaN|Infinity)\b/.test(text)) return JSON.stringify(fail('nan'));
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return JSON.stringify(fail('malformed'));
  }
  if (Array.isArray(body)) {
    const out = [];
    for (let i = 0; i < body.length; i++) out.push(publicReceipt(verifyRun(body[i].log, body[i].ctx)));
    return JSON.stringify(out);
  }
  return JSON.stringify(publicReceipt(verifyRun(body.log, body.ctx)));
}

export function runKiteProbeJSON(text) {
  let body = {};
  if (typeof text === 'string' && text) {
    try { body = JSON.parse(text); } catch { body = {}; }
  }
  return JSON.stringify(runSahilKiteProbe(body.seed, body.mode, body.maxFrames));
}

export function contentFingerprintOf() {
  return contentFingerprint(PROTOCOL_VERSION);
}

export {
  PROTOCOL_VERSION, LIMITS, ECONOMY, SOURCE_COMMIT, buildIssuance, bossById, pureClone,
};
