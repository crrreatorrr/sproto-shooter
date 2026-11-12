// Controller settings: every key and button the game uses, press-to-bind remapping for keyboard keys
// and gamepad buttons, Reset to defaults, the controller look speed / aim assist sliders and the left
// stick dead zone. It opens over whatever menu asked for it (title, pause, a panel, an end screen, the
// Free 1v1 lobby) and Back returns there. Bindings go through src/input/bindings.js, which rewrites the
// input layer's tables; the sim only ever sees the Command they produce.
import {
  DEADZONE_MAX, DEADZONE_MIN, FIXED_KEYS, KEY_ACTIONS, PAD_ACTIONS, RESERVED_PAD,
  applyControls, defaultControls, keyName, loadControls, rebindKey, rebindPad, saveControls,
} from '../input/bindings.js';
import { padGlyph } from '../input/gamepad.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const labelOf = (list, id) => (list.find((a) => a.id === id) || { label: id }).label;

function browserStorage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

/**
 * @param {object} game  the Game: input, settings, padStyle, persistSettings, stdMenuHtml
 */
export function createControlsScreen(game, { storage = browserStorage(), host = null, win = globalThis.window } = {}) {
  let controls = applyControls(loadControls(storage));
  let el = null;
  let capture = null; // { kind: 'key' | 'pad', action }
  let msg = '';
  let opts = {};

  function commit(next) {
    controls = applyControls(next);
    saveControls(storage, controls);
  }

  function keyRows() {
    return KEY_ACTIONS.map(({ id, label }) => {
      const codes = controls.keys[id] || [];
      const waiting = capture && capture.kind === 'key' && capture.action === id;
      return `<div class="ctl-row"><span>${esc(label)}</span><button class="btn sm ctl-bind${waiting ? ' waiting' : ''}" data-bind-key="${id}" aria-label="${esc(label)}: ${esc(keyName(codes[0]))}">${waiting ? 'Press a key…' : esc(keyName(codes[0]))}</button><small>${codes.slice(1).map((c) => esc(keyName(c))).join(' ')}</small></div>`;
    }).join('') + FIXED_KEYS.map(([key, what]) => `<div class="ctl-row fixed"><span>${esc(what)}</span><kbd>${esc(key)}</kbd><small>fixed</small></div>`).join('');
  }

  function padRows() {
    const style = game.padStyle || 'xbox';
    const g = (b) => esc(padGlyph(b, style));
    const rows = PAD_ACTIONS.map(({ id, label }) => {
      const waiting = capture && capture.kind === 'pad' && capture.action === id;
      return `<div class="ctl-row"><span>${esc(label)}</span><button class="btn sm ctl-bind${waiting ? ' waiting' : ''}" data-bind-pad="${id}" aria-label="${esc(label)}: ${g(controls.pad[id])}">${waiting ? 'Press a button…' : g(controls.pad[id])}</button><small></small></div>`;
    }).join('');
    const fixed = [
      ['Left stick', 'Move'], ['Right stick', 'Look (aim assist near enemies)'], [padGlyph('start', style), 'Pause · cancels a rebind'],
      [`D-pad / stick · ${padGlyph('a', style)}`, 'Menus: move · confirm'], [padGlyph('b', style), 'Menus: back'],
      [`${padGlyph('lb', style)} ${padGlyph('rb', style)}`, 'Menus: switch panel'], [padGlyph('back', style), 'Menus: close panel'],
    ].map(([key, what]) => `<div class="ctl-row fixed"><span>${esc(what)}</span><kbd>${esc(key)}</kbd><small>fixed</small></div>`).join('');
    return rows + fixed;
  }

  function slidersHtml() {
    const s = game.settings || {};
    return `<div class="ctl-sliders">
      <label>Controller look speed <input id="padsens" type="range" min="0.3" max="3" step="0.05" value="${s.padSensitivity ?? 1}"></label>
      <label>Controller aim assist <input id="aimassist" type="range" min="0" max="1.5" step="0.05" value="${s.aimAssist ?? 1}"></label>
      <label>Left stick dead zone <input id="ctl-deadzone" type="range" min="${DEADZONE_MIN}" max="${DEADZONE_MAX}" step="0.01" value="${controls.moveDeadzone}"> <output data-ctl-dz>${Math.round(controls.moveDeadzone * 100)}%</output></label>
    </div>`;
  }

  function html() {
    const pad = game.input && game.input.device === 'pad';
    const kb = `<section class="ctl-col" data-ctl-device="kbm"><h2>⌨ Keyboard &amp; mouse</h2><div class="ctl-list">${keyRows()}</div></section>`;
    const gp = `<section class="ctl-col" data-ctl-device="pad"><h2>🎮 Controller</h2>${slidersHtml()}<div class="ctl-list">${padRows()}</div></section>`;
    const std = game.stdMenuHtml ? game.stdMenuHtml({ main: !!opts.main, controls: false }) : '';
    return `<div class="ctl" data-ctl-screen>
      <h1>CONTROLLER <span>SETTINGS</span></h1>
      <p class="tag">Pick an action, then press its new key or button. Esc (or ${esc(padGlyph('start', game.padStyle || 'xbox'))}) cancels. A key or button that is already used swaps over. Saved on this device.</p>
      <p class="ctl-msg" data-ctl-msg aria-live="polite">${esc(msg)}</p>
      <div class="menu"><button class="btn" data-ctl="reset">Reset to defaults</button><button class="btn alt" data-ctl="back" data-nav-back>← Back</button></div>
      ${std}
      <div class="ctl-cols">${pad ? gp + kb : kb + gp}</div>
    </div>`;
  }

  function render() {
    if (!el) return;
    const y = el.scrollTop;
    el.innerHTML = html();
    el.scrollTop = y;
  }

  function startCapture(kind, action) {
    capture = { kind, action };
    msg = kind === 'key' ? `${labelOf(KEY_ACTIONS, action)}: press a key (Esc cancels)` : `${labelOf(PAD_ACTIONS, action)}: press a button (${padGlyph('start', game.padStyle || 'xbox')} cancels)`;
    // A focused button would turn the next Space / Enter into a click instead of a binding.
    try { globalThis.document?.activeElement?.blur?.(); } catch { /* nothing focused */ }
    render();
  }

  function cancelCapture() {
    if (!capture) return;
    capture = null;
    msg = 'Cancelled. Nothing changed.';
    render();
  }

  function finish(r, name, list) {
    const action = capture.action;
    capture = null;
    const what = labelOf(list, action);
    if (r.result === 'reserved') msg = `${name} is kept for ${r.reason}. Pick another.`;
    else if (r.result === 'unknown') msg = `${name} cannot be used. Pick another.`;
    else if (r.result === 'same') msg = `${what} already uses ${name}.`;
    else {
      commit(r.controls);
      msg = `${what}: ${name}.`;
      if (r.swappedWith) msg += ` Swapped: ${labelOf(list, r.swappedWith)} now uses ${list === KEY_ACTIONS ? keyName(r.controls.keys[r.swappedWith][0]) : padGlyph(r.controls.pad[r.swappedWith], game.padStyle || 'xbox')}.`;
      if (r.takenFrom) msg += ` ${labelOf(list, r.takenFrom)} no longer uses it.`;
    }
    render();
  }

  /** A key pressed while waiting for one. Runs before every game key listener (window, capture phase). */
  function onKey(e) {
    if (!capture) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.repeat) return;
    if (e.code === 'Escape') { cancelCapture(); return; }
    if (capture.kind !== 'key') return;
    finish(rebindKey(controls, capture.action, e.code), keyName(e.code), KEY_ACTIONS);
  }
  if (win) win.addEventListener('keydown', onKey, true);

  function onClick(e) {
    const t = e.target.closest('[data-bind-key], [data-bind-pad], [data-ctl]');
    if (!t) return;
    if (t.dataset.bindKey) startCapture('key', t.dataset.bindKey);
    else if (t.dataset.bindPad) startCapture('pad', t.dataset.bindPad);
    else if (t.dataset.ctl === 'reset') { capture = null; commit(defaultControls()); msg = 'Back to the default layout.'; render(); }
    else if (t.dataset.ctl === 'back') api.back();
  }

  function onInput(e) {
    const t = e.target;
    if (t.id === 'padsens' || t.id === 'aimassist') {
      if (t.id === 'padsens') game.settings.padSensitivity = +t.value;
      else game.settings.aimAssist = +t.value;
      if (game.persistSettings) game.persistSettings();
    } else if (t.id === 'ctl-deadzone') {
      commit({ ...controls, moveDeadzone: +t.value });
      const out = el && el.querySelector('[data-ctl-dz]');
      if (out) out.textContent = `${Math.round(controls.moveDeadzone * 100)}%`;
    }
  }

  const api = {
    get isOpen() { return !!el; },
    get capturing() { return !!capture; },
    get padCapturing() { return !!capture && capture.kind === 'pad'; },
    get controls() { return controls; },
    get element() { return el; },
    /** `main`: show Main menu (not when opened from the main menu). `onClose`: called after Back. */
    open(o = {}) {
      opts = o;
      msg = '';
      capture = null;
      if (!el) {
        el = globalThis.document.createElement('div');
        el.id = 'controls-screen';
        el.addEventListener('click', onClick);
        el.addEventListener('input', onInput);
        (host || globalThis.document.getElementById('app') || globalThis.document.body).appendChild(el);
      }
      render();
    },
    close() {
      if (!el) return;
      capture = null;
      el.remove();
      el = null;
      const done = opts.onClose;
      opts = {};
      if (done) done();
    },
    /** Esc / B / Back: cancel a rebind in progress, else close. */
    back() { if (capture) cancelCapture(); else api.close(); },
    /** A pad button pressed while waiting for one (src/input/padController.js). */
    padPressed(button) {
      if (!capture) return;
      if (button === 'start' || RESERVED_PAD[button] === 'Pause') { cancelCapture(); return; }
      if (capture.kind !== 'pad') return;
      finish(rebindPad(controls, capture.action, button), padGlyph(button, game.padStyle || 'xbox'), PAD_ACTIONS);
    },
    /** Redraw (device or pad style changed). */
    refresh() { render(); },
    /** For tests and the browser check: the layout in use. */
    reset() { commit(defaultControls()); render(); },
  };
  return api;
}
