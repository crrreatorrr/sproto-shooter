// Keyboard/mouse + pointer lock -> Command objects. Edge latches consumed once per tick. PLAN §0.3, §1.3
const BIND = {
  forward: ['KeyW'], back: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
  sprint: ['ShiftLeft', 'ShiftRight'], jump: ['Space'], slide: ['KeyC', 'ControlLeft'], dash: ['AltLeft', 'KeyV'],
  reload: ['KeyR'], interact: ['KeyG'], medkit: ['KeyH'],
  gooBolt: ['KeyQ'], chainZap: ['KeyE'], swarm: ['KeyZ'], manaShield: ['KeyX'], meteor: ['KeyF'],
  skip: ['Enter'],
};
const LATCHED = ['jump', 'slide', 'dash', 'reload', 'interact', 'medkit', 'gooBolt', 'chainZap', 'swarm', 'manaShield', 'meteor', 'skip'];

export function createInput(canvas) {
  const held = new Set();
  const latch = {};
  let mouseL = false, mouseR = false, wheel = 0, slot = -1;
  let yaw = 0, pitch = 0;
  let actions = [];
  let enabled = true; // false while a menu is open
  const listeners = {};
  const api = {
    sensitivity: 0.0022,
    get locked() { return document.pointerLockElement === canvas; },
    on(type, fn) { (listeners[type] ||= []).push(fn); },
    setEnabled(v) { enabled = v; if (!v) { mouseL = mouseR = false; held.clear(); } },
    get enabled() { return enabled; },
    lock() { try { const r = canvas.requestPointerLock({ unadjustedMovement: false }); if (r && r.catch) r.catch(() => {}); } catch { /* ignore */ } },
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
        held: { fire: enabled && mouseL && api.locked, zoom: enabled && mouseR && api.locked, sprint: enabled && has('sprint') },
        pressed: enabled ? pressed : { skip: pressed.skip },
        slot: enabled ? slot : -1, wheel: enabled ? wheel : 0,
        actions,
      };
      slot = -1; wheel = 0; actions = [];
      return cmd;
    },
  };
  const emit = (t, e) => (listeners[t] || []).forEach((f) => f(e));

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (e.code === 'AltLeft' || e.code === 'Tab' || e.code === 'Space' || e.code === 'Backquote' || (e.ctrlKey && e.code !== 'ControlLeft')) e.preventDefault();
    emit('key', e);
    if (e.repeat) return;
    held.add(e.code);
    for (const k of LATCHED) if (BIND[k].includes(e.code)) latch[k] = true;
    if (/^Digit[1-4]$/.test(e.code)) slot = Number(e.code.slice(5)) - 1;
  });
  window.addEventListener('keyup', (e) => { held.delete(e.code); if (e.code === 'AltLeft') e.preventDefault(); emit('keyup', e); });
  window.addEventListener('blur', () => { held.clear(); mouseL = mouseR = false; });
  canvas.addEventListener('mousedown', (e) => {
    if (!api.locked) { emit('clickUnlocked', e); return; }
    if (e.button === 0) mouseL = true;
    if (e.button === 2) mouseR = true;
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseL = false; if (e.button === 2) mouseR = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('wheel', (e) => { if (api.locked && enabled) wheel = e.deltaY > 0 ? 1 : -1; }, { passive: true });
  document.addEventListener('mousemove', (e) => {
    if (!api.locked || !enabled) return;
    const zoomK = api.zoomSensitivity || 1;
    yaw -= e.movementX * api.sensitivity * zoomK;
    pitch -= e.movementY * api.sensitivity * zoomK;
    pitch = Math.max(-1.5, Math.min(1.5, pitch));
  });
  document.addEventListener('pointerlockchange', () => emit('lockchange', api.locked));
  return api;
}
