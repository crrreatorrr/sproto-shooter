// Controller settings: key / button remapping, its saved form, and the standard menu options.
import { afterEach, describe, expect, it } from 'vitest';
import { BIND, createInput } from '../src/input/input.js';
import { PAD, PAD_BINDINGS } from '../src/input/padConfig.js';
import { createPadGameplay } from '../src/input/padGameplay.js';
import { BUTTON_INDEX } from '../src/input/gamepad.js';
import {
  CONTROLS_KEY, DEFAULT_KEYS, DEFAULT_MOVE_DEADZONE, DEFAULT_PAD, KEY_ACTIONS, PAD_ACTIONS,
  applyControls, defaultControls, keyName, loadControls, normalizeControls, rebindKey, rebindPad, saveControls,
} from '../src/input/bindings.js';
import { STD_OPTIONS, fullscreenLabel, stdMenuHtml } from '../src/ui/fullscreen.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}

afterEach(() => applyControls(defaultControls()));

describe('key remapping', () => {
  it('lists every keyboard action the game binds', () => {
    const listed = new Set(KEY_ACTIONS.map((a) => a.id));
    for (const action of Object.keys(DEFAULT_KEYS)) if (action !== 'gooBolt') expect(listed.has(action), action).toBe(true);
  });
  it('binds a free key as the main key and keeps the extra keys', () => {
    const r = rebindKey(defaultControls(), 'forward', 'KeyI');
    expect(r.result).toBe('bound');
    expect(r.swappedWith).toBe('inventory');
    expect(r.controls.keys.forward).toEqual(['KeyI', 'ArrowUp']);
    expect(r.controls.keys.inventory).toEqual(['KeyW']);
    const free = rebindKey(defaultControls(), 'jump', 'KeyJ');
    expect(free.controls.keys.jump).toEqual(['KeyJ']);
    expect(free.swappedWith).toBeNull();
  });
  it('swaps with an action that used the key, and only removes an extra key', () => {
    const swap = rebindKey(defaultControls(), 'jump', 'KeyC');
    expect(swap.controls.keys.jump).toEqual(['KeyC']);
    expect(swap.controls.keys.slide).toEqual(['Space']);
    const extra = rebindKey(defaultControls(), 'jump', 'ArrowUp');
    expect(extra.swappedWith).toBeNull();
    expect(extra.takenFrom).toBe('forward');
    expect(extra.controls.keys.forward).toEqual(['KeyW']);
  });
  it('refuses the keys the game keeps for itself and never leaves one key on two actions', () => {
    for (const code of ['Escape', 'KeyP', 'KeyN', 'KeyM', 'Backquote', 'F3']) {
      const r = rebindKey(defaultControls(), 'jump', code);
      expect(r.result).toBe('reserved');
      expect(r.controls.keys.jump).toEqual(['Space']);
    }
    let c = defaultControls();
    for (const [a, k] of [['jump', 'KeyC'], ['slide', 'KeyW'], ['forward', 'Space'], ['reload', 'KeyE'], ['shop', 'Tab']]) c = rebindKey(c, a, k).controls;
    const seen = new Map();
    for (const [action, codes] of Object.entries(c.keys)) for (const code of codes) {
      expect(seen.get(code), `${code}: ${seen.get(code)} and ${action}`).toBeUndefined();
      seen.set(code, action);
    }
  });
  it('makes a new key work in play through the same Command (nothing below the input layer changes)', () => {
    applyControls(rebindKey(defaultControls(), 'jump', 'KeyJ').controls);
    expect(BIND.jump).toEqual(['KeyJ']);
    // Node has no DOM: a bare EventTarget stands in for window and document.
    const saved = { window: globalThis.window, document: globalThis.document };
    globalThis.window = new EventTarget();
    globalThis.document = Object.assign(new EventTarget(), { pointerLockElement: null });
    const canvas = { addEventListener() {}, requestPointerLock() {} };
    const input = createInput(canvas);
    const press = (code) => window.dispatchEvent(Object.assign(new Event('keydown'), { code }));
    press('Space');
    expect(input.buildCommand(1).pressed.jump).toBe(false);
    press('KeyJ');
    expect(input.buildCommand(2).pressed.jump).toBe(true);
    applyControls(rebindKey(defaultControls(), 'slot2', 'KeyK').controls);
    press('KeyK');
    expect(input.buildCommand(3).slot).toBe(1);
    globalThis.window = saved.window;
    globalThis.document = saved.document;
  });
  it('names keys the way the player reads them', () => {
    expect(keyName('KeyW')).toBe('W');
    expect(keyName('Digit1')).toBe('1');
    expect(keyName('ShiftLeft')).toBe('Shift');
    expect(keyName('ArrowUp')).toBe('↑');
    expect(keyName(undefined)).toBe('—');
  });
});

