// Gamepad reading with pure, testable mapping logic: deadzones, response curve, edge detection,
// latch-on-connect, tap/hold, menu auto-repeat and spatial menu focus. No DOM here: the caller passes
// `navigator.getGamepads()` (or fakes in tests). Glyph and style helpers follow sproto-duel's Gamepad.ts.
import { PAD, PAD_BUTTONS } from '../data/gamepad.js';

export { PAD_BUTTONS };
export const BUTTON_INDEX = Object.fromEntries(PAD_BUTTONS.map((b, i) => [b, i]));
const LT = BUTTON_INDEX.lt, RT = BUTTON_INDEX.rt;

/**
 * Radial deadzone, rescaled so the output starts at 0 just past the deadzone and reaches 1 at `outer`.
 * Returns { x, y, mag } with the input's direction and magnitude 0..1.
 */
export function radialDeadzone(x, y, deadzone, outer = PAD.outerDeadzone) {
  x = Number.isFinite(x) ? x : 0;
  y = Number.isFinite(y) ? y : 0;
  const m = Math.hypot(x, y);
  if (!(m > deadzone)) return { x: 0, y: 0, mag: 0 };
  const mag = Math.min(1, (m - deadzone) / Math.max(1e-6, outer - deadzone));
  return { x: (x / m) * mag, y: (y / m) * mag, mag };
}

/** Response curve on a deadzoned stick: keeps direction, raises the magnitude to `exponent`. */
export function curveStick(s, exponent) {
  if (!s.mag) return { x: 0, y: 0, mag: 0 };
  const mag = Math.pow(s.mag, exponent);
  return { x: (s.x / s.mag) * mag, y: (s.y / s.mag) * mag, mag };
}

/**
 * Raw button state for one pad: analog triggers use press/release hysteresis so a resting finger
 * does not chatter. `prev` is last frame's state for the same pad (or null).
 */
export function readButtons(pad, prev) {
  const out = new Array(PAD_BUTTONS.length).fill(false);
  const buttons = pad && pad.buttons ? pad.buttons : [];
  for (let i = 0; i < out.length; i++) {
    const b = buttons[i];
    if (!b) continue;
    const value = typeof b === 'number' ? b : b.value || 0;
    const pressed = typeof b === 'number' ? b > 0.5 : !!b.pressed;
    if (i === LT || i === RT) {
      const was = prev ? prev[i] : false;
      out[i] = value > (was ? PAD.triggerPress * PAD.triggerRelease : PAD.triggerPress) || (pressed && value === 0);
    } else out[i] = pressed;
  }
  return out;
}

/** True if the pad shows deliberate use this frame (a button press, a stick or trigger pushed well past drift). */
export function padActivity(pad, raw, prevRaw) {
  for (let i = 0; i < raw.length; i++) if (raw[i] && !(prevRaw && prevRaw[i]) && i !== BUTTON_INDEX.home) return true;
  const a = pad && pad.axes ? pad.axes : [];
  const t = PAD.activity;
  return Math.hypot(a[0] || 0, a[1] || 0) > t || Math.hypot(a[2] || 0, a[3] || 0) > t;
}

/**
 * Tracks pads across frames. Picks one pad for single player: the last one used, else the first
 * standard-mapping pad (controller 1). Latch on connect: any button already held when a pad first
 * appears (page load, hub -> game travel, reconnect, switching pads) reads as up until it is released,
 * so the A that confirmed a hub portal never confirms anything here.
 */
