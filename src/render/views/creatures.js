// @ts-check
import * as THREE from 'three';
import { ENEMIES as ENEMY_DEFS, BOSSES, enemyStage } from '../../data/enemies.js';
import { instantiateCharacter, peekModel } from '../assets.js';
import { CHARACTER_MODELS } from '../../data/stages.js';
import { createViewRegistry } from './ViewRegistry.js';

const lerp = (a, b, t) => a + (b - a) * t;
const loaded = (model, stage) => (peekModel(CHARACTER_MODELS[model][stage - 1]) ? 1 : 0);

function viewKey(e) {
  const elite = e.elite ? 1 : 0;
  if (e.boss) { const si = Math.min(2, e.boss.phaseIdx); return `${e.type}:${si}:${loaded(BOSSES[e.type].model, si + 1)}:${elite}`; }
  const def = ENEMY_DEFS[e.type];
  if (!def.model) return `${e.type}:${elite}`;
  const st = enemyStage(e);
  return `${e.type}:${st}:${loaded(def.model, st)}:${elite}`;
}

export function createCreatureViews(ctx, mats) {
  const { scene } = ctx;
  const { M, E, G, MAT } = mats;
  const registry = createViewRegistry(scene);

  function googly(size) {
    const g = new THREE.Group();
    const w = new THREE.Mesh(G.sphere, MAT.eyeWhite); w.scale.setScalar(size);
    const p = new THREE.Mesh(G.sphere, MAT.black); p.scale.setScalar(size * 0.5); p.position.z = size * 0.62;
    g.add(w, p); g.userData.pupil = p;
    return g;
  }
  function buildFallback(color, height, radius) {
    const g = new THREE.Group();
    const bodyMat = M(color, { roughness: 0.5 });
    const body = new THREE.Mesh(G.capsule, bodyMat);
    body.scale.set(radius, Math.max(0.1, (height - radius * 2) / 2 + radius * 0.6), radius);
    body.position.y = height / 2;
    g.add(body);
    const eyes = [];
    for (const x of [-0.18, 0.18]) { const ey = googly(0.13); ey.position.set(x * radius * 2, height * 0.8, radius * 0.9); g.add(ey); eyes.push(ey); }
    g.userData = { bodyMat, eyes };
    return g;
  }
  function blob(r) { const b = new THREE.Mesh(G.disc, MAT.blob); b.rotation.x = -Math.PI / 2; b.position.y = 0.02; b.scale.setScalar(r); return b; }

  function buildEnemy(e) {
    const def = ENEMY_DEFS[e.type];
    const g = new THREE.Group();
    const parts = { eyes: [] };
    let ch = null;
    if (def.model) ch = instantiateCharacter(def.model, enemyStage(e), def.height);
    if (ch) { g.add(ch.root); parts.char = ch; ch.play('idle'); }
    else { const f = buildFallback(def.color, def.height, def.radius); g.add(f); Object.assign(parts, f.userData); }
    if (e.type === 'bigObama') {
      const shield = new THREE.Mesh(G.box, MAT.shield); shield.scale.set(1.8, 1.9, 0.14); shield.position.set(0, 1.3, 1.0);
      const batt = new THREE.Mesh(G.box, MAT.weak); batt.scale.set(0.5, 0.6, 0.3); batt.position.set(0, 1.5, -0.95);
      g.add(shield, batt); parts.weak = batt;
    }
    if (def.flying) {
      const cap = new THREE.Mesh(G.sphere, M(0xff5ec4)); cap.scale.set(0.2, 0.12, 0.2); cap.position.y = def.height + 0.02;
      const prop = new THREE.Group();
      for (const r of [0, Math.PI / 2]) { const blade = new THREE.Mesh(G.box, M(0xffd166)); blade.scale.set(0.7, 0.02, 0.09); blade.rotation.y = r; prop.add(blade); }
      prop.position.y = def.height + 0.16;
      g.add(cap, prop); parts.prop = prop;
    }
    if (e.type === 'dummy') {
      const head = new THREE.Mesh(G.sphere, MAT.weak); head.scale.setScalar(0.3); head.position.y = 1.85; g.add(head); parts.weak = head;
    }
    if (e.elite) {
      const crown = new THREE.Mesh(G.cone, MAT.crown); crown.scale.set(0.25, 0.3, 0.25);
      crown.position.y = def.height + 0.4;
      g.add(crown);
      parts.crown = crown;
    }
    const sh = blob(def.radius * 1.3); g.add(sh); parts.shadow = sh;
    g.userData = parts;
    return { obj: g, key: viewKey(e) };
  }

  function buildBoss(e) {
    const def = BOSSES[e.type];
    const g = new THREE.Group();
    const parts = { eyes: [] };
    const si = Math.min(2, e.boss.phaseIdx);
    const h = def.stageHeights[si];
    const ch = instantiateCharacter(def.model, si + 1, h);
    const holder = new THREE.Group();
    g.add(holder);
    if (ch) { holder.add(ch.root); parts.char = ch; ch.play('idle'); }
    else { const f = buildFallback(def.color, h, def.radius); holder.add(f); Object.assign(parts, f.userData); }
    const extra = [];
    if (e.type === 'megaSproto') {
      const belly = new THREE.Mesh(G.sphere, E(0xff3b3b)); belly.scale.setScalar(0.55); belly.position.set(0, 2.0, 1.9); belly.visible = false;
      g.add(belly, blob(2.6)); parts.belly = belly;
    } else {
      holder.position.y = -1.3;
      const orb = new THREE.Mesh(G.sphere, MAT.weak); orb.scale.setScalar(0.45);
      const aura = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0x9b59ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
      aura.rotation.x = -Math.PI / 2;
      const auraFill = new THREE.Mesh(G.disc, new THREE.MeshBasicMaterial({ color: 0x9b59ff, transparent: true, opacity: 0.08, depthWrite: false }));
      auraFill.rotation.x = -Math.PI / 2;
      scene.add(orb, aura, auraFill);
      extra.push(orb, aura, auraFill);
      Object.assign(parts, { weak: orb, aura, auraFill });
    }
    g.userData = parts;
    return { obj: g, extra, key: viewKey(e) };
  }

  function updateOne(e, v, alpha, dt, now) {
    const o = v.obj, u = o.userData;
    const ex = lerp(e.prevPos.x, e.pos.x, alpha), ey = lerp(e.prevPos.y, e.pos.y, alpha), ez = lerp(e.prevPos.z, e.pos.z, alpha);
    o.position.set(ex, ey, ez);
    o.rotation.y = e.yaw + Math.PI;
    const tint = e.hitFlash > 0 ? [0.9, 0.9, 0.9] : e.status.burn ? [0.45, 0.12, 0] : e.status.goo ? [0.08, 0.3, 0] : [0, 0, 0];
    if (u.char) u.char.setTint(tint[0], tint[1], tint[2]);
    else if (u.bodyMat) u.bodyMat.emissive.setRGB(tint[0], tint[1], tint[2]);
    let sc = e.boss ? 1 : e.scale;
    if (e.state === 'spawning') sc *= Math.min(1, 0.2 + e.stateT / 0.8);
    if (e.dead) sc = 0.01;
    o.scale.setScalar(sc);
    o.rotation.z = e.state === 'stagger' ? Math.sin(now * 0.04) * 0.12 : 0;
    if (u.weak && !e.boss) {
      const bh = e.bigHeadT > 0 ? 1.8 : 1;
      if (!u.weakBase) u.weakBase = u.weak.scale.clone();
      u.weak.scale.copy(u.weakBase).multiplyScalar(bh * (1 + Math.sin(now * 0.008) * 0.08));
    }
    for (const ey2 of u.eyes) { const pu = ey2.userData.pupil; pu.position.x = Math.sin(now * 0.013 + e.id) * 0.04; pu.position.y = Math.cos(now * 0.017 + e.id) * 0.04; }
    if (u.crown) u.crown.rotation.y += dt * 2;
    if (u.prop) u.prop.rotation.y += dt * 40;
    if (u.shadow) { u.shadow.position.y = 0.02 - ey / Math.max(0.05, sc); u.shadow.visible = !ENEMY_DEFS[e.type]?.flying || ey < 10; }
    const spd = Math.hypot(e.vel.x, e.vel.z);
    if (u.char) {
      const ch = u.char;
      if (!e.boss) {
        if (e.state === 'stagger') ch.play('stun');
        else if (e.state === 'attack') ch.play(e.type === 'bigObama' ? 'castBig' : 'cast', { speed: e.type === 'midget' ? 1.8 : 1.2 });
        else if (e.ai.shooting) ch.play('cast', { speed: 1.4 });
        else if (ENEMY_DEFS[e.type].flying) ch.play(ch.has('jump') ? 'jump' : 'idle', { speed: 0.8 });
        else if (spd > 0.6) { ch.play('run'); ch.setSpeed(Math.min(2.2, Math.max(0.6, spd / 4.5))); }
        else ch.play('idle');
      } else {
        const act = e.boss.action.id;
        const map = e.type === 'megaSproto'
          ? { intro: 'victory', transition: 'hit', chase: 'run', charge: e.boss.action.t < 0.8 ? 'castBig' : 'run', stunned: 'stun', slam: 'jump', volley: 'castBig', summon: 'victory' }
          : { intro: 'victory', transition: 'hit', drift: 'idle', ring: 'cast', fan: 'cast', spiral: 'cast', taxBolts: 'castBig', spiralRing: 'castBig', teleport: 'castBig' };
        const clip = map[act] || 'idle';
        ch.play(clip, { speed: act === 'charge' && e.boss.action.t >= 0.8 ? 1.8 : 1 });
      }
      ch.update(dt);
    }
    if (e.boss) {
      if (e.type === 'megaSproto') {
        u.belly.visible = e.boss.action.id === 'stunned';
        o.rotation.z = e.boss.action.id === 'stunned' ? Math.sin(now * 0.02) * 0.06 : 0;
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

  return {
    update(state, alpha, frame) {
      const { now, dt } = frame;
      for (const e of state.enemies) {
        const v = registry.sync(e.id, () => (e.boss ? buildBoss(e) : buildEnemy(e)), viewKey(e));
        updateOne(e, v, alpha, dt, now);
      }
      registry.endFrame();
    },
  };
}
