// Shared avatar step. Campaign, Wave Mode, Sandbox, and Free 1v1 all call this.
// The numbers come from GAMEPLAY only. `world` may sample the map. It cannot
// pass a speed, a jump, or a damage number.
import { GAMEPLAY as G } from '../data/gameplay.js';

/**
 * One tick of locomotion: stamina, sprint, coyote, jump buffer, double jump,
 * dash (including the speed cut when it ends), slide (button or crouch while
 * sprinting, plus downhill), and ground or air control. Does not apply gravity,
 * the grapple pull, or collision. Those stay in order around this call.
 *
 * `body.move` is the campaign move record (mode, dash, slide). `body.vel` and
 * `body.pos` are mutated. Scalar fields on `body` are mutated too.
 * `world.groundAt(x, z, radius, feet, reach)` returns a floor height, or a
 * number <= -1e8 when there is no floor. `world.emit(name)` is optional.
 * `body.speedScales` is a list of map or status multipliers applied after the
 * shared walk or sprint speed (ice, a scripted slow). It is not a second speed.
 */
export function stepLocomotion(body, wish, dt, world = {}) {
  const move = body.move;
  const vel = body.vel;
  move.slideCd = Math.max(0, move.slideCd - dt);
  move.dashCd = Math.max(0, move.dashCd - dt);

  const sy = Math.sin(body.yaw);
  const cy = Math.cos(body.yaw);
  let wx = -sy * wish.moveZ + cy * wish.moveX;
  let wz = -cy * wish.moveZ - sy * wish.moveX;
  const wl = Math.hypot(wx, wz);
  if (wl > 1) { wx /= wl; wz /= wl; }

  const canAct = !body.downed;
  const zooming = !!(wish.zoom || body.zooming);
  const wantSprint = canAct && !!wish.sprint && wish.moveZ > 0 && !zooming && !body.staminaLock && body.stamina > 0;
  let sprinting = wantSprint;
  if (sprinting) {
    body.stamina = Math.max(0, body.stamina - dt / G.staminaSprint);
    body.staminaDelay = G.staminaRegenDelay;
    if (body.stamina <= 0) { body.staminaLock = true; sprinting = false; }
  } else {
    if (body.staminaDelay > 0) body.staminaDelay = Math.max(0, body.staminaDelay - dt);
    else if (body.stamina < 1) body.stamina = Math.min(1, body.stamina + dt / G.staminaRegen);
    if (body.staminaLock && body.stamina >= G.staminaRefill) body.staminaLock = false;
  }
  let maxSpeed = sprinting ? G.sprintSpeed : G.walkSpeed;
  const scales = body.speedScales;
  if (scales) for (let i = 0; i < scales.length; i++) maxSpeed *= scales[i];
  if (body.downed) maxSpeed *= G.downedSpeedMult;

  if (wish.jump) body.jumpBufferT = G.jumpBuffer;
  else body.jumpBufferT = Math.max(0, body.jumpBufferT - dt);
  if (body.onGround) { body.coyoteT = G.coyote; body.jumpsLeft = 2; }
  else body.coyoteT = Math.max(0, body.coyoteT - dt);

  const emit = world.emit;
  if (canAct && wish.dash && move.dashCd <= 0) {
    const dl = Math.hypot(wx, wz);
    move.dashDir = dl > 0.1 ? { x: wx / dl, z: wz / dl } : { x: -sy, z: -cy };
    move.mode = 'dash';
    move.dashT = G.dashTime;
    move.dashCd = G.dashCd;
    body.invulnT = Math.max(body.invulnT || 0, G.dashInvuln);
    if (emit) emit('dash');
  }

  const hs = Math.hypot(vel.x, vel.z);
  const wantSlide = canAct && body.onGround && move.mode !== 'slide' && move.slideCd <= 0
    && (wish.slide || (wish.crouch && sprinting))
    && (hs > G.slideMinSpeed || sprinting);
  if (wantSlide) {
    const dirx = hs > 0.4 ? vel.x / hs : -sy;
    const dirz = hs > 0.4 ? vel.z / hs : -cy;
    const boost = Math.max(hs, G.slideBoost);
    vel.x = dirx * boost;
    vel.z = dirz * boost;
    move.mode = 'slide';
    move.slideT = G.slideTime;
    body.stamina = Math.max(0, body.stamina - G.slideStamina);
    body.staminaDelay = G.staminaRegenDelay;
    if (body.stamina <= 0) body.staminaLock = true;
    if (emit) emit('slide');
  }

  const hooked = !!body.grapple;
  if (move.mode === 'dash') {
    move.dashT -= dt;
    vel.x = move.dashDir.x * G.dashSpeed;
    vel.z = move.dashDir.z * G.dashSpeed;
    vel.y = Math.max(vel.y, 0);
    if (move.dashT <= 0) {
      move.mode = 'walk';
      vel.x *= G.dashEndScale;
      vel.z *= G.dashEndScale;
    }
  } else if (move.mode === 'slide' && !hooked) {
    move.slideT -= dt;
    if (wl > 0.2) { vel.x += wx * G.slideSteer * dt; vel.z += wz * G.slideSteer * dt; }
    let sp = Math.hypot(vel.x, vel.z) || 0.0001;
    const probe = G.slideProbe;
    if (world.groundAt) {
      const pos = body.pos;
      const ux = vel.x / sp;
      const uz = vel.z / sp;
      const here = world.groundAt(pos.x, pos.z, probe.radius, pos.y + probe.hereFeet, probe.hereReach);
      const there = world.groundAt(
        pos.x + ux * probe.ahead, pos.z + uz * probe.ahead, probe.radius, pos.y + probe.thereFeet, probe.thereReach,
      );
      if (here > -1e8 && there > -1e8 && here - there > probe.drop) {
        const gain = Math.min(G.slideSlope * dt, (here - there) * probe.gain);
        vel.x += ux * gain;
        vel.z += uz * gain;
        sp = Math.hypot(vel.x, vel.z) || 0.0001;
      }
    }
    const next = sp + (G.slideCruise - sp) * Math.min(1, G.slideDrag * dt);
    const k = Math.max(0, next) / sp;
    vel.x *= k;
    vel.z *= k;
    if (move.slideT <= 0 || next < G.walkSpeed * G.slideStopFrac || !body.onGround) {
      move.mode = body.onGround ? 'walk' : 'air';
      move.slideCd = G.slideCd;
    }
  } else if (body.onGround && !hooked) {
    const tx = wx * maxSpeed;
    const tz = wz * maxSpeed;
    const dx = tx - vel.x;
    const dz = tz - vel.z;
    const dl = Math.hypot(dx, dz);
    const acc = (wl > 0.01 ? G.groundAccel : G.friction * Math.max(hs, 2)) * dt;
    if (dl > 0) {
      const k = Math.min(1, acc / dl);
      vel.x += dx * k;
      vel.z += dz * k;
    }
    move.mode = sprinting ? 'sprint' : 'walk';
  } else if (hooked) {
    move.mode = 'air';
  } else {
    const cap = Math.max(hs, G.walkSpeed);
    vel.x += wx * G.airAccel * dt;
    vel.z += wz * G.airAccel * dt;
    const nh = Math.hypot(vel.x, vel.z);
    if (nh > cap) { vel.x *= cap / nh; vel.z *= cap / nh; }
    move.mode = 'air';
  }

  if (canAct && body.jumpBufferT > 0) {
    if (body.onGround || body.coyoteT > 0) {
      vel.y = G.jumpVel;
      body.onGround = false;
      body.coyoteT = 0;
      body.jumpsLeft = 1;
      body.jumpBufferT = 0;
      if (move.mode === 'slide') {
        const sp = Math.hypot(vel.x, vel.z);
        if (sp > 0.1) {
          const boosted = sp * G.slideHopBoost;
          vel.x = (vel.x / sp) * boosted;
          vel.z = (vel.z / sp) * boosted;
        }
        move.mode = 'air';
        move.slideCd = G.slideHopCd;
      }
      if (emit) emit('jump');
    } else if (body.jumpsLeft > 0) {
      vel.y = G.doubleJumpVel;
      body.jumpsLeft = 0;
      body.jumpBufferT = 0;
      if (emit) emit('doubleJump');
    }
  }
}

export function applyGravity(body, dt) {
  if (body.move.mode !== 'dash') body.vel.y -= G.gravity * dt;
}

/** Enter the shared downed state at 0 HP. The timer is the campaign second wind. */
export function beginDowned(body) {
  body.hp = 0;
  body.downed = true;
  body.downedT = G.secondWindTime;
}

/** Returns true on the tick the downed timer runs out. The caller marks the death. */
export function tickDowned(body, dt) {
  if (!body.downed) return false;
  body.downedT -= dt;
  if (body.downedT <= 0) {
    body.downed = false;
    body.downedT = 0;
    return true;
  }
  return false;
}
