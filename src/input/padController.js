// Polls the gamepad once per frame and routes it: menus (focus, A confirm, B back) or play (the same
// Command the keyboard and mouse build, through input.js). The mapping logic lives in pure modules:
// gamepad.js (deadzones, edges, latch-on-connect, repeat), padGameplay.js (layout) and aimAssist.js.
import { createPadTracker, createRepeater, menuDirection, padStyleFromId, wasPressed } from './gamepad.js';
import { createPadGameplay } from './padGameplay.js';
import { aimAssist, assistTargets } from './aimAssist.js';
import { PAD_BUTTONS, PAD_MENU } from './padConfig.js';
import { eyePos } from '../sim/collision.js';
import { gunRange } from '../data/guns.js';

function readPads() {
  try { return typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []; } catch { return []; }
}

/**
 * @param {object} game  the Game (state, input, ui, nav, settings and the pause / back helpers)
 */
export function createPadController(game) {
  const tracker = createPadTracker();
  const play = createPadGameplay();
  const repeat = createRepeater();
  const targets = [];
  let wasConnected = false;

  function menuFrame(f, dt) {
    const { input, ui, nav } = game;
    if (!f.connected) return;
    // The first press after the focus was hidden (mouse or keyboard was in use) only shows it.
    const shown = !!(nav.current && nav.current.isConnected);
    if (input.device === 'pad') nav.ensure();
    const dir = repeat.step(menuDirection(f), dt * 1000);
    if (dir && shown) nav.move(dir);
    if (wasPressed(f, PAD_MENU.confirm) && shown) nav.activate();
    if (wasPressed(f, PAD_MENU.back)) game.navBack();
    if (wasPressed(f, PAD_MENU.pause)) game.navStart();
    const panelOpen = ui.menuOpen && game.screen.hidden && !game.pvpActive && !game.ctl?.isOpen;
    if (panelOpen && wasPressed(f, PAD_MENU.prevTab)) ui.cycleMenu(-1);
    if (panelOpen && wasPressed(f, PAD_MENU.nextTab)) ui.cycleMenu(1);
    if (panelOpen && wasPressed(f, PAD_MENU.close)) ui.closeMenu();
  }

  function playFrame(f, dt, nowMs) {
    const { input, ui } = game;
    const pvp = game.pvpActive;
    const s = game.state, p = s.players[s.localPlayerId];
    const out = play.step(f, {
      nowMs, dt, canInteract: input.canInteract,
      aiming: input.aiming, zoomStep: input.zoomLevel,
      twoZoom: input.zoomLevels > 1,
      zoomK: input.zoomSensitivity || 1,
      sensitivity: game.settings.padSensitivity ?? 1,
    });
    input.setPad({ moveX: out.moveX, moveZ: out.moveZ, fire: out.fire, sprint: out.sprint, holdProgress: out.holdProgress });
    if (out.aimToggle) input.toggleAim();
    if (out.dropAim) input.dropAim();
    for (const a of out.presses) input.padPress(a);
    if (out.nextSpell) input.nextSpell();
    if (out.castSpell) input.castSpell();
    if (out.reload) input.padPress('reload');
    if (out.interact) input.holdInteract();
    if (out.wheel) input.padWheel(out.wheel);

    let slow = 1, pullYaw = 0, pullPitch = 0;
    if (!pvp && p && !p.dead) {
      const g = p.guns[p.activeSlot];
      const look = input.liveLook();
      const a = aimAssist({
        eye: eyePos(p), yaw: look.yaw, pitch: look.pitch,
        targets: assistTargets(s, targets), aiming: out.zoom, input: out.steer, dt,
        strength: game.settings.aimAssist ?? 1, range: g ? gunRange(g).max : 0,
      });
      slow = a.slow; pullYaw = a.dYaw; pullPitch = a.dPitch;
    }
    input.addLook(out.lookYaw * slow * dt + pullYaw, out.lookPitch * slow * dt + pullPitch);

    if (out.pause) game.navStart();
    else if (out.panel && !pvp) ui.openGearPanel();
  }

  return {
    get connected() { return wasConnected; },
    /** `dt` in seconds (real frame time, not sim ticks). */
    frame(dt, nowMs = performance.now()) {
      const f = tracker.update(readPads());
      if (f.connected !== wasConnected) {
        wasConnected = f.connected;
        game.onPadConnection(f.connected);
      }
      if (f.connected && f.activity) {
        game.padStyle = padStyleFromId(f.id);
        game.input.setDevice('pad');
      }
      // Controller settings is waiting for a button: the next press is the binding, nothing else.
      if (game.ctl && game.ctl.capturing) {
        game.input.setPad(null);
        play.reset();
        if (f.connected) {
          const b = PAD_BUTTONS.find((name) => wasPressed(f, name));
          if (b) game.ctl.padPressed(b);
        }
        return;
      }
      if (game.navRoot()) {
        game.input.setPad(null);
        play.reset();
        menuFrame(f, dt);
        return;
      }
      if (!f.connected) { game.input.setPad(null); play.reset(); return; }
      playFrame(f, dt, nowMs);
    },
  };
}
