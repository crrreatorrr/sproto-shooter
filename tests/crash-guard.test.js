// Crash guard (src/core/crashGuard.js), the main loop (Game.frame) and boot: one throw never stops
// the game forever, a throw inside a sim tick stops further ticks that frame, CRASH_HALT_FRAMES
// failing frames in a row halt the game and show the "Something broke" panel, one bad frame
// recovers, the console is not spammed, and a failed boot shows the panel with RETRY.
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../src/game/Game.js';
import { DT } from '../src/sim/simulate.js';
import { CRASH_HALT_FRAMES, CRASH_LOG_LIMIT, CrashGuard, isBenignError, isBenignRejection } from '../src/core/crashGuard.js';
import { CRASH_PANEL_ID, CrashPanel } from '../src/ui/crashPanel.js';

// The loop test drives Game.frame with a stand-in state, so the real sim step is a no-op here.
vi.mock('../src/sim/simulate.js', async (importOriginal) => ({ ...(await importOriginal()), simulate: () => {} }));

let queued = [];
let now = 1000;

function pump(frames, ticksPerFrame = 1) {
  for (let i = 0; i < frames; i++) {
    const calls = queued;
    queued = [];
    now += ticksPerFrame * DT * 1000 + 0.05;
    for (const fn of calls) fn(now);
  }
}

// A Game with just the loop: the real frame()/step(), with sim, render and UI stand-ins.
function fakeGame({ tickThrows = () => false, renderThrows = () => false } = {}) {
  const log = vi.fn();
  const game = Object.create(Game.prototype);
  let ticks = 0;
  let renders = 0;
  Object.assign(game, {
    crash: new CrashGuard(CRASH_HALT_FRAMES, CRASH_LOG_LIMIT, log, null),
    last: now,
    acc: 0,
    timeScale: 1,
    settings: { hitstop: false, shake: 0 },
    feel: { scaleFrame: (ft) => ft },
    pvpActive: false,
    screen: { hidden: true, querySelector: () => null },
    state: { tick: 0, time: 0, mode: 'sandbox', level: null, localPlayerId: 'p1', events: [], players: { p1: { guns: [], activeSlot: 0, zooming: false } } },
    input: { buildCommand: () => ({ pressed: {}, held: {} }), zoomLevel: 1, liveLook: () => ({}), setLook() {} },
    bus: { emitAll() {} },
    renderer: { render() { renders++; if (renderThrows(renders)) throw new Error('boom from render'); }, takeGpuMs: () => 0 },
    ui: { update() {} },
    perfCounters: { push() {} },
    statsOn: false,
    // The sim tick: the real loop calls this.onSimCommand(cmd, state) before simulate().
    onSimCommand: () => {
      ticks++;
      if (tickThrows(ticks)) throw new Error('boom from a sim tick');
    },
  });
  return { game, log, ticks: () => ticks, renders: () => renders };
}

function start(opts) {
  const g = fakeGame(opts);
  queued.push((t) => g.game.frame(t));
  pump(1);
  return g;
}

