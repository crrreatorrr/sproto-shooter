// Client-side prediction and reconciliation for the local arena seat (SHOOTER-S3).
//
// The client steps its own player with the sim's movePlayer + weaponTick for every input it sends,
// so movement, aim, the muzzle flash and ammo answer at once. Body contact (separate) and damage
// are left to the server: reconciliation absorbs them.
//
// On each snapshot (tick T: the state after ticks 0..T-1) the client rebases on the server's exact
// copy of its player (players[seat] + you.private), replays the inputs it sent for frames >= T,
// and compares the result with what it had predicted for the same frame. The difference becomes
// a visual offset that decays with tau ~100 ms, so the picture never jumps; past 2 m it snaps.
// Frames the client never sent are filled the way the director fills them: the last real wish
// held for INPUT_LIMITS.holdTicks ticks (move, aim, held buttons), then neutral (aim only).
//
// Pure: it never touches the DOM or the clock. It does not change the sim (src/sim/pvp).
import { movePlayer, normalizeWish, weaponTick } from '../sim/pvp/sim.js';
import { DT, INPUT_LIMITS } from '../sim/pvp/rules.js';

export const PREDICT = Object.freeze({
  /** Visual error decay constant. */
  tauMs: 100,
  /** Corrections larger than this snap instead of blending. */
  snapM: 2,
  /** Inputs kept for replay (2 s at 30 Hz). */
  ring: 64,
});

function q4(n) {
  return Math.round(n * 10000) / 10000;
}

/**
 * The sim's per-tick quantization of a player (sim.js `snap`). Kept in step with it by
 * tests/net/predict.test.js, which checks the predictor against the sim bit for bit.
 */
export function quantizePlayer(p) {
  p.x = q4(p.x); p.y = q4(p.y); p.z = q4(p.z);
  p.vx = q4(p.vx); p.vy = q4(p.vy); p.vz = q4(p.vz);
  p.yaw = q4(p.yaw); p.pitch = q4(p.pitch);
  p.fireCd = q4(Math.max(0, p.fireCd));
  p.reloadT = q4(Math.max(0, p.reloadT));
  p.swapT = q4(Math.max(0, p.swapT));
  p.dashT = q4(Math.max(0, p.dashT));
  p.dashCd = q4(Math.max(0, p.dashCd));
  p.invuln = q4(Math.max(0, p.invuln));
  p.shieldDelay = q4(Math.max(0, p.shieldDelay));
}

/** players[seat] + you.private -> a whole player (no RNG: spread is the server's). */
export function playerFromSnapshot(pub, priv) {
  const out = { ...(priv || {}), ...(pub || {}) };
  if (Array.isArray(out.mag)) out.mag = out.mag.slice();
  if (!Number.isFinite(out.vy)) out.vy = 0;
  if (typeof out.onGround !== 'boolean') out.onGround = (out.y || 0) <= 0;
  for (const key of ['shieldDelay', 'invuln', 'dashT', 'dashCd', 'dashX', 'dashZ', 'fireCd', 'reloadT', 'swapT']) {
    if (!Number.isFinite(out[key])) out[key] = 0;
  }
  return out;
}

export function clonePlayer(p) {
  const out = { ...p };
  if (Array.isArray(p.mag)) out.mag = p.mag.slice();
  return out;
}

/**
 * One tick of the local player, as the sim steps it minus body contact, damage and regen (the
 * server's copy brings those in at the next reconciliation). Returns true when the gun fired.
 * Mutates `p`.
 */
export function predictStep(p, wish, frame) {
  if (!p.alive) return false;
  const w = normalizeWish(p, wish, frame);
  movePlayer(p, w, DT);
  quantizePlayer(p);
  const fired = Array.isArray(p.mag) ? weaponTick(p, w, DT) : false;
  quantizePlayer(p);
  return fired;
}

/** The director's held substitute: move, aim and held buttons; no edges, no slot pick. */
export function holdWish(w) {
  return {
    yaw: w.yaw,
    pitch: w.pitch,
    moveX: w.moveX || 0,
    moveZ: w.moveZ || 0,
    fire: !!w.fire,
    zoom: !!w.zoom,
    sprint: !!w.sprint,
    jump: false,
    dash: false,
    reload: false,
    slot: -1,
  };
}

/** The director's neutral substitute: aim kept, nothing else. */
export function neutralWish(w) {
  return {
    yaw: w ? w.yaw : undefined,
    pitch: w ? w.pitch : undefined,
    moveX: 0,
    moveZ: 0,
    fire: false,
    zoom: false,
    sprint: false,
    jump: false,
    dash: false,
    reload: false,
    slot: -1,
  };
}

const ZERO = Object.freeze({ x: 0, y: 0, z: 0 });

/**
 * The local seat's predictor.
 *   rebase(tick, ackFrame, player, now)  seed from a snapshot (no correction is measured)
 *   reconcile(tick, ackFrame, player, now)  rebase + replay + measure; returns { error, snapped, replayed }
 *   push(frame, wish, now)  one sent input; returns { fired } (cosmetic, first prediction only)
 *   visual(now, alpha)  the drawn player: between the last two predicted ticks, plus the decaying offset
 */
