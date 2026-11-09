// The used-input log: the exact wish the director applied for each seat on each tick, including
// held and neutral substitutes. replayJSON v2 re-runs a match from it and must reach the same
// tick and state hash before a wager can settle.
//
// One seat-tick is 10 bytes, written as 20 hex chars (a tick is 40 chars, both seats):
//   int16 yaw    quantized like the input codec (-32767..32767 -> -pi..pi), -32768 = keep the
//                player's current yaw (no input has arrived yet)
//   int16 pitch  -32767..32767 -> -1.5..1.5, -32768 = keep
//   int8  moveX  -127..127 -> -1..1
//   int8  moveZ
//   uint8 buttons, input-codec bits: fire, zoom, sprint, jump, dash, reload, slide
//   uint8 meta   low 2 bits slot + 1 (0 = keep the gun), bits 2-3 source (input, hold, neutral)
//   uint8 rewind ticks back from this tick, already clamped by the director (sim 2)
//   uint8 frac   viewFrac, 0..255 (the shooter saw rewind - frac/256 ticks back)
// The director steps the sim with wishOfUsed(record), and replay decodes the same bytes with the
// same function, so a replay is bit-identical by construction.

export const SOURCE = Object.freeze({ input: 0, hold: 1, neutral: 2 });
export const TICK_HEX = 40;
const SEAT_HEX = TICK_HEX / 2;
/** Ticks per log chunk. Chunks keep exportState cheap to copy. */
export const CHUNK_TICKS = 30;

const BUTTONS = Object.freeze(['fire', 'zoom', 'sprint', 'jump', 'dash', 'reload', 'slide']);
/** fire, zoom, sprint: the held buttons a missing tick may repeat. Edges never repeat. */
export const HELD_MASK = 0b0000111;
const KEEP = -32768;

function quant(value, scale) {
  const q = Math.round((value / scale) * 32767);
  return Math.max(-32767, Math.min(32767, q));
}

function u8(value) {
  return Number.isInteger(value) ? Math.max(0, Math.min(255, value)) : 0;
}

/**
 * A decoded protocol wish (inputCodec.decodeInput) -> a used record. `view` is the director's
 * clamped { rewind, frac } for this frame.
 */
export function usedOf(wish, source = SOURCE.input, view = null) {
  let buttons = 0;
  for (let i = 0; i < BUTTONS.length; i++) if (wish[BUTTONS[i]]) buttons |= 1 << i;
  return {
    y: quant(wish.yaw, Math.PI),
    p: quant(wish.pitch, 1.5),
    mx: Math.max(-127, Math.min(127, Math.round(wish.moveX * 127))),
    mz: Math.max(-127, Math.min(127, Math.round(wish.moveZ * 127))),
    b: buttons,
    s: Number.isInteger(wish.slot) && wish.slot >= 0 && wish.slot <= 2 ? wish.slot : -1,
    src: source,
    r: view ? u8(view.rewind) : 0,
    f: view ? u8(view.frac) : 0,
  };
}

/** Neutral record: no move, no buttons, aim kept (null) or held, no rewind. */
export function neutralUsed(y = null, p = null, source = SOURCE.neutral) {
  return { y, p, mx: 0, mz: 0, b: 0, s: -1, src: source, r: 0, f: 0 };
}

/** The wish the sim steps with. Same arithmetic as inputCodec.decodeInput. */
export function wishOfUsed(u) {
  const out = {
    yaw: u.y == null ? undefined : (u.y / 32767) * Math.PI,
    pitch: u.p == null ? undefined : (u.p / 32767) * 1.5,
    moveX: u.mx / 127,
    moveZ: u.mz / 127,
    slot: u.s,
    rewind: u.r || 0,
    viewFrac: u.f || 0,
  };
  for (let i = 0; i < BUTTONS.length; i++) out[BUTTONS[i]] = (u.b & (1 << i)) !== 0;
  return out;
}

function hex(value, bytes) {
  const mod = bytes === 2 ? 0x10000 : 0x100;
  return ((value + mod) % mod).toString(16).padStart(bytes * 2, '0');
}

