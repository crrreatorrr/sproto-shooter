// Keyboard/mouse + pointer lock -> Command objects. Edge latches consumed once per tick. PLAN §0.3, §1.3
// A gamepad feeds the same Command through setPad / padPress / addLook (src/input/padController.js).
// With no pad state every keyboard and mouse path below is unchanged.
// Keyboard layout follows the shared Sproto convention: WASD or arrows move, Space jumps, Shift runs,
// R reloads (hold R to pick up / open; E and G still work), Esc pauses. Keep README.md and the in-game
// controls list in sync. The keyboard and the pad share one layout idea: tap reload / hold pick up,
// one button casts the selected spell (right-click / LT), one picks the next spell (Q / LB), and aim is a
// toggle (F or middle-click / R3): aim, then (sniper) zoom closer, then stop.
import { createTapHold } from './gamepad.js';
import { PAD } from './padConfig.js';
import { SPELL_IDS } from '../data/skills.js';

export const BIND = {
  forward: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'], jump: ['Space'], slide: ['KeyC', 'ControlLeft'], dash: ['AltLeft', 'KeyV'],
  reload: ['KeyR'], interact: ['KeyE', 'KeyG'], medkit: ['KeyH'],
  gooBolt: [], chainZap: ['KeyY'], swarm: ['KeyZ'], manaShield: ['KeyX'], meteor: ['KeyT'], // Goo Bolt: select it and right-click
  spellSelect: ['KeyQ'], // next unlocked spell; right-click casts the selected one
  aimToggle: ['KeyF'], // aim -> (sniper) zoom 2 -> off; middle-click does the same
  skip: ['Enter'],
};
export const LATCHED = ['jump', 'slide', 'dash', 'reload', 'interact', 'medkit', 'gooBolt', 'chainZap', 'swarm', 'manaShield', 'meteor', 'skip'];

/** Key label shown in prompts and on the HUD for an action (the first key bound to it). */
export function keyLabel(action) {
  const code = (BIND[action] || [])[0] || '';
  return code.replace(/^Key|^Digit/, '').replace(/^(Shift|Alt|Control)(Left|Right)$/, '$1').replace(/^Arrow/, '');
}

/** Keys that move menu focus (arrows and W / A / S / D), as a direction. */
export const NAV_KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};

