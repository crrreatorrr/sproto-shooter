// Gamepad -> gameplay intent for one frame. Pure (no DOM, no sim writes), so tests drive it with fake
// tracker frames. src/input/padController.js feeds the result into input.js, which builds the same
// Command the keyboard and mouse build. Layout and reasons: PAD_BINDINGS in src/input/padConfig.js.
import { PAD, PAD_BINDINGS } from './padConfig.js';
import { createTapHold, curveStick, isDown, wasPressed } from './gamepad.js';

/** Latched (one-tick) actions a single press sends, in the order they are checked. */
export const PAD_PRESS_ACTIONS = ['jump', 'slide', 'dash', 'chainZap', 'swarm', 'manaShield', 'medkit'];

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
     * @param {boolean} [ctx.aiming]  the aim toggle is on (input.js owns it; R3 flips it through aimToggle)
     * @param {boolean} [ctx.twoZoom]  the active gun has a two-level scope (a second R3 zooms closer)
     * @param {number} [ctx.zoomStep]  current zoom level while aiming (1 or 2)
     * @param {number} [ctx.zoomK]  field-of-view factor while zoomed (the mouse gets the same)
     * @param {number} [ctx.sensitivity]  player's controller look setting
     */
    step(f, ctx) {
      const out = {
        moveX: 0, moveZ: 0, fire: false, zoom: false, sprint: false,
        presses: [], reload: false, interact: false, holdProgress: 0, wheel: 0,
        castSpell: false, nextSpell: false, aimToggle: false, dropAim: false,
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

      // R3: aim toggle (aim -> sniper zoom 2 -> off). Aiming is predicted here so sprint and look react this frame.
      out.aimToggle = pressed('aim');
      let aiming = !!ctx.aiming;
      if (out.aimToggle && !aiming) aiming = true;
      else if (out.aimToggle && !(ctx.twoZoom && ctx.zoomStep === 1)) aiming = false;

      // Sprint: L3 toggles, like most console shooters. Letting go of forward or aiming ends it; starting it drops aim.
      if (pressed('sprint')) {
        sprintOn = !sprintOn;
        if (sprintOn && aiming) { aiming = false; out.dropAim = true; out.aimToggle = false; }
      }
      if (out.moveZ < cfg.sprintStopBelow || aiming) sprintOn = false;
      out.sprint = sprintOn;
      out.zoom = aiming;

      for (const a of PAD_PRESS_ACTIONS) if (pressed(a)) out.presses.push(a);
      // LT casts the selected spell, LB picks the next one (input.js keeps the pick, shared with Q / right-click).
      out.castSpell = pressed('castSpell');
      out.nextSpell = pressed('spellSelect');

      // X: tap reloads; holding it longer picks up / opens when something is in reach.
      const xb = binds.reload;
      const tap = reloadHold.update(wasPressed(f, xb), isDown(f, xb), ctx.nowMs, !!ctx.canInteract);
      if (tap === 'tap') out.reload = true;
      else if (tap === 'hold') out.interact = true;
      out.holdProgress = reloadHold.progress(ctx.nowMs, !!ctx.canInteract);

      // Y: next gun.
      if (pressed('swap')) out.wheel = 1;
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
