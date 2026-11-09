// Keyboard and gamepad focus for the DOM menus (title, pickers, pause, end screens, shop / Weapon Box /
// guns panels, Free 1v1 lobby). A virtual focus: a `nav-focus` class, never browser focus, so the mouse
// keeps working exactly as before and native <select> / range keys never fight the arrows.
// Spatial picking is pure and tested: pickSpatial in src/input/gamepad.js.
import { pickSpatial } from '../input/gamepad.js';
import { PAD } from '../input/padConfig.js';

const SELECTOR = 'button, select, input[type="range"], input[type="checkbox"]';
const CLS = 'nav-focus';

function usable(el) {
  if (el.disabled || el.closest('[hidden]')) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

/** Stable identity for an item, so focus survives a panel re-render (the shop redraws a few times a second). */
function keyOf(el) {
  const d = el.dataset;
  return [el.tagName, el.id, d.go, d.p, d.act, d.v, d.slot, d.boss, d.level, d.tier, d.pvpGo, el.textContent.trim().slice(0, 24)].join('|');
}

export function createMenuNav() {
  let root = null;
  let current = null;
  let key = '';

  function items() { return root ? [...root.querySelectorAll(SELECTOR)].filter(usable) : []; }
  function mark(el) {
    const ring = (x) => (x ? (x.closest('label') || x) : null);
    if (current) ring(current).classList.remove(CLS);
    current = el;
    key = el ? keyOf(el) : '';
    if (el) {
      ring(el).classList.add(CLS);
      ring(el).scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  const api = {
    get root() { return root; },
    get current() { return current; },
    /** Point the focus at a container (or null). A new container starts with no focus. */
    setRoot(el) {
      if (el === root) return;
      if (current) mark(null);
      root = el;
      current = null;
      key = '';
    },
    /** Re-find the focused item after the container re-rendered its contents. */
    sync() {
      if (!root || !current || current.isConnected) return;
      const k = key;
      current = null;
      mark(items().find((el) => keyOf(el) === k) || null);
    },
    /** Focus the first item if nothing is focused. Returns true if something is focused. */
    ensure() {
      if (current && current.isConnected) return true;
      const list = items();
      const front = list.filter((el) => !el.hasAttribute('data-nav-back'));
      const pool = front.length ? front : list;
      const preferred = list.find((el) => el.hasAttribute('data-nav-default')) || pool[pickSpatial(-1, pool.map(rectOf), 'down')];
      mark(preferred || null);
      return !!current;
    },
    clear() { mark(null); },
    /** Move the focus up / down / left / right. Left / right on a slider or a list changes its value. */
    move(dir) {
      if (!current || !current.isConnected) { api.ensure(); return; } // the first press only shows the focus
      if ((dir === 'left' || dir === 'right') && adjust(current, dir === 'right' ? 1 : -1)) return;
      const list = items();
      const i = list.indexOf(current);
      const j = pickSpatial(i, list.map(rectOf), dir);
      if (j >= 0) mark(list[j]);
    },
    /** Confirm the focused item: click a button, tick a box, step a list. */
    activate() {
      if (!current || !current.isConnected) { api.ensure(); return false; }
      const el = current;
      if (el.tagName === 'SELECT') { adjust(el, 1, true); return true; }
      if (el.type === 'range') return false;
      el.click();
      return true;
    },
    /** Click the container's back item ([data-nav-back]) if it has one. */
    back() {
      const b = root && root.querySelector('[data-nav-back]');
      if (!b || !usable(b)) return false;
      b.click();
      return true;
    },
  };
  return api;
}

function rectOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

function fire(el) {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Step a slider by a share of its span, or a list by one option. Returns true if `el` is adjustable. */
function adjust(el, dir, wrap = false) {
  if (el.tagName === 'SELECT') {
    const n = el.options.length;
    if (!n) return true;
    let i = el.selectedIndex + dir;
    if (wrap) i = (i + n) % n;
    i = Math.max(0, Math.min(n - 1, i));
    if (i !== el.selectedIndex) { el.selectedIndex = i; fire(el); }
    return true;
  }
  if (el.type === 'range') {
    const min = +el.min || 0, max = el.max === '' ? 100 : +el.max, step = +el.step || 1;
    const raw = +el.value + dir * Math.max(step, (max - min) * PAD.sliderStep);
    const snapped = Math.round((raw - min) / step) * step + min;
    const v = Math.max(min, Math.min(max, +snapped.toFixed(6)));
    if (v !== +el.value) { el.value = String(v); fire(el); }
    return true;
  }
  return false;
}
