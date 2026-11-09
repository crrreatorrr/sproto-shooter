// Fixed-step free arena. Two equal fighters, no loot, no client winner.
//
// Sim 2 (SHOOTER-S2b):
// - Lag compensation. The state keeps a 12-tick history ring (REWIND.historyTicks) of {x, y, z, alive, invuln} per
//   player. A shot is traced from the shooter's current position against the target's capsule
//   interpolated from history at the tick the shooter saw (wish.viewTick + viewFrac/256, at most
//   REWIND.maxTicks back). invuln comes from the rewound tick, alive from the current one.
// - Split seed. spawnSeed (public) places the spawns; combatSeed (secret until RESULT) seeds
//   both seats' RNG with all 128 bits of sfc32 state, taken from sha256(combatSeed). The raw
//   combat seed is not kept in the state. Snapshots carry publicStateHash (the state without the
//   RNG); replays check the full hashState and stateSha256.
// - No crits. The only randomness left is pellet spread.
import { TUNING } from '../../data/tuning.js';
import { rangeFalloff } from '../../data/guns.js';
import { createRng, float, next } from '../../core/rng.js';
import { sha256Hex } from '../../core/sha256.js';
import { dirFromYawPitch, deg, yawTo } from '../../core/math.js';
import { quantizeForHash, stableStringify, verifyStateHash } from '../hash.js';
import { rayCapsule } from './hit.js';
import {
  DT, LOADOUT, MATCH_TICKS, RESERVE, REWIND, SPAWN_RADIUS, STAGE_ID,
} from './rules.js';

const MAX_HP = TUNING.maxHp * 1000;
const MAX_SHIELD = TUNING.maxShield * 1000;

function q4(n) {
  return Math.round(n * 10000) / 10000;
}

/**
 * The four 32-bit words of sfc32 state a string combat seed starts from: the first 128 bits of
 * sha256('sproto-shooter:combat:' + seed). A 32-bit seed (the old FNV-1a) could be brute-forced
 * from a snapshot hash; 128 bits cannot.
 */
export function combatRngWords(combatSeed) {
  const digest = sha256Hex(`sproto-shooter:combat:${combatSeed}`);
  const words = [];
  for (let i = 0; i < 4; i++) words.push(parseInt(digest.slice(i * 8, i * 8 + 8), 16) >>> 0);
  return words;
}

/**
 * The RNG both seats start from. A number is a 32-bit seed (tests, replay v1, the mirrored
 * golden); a string (the host's secret hex combat seed) fills all 128 bits of sfc32 state.
 */
function combatRng(combatSeed) {
  if (typeof combatSeed !== 'string') return createRng((Number(combatSeed) >>> 0) || 1);
  const [a, b, c, d] = combatRngWords(combatSeed);
  const r = { a, b, c, d: d || 1 };
  for (let i = 0; i < 12; i++) next(r);
  return r;
}

export function spawnsFor(seed) {
  const angle = ((seed >>> 0) % 360) * Math.PI / 180;
  const x = q4(Math.cos(angle) * SPAWN_RADIUS);
  const z = q4(Math.sin(angle) * SPAWN_RADIUS);
  const a = { x, y: 0, z };
  const b = { x: q4(-x), y: 0, z: q4(-z) };
  return [a, b];
}

function makePlayer(seat, pos, yaw, rng) {
  return {
    seat,
    x: pos.x, y: 0, z: pos.z,
    vx: 0, vy: 0, vz: 0,
    yaw: q4(yaw), pitch: 0,
    hp: MAX_HP,
    shield: MAX_SHIELD,
    shieldDelay: 0,
    alive: true,
    onGround: true,
    invuln: 0,
    dashT: 0, dashCd: 0, dashX: 0, dashZ: 0,
    slot: 0,
    mag: LOADOUT.map((gun) => gun.stats.magSize),
    shells: RESERVE.shells,
    sniper: RESERVE.sniper,
    fireCd: 0,
    reloadT: 0,
    swapT: 0,
    rng: { ...rng },
  };
}

function histEntry(tick, p) {
  return { t: tick, x: p.x, y: p.y, z: p.z, alive: p.alive, invuln: p.invuln };
}

/** Write both players' current state into the history ring as tick `tick`. */
function record(state, tick) {
  const slot = tick % REWIND.historyTicks;
  for (let i = 0; i < 2; i++) state.hist[i][slot] = histEntry(tick, state.players[i]);
}

/**
 * createMatch(spawnSeed, combatSeed). combatSeed defaults to spawnSeed (replay v1 and the
 * mirrored golden); the director always passes its secret one.
 */