function signed(text, bytes) {
  const v = parseInt(text, 16);
  const half = bytes === 2 ? 0x8000 : 0x80;
  return v >= half ? v - half * 2 : v;
}

function encodeOne(u) {
  return hex(u.y == null ? KEEP : u.y, 2)
    + hex(u.p == null ? KEEP : u.p, 2)
    + hex(u.mx, 1)
    + hex(u.mz, 1)
    + hex(u.b & 0x7f, 1)
    + hex(((u.s + 1) & 3) | ((u.src & 3) << 2), 1)
    + hex(u8(u.r), 1)
    + hex(u8(u.f), 1);
}

/** Both seats of one tick -> 40 hex chars. */
export function encodeUsedTick(pair) {
  return encodeOne(pair[0]) + encodeOne(pair[1]);
}

const HEX_RE = /^[0-9a-f]*$/;

function decodeOne(text, at) {
  const y = signed(text.slice(at, at + 4), 2);
  const p = signed(text.slice(at + 4, at + 8), 2);
  const mx = signed(text.slice(at + 8, at + 10), 1);
  const mz = signed(text.slice(at + 10, at + 12), 1);
  const b = parseInt(text.slice(at + 12, at + 14), 16);
  const meta = parseInt(text.slice(at + 14, at + 16), 16);
  const r = parseInt(text.slice(at + 16, at + 18), 16);
  const f = parseInt(text.slice(at + 18, at + 20), 16);
  if (b & 0x80 || meta > 0x0f || mx < -127 || mz < -127) return null;
  if ((y !== KEEP && y < -32767) || (p !== KEEP && p < -32767)) return null;
  const src = (meta >> 2) & 3;
  if (src > SOURCE.neutral) return null;
  return {
    y: y === KEEP ? null : y,
    p: p === KEEP ? null : p,
    mx,
    mz,
    b,
    s: (meta & 3) - 1,
    src,
    r,
    f,
  };
}

/**
 * Hex chunks -> [[seat0, seat1], ...]. Returns null on any malformed chunk, so replay can refuse
 * the log instead of guessing.
 */
export function decodeUsedLog(chunks) {
  if (!Array.isArray(chunks)) return null;
  const ticks = [];
  for (const chunk of chunks) {
    if (typeof chunk !== 'string' || chunk.length % TICK_HEX !== 0 || !HEX_RE.test(chunk)) return null;
    for (let at = 0; at < chunk.length; at += TICK_HEX) {
      const a = decodeOne(chunk, at);
      const b = decodeOne(chunk, at + SEAT_HEX);
      if (!a || !b) return null;
      ticks.push([a, b]);
    }
  }
  return ticks;
}

/** The pair logged for `tick`, or null. Reads one tick out of its chunk. */
export function usedTickAt(chunks, tick) {
  if (!Array.isArray(chunks) || !Number.isInteger(tick) || tick < 0) return null;
  const chunk = chunks[Math.floor(tick / CHUNK_TICKS)];
  const at = (tick % CHUNK_TICKS) * TICK_HEX;
  if (typeof chunk !== 'string' || chunk.length < at + TICK_HEX) return null;
  const a = decodeOne(chunk, at);
  const b = decodeOne(chunk, at + SEAT_HEX);
  return a && b ? [a, b] : null;
}

/**
 * Append one tick to a chunk list in place, and return the pair as the log now holds it
 * (decoded back from its hex). The director steps the sim with this decoded pair, so a replay of
 * the log is the same match by construction, even if a record ever failed to round-trip.
 */
export function appendUsedTick(chunks, pair) {
  const text = encodeUsedTick(pair);
  const a = decodeOne(text, 0);
  const b = decodeOne(text, SEAT_HEX);
  if (!a || !b) throw new Error('used log: a record does not encode');
  const last = chunks.length ? chunks[chunks.length - 1] : null;
  if (last != null && last.length < CHUNK_TICKS * TICK_HEX) chunks[chunks.length - 1] = last + text;
  else chunks.push(text);
  return [a, b];
}
