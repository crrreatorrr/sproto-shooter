// Quantized input codec and hard limits for a server-issued Shooter run.
// The log is inputs only. A client state, profile, or checkpoint blob is not a log.
import { fnv1a, stableStringify } from '../sim/hash.js';

export const PROTOCOL_VERSION = 1;

export const LIMITS = Object.freeze({
  maxSegmentFrames: 60 * 60 * 8,
  maxSegments: 24,
  maxTotalFrames: 60 * 60 * 45,
  maxSegmentText: 700000,
  maxTotalText: 2 * 1024 * 1024,
  maxActionsPerSegment: 32,
  maxCpuMs: 15000,
  maxStepMeters: 15,
  maxIdLength: 80,
});

export const BUTTONS = Object.freeze([
  'fire', 'zoom', 'sprint',
  'jump', 'dash', 'slide', 'reload', 'interact', 'medkit', 'skip',
  'gooBolt', 'chainZap', 'swarm', 'manaShield', 'meteor',
  'grapple',
]);

const FRAME_BYTES = 12;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_REV = new Int16Array(128);
B64_REV.fill(-1);
for (let i = 0; i < B64.length; i++) B64_REV[B64.charCodeAt(i)] = i;

export class ProtocolError extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

const HOSTILE = {
  state: 'bad_checkpoint',
  checkpoint: 'bad_checkpoint',
  checkpointState: 'bad_checkpoint',
  resume: 'bad_checkpoint',
  snapshot: 'bad_checkpoint',
  profile: 'injected_inventory',
  loot: 'injected_inventory',
  inventory: 'injected_inventory',
  guns: 'injected_inventory',
  loadout: 'injected_inventory',
  ammo: 'injected_inventory',
  resources: 'injected_inventory',
  dt: 'accelerated',
  timeScale: 'accelerated',
  accel: 'accelerated',
  skipTicks: 'accelerated',
  godMode: 'god_mode',
  god: 'god_mode',
  tuning: 'god_mode',
  debug: 'debug',
  pos: 'teleport',
  teleport: 'teleport',
  position: 'teleport',
};

function hostileKey(key) {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') return 'malformed';
  return HOSTILE[key] || null;
}

export function inspectValue(value, depth = 0) {
  if (depth > 12) return 'malformed';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'nan';
    return null;
  }
  if (value == null || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = inspectValue(value[i], depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  const keys = Object.keys(value);
  for (let i = 0; i < keys.length; i++) {
    const why = hostileKey(keys[i]);
    if (why) return why;
    const hit = inspectValue(value[keys[i]], depth + 1);
    if (hit) return hit;
  }
  return null;
}

function unwrapPi(yaw) {
  if (typeof yaw !== 'number' || !Number.isFinite(yaw)) throw new ProtocolError('nan');
  if (Math.abs(yaw) > 1e6) throw new ProtocolError('malformed');
  return Math.atan2(Math.sin(yaw), Math.cos(yaw));
}

function quantYaw(yaw) {
  const w = unwrapPi(yaw);
  let q = Math.round((w / Math.PI) * 32767);
  if (q > 32767) q = 32767;
  if (q < -32767) q = -32767;
  return q;
}

function quantPitch(pitch) {
  if (typeof pitch !== 'number' || !Number.isFinite(pitch)) throw new ProtocolError('nan');
  if (pitch < -Math.PI / 2 - 1e-4 || pitch > Math.PI / 2 + 1e-4) throw new ProtocolError('malformed');
  const clamped = Math.max(-1.5, Math.min(1.5, pitch));
  return Math.round((clamped / 1.5) * 32767);
}

function quantMove(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ProtocolError('nan');
  if (v < -1 - 1e-6 || v > 1 + 1e-6) throw new ProtocolError('malformed');
  const c = Math.max(-1, Math.min(1, v));
  return Math.max(-127, Math.min(127, Math.round(c * 127)));
}

function buttonMask(obj) {
  if (obj == null) return 0;
  if (typeof obj !== 'object' || Array.isArray(obj)) throw new ProtocolError('malformed');
  let mask = 0;
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key === 'god' || key === 'godMode') throw new ProtocolError('god_mode');
    if (key === 'debug') throw new ProtocolError('debug');
    const idx = BUTTONS.indexOf(key);
    if (idx < 0) throw new ProtocolError('malformed');
    if (obj[key]) mask |= 1 << idx;
  }
  return mask;
}

