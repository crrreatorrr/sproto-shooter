// Gamepad mapping logic with fake Gamepad objects: deadzones, latch-on-connect, hot-plug, edges,
// tap / hold, menu auto-repeat and focus, the gameplay layout and aim assist.
import { describe, expect, it } from 'vitest';
import {
  BUTTON_INDEX, createPadTracker, createRepeater, createTapHold, curveStick, isDown, menuDirection,
  padGlyph, padStyleFromId, pickSpatial, radialDeadzone, readButtons, wasPressed,
} from '../src/input/gamepad.js';
import { createPadGameplay } from '../src/input/padGameplay.js';
import { aimAssist, assistTargets, lookAngles } from '../src/input/aimAssist.js';
import { AIM_ASSIST, PAD, PAD_BINDINGS, PAD_BUTTONS } from '../src/input/padConfig.js';

/** A fake standard-mapping pad. `held` lists button names; `axes` is [lx, ly, rx, ry]. */
function fakePad({ index = 0, id = 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e)', held = [], axes = [0, 0, 0, 0], values = {}, mapping = 'standard' } = {}) {
  const buttons = PAD_BUTTONS.map((name) => {
    const v = values[name] ?? (held.includes(name) ? 1 : 0);
    return { pressed: v > 0.5, value: v };
  });
  return { index, id, connected: true, mapping, buttons, axes };
}

const press = (tracker, opts) => tracker.update([fakePad(opts)]);

describe('sticks', () => {
  it('radial deadzone rescales so motion starts from 0 and keeps the direction', () => {
    expect(radialDeadzone(0.15, 0.1, 0.2).mag).toBe(0);
    const just = radialDeadzone(0.21, 0, 0.2);
    expect(just.mag).toBeGreaterThan(0);
    expect(just.mag).toBeLessThan(0.02);
    const full = radialDeadzone(0, -1, 0.2);
    expect(full.mag).toBe(1);
    expect(full.y).toBeCloseTo(-1);
    const diag = radialDeadzone(0.6, 0.6, 0.2);
    expect(diag.x).toBeCloseTo(diag.y);
    expect(radialDeadzone(NaN, undefined, 0.2).mag).toBe(0);
  });
  it('the look curve keeps direction and softens small tilts', () => {
    const s = curveStick(radialDeadzone(0.5, 0, PAD.lookDeadzone), PAD.lookCurve);
    const lin = radialDeadzone(0.5, 0, PAD.lookDeadzone);
    expect(s.x).toBeGreaterThan(0);
    expect(s.mag).toBeLessThan(lin.mag);
    expect(curveStick({ x: 0, y: 0, mag: 0 }, 2).mag).toBe(0);
  });
  it('analog triggers use press / release hysteresis', () => {
    const at = (v, prev) => readButtons(fakePad({ values: { rt: v } }), prev)[BUTTON_INDEX.rt];
    expect(at(0.45, null)).toBe(false);
    expect(at(0.55, null)).toBe(true);
    const held = readButtons(fakePad({ values: { rt: 0.55 } }), null);
    expect(at(0.4, held)).toBe(true); // still above the release point
    expect(at(0.2, held)).toBe(false);
  });
});

