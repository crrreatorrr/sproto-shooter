import * as THREE from 'three';
import { TUNING } from '../../data/tuning.js';
import { BOSSES, ENEMIES as ENEMY_DEFS } from '../../data/enemies.js';
import { stageFor } from '../../data/stages.js';
import { worldHitboxes } from '../../sim/collision.js';
import { DT } from '../../sim/simulate.js';
import { activeSolids, groundHeight } from '../../sim/campaign/solids.js';
import { damp } from '../anim.js';
import { creatureClip, creatureTravel, creatureYaw } from '../creatureMotion.js';
import { createClock } from '../core/clock.js';
import { createFirstPersonView } from './firstPersonView.js';

export function mountPresent(env) {
  const { AMMO_COL, CONF_N, G, GUN_MODEL_LEN, PK, ensurePickupModel, PK_COL, RES_COL, TRACER_N, VM_LAYER, addTracer, applyStage, arenaBits, beginGpu, booms, boxView, boxViews, buildAlly, buildBoss, buildEnemy, buildGunModel, buildGunPickup, buildHazard, camera, cl, confetti, cp, cr, cv, disposeTree, dummy, endGpu, ensureProjectileModel, inst, lerp, levelView, pollGpu, releaseUnseen, renderer, requestNeeds, scene, syncView, tracerGeo, tracerPos, tracers, updateBeams, viewKey } = env;
  const updateFirstPersonView = createFirstPersonView(env);
  let needsT = 0;
  const clock = createClock();
  const cues = new Map();
  let motionTime = 0, motionState;
  for (const type of ['bossAttack', 'enemyShot']) env.bus.on(type, (event) => cues.set(event.id, event));
  let showHitboxes = false;
  const hbGroup = new THREE.Group(); scene.add(hbGroup);
  const hbMats = { body: new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }), weak: new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true }), shield: new THREE.MeshBasicMaterial({ color: 0x00aaff, wireframe: true }) };
  const _hb = [];
  function liveFx() {
    let n = booms.length;
    for (let i = 0; i < CONF_N; i++) if (cl[i] > 0) n++;
    for (let i = 0; i < tracers.length; i++) if (tracers[i].life > 0) n++;
    return n;
  }

  function render(state, alpha, look, opts = {}) {
    renderer.info.reset();
    pollGpu();
    beginGpu();
    const frame = clock.tick();
    const now = frame.now;
    const fdt = frame.dt;
    const p = state.players[state.localPlayerId];
    const t = state.time;
    const sampleTime = t - (1 - alpha) * DT;
    const resetMotion = motionState !== state || sampleTime < motionTime - DT;
    const motionDt = resetMotion ? 0 : Math.min(0.1, Math.max(0, sampleTime - motionTime));
    if (resetMotion) cues.clear();
    motionTime = sampleTime;
    motionState = state;
    for (const [id, cue] of cues) if (state.tick - cue.tick > 60) cues.delete(id);

    updateFirstPersonView(p, alpha, look, opts, now, fdt, resetMotion);
    // The sky is a dome, not a place. Campaign routes run for hundreds of metres, so it travels with the eye.
    env.sky.position.copy(camera.position);

    // weapon boxes
    for (const b of state.weaponBoxes) {
      let v = boxViews.get(b.id);
      if (!v) { v = boxView(b); boxViews.set(b.id, v); }
      v.userData.glow.material.opacity = b.glow ? 0.45 + Math.sin(now * 0.005) * 0.25 : 0.15;
      v.userData.lid.position.y = 1.1 + (b.craft ? Math.abs(Math.sin(now * 0.03)) * 0.3 : 0);
    }

    // enemies
    needsT -= fdt;
    applyStage(stageFor(state, env.stageOverride), state.mode === 'campaign' ? state.level?.id : null);
    if (needsT <= 0) { needsT = 0.25; requestNeeds(state); }
    const campaign = state.mode === 'campaign' && state.level;
    for (const mesh of arenaBits) mesh.visible = !campaign;
    levelView.group.visible = !!campaign;
    if (campaign) {
      levelView.sync(state);
      if (scene.fog) {
        const cap = state.level.viewCap;
        if (state.level.id === 'L05' && env.sky.material.uniforms?.whiteout) {
          env.sky.material.uniforms.whiteout.value = cap ? 1 : 0;
          scene.fog.color.setHex(cap ? 0xb4c3d2 : 0x465b7a);
        }
        const dark = state.level.modifiers && state.level.modifiers.lightsOut;
        if (cap) {
          scene.fog.near = Math.min(14, cap * 0.35);
          scene.fog.far = cap;
        } else {
          scene.fog.near = dark ? 4 : state.level.id === 'L04' ? 90 : 30;
          scene.fog.far = dark ? 36 : 420;
        }
      }
    } else if (scene.fog && scene.fog.far > 300) {
      scene.fog.near = 60;
      scene.fog.far = 200;
    }
    const creatureSolids = activeSolids(state);
    for (const e of state.enemies) {
      // Model-swap only when the needed stage model is loaded (avoid flicker between fallback and model).
      const v = syncView(e.id, () => (e.boss ? buildBoss(e) : buildEnemy(e)), viewKey(e));
      const o = v.obj, u = o.userData;
      const ex = lerp(e.prevPos.x, e.pos.x, alpha), ey = lerp(e.prevPos.y, e.pos.y, alpha), ez = lerp(e.prevPos.z, e.pos.z, alpha);
      o.position.set(ex, ey, ez);
      if (resetMotion || u.entity !== e) {
        u.clips?.reset();
        u.entity = e;
        u.visYaw = e.yaw;
      }
      const def = e.boss ? BOSSES[e.type] : ENEMY_DEFS[e.type];
      u.visYaw = creatureYaw(e, u.visYaw, motionDt);
      if (u.bomb) { // kamikaze: the bomb swells and throbs once the fuse is lit
        const base = u.bomb.userData.base || (u.bomb.userData.base = u.bomb.scale.x);
        u.bomb.scale.setScalar(base * (e.ai && e.ai.fuseT != null ? 1.3 + 0.35 * Math.sin(now * 0.06) : 1));
      }
      o.rotation.y = u.visYaw + Math.PI;
      const travel = creatureTravel(e, u.visYaw);
      // flash / status tint
      const tint = e.hitFlash > 0 ? [0.9, 0.9, 0.9] : e.status.burn ? [0.45, 0.12, 0] : e.status.goo ? [0.08, 0.3, 0] : [0, 0, 0];
      if (u.char) u.char.setTint(...tint);
      else if (u.bodyMat) { u.bodyMat.emissive.setRGB(...tint); }
      // scale: pop in while spawning, wobble when staggered
      let sc = e.boss ? 1 : e.scale;
      if (e.state === 'spawning') sc *= Math.min(1, 0.2 + e.stateT / 0.8);
      if (e.dead) sc = 0.01;
      o.scale.setScalar(sc);
      o.visible = !(e.ai.buried > 0);
      if (u.weak && !e.boss) {
        const bh = e.bigHeadT > 0 ? 1.8 : 1;
        if (!u.weakBase) u.weakBase = u.weak.scale.clone();
        u.weak.scale.copy(u.weakBase).multiplyScalar(bh * (1 + Math.sin(now * 0.008) * 0.08));
      }
      for (const ey2 of u.eyes) { const pu = ey2.userData.pupil; pu.position.x = Math.sin(now * 0.013 + e.id) * 0.04; pu.position.y = Math.cos(now * 0.017 + e.id) * 0.04; }
      if (u.crown) u.crown.rotation.y += fdt * 2;
      if (u.prop) u.prop.rotation.y += fdt * 40;
      if (u.shadow) {
        const ground = creatureSolids ? groundHeight(creatureSolids, ex, ez, def.radius * sc * 0.2, ey) : 0;
        u.shadow.visible = Number.isFinite(ground) && (!def.flying || ey - ground < 10);
        if (u.shadow.visible) u.shadow.position.y = (0.02 + ground - ey) / Math.max(0.05, sc);
      }
      if (u.bodyMotion) u.bodyMotion(e, travel, motionDt);
      if (u.char) {
        const ch = u.char;
        if (u.clips) {
          const cue = cues.get(e.id);
          const elapsed = cue ? (state.tick - cue.tick + alpha) * DT : Infinity;
          const want = creatureClip(e, def, u, travel, u.fitH * sc, cue, elapsed);
          const a = e.boss?.action;
          ch.root.position.y = 0;
          if (u.rig) u.rig.update(motionDt, { ...travel, moving: travel.speed > 0.18, action: a?.id,
            actionT: a?.t ?? 0, variant: a?.data?.variant, data: a?.data ?? {}, altitude: ey, yaw: u.visYaw,
            clipDriven: !!want, phaseIdx: e.boss?.phaseIdx });
          const w = u.clips.apply(motionDt, want && !u.clips.has(want.clip) && !u.rig ? { clip: 'idle' } : want);
          if (u.rig?.post) u.rig.post(w, u.clips.state.tailPitch);
          const usesFloor = !def.flying && def.ai !== 'hex' && !(def.campaign && ey > 0.5);
          ch.root.position.y = ch.root.position.y * (1 - w) + (usesFloor ? u.clips.state.clearance * u.fitH : 0);
          if (def.flying || def.ai === 'hex') {
            ch.root.rotation.x = damp(ch.root.rotation.x, Math.max(-0.16, Math.min(0.16, travel.forward * 0.027)), 0.09, motionDt);
            ch.root.rotation.z = damp(ch.root.rotation.z, Math.max(-0.18, Math.min(0.18, -travel.side * 0.03)), 0.09, motionDt);
          }
        } else ch.update(motionDt);
      }
      if (e.boss) {
        if (e.type === 'dragon') {
          if (u.groundShadow) { // shadow stays on the floor, shrinking and fading with altitude
            u.groundShadow.position.y = 0.02 - (o.position.y) / Math.max(0.05, o.scale.y);
            u.groundShadow.scale.setScalar(3.4 * Math.max(0.5, 1 - ey * 0.05));
          }
        } else if (BOSSES[e.type].ai === 'mega') {
          u.belly.visible = e.boss.action.id === 'stunned';
        } else {
          const a = e.boss.weakAngle;
          u.weak.position.set(ex + Math.cos(a) * 1.9, ey + 0.2, ez + Math.sin(a) * 1.9);
          u.weak.scale.setScalar(0.45 * (1 + Math.sin(now * 0.01) * 0.12) * (e.bigHeadT > 0 ? 1.8 : 1));
          const ar = e.ai.auraR || 9;
          u.aura.position.set(ex, 0.05, ez); u.aura.scale.setScalar(ar);
          u.auraFill.position.set(ex, 0.04, ez); u.auraFill.scale.setScalar(ar);
          u.aura.material.opacity = 0.3 + Math.sin(now * 0.006) * 0.15;
          const fade = e.boss.fade ?? 1;
          o.visible = fade > 0.05;
          o.scale.setScalar(Math.max(0.05, fade));
          u.weak.visible = u.aura.visible = u.auraFill.visible = !e.dead && fade > 0.05;
        }
      }
    }
    // allies
    for (const a of state.allies) {
      const v = syncView(a.id, () => ({ obj: buildAlly() }));
      v.obj.position.set(lerp(a.prevPos.x, a.pos.x, alpha), a.pos.y, lerp(a.prevPos.z, a.pos.z, alpha));
      v.obj.rotation.y = a.yaw + Math.PI;
    }
    // gun pickups
    for (const k of state.pickups) {
      if (k.kind !== 'gun') continue;
      const v = syncView(k.id, () => ({ obj: buildGunPickup(k.gun) }));
      const old = v.obj.userData.mesh;
      if (GUN_MODEL_LEN[k.gun.type] && !old.userData.model) {
        const m = buildGunModel(k.gun, GUN_MODEL_LEN[k.gun.type] * 1.6);
        if (m) { m.rotation.copy(old.rotation); v.obj.remove(old); v.obj.add(m); v.obj.userData.mesh = m; }
      }
      v.obj.position.set(lerp(k.prevPos.x, k.pos.x, alpha), lerp(k.prevPos.y, k.pos.y, alpha) + Math.sin(now * 0.003 + k.id) * 0.1, lerp(k.prevPos.z, k.pos.z, alpha));
      v.obj.userData.mesh.rotation.y += fdt * 1.5;
      v.obj.scale.setScalar(p.nearGunPickupId === k.id ? 1.15 : 1);
    }
    // hazards
    for (const h of state.hazards) {
      const v = syncView(h.id, () => ({ obj: buildHazard(h) }));
      const o = v.obj;
      if (h.kind === 'shockwave') { o.scale.set(h.radius, h.height * 2, h.radius); o.position.y = h.height / 2; o.material.opacity = 0.75 * (1 - h.radius / h.maxRadius) + 0.15; }
      else if (h.kind === 'telegraphLine') o.material.opacity = 0.2 + 0.3 * Math.abs(Math.sin(now * 0.02));
      else if (h.kind === 'meteorMarker') { const k = h.t / h.data.delay; o.userData.rock.position.y = 30 * (1 - k); o.userData.rock.rotation.x += fdt * 5; o.userData.ring.material.opacity = 0.4 + 0.5 * Math.abs(Math.sin(now * 0.03)); }
      else if (h.kind === 'spawnPortal') { o.scale.setScalar(h.radius * (0.5 + h.t / h.ttl)); o.rotation.z += fdt * 6; o.material.opacity = 1 - h.t / h.ttl; }
      else { o.scale.setScalar(h.radius * (0.4 + 0.6 * (h.t / h.ttl))); o.material.opacity = 0.7 * (1 - h.t / h.ttl); }
    }
    releaseUnseen();

    // instanced projectiles
    for (const k in inst) inst[k].n = 0;
    for (const pr of state.projectiles) {
      const I = inst[pr.kind]; if (!I || I.n >= I.d.cap) continue;
      dummy.position.set(lerp(pr.prevPos.x, pr.pos.x, alpha), lerp(pr.prevPos.y, pr.pos.y, alpha), lerp(pr.prevPos.z, pr.pos.z, alpha));
      const s = I.d.scale * (pr.kind === 'orb' || pr.kind === 'taxBolt' || pr.kind === 'fireball' ? 1 + Math.sin(now * 0.02 + pr.id) * 0.15 : 1) * (pr.kind === 'flame' ? 0.6 + (1.4 - pr.ttl) * 1.6 : 1);
      if (I.d.kit) ensureProjectileModel(I);
      if (I.d.kit && I.modeled) { // cartoon kit round: already sized, flies nose-first
        dummy.scale.setScalar(1);
        dummy.lookAt(dummy.position.x + pr.vel.x, dummy.position.y + pr.vel.y, dummy.position.z + pr.vel.z);
        if (pr.kind === 'bigBullet') addTracer(pr.prevPos, dummy.position, 0xffd27a, 0.09);
        else if (pr.kind === 'rocket' || pr.kind === 'megaBullet') dummy.rotateZ(now * 0.012 + pr.id);
      }
      else if (pr.kind === 'rocket') { dummy.scale.set(s, s, s * 3); dummy.lookAt(dummy.position.x + pr.vel.x, dummy.position.y + pr.vel.y, dummy.position.z + pr.vel.z); }
      else if (pr.kind === 'bigBullet') {
        dummy.scale.set(s, s, s * 2.4); dummy.lookAt(dummy.position.x + pr.vel.x, dummy.position.y + pr.vel.y, dummy.position.z + pr.vel.z);
        addTracer(pr.prevPos, dummy.position, 0xffd27a, 0.09); // hot streak behind the round
      }
      else if (pr.kind === 'bullet' || pr.kind === 'pellet') { dummy.scale.set(s, s, s * 2.2); dummy.lookAt(dummy.position.x + pr.vel.x, dummy.position.y + pr.vel.y, dummy.position.z + pr.vel.z); }
      else if (pr.kind === 'laser' || pr.kind === 'bigLaser') { dummy.scale.set(s, s, s * (pr.kind === 'laser' ? 7 : 5)); dummy.lookAt(dummy.position.x + pr.vel.x, dummy.position.y + pr.vel.y, dummy.position.z + pr.vel.z); }
      else if (pr.kind === 'yeetGun') { dummy.scale.set(0.15, 0.2, 0.8); dummy.rotation.set(now * 0.02, now * 0.015, 0); }
      else if (I.d.model) { // modeled boss projectiles fly nose-first; the mesh stays a sphere until it loads
        ensureProjectileModel(I);
        dummy.scale.setScalar(I.modeled ? 1 : s);
        dummy.lookAt(dummy.position.x + pr.vel.x, dummy.position.y + pr.vel.y, dummy.position.z + pr.vel.z);
        if (pr.kind === 'missile') dummy.rotateZ(now * 0.01 + pr.id); // spin
        else if (pr.kind === 'drill') dummy.rotateZ(now * 0.04 + pr.id); // the drill bit keeps spinning
        else if (pr.kind === 'tyre') { dummy.rotateY(now * 0.009 + pr.id); dummy.rotateX(now * 0.015 + pr.id); } // tumbles: face and tread both show
        else if (pr.kind === 'rubberBullet') dummy.rotateZ(now * 0.02 + pr.id); // rubber rounds spin as they fly
      }
      else { dummy.scale.setScalar(s); dummy.rotation.set(0, 0, 0); }
      dummy.updateMatrix();
      I.im.setMatrixAt(I.n++, dummy.matrix);
    }
    for (const k in inst) { inst[k].im.count = inst[k].n; inst[k].im.instanceMatrix.needsUpdate = true; }

    // instanced pickups
    for (const k in PK) PK[k].n = 0;
    for (const pk of state.pickups) {
      if (pk.kind === 'gun') continue;
      const I = PK[pk.kind]; if (!I || I.n >= 256) continue;
      ensurePickupModel(pk.kind);
      dummy.position.set(lerp(pk.prevPos.x, pk.pos.x, alpha), lerp(pk.prevPos.y, pk.pos.y, alpha) + Math.sin(now * 0.004 + pk.id) * 0.08, lerp(pk.prevPos.z, pk.pos.z, alpha));
      const s = pk.kind === 'bigHealth' ? 0.4 : pk.kind === 'resource' ? (pk.resId === 'bossCore' || pk.resId === 'manaCrystal' ? 0.35 : 0.2) : pk.kind === 'tickets' ? 0.18 : 0.22;
      const flatCoin = pk.kind === 'tickets' && !I.modeled; // the stand-in coin is a squashed cylinder on edge
      dummy.rotation.set(flatCoin ? Math.PI / 2 : 0, now * 0.003 + pk.id, 0);
      if (I.modeled) dummy.scale.setScalar(s * 1.5);
      else dummy.scale.set(s, flatCoin ? 0.05 / 0.18 * s : s, s);
      if (pk.ttl < 5) dummy.scale.multiplyScalar(Math.sin(now * 0.03) > 0 ? 1 : 0.5);
      dummy.updateMatrix();
      I.im.setMatrixAt(I.n, dummy.matrix);
      // Infinite-reserve guns can still appear in rolled ammo drops (notably the Duck Gun).
      // A new ammo/resource id must keep its placeholder drawable instead of halting every frame.
      const col = (pk.kind === 'resource' ? RES_COL[pk.resId] : pk.kind === 'ammo' ? AMMO_COL[pk.ammoType] : PK_COL[pk.kind]) ?? PK_COL[pk.kind];
      I.im.setColorAt(I.n, col);
      I.n++;
    }
    for (const k in PK) { const I = PK[k]; I.im.count = I.n; I.im.instanceMatrix.needsUpdate = true; if (I.im.instanceColor) I.im.instanceColor.needsUpdate = true; }

    updateBeams(fdt);
    // tracers
    for (let i = 0; i < TRACER_N; i++) {
      const tr = tracers[i];
      if (tr.life > 0) { tr.life -= fdt; if (tr.life <= 0) tracerPos.fill(0, i * 6, i * 6 + 6); }
    }
    tracerGeo.attributes.position.needsUpdate = true;
    tracerGeo.attributes.color.needsUpdate = true;

    // confetti
    for (let i = 0; i < CONF_N; i++) {
      if (cl[i] <= 0) { dummy.scale.setScalar(0); dummy.position.set(0, -100, 0); dummy.updateMatrix(); confetti.setMatrixAt(i, dummy.matrix); continue; }
      cl[i] -= fdt;
      cv[i * 3 + 1] -= 9 * fdt;
      cv[i * 3] *= 1 - fdt * 1.5; cv[i * 3 + 2] *= 1 - fdt * 1.5;
      if (cv[i * 3 + 1] < -2.5) cv[i * 3 + 1] = -2.5;
      cp[i * 3] += cv[i * 3] * fdt; cp[i * 3 + 1] += cv[i * 3 + 1] * fdt; cp[i * 3 + 2] += cv[i * 3 + 2] * fdt;
      if (cp[i * 3 + 1] < 0.02) { cp[i * 3 + 1] = 0.02; cv[i * 3] = cv[i * 3 + 2] = 0; }
      cr[i] += fdt * 8;
      dummy.position.set(cp[i * 3], cp[i * 3 + 1], cp[i * 3 + 2]);
      dummy.rotation.set(cr[i], cr[i] * 0.7, 0);
      dummy.scale.setScalar(Math.min(1, cl[i] * 2));
      dummy.updateMatrix();
      confetti.setMatrixAt(i, dummy.matrix);
    }
    confetti.instanceMatrix.needsUpdate = true;

    // booms
    for (let i = booms.length - 1; i >= 0; i--) {
      const b = booms[i];
      b.life -= fdt;
      if (b.fx) { // Blender-authored clip
        b.fx.mixer.update(fdt);
        if (b.life <= 0) { b.fx.root.visible = false; b.fx.busy = false; booms.splice(i, 1); }
        continue;
      }
      const k = 1 - b.life / b.max;
      b.m.scale.setScalar(b.radius * (0.3 + 0.7 * Math.sqrt(k)));
      b.m.material.opacity = 0.8 * (1 - k);
      if (b.life <= 0) { scene.remove(b.m); b.m.material.dispose(); booms.splice(i, 1); }
    }

    // debug hitboxes
    hbGroup.clear();
    if (showHitboxes) {
      for (const e of state.enemies) {
        if (e.dead) continue;
        worldHitboxes(e, _hb);
        for (const hb of _hb) {
          const m = new THREE.Mesh(hb.type === 'sphere' ? G.sphereLo : G.cyl, hbMats[hb.zone]);
          if (hb.type === 'sphere') { m.position.set(hb.x, hb.y, hb.z); m.scale.setScalar(hb.r); }
          else { m.position.set(hb.x, (hb.y0 + hb.y1) / 2, hb.z); m.scale.set(hb.r, hb.y1 - hb.y0, hb.r); }
          hbGroup.add(m);
        }
      }
    }

    // dev hook: window.__debugCam renders the scene from an outside camera (used to tune the first-person rig)
    const debugCam = typeof window !== 'undefined' && window.__debugCam;
    if (debugCam) { debugCam.layers.enableAll(); renderer.render(scene, debugCam); endGpu(); return; }
    renderer.render(scene, camera);
    // viewmodel pass: same camera, depth cleared, no sky redraw
    const bg = scene.background;
    scene.background = null;
    renderer.autoClear = false;
    renderer.clearDepth();
    // the gun is drawn at the base field of view, so zooming magnifies the world but not the gun
    const worldFov = camera.fov;
    camera.fov = TUNING.fovBase; camera.updateProjectionMatrix();
    camera.layers.set(VM_LAYER);
    renderer.render(scene, camera);
    camera.layers.set(0);
    camera.fov = worldFov; camera.updateProjectionMatrix();
    renderer.autoClear = true;
    scene.background = bg;
    endGpu();
  }
  Object.assign(env, { clock, hbGroup, hbMats, _hb, liveFx, render });
  env.render = render;
  env.liveFx = liveFx;
  env.setShowHitboxes = (v) => { showHitboxes = v; };
}