export function createPredictor({ tauMs = PREDICT.tauMs, snapM = PREDICT.snapM, ring = PREDICT.ring } = {}) {
  // Sent inputs by frame (decoded, exactly what the server will use).
  const pending = new Map();
  let base = null;
  let baseTick = 0;
  // The director's hold state at the base: the acked wish and how many ticks it has covered since.
  let ack = null;
  let baseHold = null;
  let baseMiss = INPUT_LIMITS.holdTicks;
  // Hold source while stepping frames the client never sent.
  let hold = null;
  let miss = 0;
  // pred: the state after input frame `frame`; prev: the state before it.
  let pred = null;
  let prev = null;
  let frame = -1;
  let offset = { ...ZERO };
  let decayedAt = null;

  function substitute(state) {
    miss += 1;
    if (hold && miss <= INPUT_LIMITS.holdTicks) return holdWish(hold);
    return neutralWish(hold || { yaw: state.yaw, pitch: state.pitch });
  }

  function stepOne(state, f) {
    const entry = pending.get(f);
    if (!entry) {
      predictStep(state, substitute(state), f);
      return false;
    }
    hold = entry;
    miss = 0;
    return predictStep(state, entry, f);
  }

  /** The base state stepped through frames baseTick..to; prev is the state before `to`. */
  function replayFromBase(to) {
    const state = clonePlayer(base);
    let before = clonePlayer(state);
    hold = baseHold;
    miss = baseMiss;
    for (let f = baseTick; f <= to; f++) {
      before = clonePlayer(state);
      stepOne(state, f);
    }
    pred = state;
    prev = before;
    frame = Math.max(to, baseTick - 1);
    return Math.max(0, to - baseTick + 1);
  }

  function trim() {
    if (pending.size <= ring) return;
    const keys = [...pending.keys()].sort((a, b) => a - b);
    for (let i = 0; i < keys.length - ring; i++) pending.delete(keys[i]);
  }

  function decay(now) {
    if (decayedAt != null && Number.isFinite(now) && now > decayedAt) {
      const k = Math.exp(-(now - decayedAt) / tauMs);
      offset = { x: offset.x * k, y: offset.y * k, z: offset.z * k };
    }
    if (Number.isFinite(now)) decayedAt = now;
  }

  /** Seed (or reseed) from the server's copy at tick `tick` and replay everything after it. */
  function rebase(tick, ackFrame, player, now) {
    base = clonePlayer(player);
    baseTick = tick;
    const acked = Number.isInteger(ackFrame) && ackFrame >= 0;
    if (acked && pending.has(ackFrame)) ack = { frame: ackFrame, wish: pending.get(ackFrame) };
    for (const key of [...pending.keys()]) if (key < tick) pending.delete(key);
    // The director has already held or neutralised the ticks between the ack and the snapshot.
    baseHold = acked && ack && ack.frame === ackFrame ? ack.wish : null;
    baseMiss = acked ? Math.max(0, tick - 1 - ackFrame) : INPUT_LIMITS.holdTicks;
    decay(now);
    return replayFromBase(Math.max(frame, tick - 1));
  }

  return {
    get ready() { return pred != null; },
    /** The newest input frame applied: `state` is the player after it (tick frame + 1). */
    get frame() { return frame; },
    get state() { return pred; },
    get prev() { return prev; },
    get offset() { return offset; },
    get baseTick() { return baseTick; },
    pendingFrames() { return [...pending.keys()].sort((a, b) => a - b); },

    rebase(tick, ackFrame, player, now) {
      rebase(tick, ackFrame, player, now);
    },

    reconcile(tick, ackFrame, player, now) {
      if (!pred) {
        rebase(tick, ackFrame, player, now);
        return null;
      }
      const old = clonePlayer(pred);
      const oldFrame = frame;
      decay(now);
      const replayed = rebase(tick, ackFrame, player, now);
      // Only a prediction for the same frame is a correction (a snapshot past every input is not).
      if (oldFrame < tick) return { error: null, snapped: false, replayed };
      const dx = old.x - pred.x;
      const dy = old.y - pred.y;
      const dz = old.z - pred.z;
      const error = Math.hypot(dx, dy, dz);
      // The offset applies to both predicted ticks, so the drawn blend between them stays put.
      offset = { x: offset.x + dx, y: offset.y + dy, z: offset.z + dz };
      let snapped = false;
      if (error > snapM || Math.hypot(offset.x, offset.y, offset.z) > snapM) {
        offset = { ...ZERO };
        snapped = true;
      }
      return { error, snapped, replayed };
    },

    push(f, wish, now) {
      if (!pred || !Number.isInteger(f) || f < baseTick) return { fired: false };
      pending.set(f, wish);
      trim();
      decay(now);
      if (f <= frame) {
        // A repeated or lowered frame (a resync down): replay from the base.
        replayFromBase(frame);
        return { fired: false };
      }
      for (let g = frame + 1; g < f; g++) stepOne(pred, g);
      prev = clonePlayer(pred);
      const fired = stepOne(pred, f);
      frame = f;
      return { fired };
    },

    /** The drawn local player at `now`: alpha in 0..1 blends from the previous predicted tick. */
    visual(now, alpha = 1) {
      if (!pred) return null;
      decay(now);
      const a = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
      const from = prev || pred;
      return {
        ...pred,
        mag: Array.isArray(pred.mag) ? pred.mag.slice() : pred.mag,
        x: from.x + (pred.x - from.x) * a + offset.x,
        y: from.y + (pred.y - from.y) * a + offset.y,
        z: from.z + (pred.z - from.z) * a + offset.z,
      };
    },

    reset() {
      pending.clear();
      base = null;
      pred = null;
      prev = null;
      frame = -1;
      ack = null;
      baseHold = null;
      baseMiss = INPUT_LIMITS.holdTicks;
      hold = null;
      miss = 0;
      offset = { ...ZERO };
      decayedAt = null;
    },
  };
}