export function createPadTracker() {
  const seen = new Map(); // index -> { id, raw, latched }
  let active = -1;
  let prevDown = new Array(PAD_BUTTONS.length).fill(false);

  function empty() {
    return {
      connected: false, index: -1, id: '', justConnected: false, activity: false,
      down: new Array(PAD_BUTTONS.length).fill(false), pressed: new Array(PAD_BUTTONS.length).fill(false), released: new Array(PAD_BUTTONS.length).fill(false),
      move: { x: 0, y: 0, mag: 0 }, look: { x: 0, y: 0, mag: 0 }, lt: 0, rt: 0, axes: [0, 0, 0, 0],
    };
  }

  return {
    get activeIndex() { return active; },
    /** `pads` is what navigator.getGamepads() returned this frame (any array-like, nulls allowed). */
    update(pads) {
      const list = [];
      for (const p of pads || []) if (p && p.connected !== false && p.mapping === 'standard') list.push(p);
      const live = new Set(list.map((p) => p.index));
      for (const i of [...seen.keys()]) if (!live.has(i)) seen.delete(i); // unplugged: forget, so a reconnect latches again
      let switched = false;
      let usedNow = -1;
      for (const p of list) {
        let s = seen.get(p.index);
        const fresh = !s || s.id !== p.id;
        const raw = readButtons(p, s ? s.raw : null);
        if (fresh) {
          s = { id: p.id, raw, latched: raw.slice() };
          seen.set(p.index, s);
          continue; // a brand new pad cannot "use" anything on its first frame: everything held is latched
        }
        const act = padActivity(p, raw, s.raw);
        s.raw = raw;
        for (let i = 0; i < raw.length; i++) if (!raw[i]) s.latched[i] = false;
        if (act && (usedNow < 0 || p.index === active)) usedNow = p.index; // the current pad wins a tie
      }
      if (usedNow >= 0 && usedNow !== active) { active = usedNow; switched = true; }
      if (!live.has(active)) { active = list.length ? list[0].index : -1; switched = active >= 0; }
      const f = empty();
      if (active < 0) { prevDown = f.down; return f; }
      const pad = list.find((p) => p.index === active);
      const s = seen.get(active);
      f.connected = true;
      f.index = active;
      f.id = pad.id || '';
      f.justConnected = switched;
      if (switched) {
        // The newly picked pad starts with everything it holds latched, and no edges this frame.
        for (let i = 0; i < s.raw.length; i++) if (s.raw[i]) s.latched[i] = true;
        prevDown = s.raw.map((v, i) => v && !s.latched[i]);
      }
      for (let i = 0; i < f.down.length; i++) {
        f.down[i] = s.raw[i] && !s.latched[i];
        f.pressed[i] = f.down[i] && !prevDown[i];
        f.released[i] = !f.down[i] && prevDown[i];
      }
      prevDown = f.down.slice();
      f.activity = usedNow === active;
      const ax = pad.axes || [];
      f.axes = [0, 1, 2, 3].map((i) => (Number.isFinite(ax[i]) ? ax[i] : 0));
      f.move = radialDeadzone(ax[0], ax[1], PAD.moveDeadzone);
      f.look = radialDeadzone(ax[2], ax[3], PAD.lookDeadzone);
      const btn = pad.buttons || [];
      f.lt = s.latched[LT] ? 0 : (btn[LT] && (typeof btn[LT] === 'number' ? btn[LT] : btn[LT].value)) || 0;
      f.rt = s.latched[RT] ? 0 : (btn[RT] && (typeof btn[RT] === 'number' ? btn[RT] : btn[RT].value)) || 0;
      return f;
    },
  };
}

/** Frame helpers by button name. */
export const isDown = (f, name) => !!f.down[BUTTON_INDEX[name]];
export const wasPressed = (f, name) => !!f.pressed[BUTTON_INDEX[name]];
export const wasReleased = (f, name) => !!f.released[BUTTON_INDEX[name]];

/**
 * Tap vs hold on one button. `update(pressed, down, nowMs, canHold)` returns 'tap', 'hold' or null.
 * `pressed` is this frame's press edge and `down` the held state. With nothing to hold for (`canHold`
 * false at the press) the tap fires on the press, with no delay. Otherwise a release before `holdMs`
 * is a tap and reaching `holdMs` is a hold (once). `reset()` drops a press in progress (a menu opened).
 */
export function createTapHold(holdMs) {
  let armed = false, start = 0;
  return {
    update(pressed, down, nowMs, canHold) {
      if (pressed) {
        if (!canHold) { armed = false; return 'tap'; }
        armed = true; start = nowMs;
        return null;
      }
      if (!armed) return null;
      if (!down) { armed = false; return 'tap'; }
      if (nowMs - start >= holdMs) { armed = false; return 'hold'; }
      return null;
    },
    reset() { armed = false; },
    get pending() { return armed; },
  };
}

/**
 * Key-repeat style auto-repeat for menu directions. `step(dir, dtMs)` returns the direction on the
 * first frame it is held, again after `firstMs`, then every `nextMs`; null otherwise. A change of
 * direction starts over.
 */