export function createMatch(spawnSeed, combatSeed = spawnSeed) {
  const n = spawnSeed >>> 0;
  const rng = combatRng(combatSeed);
  const points = spawnsFor(n);
  const yaw0 = yawTo(points[0], points[1]);
  const yaw1 = yawTo(points[1], points[0]);
  const state = {
    spawnSeed: n,
    stage: STAGE_ID,
    tick: 0,
    phase: 'live',
    outcome: null,
    winner: null,
    reason: null,
    players: [
      makePlayer(0, points[0], yaw0, rng),
      makePlayer(1, points[1], yaw1, rng),
    ],
    hist: [[], []],
  };
  for (let i = 0; i < REWIND.historyTicks; i++) {
    state.hist[0].push(null);
    state.hist[1].push(null);
  }
  record(state, 0);
  return state;
}

function viewOf(wish, tick) {
  // rewind (ticks back from the frame) wins over an absolute viewTick: the director's used log
  // stores the clamped rewind.
  let back = 0;
  if (Number.isInteger(wish.rewind)) back = wish.rewind;
  else if (Number.isInteger(wish.viewTick)) back = tick - wish.viewTick;
  let frac = Number.isInteger(wish.viewFrac) ? Math.max(0, Math.min(REWIND.fracSteps - 1, wish.viewFrac)) : 0;
  if (back < 0) { back = 0; frac = 0; }
  if (back > REWIND.maxTicks) { back = REWIND.maxTicks; frac = 0; }
  // History starts at tick 0.
  if (back > tick) { back = tick; frac = 0; }
  return { back, frac };
}

export function normalizeWish(player, raw, tick = 0) {
  const wish = raw || {};
  const num = (value, fallback) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
  let slot = -1;
  if (Number.isInteger(wish.slot) && wish.slot >= 0 && wish.slot <= 2) slot = wish.slot;
  const view = viewOf(wish, tick);
  return {
    yaw: num(wish.yaw, player.yaw),
    pitch: Math.max(-1.5, Math.min(1.5, num(wish.pitch, player.pitch))),
    moveX: Math.max(-1, Math.min(1, num(wish.moveX, 0))),
    moveZ: Math.max(-1, Math.min(1, num(wish.moveZ, 0))),
    fire: !!wish.fire,
    zoom: !!wish.zoom,
    sprint: !!wish.sprint && !wish.zoom,
    jump: !!wish.jump,
    dash: !!wish.dash,
    reload: !!wish.reload,
    slot,
    rewind: view.back,
    viewFrac: view.frac,
  };
}

function histAt(state, seat, tick) {
  const entry = state.hist[seat][tick % REWIND.historyTicks];
  return entry && entry.t === tick ? entry : null;
}

/**
 * The target's capsule as the shooter saw it while stepping frame `frame`: interpolated between
 * history ticks base and base + 1, where base = frame - rewind and t = viewFrac / 256. Tick
 * frame + 1 is the target's position this step (written before the shots), so rewind 0 with
 * frac 0 is the start of this tick. invuln is the rewound tick's; alive is NOT taken from here.
 */
export function rewoundTarget(state, seat, frame, rewind, viewFrac) {
  const base = frame - rewind;
  const a = histAt(state, seat, base) || histAt(state, seat, frame + 1);
  const b = histAt(state, seat, base + 1) || a;
  const t = viewFrac / REWIND.fracSteps;
  return {
    x: q4(a.x + (b.x - a.x) * t),
    y: q4(a.y + (b.y - a.y) * t),
    z: q4(a.z + (b.z - a.z) * t),
    invuln: a.invuln,
    base,
    rewind,
    viewFrac,
  };
}

/** Position of `seat` at fractional history tick `at` (harness and tests). Null when not kept. */
export function historyAt(state, seat, at) {
  const base = Math.floor(at);
  const a = histAt(state, seat, base);
  if (!a) return null;
  const b = histAt(state, seat, base + 1) || a;
  const t = at - base;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, invuln: a.invuln, alive: a.alive };
}

/**
 * Movement for one player and one tick: look, gun swap, dash, ground/air control, jump,
 * gravity and the arena wall. Pure: it only reads `wish` and mutates `p`. The caller
 * normalizes the wish (normalizeWish) and skips dead players. Client prediction (S3) runs the
 * same function on its local copy.
 */
