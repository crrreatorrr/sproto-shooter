// Gamepad -> gameplay intent for one frame. Pure (no DOM, no sim writes), so tests drive it with fake
// tracker frames. src/input/padController.js feeds the result into input.js, which builds the same
// Command the keyboard and mouse build. Layout and reasons: PAD_BINDINGS in src/data/gamepad.js.
import { PAD, PAD_BINDINGS } from '../data/gamepad.js';
import { createTapHold, curveStick, isDown, wasPressed } from './gamepad.js';

/** Latched (one-tick) actions a single press sends, in the order they are checked. */
export const PAD_PRESS_ACTIONS = ['jump', 'slide', 'dash', 'gooBolt', 'chainZap', 'swarm', 'manaShield', 'medkit', 'meteor'];

/**
 * @param {typeof PAD} [cfg]
 * @param {typeof PAD_BINDINGS} [binds]
 */
export function createPadGameplay(cfg = PAD, binds = PAD_BINDINGS) {
  const reloadHold = createTapHold(cfg.interactHoldMs);
  let sprintOn = false;
  let rimT = 0; // seconds the look stick has been held at the rim (turn boost)
  function reset() { reloadHold.reset(); sprintOn = false; rimT = 0; }

  return {
    /** Forget presses in progress (call when a menu or pause takes the pad away from play). */
    reset,
    get sprintOn() { return sprintOn; },
    /**
     * @param {object} f  frame from createPadTracker().update()
     * @param {object} ctx
     * @param {number} ctx.nowMs
     * @param {number} ctx.dt  seconds since the last frame
     * @param {boolean} [ctx.canInteract]  a gun or Weapon Box is in reach (X becomes tap / hold)
     * @param {boolean} [ctx.twoZoom]  the active gun has a two-level scope
     * @param {number} [ctx.zoomK]  field-of-view factor while zoomed (the mouse gets the same)
     * @param {number} [ctx.sensitivity]  player's controller look setting
     */
    step(f, ctx) {
      const out = {
        moveX: 0, moveZ: 0, fire: false, zoom: false, sprint: false,
        presses: [], reload: false, interact: false, wheel: 0, cycleZoom: false,
        pause: false, panel: false,
        lookYaw: 0, lookPitch: 0, // radians per second, before aim-assist slowdown
        steer: 0, // 0..1, how hard the player is steering (for the aim-assist pull)
      };
      if (!f || !f.connected) { reset(); return out; }
      const down = (a) => isDown(f, binds[a]);
      const pressed = (a) => wasPressed(f, binds[a]);

      // Move: left stick, forward is stick up (negative y).
      out.moveX = f.move.x;
      out.moveZ = -f.move.y;
      out.fire = down('fire');
      out.zoom = down('aim');

      // Sprint: L3 toggles, like most console shooters. Letting go of forward or aiming ends it.
      if (pressed('sprint')) sprintOn = !sprintOn;
      if (out.moveZ < cfg.sprintStopBelow || out.zoom) sprintOn = false;
      out.sprint = sprintOn;

      for (const a of PAD_PRESS_ACTIONS) if (pressed(a)) out.presses.push(a);

      // X: tap reloads; hold picks up / opens when something is in reach (otherwise reload is instant).
      const xb = binds.reload;
      const tap = reloadHold.update(wasPressed(f, xb), isDown(f, xb), ctx.nowMs, !!ctx.canInteract);
      if (tap === 'tap') out.reload = true;
      else if (tap === 'hold') out.interact = true;

      // Y: next gun; while aiming a two-level scope it flips zoom 1 / 2 instead (the mouse wheel does the same).
      if (pressed('swap')) {
        if (out.zoom && ctx.twoZoom) out.cycleZoom = true;
        else out.wheel = 1;
      }
      out.pause = pressed('pause');
      out.panel = pressed('panel');

      // Look: right stick with a response curve, frame-rate independent (rates are per second).
      const s = curveStick(f.look, cfg.lookCurve);
      const dt = Math.max(0, ctx.dt || 0);
      rimT = f.look.mag >= cfg.turnBoostAt && !out.zoom ? rimT + dt : 0;
      const boost = 1 + cfg.turnBoost * Math.min(1, Math.max(0, (rimT - cfg.turnBoostDelay) / cfg.turnBoostRamp));
      const k = (ctx.sensitivity ?? 1) * (ctx.zoomK ?? 1) * (out.zoom ? cfg.adsLookScale : 1);
      out.lookYaw = -s.x * cfg.yawSpeed * boost * k; // stick right turns right (yaw goes down, like the mouse)
      out.lookPitch = -s.y * cfg.pitchSpeed * k; // stick up looks up; not inverted
      out.steer = Math.min(1, Math.max(f.look.mag, f.move.mag));
      return out;
    },
  };
}
