// @ts-check
import { TUNING } from '../../data/tuning.js';

const lerp = (a, b, t) => a + (b - a) * t;

/** Eye height, bob, land dip, trauma shake, fov punch. Viewmodel bob advances here so the gun and the camera share one phase. */
export function createCameraRig(ctx) {
  const { camera } = ctx;
  const feel = { trauma: 0, fovPunch: 0, fov: TUNING.fovBase, landDip: 0, eye: /** @type {number | null} */ (null) };
  /** @type {{ bob: number } | null} */
  let vm = null;

  return {
    feel,
    bindViewmodel(state) { vm = state; },
    addTrauma(t) { feel.trauma = Math.min(1, feel.trauma + t); },
    update(state, alpha, look, opts, frame) {
      const { now, dt } = frame;
      const p = state.players[state.localPlayerId];
      const px = lerp(p.prevPos.x, p.pos.x, alpha);
      const py = lerp(p.prevPos.y, p.pos.y, alpha);
      const pz = lerp(p.prevPos.z, p.pos.z, alpha);
      const eyeT = p.dead ? 0.3 : p.downed ? TUNING.downedEye : p.move.mode === 'slide' ? TUNING.slideEye : TUNING.eyeHeight;
      feel.eye = feel.eye == null ? eyeT : lerp(feel.eye, eyeT, Math.min(1, dt * 14));
      const speed = Math.hypot(p.vel.x, p.vel.z);
      if (vm && p.onGround && speed > 1) vm.bob += dt * speed * 1.4;
      const bob = vm ? vm.bob : 0;
      const bobY = p.onGround ? Math.sin(bob * 2) * 0.03 * Math.min(1, speed / 6) : 0;
      feel.landDip = Math.max(0, feel.landDip - dt * 1.2);
      camera.position.set(px, py + (feel.eye ?? eyeT) + bobY - feel.landDip * 0.4, pz);
      feel.trauma = Math.max(0, feel.trauma - dt * 1.6);
      const sh = feel.trauma * feel.trauma * (opts.shake ?? 1);
      const n1 = Math.sin(now * 0.047) + Math.sin(now * 0.031);
      const n2 = Math.sin(now * 0.043 + 1) + Math.sin(now * 0.029 + 2);
      camera.rotation.y = look.yaw + p.recoil.yaw + n1 * 0.02 * sh;
      camera.rotation.x = look.pitch + p.recoil.pitch + n2 * 0.02 * sh;
      camera.rotation.z = (Math.sin(now * 0.037) * 0.03 * sh) + (p.move.mode === 'slide' ? 0.06 : 0) + (p.downed ? 0.25 : 0);
      const gun = p.guns[p.activeSlot];
      let targetFov = TUNING.fovBase + (p.move.mode === 'sprint' ? TUNING.fovSprint : 0);
      if (p.zooming && gun) targetFov = gun.stats.zoomFov;
      feel.fovPunch = Math.max(0, feel.fovPunch - dt * 30);
      feel.fov = lerp(feel.fov, targetFov, Math.min(1, dt * 14));
      camera.fov = feel.fov + feel.fovPunch;
      camera.updateProjectionMatrix();
    },
  };
}