function actionId(action) {
  if (!action || typeof action !== 'object') throw new ProtocolError('malformed');
  const why = inspectValue(action);
  if (why) throw new ProtocolError(why);
  if (action.type === 'debug' || action.op === 'spawnGun' || action.op === 'giveTickets' || action.op === 'killAll') {
    throw new ProtocolError('debug');
  }
  if (action.op === 'toggleGod' || (action.op === 'setTuning' && action.args && action.args.key === 'godMode')) {
    throw new ProtocolError('god_mode');
  }
  if (action.type === 'transitionDone' && Object.keys(action).length === 1) return 1;
  throw new ProtocolError(action.type === 'debug' ? 'debug' : 'debug');
}

/** Pack one command into the fixed 12-byte frame. Extra actions are returned beside it. */
export function quantizeCommand(cmd) {
  if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd)) throw new ProtocolError('malformed');
  const why = inspectValue(cmd);
  if (why) throw new ProtocolError(why);
  const actions = cmd.actions || [];
  if (!Array.isArray(actions) || actions.length > 1) throw new ProtocolError('malformed');
  const slot = cmd.slot == null ? -1 : cmd.slot;
  const wheel = cmd.wheel == null ? 0 : cmd.wheel;
  if (typeof slot !== 'number' || !Number.isInteger(slot) || slot < -1 || slot > 4) throw new ProtocolError('malformed');
  if (typeof wheel !== 'number' || !Number.isInteger(wheel) || wheel < -4 || wheel > 4) throw new ProtocolError('malformed');
  return {
    yaw: quantYaw(cmd.yaw || 0),
    pitch: quantPitch(cmd.pitch || 0),
    moveX: quantMove(cmd.moveX || 0),
    moveZ: quantMove(cmd.moveZ || 0),
    held: buttonMask(cmd.held),
    pressed: buttonMask(cmd.pressed),
    slot,
    wheel,
    action: actions.length ? actionId(actions[0]) : 0,
  };
}

export function dequantizeCommand(q) {
  const held = {};
  const pressed = {};
  for (let i = 0; i < BUTTONS.length; i++) {
    if (q.held & (1 << i)) held[BUTTONS[i]] = true;
    if (q.pressed & (1 << i)) pressed[BUTTONS[i]] = true;
  }
  const cmd = {
    yaw: (q.yaw / 32767) * Math.PI,
    pitch: (q.pitch / 32767) * 1.5,
    moveX: q.moveX / 127,
    moveZ: q.moveZ / 127,
    held,
    pressed,
    slot: q.slot,
    wheel: q.wheel,
    actions: [],
  };
  if (q.action === 1) cmd.actions.push({ type: 'transitionDone' });
  return cmd;
}

function u8(n) {
  return n < 0 ? n + 256 : n;
}

function packFrame(q) {
  const yaw = q.yaw < 0 ? q.yaw + 65536 : q.yaw;
  const pitch = q.pitch < 0 ? q.pitch + 65536 : q.pitch;
  return [
    yaw & 255, (yaw >> 8) & 255,
    pitch & 255, (pitch >> 8) & 255,
    u8(q.moveX), u8(q.moveZ),
    q.held & 255, (q.held >> 8) & 255,
    q.pressed & 255, (q.pressed >> 8) & 255,
    u8(q.slot), u8(q.wheel),
  ];
}

function i16(lo, hi) {
  const n = lo | (hi << 8);
  return n >= 32768 ? n - 65536 : n;
}

function i8(n) {
  return n >= 128 ? n - 256 : n;
}

export function bytesToB64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >>> 18) & 63];
    out += B64[(n >>> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >>> 6) & 63] : '=';
    out += i + 2 < bytes.length ? B64[n & 63] : '=';
  }
  return out;
}

function b64Value(ch) {
  if (ch === '=') return -2;
  const c = ch.charCodeAt(0);
  if (c > 127) return -1;
  return B64_REV[c];
}