export function movePlayer(p, wish, dt) {
  p.yaw = q4(wish.yaw);
  p.pitch = q4(Math.max(-1.5, Math.min(1.5, wish.pitch)));
  if (wish.slot >= 0 && wish.slot !== p.slot) {
    p.slot = wish.slot;
    p.reloadT = 0;
    p.swapT = LOADOUT[p.slot].stats.swapTime;
  }
  const sy = Math.sin(p.yaw);
  const cy = Math.cos(p.yaw);
  let wx = -sy * wish.moveZ + cy * wish.moveX;
  let wz = -cy * wish.moveZ - sy * wish.moveX;
  const wl = Math.hypot(wx, wz);
  if (wl > 1) { wx /= wl; wz /= wl; }
  const maxSpeed = wish.sprint && wish.moveZ > 0 ? TUNING.sprintSpeed : TUNING.walkSpeed;
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  if (wish.dash && p.dashCd <= 0) {
    const dl = Math.hypot(wx, wz);
    p.dashX = dl > 0.1 ? wx / dl : -sy;
    p.dashZ = dl > 0.1 ? wz / dl : -cy;
    p.dashT = TUNING.dashTime;
    p.dashCd = TUNING.dashCd;
    p.invuln = Math.max(p.invuln, TUNING.dashInvuln);
  }
  if (p.dashT > 0) {
    p.dashT -= dt;
    p.vx = p.dashX * TUNING.dashSpeed;
    p.vz = p.dashZ * TUNING.dashSpeed;
    p.vy = Math.max(p.vy, 0);
    if (p.dashT < 0) p.dashT = 0;
  } else if (p.onGround) {
    const tx = wx * maxSpeed;
    const tz = wz * maxSpeed;
    const dx = tx - p.vx;
    const dz = tz - p.vz;
    const dl = Math.hypot(dx, dz);
    const hs = Math.hypot(p.vx, p.vz);
    const acc = (wl > 0.01 ? TUNING.groundAccel : TUNING.friction * Math.max(hs, 2)) * dt;
    if (dl > 0) {
      const k = Math.min(1, acc / dl);
      p.vx += dx * k;
      p.vz += dz * k;
    }
  } else {
    const hs = Math.hypot(p.vx, p.vz);
    const cap = Math.max(hs, TUNING.walkSpeed);
    p.vx += wx * TUNING.airAccel * dt;
    p.vz += wz * TUNING.airAccel * dt;
    const nh = Math.hypot(p.vx, p.vz);
    if (nh > cap) { p.vx *= cap / nh; p.vz *= cap / nh; }
  }
  if (wish.jump && p.onGround) {
    p.vy = TUNING.jumpVel;
    p.onGround = false;
  }
  if (p.dashT <= 0) p.vy -= TUNING.gravity * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.z += p.vz * dt;
  if (p.y <= 0) {
    p.y = 0;
    if (p.vy < 0) p.vy = 0;
    p.onGround = true;
  } else p.onGround = false;
  const radius = Math.hypot(p.x, p.z);
  const maxR = TUNING.arenaRadius - TUNING.playerRadius;
  if (radius > maxR && radius > 0) {
    const nx = p.x / radius;
    const nz = p.z / radius;
    p.x = nx * maxR;
    p.z = nz * maxR;
    const vr = p.vx * nx + p.vz * nz;
    if (vr > 0) { p.vx -= nx * vr; p.vz -= nz * vr; }
  }
}

function separate(players) {
  const a = players[0];
  const b = players[1];
  let dx = b.x - a.x;
  let dz = b.z - a.z;
  let dist = Math.hypot(dx, dz);
  const min = TUNING.playerRadius * 2;
  if (dist >= min) return;
  if (dist < 1e-6) { dx = 1; dz = 0; dist = 1; }
  const push = (min - dist) / 2;
  const nx = dx / dist;
  const nz = dz / dist;
  a.x -= nx * push;
  a.z -= nz * push;
  b.x += nx * push;
  b.z += nz * push;
}

