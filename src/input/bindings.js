// Player key and button remapping (the Controller settings screen, src/ui/controlsScreen.js).
// Input layer only: applyControls() rewrites BIND (input.js) and PAD_BINDINGS / PAD.moveDeadzone
// (padConfig.js) in place, so input.js and padGameplay.js build the same Command as before from the
// player's keys. The sim, the input codec and every pinned file never see a binding, only the Command.
// Saved on this device under CONTROLS_KEY. Pure apart from applyControls (no DOM; storage is passed in).
import { BIND } from './input.js';
import { PAD, PAD_BINDINGS, PAD_BUTTONS } from './padConfig.js';

export const CONTROLS_KEY = 'sproto-shooter-controls';
export const CONTROLS_VERSION = 1;

const cloneKeys = (keys) => Object.fromEntries(Object.entries(keys).map(([a, codes]) => [a, [...codes]]));

/** The shipped layout, captured before anything is remapped. */
export const DEFAULT_KEYS = Object.freeze(Object.fromEntries(Object.entries(BIND).map(([a, codes]) => [a, Object.freeze([...codes])])));
export const DEFAULT_PAD = Object.freeze({ ...PAD_BINDINGS });
export const DEFAULT_MOVE_DEADZONE = PAD.moveDeadzone;
export const DEADZONE_MIN = 0.05;
export const DEADZONE_MAX = 0.5;

/** Keyboard actions the player can remap, in screen order. */
export const KEY_ACTIONS = [
  ['forward', 'Move forward'], ['back', 'Move back'], ['left', 'Move left'], ['right', 'Move right'],
  ['sprint', 'Sprint'], ['jump', 'Jump / double jump'], ['slide', 'Slide'], ['crouch', 'Crouch-slide (with Sprint)'],
  ['grapple', 'Grapple'], ['dash', 'Dash'], ['aimToggle', 'Aim toggle · sniper: zoom closer'],
  ['reload', 'Reload · hold: pick up gun'], ['interact', 'Pick up gun / open Weapon Box'], ['medkit', 'Use medkit'],
  ['spellSelect', 'Next spell'], ['chainZap', 'Quick cast Chain Zap'], ['swarm', 'Quick cast Sproto Swarm'],
  ['manaShield', 'Quick cast Mana Shield'], ['meteor', 'Quick cast Meteor Bonk'],
  ['slot1', 'Gun slot 1'], ['slot2', 'Gun slot 2'], ['slot3', 'Gun slot 3'], ['slot4', 'Gun slot 4'], ['slotLegendary', 'Legendary gun slot'],
  ['skills', 'Skills (hold)'], ['stats', 'Stats & powers'], ['shop', 'Shop (between waves)'], ['inventory', 'Your guns'],
  ['skip', 'Ready / skip break'],
].map(([id, label]) => ({ id, label }));

/** Shown on the screen, not remappable: the mouse and the game's system keys. */
export const FIXED_KEYS = [
  ['Mouse', 'Look'], ['LMB', 'Fire'], ['RMB', 'Cast the selected spell'], ['Middle-click', 'Aim toggle'],
  ['Wheel', 'Switch gun · sniper zoom 1 / 2 while zoomed'], ['Mouse back / forward', 'Grapple'],
  ['Esc', 'Pause · back in menus'], ['Arrows / W S · Enter', 'Menus: move · confirm'],
  ['N N', 'Send feedback'], ['M', 'Mute'], ['P', 'God mode (health stays at 99)'], ['`', 'Debug panel'], ['F3', 'Frame stats'],
];

/** Keys a gameplay action may not take (the game or the browser already uses them). */
export const RESERVED_KEYS = {
  Escape: 'Pause', Backquote: 'Debug panel', F3: 'Frame stats', KeyM: 'Mute', KeyN: 'Send feedback', KeyP: 'God mode',
  F1: 'the browser', F5: 'the browser', F11: 'the browser', F12: 'the browser', MetaLeft: 'the system', MetaRight: 'the system',
};

/** Gamepad actions the player can remap. `interact` always follows `reload` (tap reloads, hold picks up). */
export const PAD_ACTIONS = [
  ['fire', 'Fire'], ['aim', 'Aim toggle · sniper: zoom closer'], ['castSpell', 'Cast the selected spell'], ['spellSelect', 'Next spell'],
  ['jump', 'Jump / double jump'], ['slide', 'Slide'], ['dash', 'Dash'], ['sprint', 'Sprint (toggle)'],
  ['reload', 'Reload · hold: pick up gun'], ['swap', 'Next gun'], ['chainZap', 'Quick cast Chain Zap'],
  ['swarm', 'Quick cast Sproto Swarm'], ['manaShield', 'Quick cast Mana Shield'], ['medkit', 'Use medkit'],
  ['panel', 'Shop (between waves) or your guns'],
].map(([id, label]) => ({ id, label }));

/** Pad buttons with a fixed job: Menu pauses (and cancels a rebind), Home belongs to the system. */
export const RESERVED_PAD = { start: 'Pause', home: 'the system' };

export function defaultControls() {
  return { v: CONTROLS_VERSION, keys: cloneKeys(DEFAULT_KEYS), pad: { ...DEFAULT_PAD }, moveDeadzone: DEFAULT_MOVE_DEADZONE };
}

export function cloneControls(c) {
  return { v: CONTROLS_VERSION, keys: cloneKeys(c.keys), pad: { ...c.pad }, moveDeadzone: c.moveDeadzone };
}

const CODE_RE = /^[A-Za-z][A-Za-z0-9]{0,23}$/;
const clampDz = (v) => (Number.isFinite(v) ? Math.round(Math.min(DEADZONE_MAX, Math.max(DEADZONE_MIN, v)) * 100) / 100 : DEFAULT_MOVE_DEADZONE);