export function b64ToBytes(text) {
  if (typeof text !== 'string' || text.length === 0 || text.length % 4 !== 0) return null;
  const out = [];
  for (let i = 0; i < text.length; i += 4) {
    const v0 = b64Value(text[i]);
    const v1 = b64Value(text[i + 1]);
    const v2 = b64Value(text[i + 2]);
    const v3 = b64Value(text[i + 3]);
    if (v0 < 0 || v1 < 0) return null;
    if (v2 === -1 || v3 === -1) return null;
    if (v2 === -2 && v3 !== -2) return null;
    const n = (v0 << 18) | (v1 << 12) | ((v2 < 0 ? 0 : v2) << 6) | (v3 < 0 ? 0 : v3);
    out.push((n >>> 16) & 255);
    if (v2 !== -2) out.push((n >>> 8) & 255);
    if (v3 !== -2) out.push(n & 255);
  }
  return out;
}

export function encodeQuantized(qs) {
  const bytes = [];
  const actions = [];
  for (let i = 0; i < qs.length; i++) {
    if (qs[i].action) actions.push([i, qs[i].action]);
    const packed = packFrame(qs[i]);
    for (let b = 0; b < packed.length; b++) bytes.push(packed[b]);
  }
  return { frames: bytesToB64(bytes), n: qs.length, actions };
}

export function encodeFrames(commands) {
  const qs = [];
  for (let i = 0; i < commands.length; i++) qs.push(quantizeCommand(commands[i]));
  return encodeQuantized(qs);
}

export function decodeFrames(text, n, actions) {
  if (typeof text !== 'string') return { error: 'malformed' };
  if (text.length > LIMITS.maxSegmentText) return { error: 'oversized' };
  const bytes = b64ToBytes(text);
  if (!bytes || bytes.length !== n * FRAME_BYTES) return { error: 'malformed' };
  const actionAt = new Map();
  if (actions) {
    if (!Array.isArray(actions) || actions.length > LIMITS.maxActionsPerSegment) return { error: 'malformed' };
    for (let i = 0; i < actions.length; i++) {
      const row = actions[i];
      if (!Array.isArray(row) || row.length !== 2) return { error: 'malformed' };
      const [at, id] = row;
      if (typeof at !== 'number' || !Number.isInteger(at)) return { error: 'malformed' };
      if (at < 0) return { error: 'negative' };
      if (at >= n) return { error: 'malformed' };
      if (id === 2 || id === 3) return { error: id === 3 ? 'god_mode' : 'debug' };
      if (id !== 1) return { error: 'debug' };
      if (actionAt.has(at)) return { error: 'malformed' };
      actionAt.set(at, 1);
    }
  }
  const commands = new Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * FRAME_BYTES;
    const q = {
      yaw: i16(bytes[o], bytes[o + 1]),
      pitch: i16(bytes[o + 2], bytes[o + 3]),
      moveX: i8(bytes[o + 4]),
      moveZ: i8(bytes[o + 5]),
      held: bytes[o + 6] | (bytes[o + 7] << 8),
      pressed: bytes[o + 8] | (bytes[o + 9] << 8),
      slot: i8(bytes[o + 10]),
      wheel: i8(bytes[o + 11]),
      action: actionAt.get(i) || 0,
    };
    if (q.yaw < -32767 || q.yaw > 32767 || q.pitch < -32767 || q.pitch > 32767) return { error: 'malformed' };
    if (q.moveX < -127 || q.moveX > 127 || q.moveZ < -127 || q.moveZ > 127) return { error: 'malformed' };
    if (q.slot < -1 || q.slot > 4 || q.wheel < -4 || q.wheel > 4) return { error: 'malformed' };
    if (q.held > 0xffff || q.pressed > 0xffff) return { error: 'malformed' };
    commands[i] = dequantizeCommand(q);
  }
  return { commands };
}

const LOG_KEYS = ['v', 'binding', 'segments'];
const BIND_KEYS = ['accountId', 'sessionId', 'day', 'runId'];
const SEG_KEYS = ['i', 'from', 'tick0', 'n', 'frames', 'actions'];

function exactKeys(obj, allowed) {
  const keys = Object.keys(obj);
  if (keys.length !== allowed.length) return false;
  for (let i = 0; i < allowed.length; i++) if (keys.indexOf(allowed[i]) < 0) return false;
  return true;
}

