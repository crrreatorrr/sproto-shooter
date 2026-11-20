import * as THREE from 'three';
import { TUNING } from '../../data/tuning.js';
import { isDualWield, zoomFovFor } from '../../data/guns.js';
import { DT } from '../../sim/simulate.js';
import { damp } from '../anim.js';
import { assetsVersion } from '../assets.js';

const NO_WEAPON_OFFSET = [0, 0, 0];

export function createFirstPersonView(env) {
  const { GUN_MODEL_LEN, VM_POSE, buildGunMesh, buildGunModel, camera, disposeTree, feel, flashLight, fp, lerp,
    meleeOffset, muzzleFlash, NO_RELOAD, reloadHands, reloadOffsets, setVmLayer, vm, vmRoot, warmColliders } = env;
  const meleeQ = new THREE.Quaternion(), NO_TURN = new THREE.Quaternion();
  let vmGun = null, vmGunKey = null;
  let vmGunL = null, vmGunLKey = null; // dual wield: the left-hand gun
  let slide = 0, pepeBreathe = 0, pepeStride = 0, pepePace = 0;

  return function updateFirstPersonView(p, alpha, look, opts, now, fdt, resetMotion, grapplePose) {
    if (resetMotion) slide = pepeBreathe = pepeStride = pepePace = 0;
    // camera
    const px = lerp(p.prevPos.x, p.pos.x, alpha), py = lerp(p.prevPos.y, p.pos.y, alpha), pz = lerp(p.prevPos.z, p.pos.z, alpha);
    const sliding = !p.dead && !p.downed && p.move.mode === 'slide';
    slide = damp(slide, Number(sliding), sliding ? 0.035 : 0.075, fdt);
    const eyeT = p.dead ? 0.3 : p.downed ? TUNING.downedEye : sliding ? TUNING.slideEye : TUNING.eyeHeight;
    const eyeHalfLife = p.dead || p.downed ? 0.045 : sliding ? 0.035 : 0.075;
    feel.eye = feel.eye == null ? eyeT : damp(feel.eye, eyeT, eyeHalfLife, fdt);
    const speed = Math.hypot(p.vel.x, p.vel.z);
    const stride = p.onGround ? Math.min(1, speed / 6) * (1 - slide) : 0;
    if (p.onGround && speed > 1 && !sliding) vm.bob += fdt * speed * 1.4;
    const bobY = Math.sin(vm.bob * 2) * 0.03 * stride;
    feel.landDip = Math.max(0, feel.landDip - fdt * 1.2);
    camera.position.set(px, py + feel.eye + bobY - feel.landDip * 0.4, pz);
    feel.trauma = Math.max(0, feel.trauma - fdt * 1.6);
    const sh = feel.trauma * feel.trauma * (opts.shake ?? 1);
    const n1 = Math.sin(now * 0.047) + Math.sin(now * 0.031), n2 = Math.sin(now * 0.043 + 1) + Math.sin(now * 0.029 + 2);
    camera.rotation.y = look.yaw + p.recoil.yaw + n1 * 0.02 * sh;
    camera.rotation.x = look.pitch + p.recoil.pitch + n2 * 0.02 * sh;
    camera.rotation.z = (Math.sin(now * 0.037) * 0.03 * sh) + slide * 0.10 + (p.downed ? 0.25 : 0);
    const gun = p.guns[p.activeSlot];
    let targetFov = TUNING.fovBase + (p.move.mode === 'sprint' ? TUNING.fovSprint : 0);
    if (p.zooming && gun) targetFov = zoomFovFor(gun, opts.zoomLevel || 1);
    feel.fovPunch = Math.max(0, feel.fovPunch - fdt * 30);
    feel.fov = lerp(feel.fov, targetFov, Math.min(1, fdt * 14));
    camera.fov = feel.fov + feel.fovPunch;
    camera.updateProjectionMatrix();

    // viewmodel
    const vmKey = gun ? gun.id + ':' + assetsVersion() : null;
    if (gun && vmKey !== vmGunKey) {
      vmGunKey = vmKey;
      const vmLen = (VM_POSE[gun.type] && VM_POSE[gun.type].len) || GUN_MODEL_LEN[gun.type]; // viewmodel size can differ from pickups
      const modeled = GUN_MODEL_LEN[gun.type] && buildGunModel(gun, vmLen);
      // assets changed but this gun still has no model: keep the current mesh
      if (modeled || !vmGun || vmGun.userData.gunId !== gun.id) {
        if (vmGun) { disposeTree(vmGun); vmRoot.remove(vmGun); }
        vmGun = modeled || buildGunMesh(gun, true);
        vmGun.userData.gunId = gun.id;
        vmGun.userData.type = gun.type;
        vmGun.userData.pose = modeled ? VM_POSE[gun.type] || VM_POSE.model : isDualWield(gun) ? VM_POSE.sidearm : VM_POSE.box;
        vmGun.scale.setScalar(vmGun.userData.pose.scale);
        setVmLayer(vmGun);
        vmRoot.add(vmGun);
      }
    }
    // dual wield: a second rectangle gun in the left hand (no arms, no animation)
    const leftGun = p.dual ? p.dual.gun : null;
    const leftKey = leftGun ? leftGun.id : null;
    if (leftKey !== vmGunLKey) {
      vmGunLKey = leftKey;
      if (vmGunL) { disposeTree(vmGunL); vmRoot.remove(vmGunL); vmGunL = null; }
      if (leftGun) {
        vmGunL = buildGunMesh(leftGun, true);
        vmGunL.userData.pose = VM_POSE.sidearm;
        vmGunL.scale.setScalar(VM_POSE.sidearm.scale);
        setVmLayer(vmGunL);
        vmRoot.add(vmGunL);
      }
    }
    // sidearms are placeholder rectangles: no hands on them and no reload motion
    const sidearm = !!(vmGun && vmGun.userData.sidearm);
    vm.kick = Math.max(0, vm.kick - fdt * 8);
    if (vm.meleeT >= 0) { vm.meleeT += fdt; if (vm.meleeT > 1) vm.meleeT = -1; }
    vm.kickL = Math.max(0, (vm.kickL || 0) - fdt * 8);
    vm.swap = Math.max(0, vm.swap - fdt * 4);
    vm.swapL = Math.max(0, (vm.swapL || 0) - fdt * 4);
    // Sample reload at the same interpolated time as the player; gun and hands share this phase.
    const reloadT = p.reloadT > 0 && fp.usesPepeRig ? p.reloadT + (1 - alpha) * DT : p.reloadT;
    pepePace = damp(pepePace, stride, 0.09, fdt);
    if (pepePace > 0.001) pepeStride += fdt * speed * 2.05;
    pepeBreathe += fdt * 1.35;
    const weaponBob = fp.usesPepeRig
      ? Math.sin(pepeStride) * 0.005 * pepePace + Math.sin(pepeBreathe) * 0.0025 * (1 - pepePace) * (1 - slide)
      : Math.sin(vm.bob * 2) * 0.006 * (1 - slide);
    const dyaw = look.yaw - vm.lastYaw, dpitch = look.pitch - vm.lastPitch;
    vm.lastYaw = look.yaw; vm.lastPitch = look.pitch;
    vm.swayX = lerp(vm.swayX, Math.max(-0.05, Math.min(0.05, dyaw * 0.6)), Math.min(1, fdt * 10));
    vm.swayY = lerp(vm.swayY, Math.max(-0.05, Math.min(0.05, dpitch * 0.6)), Math.min(1, fdt * 10));
    const ads = p.zooming ? 1 : 0;
    vm.ads = lerp(vm.ads || 0, ads, Math.min(1, fdt * 14));
    vmRoot.visible = !p.dead;
    vm.grapplePose = grapplePose;
    const ready = 1 - grapplePose;
    if (vmGun) {
      const pose = vmGun.userData.pose, ia = 1 - vm.ads;
      const r = sidearm ? NO_RELOAD : reloadOffsets(vmGun.userData.type, reloadT, vm.reloadTime);
      const steady = 1 - 0.75 * vm.ads; // less sway and bob while aiming
      const ad = pose.ads;
      const glide = slide * ia;
      const offset = fp.weaponOffset || NO_WEAPON_OFFSET;
      // The grip remains on the weapon as it dips and clears the grappling arm.
      vmGun.position.set(
        lerp(pose.rest[0], ad[0], vm.ads) + vm.swayX * steady + r.x * ready + offset[0] + grapplePose * 0.085,
        lerp(pose.rest[1], ad[1], vm.ads) - vm.swayY * steady + r.y * ready - vm.swap * 0.25 + weaponBob * steady - glide * 0.035 + offset[1] - grapplePose * 0.29,
        lerp(pose.rest[2], ad[2], vm.ads) + (vm.kick * 0.05 + r.z) * ready + offset[2] + grapplePose * 0.07);
      vmGun.rotation.set((vm.kick * 0.25 + r.rx) * ready + glide * 0.045 - grapplePose * 0.76, pose.yaw * ia + vm.swayX * steady + r.ry * ready, pose.roll * ia + r.rz * ready - glide * 0.13);
      // melee: the universal swing (camera-space offset and turn about the gun) on top of any gun's pose.
      // window.__meleeAt (seconds) pins the swing for inspection, like __hideFP.
      const pinned = typeof window !== 'undefined' && typeof window.__meleeAt === 'number' ? window.__meleeAt : null;
      const m = meleeOffset(pinned ?? vm.meleeT);
      if (m) {
        vmGun.position.x += m.x * ready; vmGun.position.y += m.y * ready; vmGun.position.z += m.z * ready;
        vmGun.quaternion.premultiply(meleeQ.slerpQuaternions(NO_TURN, m.q, ready));
      }
      vmGun.updateMatrix();
      muzzleFlash.position.copy(vmGun.userData.muzzle).applyMatrix4(vmGun.matrix);
      if (vmGunL) {
        const lp = vmGunL.userData.pose;
        vmGunL.position.set(-lp.rest[0] + vm.swayX * steady + grapplePose * 0.085,
          lp.rest[1] - vm.swayY * steady - vm.swapL * 0.25 + weaponBob * steady - glide * 0.035 - grapplePose * 0.29,
          lp.rest[2] + vm.kickL * 0.05 + grapplePose * 0.07);
        vmGunL.rotation.set(vm.kickL * 0.25 + glide * 0.045 - grapplePose * 0.76, -lp.yaw + vm.swayX * steady, glide * 0.13);
        vmGunL.updateMatrix();
        if (env.flashHand === 'left') muzzleFlash.position.copy(vmGunL.userData.muzzle).applyMatrix4(vmGunL.matrix);
      }
    }
    if (vmGun && gun) fp.setGun(vmGun, gun.type);
    warmColliders(p.guns);
    const hands = vmGun && gun && !sidearm ? reloadHands(vmGun, vmGun.userData.type, reloadT, vm.reloadTime) : null;
    if (hands?.left) hands.left.w *= 1 - grapplePose;
    if (hands?.right) hands.right.w *= 1 - grapplePose;
    fp.update(vmRoot.visible && !sidearm, { dt: fdt, ads: vm.ads, ...hands });
    if (fp.ready && !fp.root.userData.vmLayer) { setVmLayer(fp.root); fp.root.userData.vmLayer = true; }
    env.flashT -= fdt;
    if (env.flashT <= 0 || grapplePose > 0.15) muzzleFlash.visible = false;
    flashLight.intensity = Math.max(0, flashLight.intensity - fdt * 120);
  };
}