describe('gamepad remapping', () => {
  it('swaps buttons and keeps reload and pick up on one button', () => {
    const r = rebindPad(defaultControls(), 'jump', 'b');
    expect(r.result).toBe('bound');
    expect(r.controls.pad.jump).toBe('b');
    expect(r.controls.pad.slide).toBe('a');
    expect(r.swappedWith).toBe('slide');
    const re = rebindPad(defaultControls(), 'reload', 'y');
    expect(re.controls.pad.reload).toBe('y');
    expect(re.controls.pad.interact).toBe('y');
    expect(re.controls.pad.swap).toBe('x');
    expect(rebindPad(defaultControls(), 'jump', 'start').result).toBe('reserved');
    expect(PAD_ACTIONS.some((a) => a.id === 'pause')).toBe(false);
  });
  it('drives padGameplay from the remapped button', () => {
    applyControls(rebindPad(defaultControls(), 'jump', 'y').controls);
    expect(PAD_BINDINGS.jump).toBe('y');
    const play = createPadGameplay();
    const frame = (button) => {
      const n = Object.keys(BUTTON_INDEX).length;
      const down = new Array(n).fill(false), pressed = new Array(n).fill(false);
      if (button) { down[BUTTON_INDEX[button]] = true; pressed[BUTTON_INDEX[button]] = true; }
      return { connected: true, down, pressed, released: new Array(n).fill(false), move: { x: 0, y: 0, mag: 0 }, look: { x: 0, y: 0, mag: 0 }, axes: [0, 0, 0, 0] };
    };
    expect(play.step(frame('a'), { nowMs: 0, dt: 0.016 }).presses).not.toContain('jump');
    expect(play.step(frame('y'), { nowMs: 20, dt: 0.016 }).presses).toContain('jump');
  });
});

describe('saved controls', () => {
  it('saves under the game key and loads back, applying live', () => {
    const storage = memoryStorage();
    let c = rebindKey(defaultControls(), 'jump', 'KeyJ').controls;
    c = rebindPad(c, 'fire', 'rb').controls;
    c.moveDeadzone = 0.33;
    expect(saveControls(storage, c)).toBe(true);
    expect(JSON.parse(storage.map.get(CONTROLS_KEY)).keys.jump).toEqual(['KeyJ']);
    const back = loadControls(storage);
    expect(back.keys.jump).toEqual(['KeyJ']);
    expect(back.pad.fire).toBe('rb');
    expect(back.pad.dash).toBe('rt');
    applyControls(back);
    expect(PAD.moveDeadzone).toBe(0.33);
    applyControls(defaultControls());
    expect(PAD.moveDeadzone).toBe(DEFAULT_MOVE_DEADZONE);
    expect(PAD_BINDINGS).toMatchObject(DEFAULT_PAD);
  });
  it('survives storage that throws or holds junk', () => {
    const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    expect(loadControls(throwing)).toEqual(defaultControls());
    expect(saveControls(throwing, defaultControls())).toBe(false);
    expect(loadControls({ getItem: () => '{not json' })).toEqual(defaultControls());
    const junk = normalizeControls({ keys: { jump: ['Escape', 'KeyW', 42], forward: ['KeyW'] }, pad: { jump: 'start', fire: 'a' }, moveDeadzone: 9 });
    expect(junk.keys.jump).toEqual([]); // Esc is reserved, W stays with forward, 42 is not a key
    expect(junk.keys.forward).toEqual(['KeyW']);
    expect(junk.pad).toEqual({ ...DEFAULT_PAD }); // fire on A clashes with jump: back to the defaults
    expect(junk.moveDeadzone).toBe(0.5);
  });
});

describe('standard menu options', () => {
  it('offers Main menu, Hub, Controller settings and Full screen, in that order', () => {
    const html = stdMenuHtml({ fullscreen: { on: false } });
    const ids = [...html.matchAll(/data-std="(\w+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(STD_OPTIONS);
    expect(html).toContain('Main menu');
    expect(html).toContain('Return to Hub');
    expect(html).toContain('Controller settings');
    expect(html).toContain(fullscreenLabel(false));
  });
  it('leaves Main menu off the main menu, Controller settings off its own screen, and hides Full screen without the API', () => {
    expect(stdMenuHtml({ main: false, fullscreen: { on: true } })).not.toContain('data-std="title"');
    expect(stdMenuHtml({ main: false, fullscreen: { on: true } })).toContain('Full screen: On');
    expect(stdMenuHtml({ controls: false })).not.toContain('data-std="controls"');
    expect(stdMenuHtml({ fullscreen: null })).not.toContain('data-std="fullscreen"');
  });
});
