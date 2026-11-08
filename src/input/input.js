// Keyboard/mouse + pointer lock -> Command objects. Edge latches consumed once per tick. PLAN §0.3, §1.3
const BIND = {
  forward: ['KeyW'], back: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
  sprint: ['ShiftLeft', 'ShiftRight'], jump: ['Space'], slide: ['KeyC', 'ControlLeft'], dash: ['AltLeft', 'KeyV'],
  reload: ['KeyR'], interact: ['KeyG'], medkit: ['KeyH'],
  gooBolt: ['KeyQ'], chainZap: ['KeyE'], swarm: ['KeyZ'], manaShield: ['KeyX'], meteor: ['KeyT'],
  aimToggle: ['KeyF'], // press to aim, press again to stop (holding right-click also aims)
  skip: ['Enter'],
};
const LATCHED = ['jump', 'slide', 'dash', 'reload', 'interact', 'medkit', 'gooBolt', 'chainZap', 'swarm', 'manaShield', 'meteor', 'skip'];

export function createInput(canvas) {
  const held = new Set();
  const latch = {};
  let mouseL = false, mouseR = false, wheel = 0, slot = -1;
  let aimToggled = false;
  let zoomStep = 1; // 1 or 2; only guns with two zoom levels (sniper) use 2
  let yaw = 0, pitch = 0;
  let actions = [];
  let enabled = true; // false while a menu is open
  let lockEl = canvas;
  let relay = null;
  const listeners = {};
  const api = {
    sensitivity: 0.0022,
    zoomLevels: 1, // set each frame from the active gun
    /** 0 when not aiming, else the zoom level (1 or 2). */
    get zoomLevel() { return enabled && api.locked && (mouseR || aimToggled) ? Math.min(zoomStep, api.zoomLevels) : 0; },
    get locked() { return document.pointerLockElement === lockEl; },
    // Free-arena practice locks a different canvas. Campaign play leaves this on the game view.
    setLockElement(el) {
      if (lockEl && lockEl !== canvas) lockEl.removeEventListener('mousedown', onMouseDown);
      lockEl = el || canvas;
      if (lockEl !== canvas) lockEl.addEventListener('mousedown', onMouseDown);
    },
    setRelay(fn) { relay = typeof fn === 'function' ? fn : null; },
    on(type, fn) { (listeners[type] ||= []).push(fn); },
    setEnabled(v) { enabled = v; if (!v) { mouseL = mouseR = false; aimToggled = false; zoomStep = 1; held.clear(); } },
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
      const cmd = {
        tick, yaw, pitch,
        moveX: enabled ? (has('right') ? 1 : 0) - (has('left') ? 1 : 0) : 0,
        moveZ: enabled ? (has('forward') ? 1 : 0) - (has('back') ? 1 : 0) : 0,
        held: { fire: enabled && mouseL && api.locked, zoom: enabled && (mouseR || aimToggled) && api.locked, sprint: enabled && has('sprint') },
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
    if (!api.locked) { emit('clickUnlocked', e); return; }
    if (e.button === 0) mouseL = true;
    if (e.button === 2) { if (!aimToggled) zoomStep = 1; mouseR = true; }
  }
  const emit = (t, e) => (listeners[t] || []).forEach((f) => f(e));

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (e.code === 'AltLeft' || e.code === 'Tab' || e.code === 'Space' || e.code === 'Backquote' || (e.ctrlKey && e.code !== 'ControlLeft')) e.preventDefault();
    emit('key', e);
    if (e.repeat) return;
    held.add(e.code);
    for (const k of LATCHED) if (BIND[k].includes(e.code)) latch[k] = true;
    if (/^Digit[1-4]$/.test(e.code)) slot = Number(e.code.slice(5)) - 1;
    if (e.code === 'KeyL') slot = 4; // legendary slot (5 opens the stats panel)
    // F: off → zoom 1 → (sniper) zoom 2 → off
    if (BIND.aimToggle.includes(e.code) && enabled && api.locked) {
      const aiming = mouseR || aimToggled;
      if (!aiming) { aimToggled = true; zoomStep = 1; } else if (zoomStep < api.zoomLevels) zoomStep++; else { aimToggled = false; zoomStep = 1; }
    }
    if (BIND.sprint.includes(e.code)) { aimToggled = false; zoomStep = 1; } // sprinting drops a toggled aim
  });
  window.addEventListener('keyup', (e) => { held.delete(e.code); if (e.code === 'AltLeft') e.preventDefault(); emit('keyup', e); });
  window.addEventListener('blur', () => { held.clear(); mouseL = mouseR = false; aimToggled = false; zoomStep = 1; });
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseL = false; if (e.button === 2) { mouseR = false; if (!aimToggled) zoomStep = 1; } });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('wheel', (e) => {
    if (!api.locked || !enabled) return;
    // while zoomed with a two-level scope the wheel changes zoom instead of switching guns
    if (api.zoomLevel > 0 && api.zoomLevels > 1) { zoomStep = e.deltaY < 0 ? 2 : 1; return; }
    wheel = e.deltaY > 0 ? 1 : -1;
  }, { passive: true });
  document.addEventListener('mousemove', (e) => {
    if (!api.locked || !enabled) return;
    const zoomK = api.zoomSensitivity || 1;
    yaw -= e.movementX * api.sensitivity * zoomK;
    pitch -= e.movementY * api.sensitivity * zoomK;
    pitch = Math.max(-1.5, Math.min(1.5, pitch));
  });
  document.addEventListener('pointerlockchange', () => { if (!api.locked) { aimToggled = false; zoomStep = 1; } emit('lockchange', api.locked); });
  return api;
}