beforeEach(() => {
  queued = [];
  now = 1000;
  vi.stubGlobal('requestAnimationFrame', (fn) => { queued.push(fn); return queued.length; });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Game.frame survives exceptions', () => {
  it('keeps scheduling frames after a sim tick throws once, and recovers', () => {
    const { game, ticks } = start({ tickThrows: (n) => n === 2 });
    pump(5);
    expect(queued.length).toBe(1);
    expect(ticks()).toBeGreaterThan(4);
    expect(game.crash.total).toBe(1);
    expect(game.crash.halted).toBe(false);
  });

  it('stops further sim ticks in the frame that threw', () => {
    const { ticks } = start({ tickThrows: (n) => n >= 2 });
    const before = ticks();
    pump(1, 4); // the frame wants 4 ticks; the first one throws
    expect(ticks() - before).toBe(1);
  });

  it('halts after CRASH_HALT_FRAMES failing frames: one halt, sim paused, loop alive', () => {
    const { game, ticks } = start({ tickThrows: (n) => n >= 2 });
    const halts = [];
    game.crash.onHalt((info) => halts.push(info));
    pump(CRASH_HALT_FRAMES);
    expect(game.crash.halted).toBe(true);
    const at = ticks();
    pump(60);
    expect(ticks()).toBe(at);
    expect(queued.length).toBe(1);
    expect(halts.length).toBe(1);
  });

  it('still halts at 120 Hz, where every other frame runs no tick', () => {
    const { game } = start({ tickThrows: (n) => n >= 2 });
    for (let i = 0; i < 4 * CRASH_HALT_FRAMES; i++) pump(1, 0.5);
    expect(game.crash.halted).toBe(true);
  });

  it('a throw from render is caught too, also while the sim is paused behind a screen', () => {
    const { game } = start({ renderThrows: (n) => n >= 2 });
    game.screen = { hidden: false, querySelector: () => null }; // a pause/end screen: no ticks
    pump(CRASH_HALT_FRAMES + 1);
    expect(queued.length).toBe(1);
    expect(game.crash.halted).toBe(true);
  });

  it('does not spam the console when every frame throws', () => {
    const { game, log } = start({ tickThrows: (n) => n >= 2 });
    for (let i = 0; i < 600; i++) {
      pump(1);
      if (game.crash.halted) game.crash.resume();
    }
    expect(game.crash.total).toBeGreaterThan(500);
    // Every line the guard writes (errors, the halt line, the "further errors" note) fits the cap.
    expect(log.mock.calls.length).toBeLessThanOrEqual(CRASH_LOG_LIMIT);
    expect(log.mock.calls[0][1]).toBeInstanceOf(Error);
  });

  it('the PvP branch is guarded too', () => {
    const { game } = start();
    game.pvpActive = true;
    game.pvp = { frame() { throw new Error('pvp boom'); } };
    pump(CRASH_HALT_FRAMES);
    expect(queued.length).toBe(1);
    expect(game.crash.halted).toBe(true);
  });
});