function snap(p) {
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

function reserveOf(p, gun) {
  if (gun.ammoType === 'shells') return p.shells;
  if (gun.ammoType === 'sniper') return p.sniper;
  return 0;
}

function takeReserve(p, gun, n) {
  if (gun.ammoType === 'shells') p.shells -= n;
  else if (gun.ammoType === 'sniper') p.sniper -= n;
}

/**
 * Weapon timers, reload and ammo for one player and one tick. Returns true when the gun fires
 * this tick (one magazine round spent, cooldown armed); traceShots then rolls the pellets.
 * Pure: it only reads `wish` and mutates `p`. It never touches `p.rng`.
 */
export function weaponTick(p, wish, dt) {
  p.fireCd = Math.max(0, p.fireCd - dt);
  p.swapT = Math.max(0, p.swapT - dt);
  if (p.reloadT > 0) {
    p.reloadT = Math.max(0, p.reloadT - dt);
    if (p.reloadT === 0) finishReload(p);
    return false;
  }
  const gun = LOADOUT[p.slot];
  if (wish.reload && p.mag[p.slot] < gun.stats.magSize && canReload(p, gun)) {
    p.reloadT = gun.stats.reloadTime;
    return false;
  }
  if (!wish.fire || p.swapT > 0 || p.fireCd > 0) return false;
  if (p.mag[p.slot] <= 0) {
    if (canReload(p, gun)) p.reloadT = gun.stats.reloadTime;
    return false;
  }
  p.mag[p.slot] -= 1;
  p.fireCd = 1 / gun.stats.fireRate;
  // Auto-reload on the last round. The unsplit step armed this after the pellet rolls; traceShots
  // never reads reloadT, mag or reserve, so the state is bit-identical (tests/pvp-sim-split).
  if (p.mag[p.slot] <= 0 && canReload(p, gun)) p.reloadT = gun.stats.reloadTime;
  return true;
}

/**
 * Hitscan for one shot that weaponTick allowed: spread, ray against the target's capsule and
 * range falloff. No crits in PvP (sim 2). `target` is any {x, y, z} capsule base: the sim passes
 * the rewound one. Returns the damage of each pellet that hits, in milli-HP. It only advances
 * `p.rng` and never writes `target`.
 */
export function traceShots(p, target, wish) {
  const hits = [];
  const gun = LOADOUT[p.slot];
  const pellets = gun.stats.pellets || 1;
  const spread = deg(wish.zoom ? gun.stats.adsSpread : gun.stats.spread);
  const eye = { x: p.x, y: p.y + TUNING.eyeHeight, z: p.z };
  for (let i = 0; i < pellets; i++) {
    const jy = (float(p.rng) - 0.5) * spread;
    const jp = (float(p.rng) - 0.5) * spread;
    const dir = dirFromYawPitch(p.yaw + jy, p.pitch + jp);
    const dist = rayCapsule(eye, dir, target.x, target.z, target.y, target.y + TUNING.playerHeight, TUNING.playerRadius);
    if (dist < 0) continue;
    const fall = rangeFalloff(gun.range, dist);
    if (fall <= 0) continue;
    const raw = gun.stats.damage * fall;
    hits.push(Math.max(0, Math.round(raw * 1000)));
  }
  return hits;
}

function canReload(p, gun) {
  return gun.infiniteReserve || reserveOf(p, gun) > 0;
}

function finishReload(p) {
  const gun = LOADOUT[p.slot];
  const need = gun.stats.magSize - p.mag[p.slot];
  if (need <= 0) return;
  const got = gun.infiniteReserve ? need : Math.min(need, reserveOf(p, gun));
  if (!gun.infiniteReserve) takeReserve(p, gun, got);
  p.mag[p.slot] += got;
}

/**
 * Damage lands only on a target that is alive now (no hits on corpses) and was not invulnerable
 * at the rewound tick. Returns the milli-HP applied (0 when blocked or missed).
 */
function applyHits(target, hits, invuln) {
  if (!target.alive || invuln > 0 || hits.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < hits.length; i++) {
    total += hits[i];
    let left = hits[i];
    const absorb = Math.min(target.shield, left);
    target.shield -= absorb;
    left -= absorb;
    target.hp -= left;
    target.shieldDelay = TUNING.shieldDelay;
  }
  return total;
}

function regen(p, dt) {
  if (!p.alive) return;
  p.shieldDelay = Math.max(0, p.shieldDelay - dt);
  if (p.shieldDelay <= 0 && p.shield < MAX_SHIELD) {
    p.shield = Math.min(MAX_SHIELD, p.shield + Math.round(TUNING.shieldRegen * dt * 1000));
  }
}

function resolve(state) {
  const a = state.players[0];
  const b = state.players[1];
  if (a.hp <= 0) { a.hp = 0; a.alive = false; a.vx = a.vy = a.vz = 0; }
  if (b.hp <= 0) { b.hp = 0; b.alive = false; b.vx = b.vy = b.vz = 0; }
  if (!a.alive && !b.alive) return finish(state, 'draw', null, 'double_ko');
  if (!a.alive) return finish(state, 'ko', 1, 'ko');
  if (!b.alive) return finish(state, 'ko', 0, 'ko');
  if (state.tick >= MATCH_TICKS) {
    const sa = a.hp + a.shield;
    const sb = b.hp + b.shield;
    if (sa === sb) return finish(state, 'draw', null, 'time');
    return finish(state, 'time', sa > sb ? 0 : 1, 'time');
  }
  return state;
}

function finish(state, outcome, winner, reason) {
  state.phase = 'done';
  state.outcome = outcome;
  state.winner = winner;
  state.reason = reason;
  return state;
}

/**
 * One tick. `events`, when given, receives one entry per shot fired:
 * { tick, shooter, dmg, pellets, hits, rewind, viewFrac } (dmg 0 = missed or blocked). Events are
 * not part of the state.
 */
export function step(state, wishes, events = null) {
  if (state.phase === 'done') return state;
  const frame = state.tick;
  const wish = [
    normalizeWish(state.players[0], wishes && wishes[0], frame),
    normalizeWish(state.players[1], wishes && wishes[1], frame),
  ];
  for (let i = 0; i < 2; i++) if (state.players[i].alive) movePlayer(state.players[i], wish[i], DT);
  separate(state.players);
  for (const p of state.players) snap(p);
  // This tick's positions go into history first, so rewind 0 can interpolate toward them.
  record(state, frame + 1);
  const seen = [
    rewoundTarget(state, 1, frame, wish[0].rewind, wish[0].viewFrac),
    rewoundTarget(state, 0, frame, wish[1].rewind, wish[1].viewFrac),
  ];
  const fired = [false, false];
  const hits = [[], []];
  for (let i = 0; i < 2; i++) {
    const p = state.players[i];
    if (!p.alive || !weaponTick(p, wish[i], DT)) continue;
    fired[i] = true;
    hits[i] = traceShots(p, seen[i], wish[i]);
  }
  const dealt = [
    applyHits(state.players[1], hits[0], seen[0].invuln),
    applyHits(state.players[0], hits[1], seen[1].invuln),
  ];
  if (events) {
    for (let i = 0; i < 2; i++) {
      if (!fired[i]) continue;
      events.push({
        tick: frame,
        shooter: i,
        dmg: dealt[i],
        pellets: LOADOUT[state.players[i].slot].stats.pellets || 1,
        hits: hits[i].length,
        rewind: wish[i].rewind,
        viewFrac: wish[i].viewFrac,
      });
    }
  }
  for (const p of state.players) {
    snap(p);
    regen(p, DT);
    snap(p);
  }
  state.tick += 1;
  resolve(state);
  record(state, state.tick);
  return state;
}

/** The full state hash (FNV-1a, 32 bits): replay and RESULT. Includes the combat RNG. */
export function hashState(state) {
  return verifyStateHash(state);
}

function withoutRng(state) {
  return { ...state, players: state.players.map(({ rng: _rng, ...rest }) => rest) };
}

/**
 * The hash snapshots send clients: the state without either player's RNG, so a client never
 * gets a checksum of the secret RNG state to search against.
 */
export function publicStateHash(state) {
  return verifyStateHash(withoutRng(state));
}

/** SHA-256 of the same canonical, quantized state hashState covers: the settlement hash. */
export function stateSha256(state) {
  return sha256Hex(stableStringify(quantizeForHash(state)));
}

export function snapshotOf(state) {
  return {
    tick: state.tick,
    hash: hashState(state),
    phase: state.phase,
    outcome: state.outcome,
    winner: state.winner,
    reason: state.reason,
    players: state.players.map((p) => ({
      seat: p.seat,
      x: p.x, y: p.y, z: p.z,
      yaw: p.yaw, pitch: p.pitch,
      vx: p.vx, vz: p.vz,
      hp: p.hp, shield: p.shield,
      alive: p.alive,
      slot: p.slot,
    })),
  };
}

/** Symmetric duel used as the cross-runtime golden. */
export function scriptedMatch(seed = 7, ticks = 180) {
  const probe = createMatch(seed);
  const yaws = [probe.players[0].yaw, probe.players[1].yaw];
  const inputs = [];
  for (let i = 0; i < ticks; i++) {
    inputs.push(yaws.map((yaw) => ({
      yaw, pitch: 0, moveX: 0, moveZ: 1, fire: true, zoom: true, sprint: false, jump: false, dash: false, reload: false, slot: 0,
    })));
  }
  return { seed, inputs };
}

/** Replay v1: { seed, inputs } or { spawnSeed, combatSeed, inputs }. */
export function replay(body) {
  const spawn = body.spawnSeed != null ? body.spawnSeed : body.seed;
  const combat = body.combatSeed != null ? body.combatSeed : spawn;
  const state = createMatch(spawn >>> 0, typeof combat === 'string' ? combat : combat >>> 0);
  const inputs = Array.isArray(body.inputs) ? body.inputs : [];
  for (let i = 0; i < inputs.length; i++) step(state, inputs[i]);
  return state;
}