describe('pad tracker', () => {
  it('latches buttons held when the pad appears until they are released', () => {
    const t = createPadTracker();
    let f = press(t, { held: ['a'] }); // the A that confirmed a hub portal
    expect(f.connected).toBe(true);
    expect(f.justConnected).toBe(true);
    expect(isDown(f, 'a')).toBe(false);
    f = press(t, { held: ['a'] });
    expect(wasPressed(f, 'a')).toBe(false);
    f = press(t, {});
    f = press(t, { held: ['a'] });
    expect(wasPressed(f, 'a')).toBe(true);
    f = press(t, { held: ['a'] });
    expect(wasPressed(f, 'a')).toBe(false); // one edge per press
    expect(isDown(f, 'a')).toBe(true);
  });
  it('latches the triggers too', () => {
    const t = createPadTracker();
    let f = press(t, { values: { rt: 1 } });
    expect(isDown(f, 'rt')).toBe(false);
    expect(f.rt).toBe(0);
    f = press(t, {});
    f = press(t, { values: { rt: 1 } });
    expect(isDown(f, 'rt')).toBe(true);
    expect(f.rt).toBe(1);
  });
  it('handles unplug and reconnect (latching again) and ignores non-standard pads', () => {
    const t = createPadTracker();
    press(t, {});
    expect(t.update([null]).connected).toBe(false);
    expect(t.update([fakePad({ mapping: '' })]).connected).toBe(false);
    const f = press(t, { held: ['start'] });
    expect(f.connected).toBe(true);
    expect(wasPressed(f, 'start')).toBe(false);
  });
  it('follows the pad that was used last', () => {
    const t = createPadTracker();
    t.update([fakePad({ index: 0 }), fakePad({ index: 1, id: 'Other' })]);
    expect(t.activeIndex).toBe(0);
    t.update([fakePad({ index: 0 }), fakePad({ index: 1, id: 'Other', held: ['x'] })]);
    expect(t.activeIndex).toBe(1);
  });
  it('reports deliberate use (for the prompts) but not stick drift', () => {
    const t = createPadTracker();
    press(t, {});
    expect(press(t, { axes: [0.1, 0.1, 0.05, 0] }).activity).toBe(false);
    expect(press(t, { axes: [0, 0, 0.9, 0] }).activity).toBe(true);
  });
});

describe('tap / hold and menu repeat', () => {
  it('taps at once when there is nothing to hold for', () => {
    const th = createTapHold(300);
    expect(th.update(true, true, 0, false)).toBe('tap');
    expect(th.update(false, true, 400, false)).toBe(null);
    expect(th.update(false, false, 500, false)).toBe(null); // no second tap on release
  });
  it('still picks up when something comes into reach while the button is held', () => {
    const th = createTapHold(300);
    expect(th.update(true, true, 0, false)).toBe('tap'); // reloads at once
    expect(th.update(false, true, 200, true)).toBe(null);
    expect(th.progress(200, true)).toBeCloseTo(2 / 3);
    expect(th.update(false, true, 300, true)).toBe('hold');
    expect(th.progress(350, true)).toBe(0);
  });
  it('splits tap and hold when something is in reach', () => {
    const th = createTapHold(300);
    expect(th.update(true, true, 0, true)).toBe(null);
    expect(th.update(false, false, 100, true)).toBe('tap');
    expect(th.update(true, true, 1000, true)).toBe(null);
    expect(th.update(false, true, 1200, true)).toBe(null);
    expect(th.update(false, true, 1300, true)).toBe('hold');
    expect(th.update(false, true, 1400, true)).toBe(null);
    expect(th.update(false, false, 1500, true)).toBe(null); // no tap after a hold
    th.update(true, true, 2000, true);
    th.reset();
    expect(th.update(false, false, 2100, true)).toBe(null);
  });
  it('repeats like a held key: first delay, then a faster rate', () => {
    const r = createRepeater(350, 120);
    const fired = [];
    for (let ms = 0; ms <= 700; ms += 10) if (r.step('down', 10)) fired.push(ms);
    expect(fired[0]).toBe(0);
    expect(fired[1]).toBeGreaterThanOrEqual(340);
    expect(fired[1]).toBeLessThanOrEqual(360);
    expect(fired[2] - fired[1]).toBeGreaterThanOrEqual(110);
    expect(fired[2] - fired[1]).toBeLessThanOrEqual(130);
    expect(r.step(null, 10)).toBe(null);
    expect(r.step('up', 10)).toBe('up');
  });
  it('reads menu directions from the D-pad and the left stick (0.5 threshold)', () => {
    const t = createPadTracker();
    press(t, {});
    expect(menuDirection(press(t, { held: ['left'] }))).toBe('left');
    expect(menuDirection(press(t, { axes: [0, 0.4, 0, 0] }))).toBe(null);
    expect(menuDirection(press(t, { axes: [0, 0.8, 0, 0] }))).toBe('down');
    expect(menuDirection(press(t, { axes: [-0.9, 0.3, 0, 0] }))).toBe('left');
  });
  it('picks the next menu item spatially', () => {
    // two columns of two
    const rects = [
      { x: 0, y: 0, w: 100, h: 30 }, { x: 200, y: 0, w: 100, h: 30 },
      { x: 0, y: 50, w: 100, h: 30 }, { x: 200, y: 50, w: 100, h: 30 },
    ];
    expect(pickSpatial(-1, rects, 'down')).toBe(0);
    expect(pickSpatial(0, rects, 'down')).toBe(2);
    expect(pickSpatial(0, rects, 'right')).toBe(1);
    expect(pickSpatial(3, rects, 'up')).toBe(1);
    expect(pickSpatial(3, rects, 'left')).toBe(2);
    expect(pickSpatial(2, rects, 'down')).toBe(-1);
  });
  it('labels buttons per pad family', () => {
    expect(padStyleFromId('054c-0ce6-DualSense Wireless Controller')).toBe('playstation');
    expect(padStyleFromId('Pro Controller (Vendor: 057e)')).toBe('nintendo');
    expect(padStyleFromId('anything else')).toBe('xbox');
    expect(padGlyph('rt', 'playstation')).toBe('R2');
    expect(padGlyph('a', 'xbox')).toBe('A');
  });
});