describe('CrashGuard', () => {
  it('a good frame resets the streak', () => {
    const g = new CrashGuard(3, 5, () => {});
    g.frameFailed(new Error('a'));
    g.frameFailed(new Error('a'));
    g.frameOk();
    g.frameFailed(new Error('a'));
    expect(g.halted).toBe(false);
  });

  it('guardBoot: a rejected boot halts at once with source "boot"', async () => {
    const g = new CrashGuard(3, 5, () => {});
    const halts = [];
    g.onHalt((info) => halts.push(info.source));
    await g.guardBoot(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module')));
    expect(g.halted).toBe(true);
    expect(halts).toEqual(['boot']);
    expect(await new CrashGuard().guardBoot(async () => 7)).toBe(7);
  });

  it('guardBoot: errors while loading do not count toward a halt once boot is done', async () => {
    const g = new CrashGuard(3, 5, () => {}, null);
    await g.guardBoot(async () => {
      g.frameFailed(new Error('title demo frame'));
      g.frameFailed(new Error('title demo frame'));
    });
    g.frameFailed(new Error('later'));
    expect(g.halted).toBe(false);
  });

  it('main.js resets the streak when the tab becomes visible again', () => {
    const src = fs.readFileSync('src/main.js', 'utf8');
    expect(src).toMatch(/visibilitychange[\s\S]*crashGuard\.resetStreak\(\)/);
  });

  it('main.js boots through guardBoot and installs the global handlers', () => {
    const src = fs.readFileSync('src/main.js', 'utf8');
    expect(src).toMatch(/crashGuard\.guardBoot\(boot\)/);
    expect(src).toMatch(/crashGuard\.installGlobal\(window\)/);
    expect(src).not.toMatch(/^boot\(\);/m);
  });

  it('onCrash sees every error; a throwing listener does not break the guard', () => {
    const g = new CrashGuard(3, 5, () => {});
    const seen = [];
    g.onCrash(() => { throw new Error('bad listener'); });
    const off = g.onCrash((info) => seen.push(`${info.source}:${info.message}`));
    g.report(new Error('x'), 'frame');
    off();
    g.report(new Error('y'), 'frame');
    expect(seen).toEqual(['frame:Error: x']);
  });

  it('window error and unhandledrejection are counted and never preventDefault-ed', () => {
    const log = vi.fn();
    const g = new CrashGuard(3, 5, log, null);
    const target = new EventTarget();
    g.installGlobal(target);
    const fire = (type, extra) => { const e = Object.assign(new Event(type, { cancelable: true }), extra); target.dispatchEvent(e); return e; };
    const thrown = new Error('handler threw');
    const first = fire('error', { error: thrown, message: 'handler threw' });
    const rej = fire('unhandledrejection', { reason: new Error('rejected') });
    fire('error', { error: thrown, message: 'handler threw' });
    expect(g.total).toBe(3);
    // The browser keeps logging them itself (past our log cap, too).
    expect(first.defaultPrevented).toBe(false);
    expect(rej.defaultPrevented).toBe(false);
    expect(log.mock.calls.filter((c) => /^\[Crash\] (error|unhandledrejection):/.test(c[0])).length).toBe(2);
    g.uninstallGlobal();
    fire('error', { error: new Error('later') });
    expect(g.total).toBe(3);
  });

  it('global errors alone never halt the game (async preload, a hidden tab)', () => {
    const g = new CrashGuard(3, 5, () => {}, null);
    const { fire } = fakeWindow(g);
    for (let i = 0; i < 10; i++) fire('unhandledrejection', { reason: new Error(`fetch ${i}`) });
    expect(g.total).toBe(10);
    expect(g.halted).toBe(false);
    g.frameFailed(new Error('frame')); // a streak of one, not eleven
    expect(g.halted).toBe(false);
  });

  it('global errors can tip the halt once the streak has a failing frame', () => {
    const g = new CrashGuard(3, 5, () => {}, null);
    const { fire } = fakeWindow(g);
    g.frameFailed(new Error('frame'));
    fire('error', { error: new Error('a'), message: 'a' });
    expect(g.halted).toBe(false);
    fire('error', { error: new Error('b'), message: 'b' });
    expect(g.halted).toBe(true);
  });

  it('resetStreak (boot done, tab visible again) clears the streak but not a halt', () => {
    const g = new CrashGuard(3, 5, () => {}, null);
    g.frameFailed(new Error('a'));
    g.frameFailed(new Error('a'));
    g.resetStreak();
    g.frameFailed(new Error('a'));
    expect(g.halted).toBe(false);
    g.frameFailed(new Error('a'));
    g.frameFailed(new Error('a'));
    expect(g.halted).toBe(true);
    g.resetStreak();
    expect(g.halted).toBe(true);
  });

  it('ignores browser noise and other origins', () => {
    const g = new CrashGuard(3, 5, () => {}, null);
    const { fire } = fakeWindow(g, 'https://game.example');
    fire('error', { message: 'ResizeObserver loop completed with undelivered notifications.', error: null });
    fire('error', { message: 'Script error.', error: null, filename: '' });
    fire('error', { message: 'Uncaught Error: ext', error: new Error('ext'), filename: 'chrome-extension://abc/content.js' });
    fire('error', { message: 'Uncaught Error: ad', error: new Error('ad'), filename: 'https://ads.example/x.js' });
    fire('unhandledrejection', { reason: Object.assign(new Error('The play() request was interrupted'), { name: 'AbortError' }) });
    fire('unhandledrejection', { reason: { name: 'NotAllowedError', message: 'pointer lock refused' } });
    expect(g.total).toBe(0);
    fire('error', { message: 'Uncaught Error: ours', error: new Error('ours'), filename: 'https://game.example/assets/index.js' });
    fire('error', { message: 'Uncaught Error: nofile', error: new Error('nofile'), filename: '' });
    expect(g.total).toBe(2);
    expect(isBenignError({ message: 'Script error.', error: new Error('x') }, 'https://game.example')).toBe(false);
    expect(isBenignError({ message: 'x', error: new Error('x'), filename: '/a.js' }, 'https://game.example')).toBe(false);
    expect(isBenignRejection(new Error('a'))).toBe(false);
  });

  it('hands each new frame error to reportError once, without counting it twice', () => {
    const surfaced = [];
    let fire;
    // Like the browser's reportError: it dispatches a window "error" event for the same object.
    const g = new CrashGuard(10, 5, () => {}, (err) => {
      surfaced.push(err);
      fire('error', { error: err, message: err.message });
    });
    fire = fakeWindow(g).fire;
    const throwAt = (msg) => { try { throw new Error(msg); } catch (err) { return err; } };
    const a1 = throwAt('a');
    g.frameFailed(a1);
    g.frameFailed(a1);
    g.frameFailed(throwAt('b'));
    expect(surfaced).toEqual([a1, expect.objectContaining({ message: 'b' })]);
    expect(g.total).toBe(3);
    fire('error', { error: new Error('c'), message: 'c' }); // global errors are not re-surfaced
    expect(surfaced.length).toBe(2);
  });

  it('Game.frame surfaces its error so page-error checks still see it', () => {
    const { game } = start({ tickThrows: (n) => n === 2 });
    const surfaced = [];
    game.crash = new CrashGuard(CRASH_HALT_FRAMES, CRASH_LOG_LIMIT, () => {}, (err) => surfaced.push(err));
    pump(4);
    expect(surfaced.map((e) => e.message)).toEqual(['boom from a sim tick']);
  });

  it('dedupes by message and stack, not message alone', () => {
    const log = vi.fn();
    const g = new CrashGuard(100, 5, log, null);
    const e1 = new Error('same'); e1.stack = 'Error: same\n    at a (game.js:1:1)';
    const e2 = new Error('same'); e2.stack = 'Error: same\n    at b (game.js:9:9)';
    const e3 = new Error('same'); e3.stack = e1.stack;
    g.frameFailed(e1); g.frameFailed(e2); g.frameFailed(e3);
    expect(log).toHaveBeenCalledTimes(2);
  });

  it('keeps the "further errors" note and the halt line inside the log cap', () => {
    const log = vi.fn();
    const g = new CrashGuard(3, 5, log, null);
    for (let i = 0; i < 20; i++) g.frameFailed(new Error(`distinct ${i}`));
    expect(log.mock.calls.length).toBe(5);
    expect(String(log.mock.calls[4][0])).toContain('further errors are counted but not logged');
    expect(log.mock.calls.some((c) => String(c[0]).includes('halted'))).toBe(true);
  });

  it('describes non-Error rejection reasons usefully', () => {
    const g = new CrashGuard(3, 5, () => {}, null);
    const seen = [];
    g.onCrash((info) => seen.push(info.message));
    g.report({ type: 'error', isTrusted: true, target: { tagName: 'SCRIPT', src: 'https://game.example/a.js' } }, 'unhandledrejection');
    g.report({ name: 'NetworkError', message: 'offline' }, 'unhandledrejection');
    g.report({ code: 7 }, 'unhandledrejection');
    expect(seen).toEqual(['Event "error" on <script src="https://game.example/a.js">', 'NetworkError: offline', '{"code":7}']);
  });
});

/** A stand-in window: install the guard, then fire events at its listeners. */
function fakeWindow(g, origin = 'https://game.example') {
  const listeners = {};
  const target = {
    addEventListener: (type, fn) => (listeners[type] ??= []).push(fn),
    removeEventListener: (type, fn) => { listeners[type] = (listeners[type] || []).filter((f) => f !== fn); },
  };
  g.installGlobal(target, origin);
  const fire = (type, extra) => { for (const fn of (listeners[type] || []).slice()) fn({ type, ...extra }); };
  return { fire, listeners };
}

// A stand-in DOM for the panel (tests run in node).
class FakeElement {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.textContent = ''; }
  setAttribute(k, v) { this.attrs[k] = v; }
  appendChild(c) { this.children.push(c); return c; }
  addEventListener(t, fn) { (this.listeners[t] ??= []).push(fn); }
  focus() {}
  text() { return this.textContent + this.children.map((c) => c.text()).join(''); }
  find(tag) { for (const c of this.children) { if (c.tag === tag) return c; const d = c.find(tag); if (d) return d; } return null; }
}

describe('CrashPanel', () => {
  it('shows "Something broke" with RELOAD, once; RETRY for boot', () => {
    const body = new FakeElement('body');
    const reload = vi.fn();
    const panel = new CrashPanel({ body, createElement: (t) => new FakeElement(t) }, reload);
    panel.show('reload');
    panel.show('reload');
    expect(body.children.length).toBe(1);
    expect(body.children[0].id).toBe(CRASH_PANEL_ID);
    expect(body.children[0].text()).toContain('Something broke');
    const button = body.children[0].find('button');
    expect(button.textContent).toBe('RELOAD');
    button.listeners.click[0]();
    expect(reload).toHaveBeenCalledTimes(1);

    const body2 = new FakeElement('body');
    new CrashPanel({ body: body2, createElement: (t) => new FakeElement(t) }, () => {}).show('retry');
    expect(body2.find('button').textContent).toBe('RETRY');
  });
});