export function createInput(canvas) {
  const held = new Set();
  const latch = {};
  let mouseL = false, wheel = 0, slot = -1;
  let aimToggled = false;
  let zoomStep = 1; // 1 or 2; only guns with two zoom levels (sniper) use 2
  let spell = SPELL_IDS[0]; // the spell right-click / LT casts
  const reloadHold = createTapHold(PAD.interactHoldMs); // R: tap reloads, hold picks up / opens
  let yaw = 0, pitch = 0;
  let actions = [];
  let enabled = true; // false while a menu is open
  let lockEl = canvas;
  let relay = null;
  let pad = null; // { moveX, moveZ, fire, sprint, holdProgress } from the gamepad this frame, or null
  let device = 'kbm'; // last device used: 'kbm' or 'pad' (decides which prompts show)
  const listeners = {};
  const api = {
    sensitivity: 0.0022,
    zoomLevels: 1, // set each frame from the active gun
    canInteract: false, // set each frame: a gun or Weapon Box is in reach (reload becomes tap / hold)
    spellsUnlocked: SPELL_IDS, // set each frame from the player's perks
    /** 0 when not aiming, else the zoom level (1 or 2). */
    get zoomLevel() { return api.aiming ? Math.min(zoomStep, api.zoomLevels) : 0; },
    /** The aim toggle is on (pointer lock is needed on mouse and keyboard; a pad never gets it). */
    get aiming() { return enabled && aimToggled && (api.locked || device === 'pad'); },
    /** Aim toggle (F, middle-click, R3): off -> zoom 1 -> (two-level scope) zoom 2 -> off. */
    toggleAim() {
      if (!enabled) return;
      if (!aimToggled) { aimToggled = true; zoomStep = 1; } else if (zoomStep < api.zoomLevels) zoomStep++; else api.dropAim();
    },
    dropAim() { aimToggled = false; zoomStep = 1; },
    /** The spell right-click / LT casts. A locked pick falls back to the first unlocked spell. */
    get spell() {
      const list = api.spellsUnlocked || SPELL_IDS;
      return list.length && !list.includes(spell) ? list[0] : spell;
    },
    /** Q / LB: the next unlocked spell (all spells when none are unlocked yet, so the HUD still moves). */
    nextSpell() {
      if (!enabled) return;
      const list = api.spellsUnlocked && api.spellsUnlocked.length ? api.spellsUnlocked : SPELL_IDS;
      const cur = api.spell;
      const i = list.indexOf(cur);
      spell = list[(i + 1) % list.length];
      emit('spell', spell);
    },
    castSpell() { if (enabled) latch[api.spell] = true; },
    /** 0..1 while a reload press is being held toward a pick up (for the prompt). */
    get holdProgress() {
      const kb = held.has('KeyR') ? reloadHold.progress(performance.now(), api.canInteract) : 0;
      return Math.max(kb, (pad && pad.holdProgress) || 0);
    },
    /** A held reload reached pick up: grab the gun in reach (through the sim), or open the Weapon Box. */
    holdInteract() { if (!enabled) return; latch.interact = true; emit('holdInteract'); },
    /** Once per rendered frame: finishes a keyboard reload tap / hold. */
    frame(nowMs = performance.now()) {
      if (!enabled) { reloadHold.reset(); return; }
      const r = reloadHold.update(false, held.has('KeyR'), nowMs, api.canInteract);
      if (r === 'tap') latch.reload = true;
      else if (r === 'hold') api.holdInteract();
    },
    get device() { return device; },
    setDevice(d) { if (d === device) return; device = d; emit('device', d); },
    /** Gamepad gameplay state for this frame (null when no pad is driving play). */
    setPad(next) { pad = next; },
    /** One gamepad press of a latched action (jump, reload, a spell...). */
    padPress(name) { if (LATCHED.includes(name)) latch[name] = true; },
    padWheel(dir) { if (enabled) wheel = dir; },
    /** Right-stick look, already scaled to radians for this frame. */
    addLook(dYaw, dPitch) {
      if (!enabled) return;
      yaw += dYaw;
      pitch = Math.max(-1.5, Math.min(1.5, pitch + dPitch));
    },
    get locked() { return document.pointerLockElement === lockEl; },
    // Free-arena practice locks a different canvas. Campaign play leaves this on the game view.
    setLockElement(el) {
      if (lockEl && lockEl !== canvas) lockEl.removeEventListener('mousedown', onMouseDown);
      lockEl = el || canvas;
      if (lockEl !== canvas) lockEl.addEventListener('mousedown', onMouseDown);
    },
    setRelay(fn) { relay = typeof fn === 'function' ? fn : null; },
    on(type, fn) { (listeners[type] ||= []).push(fn); },
    setEnabled(v) { enabled = v; if (!v) { mouseL = false; aimToggled = false; zoomStep = 1; held.clear(); reloadHold.reset(); } },
    get enabled() { return enabled; },
    lock() { try { const r = lockEl.requestPointerLock({ unadjustedMovement: false }); if (r && r.catch) r.catch(() => {}); } catch { /* ignore */ } },
    unlock() { if (document.pointerLockElement) document.exitPointerLock(); },
    queueAction(a) { actions.push(a); },
    liveLook() { return { yaw, pitch }; },
    setLook(y, p) { yaw = y; pitch = p; },
    buildCommand(tick) {
      const has = (k) => BIND[k].some((c) => held.has(c));
      const pressed = {};
      for (const k of LATCHED) { pressed[k] = !!latch[k]; latch[k] = false; }
      let moveX = enabled ? (has('right') ? 1 : 0) - (has('left') ? 1 : 0) : 0;
      let moveZ = enabled ? (has('forward') ? 1 : 0) - (has('back') ? 1 : 0) : 0;
      if (enabled && pad) {
        moveX = Math.max(-1, Math.min(1, moveX + pad.moveX));
        moveZ = Math.max(-1, Math.min(1, moveZ + pad.moveZ));
      }
      const padHeld = enabled && pad;
      const cmd = {
        tick, yaw, pitch, moveX, moveZ,
        held: {
          fire: enabled && ((mouseL && api.locked) || !!(padHeld && pad.fire)),
          zoom: api.aiming,
          sprint: enabled && (has('sprint') || !!(padHeld && pad.sprint)),
        },
        pressed: enabled ? pressed : { skip: pressed.skip },
        slot: enabled ? slot : -1, wheel: enabled ? wheel : 0,
        actions,
      };
      slot = -1; wheel = 0; actions = [];
      if (relay) relay(cmd);
      return cmd;
    },
  };
  function onMouseDown(e) {
    api.setDevice('kbm');
    if (!api.locked) { emit('clickUnlocked', e); return; }
    if (e.button === 0) mouseL = true;
    if (e.button === 1) { e.preventDefault(); api.toggleAim(); }
    if (e.button === 2) api.castSpell();
  }
  const emit = (t, e) => (listeners[t] || []).forEach((f) => f(e));

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (e.code === 'AltLeft' || e.code === 'Tab' || e.code === 'Space' || e.code === 'Backquote' || e.code.startsWith('Arrow') || (e.ctrlKey && e.code !== 'ControlLeft')) e.preventDefault();
    api.setDevice('kbm');
    emit('key', e);
    if (e.repeat || e.sprotoMenuKey) return; // a key a menu used (Space / Enter confirm) never reaches play
    held.add(e.code);
    for (const k of LATCHED) if (k !== 'reload' && BIND[k].includes(e.code)) latch[k] = true;
    // R: reloads at once, unless something is in reach; then a tap reloads and a hold picks it up
    if (BIND.reload.includes(e.code) && enabled) {
      const r = reloadHold.update(true, true, performance.now(), api.canInteract);
      if (r === 'tap') latch.reload = true;
    }
    if (BIND.spellSelect.includes(e.code)) api.nextSpell();
    if (/^Digit[1-4]$/.test(e.code)) slot = Number(e.code.slice(5)) - 1;
    if (e.code === 'KeyL') slot = 4; // legendary slot (5 opens the stats panel)
    // F: off → zoom 1 → (sniper) zoom 2 → off
    if (BIND.aimToggle.includes(e.code) && api.locked) api.toggleAim();
    if (BIND.sprint.includes(e.code)) api.dropAim(); // sprinting drops a toggled aim
  });
  window.addEventListener('keyup', (e) => { held.delete(e.code); if (e.code === 'AltLeft') e.preventDefault(); emit('keyup', e); });
  window.addEventListener('blur', () => { held.clear(); mouseL = false; aimToggled = false; zoomStep = 1; reloadHold.reset(); });
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseL = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('wheel', (e) => {
    if (!api.locked || !enabled) return;
    // while zoomed with a two-level scope the wheel changes zoom instead of switching guns
    if (api.zoomLevel > 0 && api.zoomLevels > 1) { zoomStep = e.deltaY < 0 ? 2 : 1; return; }
    wheel = e.deltaY > 0 ? 1 : -1;
  }, { passive: true });
  document.addEventListener('mousemove', (e) => {
    if (!api.locked || !enabled) return;
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) api.setDevice('kbm');
    const zoomK = api.zoomSensitivity || 1;
    yaw -= e.movementX * api.sensitivity * zoomK;
    pitch -= e.movementY * api.sensitivity * zoomK;
    pitch = Math.max(-1.5, Math.min(1.5, pitch));
  });
  document.addEventListener('pointerlockchange', () => { if (!api.locked && device !== 'pad') api.dropAim(); emit('lockchange', api.locked); });
  return api;
}