export function validDay(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function validId(s) {
  return typeof s === 'string' && s.length <= LIMITS.maxIdLength && /^[A-Za-z0-9_.:@|-]+$/.test(s);
}

export function bindingHash(binding) {
  return fnv1a(stableStringify({
    accountId: binding.accountId,
    sessionId: binding.sessionId,
    day: binding.day,
    runId: binding.runId,
  }));
}

export function logDigest(log) {
  const segments = (log.segments || []).map((s) => ({
    i: s.i, from: s.from, tick0: s.tick0, n: s.n, frames: s.frames, actions: s.actions || [],
  }));
  return fnv1a(stableStringify({ v: log.v, binding: log.binding, segments }));
}

/**
 * Structural checks that do not run the sim.
 * Returns a reason string, or null when the log can be replayed.
 */
export function preflightLog(log) {
  if (!log || typeof log !== 'object' || Array.isArray(log)) return 'malformed';
  const hostile = inspectValue(log);
  if (hostile) return hostile;
  if (!exactKeys(log, LOG_KEYS)) return 'malformed';
  if (log.v !== PROTOCOL_VERSION) return 'unsupported_version';
  if (!log.binding || typeof log.binding !== 'object' || !exactKeys(log.binding, BIND_KEYS)) return 'malformed';
  if (!validId(log.binding.accountId) || !validId(log.binding.sessionId) || !validId(log.binding.runId)) return 'malformed';
  if (!validDay(log.binding.day)) return 'malformed';
  if (!Array.isArray(log.segments) || log.segments.length < 1 || log.segments.length > LIMITS.maxSegments) {
    return 'malformed';
  }
  let text = 0;
  let frames = 0;
  for (let i = 0; i < log.segments.length; i++) {
    const seg = log.segments[i];
    if (!seg || typeof seg !== 'object' || Array.isArray(seg)) return 'malformed';
    const keys = Object.keys(seg);
    for (let k = 0; k < keys.length; k++) if (SEG_KEYS.indexOf(keys[k]) < 0) return 'malformed';
    if (!('i' in seg) || !('from' in seg) || !('tick0' in seg) || !('n' in seg) || !('frames' in seg)) return 'malformed';
    if (typeof seg.i !== 'number' || !Number.isInteger(seg.i) || seg.i !== i) return seg.i < 0 ? 'negative' : 'malformed';
    if (typeof seg.tick0 !== 'number' || !Number.isInteger(seg.tick0)) return 'malformed';
    if (seg.tick0 < 0 || seg.n < 0) return 'negative';
    if (typeof seg.n !== 'number' || !Number.isInteger(seg.n) || seg.n < 1) return 'malformed';
    if (seg.n > LIMITS.maxSegmentFrames) return 'oversized';
    if (typeof seg.frames !== 'string') return Array.isArray(seg.frames) ? frameArrayReason(seg.frames) : 'malformed';
    if (seg.frames.length > LIMITS.maxSegmentText) return 'oversized';
    if (seg.from != null && (typeof seg.from !== 'string' || !/^[0-9a-f]{8}$/.test(seg.from))) return 'bad_checkpoint';
    text += seg.frames.length;
    frames += seg.n;
    if (i > 0) {
      const prev = log.segments[i - 1];
      if (seg.tick0 !== prev.tick0 + prev.n) return 'accelerated';
      if (seg.from == null) return 'bad_checkpoint';
    } else if (seg.tick0 !== 0 && seg.from == null) return 'accelerated';
  }
  if (text > LIMITS.maxTotalText || frames > LIMITS.maxTotalFrames) return 'oversized';
  return null;
}

function frameArrayReason(frames) {
  for (let i = 0; i < frames.length; i++) {
    const hit = inspectValue(frames[i]);
    if (hit) return hit;
  }
  return 'malformed';
}

export function movementDelta(prev, next) {
  if (!prev || !next) return 'malformed';
  const dx = next.x - prev.x;
  const dy = next.y - prev.y;
  const dz = next.z - prev.z;
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(dz)) return 'nan';
  if (Math.hypot(dx, dy, dz) > LIMITS.maxStepMeters) return 'teleport';
  return null;
}