describe('gameplay layout', () => {
  const ctx = (o = {}) => ({ nowMs: 0, dt: 1 / 60, canInteract: false, twoZoom: false, zoomK: 1, sensitivity: 1, ...o });
  function setup() {
    const t = createPadTracker();
    press(t, {});
    return { t, play: createPadGameplay() };
  }

  it('binds every action, never Home: RT fire, LT spell, LB next spell, R3 aim, X reload / pick up', () => {
    for (const a of ['fire', 'aim', 'castSpell', 'spellSelect', 'jump', 'slide', 'dash', 'reload', 'interact', 'swap', 'chainZap', 'swarm', 'manaShield', 'medkit', 'sprint', 'pause', 'panel']) {
      expect(PAD_BUTTONS, a).toContain(PAD_BINDINGS[a]);
    }
    expect(Object.values(PAD_BINDINGS)).not.toContain('home');
    expect(PAD_BINDINGS.fire).toBe('rt');
    expect(PAD_BINDINGS.castSpell).toBe('lt');
    expect(PAD_BINDINGS.spellSelect).toBe('lb');
    expect(PAD_BINDINGS.aim).toBe('r3');
    expect(PAD_BINDINGS.interact).toBe(PAD_BINDINGS.reload);
    // No two actions share a button, except X (tap reload / hold interact).
    const used = Object.entries(PAD_BINDINGS).filter(([a]) => a !== 'interact').map(([, b]) => b);
    expect(new Set(used).size).toBe(used.length);
  });
  it('moves and fires from the sticks and RT; LT casts the selected spell, LB picks the next', () => {
    const { t, play } = setup();
    const out = play.step(press(t, { axes: [0, -1, 0, 0], values: { rt: 1, lt: 1 } }), ctx());
    expect(out.moveZ).toBeCloseTo(1);
    expect(out.moveX).toBeCloseTo(0);
    expect(out.fire).toBe(true);
    expect(out.zoom).toBe(false); // LT no longer aims
    expect(out.castSpell).toBe(true);
    expect(play.step(press(t, { values: { rt: 1, lt: 1 } }), ctx()).castSpell).toBe(false); // once per pull
    expect(play.step(press(t, { held: ['lb'] }), ctx()).nextSpell).toBe(true);
  });
  it('sends one press per button press', () => {
    const { t, play } = setup();
    expect(play.step(press(t, { held: ['a', 'rb'] }), ctx()).presses).toEqual(['jump', 'dash']);
    expect(play.step(press(t, { held: ['a', 'rb'] }), ctx()).presses).toEqual([]);
    expect(play.step(press(t, { held: ['up', 'right', 'left', 'down', 'b'] }), ctx()).presses)
      .toEqual(['slide', 'chainZap', 'swarm', 'manaShield', 'medkit']);
  });
  it('R3 toggles aim: aim, then (sniper) zoom closer, then off', () => {
    const { t, play } = setup();
    const r3 = (c) => { const o = play.step(press(t, { held: ['r3'] }), ctx(c)); press(t, {}); return o; };
    let o = r3({ aiming: false });
    expect(o.aimToggle).toBe(true);
    expect(o.zoom).toBe(true);
    expect(play.step(press(t, {}), ctx({ aiming: true })).zoom).toBe(true); // stays aiming without holding
    o = r3({ aiming: true, twoZoom: true, zoomStep: 1 });
    expect(o.aimToggle).toBe(true);
    expect(o.zoom).toBe(true); // sniper: zoom 2
    expect(r3({ aiming: true, twoZoom: true, zoomStep: 2 }).zoom).toBe(false);
    expect(r3({ aiming: true, twoZoom: false, zoomStep: 1 }).zoom).toBe(false); // one-zoom gun: second click stops
  });
  it('X reloads; the same button held longer picks up when something is in reach', () => {
    const { t, play } = setup();
    expect(play.step(press(t, { held: ['x'] }), ctx()).reload).toBe(true);
    press(t, {});
    expect(play.step(press(t, { held: ['x'] }), ctx({ canInteract: true, nowMs: 1000 })).reload).toBe(false);
    const mid = play.step(press(t, { held: ['x'] }), ctx({ canInteract: true, nowMs: 1000 + PAD.interactHoldMs / 2 }));
    expect(mid.holdProgress).toBeCloseTo(0.5);
    const held = play.step(press(t, { held: ['x'] }), ctx({ canInteract: true, nowMs: 1000 + PAD.interactHoldMs }));
    expect(held.interact).toBe(true);
    expect(held.reload).toBe(false);
    press(t, {});
    play.step(press(t, { held: ['x'] }), ctx({ canInteract: true, nowMs: 2000 }));
    expect(play.step(press(t, {}), ctx({ canInteract: true, nowMs: 2100 })).reload).toBe(true); // short press: reload
  });
  it('Y always switches gun, even while aiming a sniper', () => {
    const { t, play } = setup();
    expect(play.step(press(t, { held: ['y'] }), ctx()).wheel).toBe(1);
    press(t, {});
    expect(play.step(press(t, { held: ['y'] }), ctx({ aiming: true, twoZoom: true, zoomStep: 1 })).wheel).toBe(1);
  });
  it('L3 toggles sprint, which ends when forward is let go or on aiming, and starting it drops aim', () => {
    const { t, play } = setup();
    expect(play.step(press(t, { held: ['l3'], axes: [0, -1, 0, 0] }), ctx()).sprint).toBe(true);
    expect(play.step(press(t, { axes: [0, -1, 0, 0] }), ctx()).sprint).toBe(true);
    expect(play.step(press(t, { axes: [0, 0, 0, 0] }), ctx()).sprint).toBe(false);
    expect(play.step(press(t, { axes: [0, -1, 0, 0] }), ctx()).sprint).toBe(false);
    const run = play.step(press(t, { held: ['l3'], axes: [0, -1, 0, 0] }), ctx({ aiming: true }));
    expect(run.sprint).toBe(true);
    expect(run.dropAim).toBe(true);
    expect(run.zoom).toBe(false);
  });
  it('right stick looks per second (frame-rate independent), not inverted, scaled by settings and zoom', () => {
    const { t, play } = setup();
    const right = play.step(press(t, { axes: [0, 0, 1, 0] }), ctx());
    expect(right.lookYaw).toBeLessThan(0); // turning right lowers yaw, like the mouse
    expect(right.lookYaw).toBeCloseTo(-PAD.yawSpeed);
    const up = play.step(press(t, { axes: [0, 0, 0, -1] }), ctx());
    expect(up.lookPitch).toBeCloseTo(PAD.pitchSpeed);
    const slow = play.step(press(t, { axes: [0, 0, 0, -1] }), ctx({ sensitivity: 0.5, zoomK: 0.5 }));
    expect(slow.lookPitch).toBeCloseTo(PAD.pitchSpeed * 0.25);
    expect(play.step(press(t, { axes: [0, 0, 0.1, 0] }), ctx()).lookYaw).toBeCloseTo(0); // inside the deadzone
  });
  it('turn boost ramps in after holding the stick at the rim', () => {
    const { t, play } = setup();
    let out;
    for (let i = 0; i < 60; i++) out = play.step(press(t, { axes: [0, 0, 1, 0] }), ctx({ dt: 1 / 60 }));
    expect(out.lookYaw).toBeCloseTo(-PAD.yawSpeed * (1 + PAD.turnBoost));
  });
  it('Menu pauses and View opens the gear panel', () => {
    const { t, play } = setup();
    const out = play.step(press(t, { held: ['start', 'back'] }), ctx());
    expect(out.pause).toBe(true);
    expect(out.panel).toBe(true);
  });
});