export function createRepeater(firstMs = PAD.menuRepeatFirstMs, nextMs = PAD.menuRepeatMs) {
  let cur = null, t = 0;
  return {
    step(dir, dtMs) {
      if (!dir) { cur = null; return null; }
      if (dir !== cur) { cur = dir; t = firstMs; return dir; }
      t -= dtMs;
      if (t <= 0) { t += nextMs; if (t <= 0) t = nextMs; return dir; }
      return null;
    },
  };
}

/** Menu direction from the D-pad or the left stick (`threshold` on the dominant axis), else null. */
export function menuDirection(f, threshold = PAD.menuStick) {
  if (isDown(f, 'up')) return 'up';
  if (isDown(f, 'down')) return 'down';
  if (isDown(f, 'left')) return 'left';
  if (isDown(f, 'right')) return 'right';
  const ax = f.axes || [];
  const x = ax[0] || 0, y = ax[1] || 0;
  if (Math.max(Math.abs(x), Math.abs(y)) < threshold) return null;
  return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
}

/**
 * Spatial focus: from `rects[fromIndex]` pick the index in `rects` that lies in direction `dir`.
 * Rects are { x, y, w, h } in screen pixels. Prefers candidates in line with the current one, then the
 * nearest. Returns -1 when nothing lies that way. With no current item (fromIndex < 0), returns the
 * top-left-most rect.
 */
export function pickSpatial(fromIndex, rects, dir) {
  if (!rects.length) return -1;
  const from = fromIndex >= 0 ? rects[fromIndex] : null;
  if (!from) {
    let best = 0;
    for (let i = 1; i < rects.length; i++) {
      const a = rects[i], b = rects[best];
      if (a.y < b.y - 4 || (Math.abs(a.y - b.y) <= 4 && a.x < b.x)) best = i;
    }
    return best;
  }
  const cx = from.x + from.w / 2, cy = from.y + from.h / 2;
  let best = -1, bestScore = Infinity;
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (i === fromIndex) continue;
    const rx = r.x + r.w / 2, ry = r.y + r.h / 2;
    let along, across, overlap;
    if (dir === 'up' || dir === 'down') {
      along = dir === 'down' ? r.y - (from.y + from.h) : from.y - (r.y + r.h);
      if ((dir === 'down' ? ry : -ry) <= (dir === 'down' ? cy : -cy) + 1) continue;
      across = Math.abs(rx - cx);
      overlap = Math.min(r.x + r.w, from.x + from.w) - Math.max(r.x, from.x) > 0;
    } else {
      along = dir === 'right' ? r.x - (from.x + from.w) : from.x - (r.x + r.w);
      if ((dir === 'right' ? rx : -rx) <= (dir === 'right' ? cx : -cx) + 1) continue;
      across = Math.abs(ry - cy);
      overlap = Math.min(r.y + r.h, from.y + from.h) - Math.max(r.y, from.y) > 0;
    }
    const score = Math.max(0, along) + across * (overlap ? 0.5 : 2) + (overlap ? 0 : 40);
    if (score < bestScore) { bestScore = score; best = i; }
  }
  return best;
}

/** Glyph set by pad id (vendor 045e = Microsoft, 054c = Sony, 057e = Nintendo). */
export function padStyleFromId(id) {
  const s = String(id || '');
  if (/045e|xbox|xinput/i.test(s)) return 'xbox';
  if (/054c|playstation|dualshock|dualsense|^wireless controller/i.test(s)) return 'playstation';
  if (/057e|nintendo|pro controller|joy-con/i.test(s)) return 'nintendo';
  return 'xbox';
}

const GLYPHS = {
  xbox: { a: 'A', b: 'B', x: 'X', y: 'Y', lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', back: 'View', start: 'Menu', l3: 'LS', r3: 'RS', up: '↑', down: '↓', left: '←', right: '→' },
  playstation: { a: '✕', b: '○', x: '□', y: '△', lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', back: 'Create', start: 'Options', l3: 'L3', r3: 'R3', up: '↑', down: '↓', left: '←', right: '→' },
  nintendo: { a: 'B', b: 'A', x: 'Y', y: 'X', lb: 'L', rb: 'R', lt: 'ZL', rt: 'ZR', back: '−', start: '+', l3: 'LS', r3: 'RS', up: '↑', down: '↓', left: '←', right: '→' },
};

/** Label for a button on a pad style, e.g. ('rt', 'playstation') -> 'R2'. D-pad directions are bare arrows. */
export function padGlyph(button, style = 'xbox') {
  return (GLYPHS[style] || GLYPHS.xbox)[button] || String(button).toUpperCase();
}
