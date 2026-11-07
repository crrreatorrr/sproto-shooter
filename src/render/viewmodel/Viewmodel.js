// @ts-check
import * as THREE from 'three';
import { ELEM_COL } from '../materials/geometries.js';

const lerp = (a, b, t) => a + (b - a) * t;

export function createViewmodel(ctx, mats, guns) {
  const { camera } = ctx;
  const { E, G } = mats;
  const vmRoot = new THREE.Group();
  camera.add(vmRoot);
  const vmLight = new THREE.PointLight(0xffffff, 0.6, 3);
  vmLight.position.set(0.3, 0.3, 0);
  camera.add(vmLight);
  let vmGun = /** @type {THREE.Group | null} */ (null);
  let vmGunId = /** @type {number | null} */ (null);
  const muzzleFlash = new THREE.Mesh(G.sphereLo, E(0xffdd66));
  muzzleFlash.visible = false;
  vmRoot.add(muzzleFlash);
  const vm = { kick: 0, swayX: 0, swayY: 0, bob: 0, reload: 0, reloadTime: 1.5, swap: 0, lastYaw: 0, lastPitch: 0, ads: 0 };
  let flashT = 0;
  const muzzlePos = new THREE.Vector3();

  return {
    vm,
    muzzleWorld() { muzzleFlash.getWorldPosition(muzzlePos); return muzzlePos; },
    onShot(ev) {
      vm.kick = Math.min(1, vm.kick + (ev.gunType === 'mg' ? 0.25 : 1));
      muzzleFlash.visible = true; flashT = 0.05;
      const big = ev.gunType !== 'mg';
      muzzleFlash.scale.setScalar(big ? 0.12 : 0.07 * (ev.manufacturer === 'blastco' ? 1.6 : 1));
      muzzleFlash.material.color.set(ELEM_COL[ev.element]);
    },
    onReload(ev) { vm.reload = 1; vm.reloadTime = ev.time || 1.5; },
    onSwap() { vm.swap = 1; },
    update(state, look, frame) {
      const { now, dt } = frame;
      const p = state.players[state.localPlayerId];
      const gun = p.guns[p.activeSlot];
      if (gun && gun.id !== vmGunId) {
        if (vmGun) vmRoot.remove(vmGun);
        vmGun = guns.buildGunMesh(gun, true);
        vmGun.scale.setScalar(0.45);
        vmRoot.add(vmGun);
        vmGunId = gun.id;
        const len = { mg: 0.6, shotgun: 0.55, sniper: 0.85, bazooka: 0.9 }[gun.type];
        muzzleFlash.position.set(0.17, -0.15, -0.42 - len * 0.3 - (gun.parts.barrel === 'long' ? 0.14 : 0.06));
      }
      vm.kick = Math.max(0, vm.kick - dt * 8);
      vm.swap = Math.max(0, vm.swap - dt * 4);
      vm.reload = p.reloadT > 0 ? 1 : Math.max(0, vm.reload - dt * 6);
      const dyaw = look.yaw - vm.lastYaw, dpitch = look.pitch - vm.lastPitch;
      vm.lastYaw = look.yaw; vm.lastPitch = look.pitch;
      vm.swayX = lerp(vm.swayX, Math.max(-0.05, Math.min(0.05, dyaw * 0.6)), Math.min(1, dt * 10));
      vm.swayY = lerp(vm.swayY, Math.max(-0.05, Math.min(0.05, dpitch * 0.6)), Math.min(1, dt * 10));
      const ads = p.zooming ? 1 : 0;
      vm.ads = lerp(vm.ads || 0, ads, Math.min(1, dt * 14));
      const scoped = p.zooming && gun && gun.type === 'sniper';
      vmRoot.visible = !p.dead && !scoped;
      if (vmGun) {
        const rl = vm.reload;
        vmGun.position.set(
          lerp(0.17, 0, vm.ads) + vm.swayX,
          lerp(-0.15, -0.1, vm.ads) - vm.swayY - rl * 0.1 - vm.swap * 0.25 + Math.sin(vm.bob * 2) * 0.006,
          -0.42 + vm.kick * 0.05,
        );
        vmGun.rotation.set(vm.kick * 0.25 + rl * 0.6 * (0.5 + 0.5 * Math.sin(now * 0.01)), vm.swayX, rl * 0.4);
      }
      flashT -= dt;
      if (flashT <= 0) muzzleFlash.visible = false;
    },
  };
}