/**
 * Anything read back from storage becomes a complete, valid layout: unknown actions and bad codes are
 * dropped, missing actions take their defaults, a key used twice stays with the first action, and a
 * pad layout with a clash goes back to the defaults.
 */
export function normalizeControls(raw) {
  const out = defaultControls();
  if (!raw || typeof raw !== 'object') return out;
  const used = new Set();
  const keys = raw.keys && typeof raw.keys === 'object' ? raw.keys : {};
  for (const action of Object.keys(DEFAULT_KEYS)) {
    const list = Array.isArray(keys[action]) ? keys[action] : DEFAULT_KEYS[action];
    const clean = [];
    for (const code of list.slice(0, 4)) {
      if (typeof code !== 'string' || !CODE_RE.test(code) || RESERVED_KEYS[code] || used.has(code)) continue;
      clean.push(code);
      used.add(code);
    }
    out.keys[action] = clean;
  }
  const pad = raw.pad && typeof raw.pad === 'object' ? raw.pad : {};
  const next = { ...DEFAULT_PAD };
  for (const action of Object.keys(DEFAULT_PAD)) {
    const b = pad[action];
    if (typeof b === 'string' && PAD_BUTTONS.includes(b) && !RESERVED_PAD[b]) next[action] = b;
  }
  next.pause = DEFAULT_PAD.pause;
  next.interact = next.reload;
  const seen = new Set();
  let clash = false;
  for (const { id } of PAD_ACTIONS) { if (seen.has(next[id])) clash = true; seen.add(next[id]); }
  out.pad = clash ? { ...DEFAULT_PAD } : next;
  out.moveDeadzone = clampDz(Number(raw.moveDeadzone));
  return out;
}

/**
 * Bind `code` as the main key of `action`. A key another action uses swaps with it (that action takes
 * this action's old main key); if it was only that action's extra key, that action just loses it.
 * Returns { controls, result: 'bound' | 'same' | 'reserved' | 'unknown', swappedWith, takenFrom, reason }.
 */
export function rebindKey(controls, action, code) {
  if (!DEFAULT_KEYS[action] || typeof code !== 'string' || !CODE_RE.test(code)) return { controls, result: 'unknown', swappedWith: null };
  if (RESERVED_KEYS[code]) return { controls, result: 'reserved', swappedWith: null, reason: RESERVED_KEYS[code] };
  if (controls.keys[action][0] === code) return { controls, result: 'same', swappedWith: null };
  const next = cloneControls(controls);
  const old = next.keys[action][0];
  let swappedWith = null, takenFrom = null;
  for (const [other, list] of Object.entries(next.keys)) {
    if (other === action) continue;
    const i = list.indexOf(code);
    if (i < 0) continue;
    if (i === 0 && old) { list[0] = old; swappedWith = other; } else { list.splice(i, 1); takenFrom = other; }
  }
  // The new key becomes the main key; the old main key is replaced (or went to the other action),
  // and the action keeps its extra keys (WASD keeps the arrows).
  next.keys[action] = [code, ...next.keys[action].slice(1).filter((c) => c !== code)];
  return { controls: next, result: 'bound', swappedWith, takenFrom };
}

/** Bind a pad button to an action. A button already in use swaps with it. Same return shape as rebindKey. */
export function rebindPad(controls, action, button) {
  if (!PAD_ACTIONS.some((a) => a.id === action) || !PAD_BUTTONS.includes(button)) return { controls, result: 'unknown', swappedWith: null };
  if (RESERVED_PAD[button]) return { controls, result: 'reserved', swappedWith: null, reason: RESERVED_PAD[button] };
  if (controls.pad[action] === button) return { controls, result: 'same', swappedWith: null };
  const next = cloneControls(controls);
  const old = next.pad[action];
  let swappedWith = null;
  for (const { id } of PAD_ACTIONS) {
    if (id !== action && next.pad[id] === button) { next.pad[id] = old; swappedWith = id; }
  }
  next.pad[action] = button;
  next.pad.interact = next.pad.reload;
  return { controls: next, result: 'bound', swappedWith };
}

export function loadControls(storage) {
  try {
    const raw = storage && storage.getItem(CONTROLS_KEY);
    return normalizeControls(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultControls();
  }
}

export function saveControls(storage, controls) {
  try {
    if (!storage) return false;
    storage.setItem(CONTROLS_KEY, JSON.stringify(normalizeControls(controls)));
    return true;
  } catch {
    return false; // private mode or full storage: the layout still applies for this visit
  }
}

/** Make a layout live: input.js and padGameplay.js read these objects on every key and frame. */
export function applyControls(controls) {
  const c = normalizeControls(controls);
  for (const action of Object.keys(DEFAULT_KEYS)) BIND[action] = [...c.keys[action]];
  for (const action of Object.keys(DEFAULT_PAD)) PAD_BINDINGS[action] = c.pad[action];
  PAD.moveDeadzone = c.moveDeadzone;
  return c;
}

const NAMED = {
  Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'Right Shift', ControlLeft: 'Ctrl', ControlRight: 'Right Ctrl',
  AltLeft: 'Alt', AltRight: 'Right Alt', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  Enter: 'Enter', NumpadEnter: 'Num Enter', Tab: 'Tab', Backspace: 'Backspace', CapsLock: 'Caps Lock',
  Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'",
  Comma: ',', Period: '.', Slash: '/', IntlBackslash: '\\',
};
/** A key code as the player reads it: KeyW -> W, Digit1 -> 1, ShiftLeft -> Shift, ArrowUp -> ↑. */
export function keyName(code) {
  if (!code) return '—';
  if (NAMED[code]) return NAMED[code];
  return code.replace(/^Key|^Digit/, '').replace(/^Numpad/, 'Num ');
}