describe('aim assist (gamepad only)', () => {
  const eye = { x: 0, y: 1.6, z: 0 };
  const ahead = (z, dx = 0) => ({ center: { x: dx, y: 1.2, z: -z }, head: { x: dx, y: 1.8, z: -z }, r: 0.5 });

  it('does nothing without targets or when turned off', () => {
    expect(aimAssist({ eye, yaw: 0, pitch: 0, targets: [], aiming: true, dt: 1 / 60 }).slow).toBe(1);
    const off = aimAssist({ eye, yaw: 0, pitch: 0, targets: [ahead(10)], aiming: true, dt: 1 / 60, strength: 0 });
    expect(off).toEqual({ slow: 1, dYaw: 0, dPitch: 0, target: -1 });
  });
  it('slows the stick near a target, more while aiming, and not past its cone', () => {
    const hip = aimAssist({ eye, yaw: 0, pitch: 0, targets: [ahead(10)], aiming: false, dt: 1 / 60 });
    const ads = aimAssist({ eye, yaw: 0, pitch: 0, targets: [ahead(10)], aiming: true, dt: 1 / 60 });
    expect(hip.slow).toBeLessThan(1);
    expect(ads.slow).toBeLessThan(hip.slow);
    expect(ads.slow).toBeGreaterThanOrEqual(AIM_ASSIST.minSlow);
    expect(aimAssist({ eye, yaw: 0, pitch: 0, targets: [ahead(10, 8)], aiming: true, dt: 1 / 60 }).target).toBe(-1);
    expect(aimAssist({ eye, yaw: 0, pitch: 0, targets: [ahead(200)], aiming: true, dt: 1 / 60 }).target).toBe(-1);
    expect(aimAssist({ eye, yaw: 0, pitch: 0, targets: [ahead(40)], aiming: true, dt: 1 / 60, range: 20 }).target).toBe(-1);
  });
  it('pulls gently toward the head only while aiming, never overshooting', () => {
    const t = ahead(10, 0.4);
    const hip = aimAssist({ eye, yaw: 0, pitch: 0, targets: [t], aiming: false, input: 1, dt: 1 / 60 });
    expect(hip.dYaw).toBe(0);
    const ads = aimAssist({ eye, yaw: 0, pitch: 0, targets: [t], aiming: true, input: 1, dt: 1 / 60 });
    const head = lookAngles(eye, t.head);
    expect(Math.sign(ads.dYaw)).toBe(Math.sign(head.yaw));
    expect(Math.sign(ads.dPitch)).toBe(Math.sign(head.pitch));
    expect(Math.hypot(ads.dYaw, ads.dPitch)).toBeLessThanOrEqual((AIM_ASSIST.pullDegPerSec * Math.PI / 180) / 60 + 1e-9);
    const huge = aimAssist({ eye, yaw: 0, pitch: 0, targets: [t], aiming: true, input: 1, dt: 100 });
    expect(Math.abs(huge.dYaw)).toBeLessThanOrEqual(Math.abs(head.yaw) + 1e-9);
  });
  it('finds a live enemy body and head from its hitboxes', () => {
    const e = { id: 1, type: 'midget', pos: { x: 0, y: 0, z: -8 }, yaw: 0, scale: 1, dead: false, state: 'chase' };
    const out = assistTargets({ enemies: [e, { ...e, id: 2, dead: true }] });
    expect(out).toHaveLength(1);
    expect(out[0].head.y).toBeGreaterThan(out[0].center.y);
  });
});
