import * as THREE from 'three';
import { ENEMIES as ENEMY_DEFS, BOSSES, enemyStage } from '../../data/enemies.js';
import { CHARACTER_MODELS } from '../../data/stages.js';
import { instantiateCharacter, peekModel } from '../assets.js';
import { createClipLayer } from '../clipLayer.js';
import { CREATURE_MOTION } from '../creatureMotionData.js';
import { createDragonRig } from '../dragonRig.js';
import { createHumanoidRig } from '../humanoidRig.js';
import { createViewRegistry } from './ViewRegistry.js';
import { buildLookGroup } from '../level/levelGeometry.js';
import { KIT, kitGeometry, kitMaterial } from '../level/kitModels.js';
import { createPrimitiveCreatureRig } from '../primitiveCreatureRig.js';

export function mountCreatures(env) {
  const { E, G, M, MAT, scene } = env;
  // ---------- creature builder (Sproto blobs with googly eyes) ----------
  function googly(size) {
    const g = new THREE.Group();
    const w = new THREE.Mesh(G.sphere, MAT.eyeWhite); w.scale.setScalar(size);
    const p = new THREE.Mesh(G.sphere, MAT.black); p.scale.setScalar(size * 0.5); p.position.z = size * 0.62;
    g.add(w, p); g.userData.pupil = p;
    return g;
  }

  // Fallback while rigged models load: a coloured capsule with googly eyes.
  function buildFallback(color, height, radius) {
    const g = new THREE.Group();
    const bodyMat = M(color, { roughness: 0.5 });
    const body = new THREE.Mesh(G.capsule, bodyMat); body.scale.set(radius, height / 3, radius); body.position.y = height / 2;
    g.add(body);
    const eyes = [];
    for (const x of [-0.18, 0.18]) { const ey = googly(0.13); ey.position.set(x * radius * 2, height * 0.8, radius * 0.9); g.add(ey); eyes.push(ey); }
    g.userData = { bodyMat, eyes };
    return g;
  }

  function blob(r) { const b = new THREE.Mesh(G.disc, MAT.blob); b.rotation.x = -Math.PI / 2; b.position.y = 0.02; b.scale.setScalar(r); return b; }

  function mountCharacter(parts, ch, height) {
    parts.char = ch;
    parts.fitH = height;
    parts.motion = CREATURE_MOTION[ch.path.split('/').pop().slice(0, -4)];
    parts.clips = createClipLayer(ch, { procedural: !!parts.rig, floor: parts.motion?.floor, tailPitch: parts.motion?.tailPitch });
    if (!parts.clips) ch.play('idle');
  }

  /** Enemy view: Sproto Duel rigged character for its stage, plus gameplay markers (crown, shield plate, battery). */
  function buildEnemy(e) {
    const def = ENEMY_DEFS[e.type];
    const g = new THREE.Group();
    const parts = { eyes: [] };
    let ch = null;
    if (def.model) ch = instantiateCharacter(def.model, enemyStage(e), def.height);
    if (ch) {
      g.add(ch.root);
      mountCharacter(parts, ch, def.height);
    } else {
      const body = def.look ? buildLookGroup(def.look) : buildFallback(def.color, def.height, def.radius);
      g.add(body);
      parts.bodyMotion = createPrimitiveCreatureRig(body, e.type, def, !!e.boss);
      Object.assign(parts, body.userData);
    }
    if (def.archetype && def.archetype.fuse) {
      // The bomb it carries on its head. A red ball until the kit model has loaded.
      const kit = kitGeometry(KIT.bomb);
      const bomb = kit ? new THREE.Mesh(kit.geometry, kitMaterial()) : new THREE.Mesh(G.sphere, M(0x2a2a36));
      bomb.scale.setScalar(kit ? 0.3 : 0.28);
      bomb.position.y = def.height + 0.32;
      g.add(bomb);
      parts.bomb = bomb;
    }
    if (e.type === 'bigObama') {
      const shield = new THREE.Mesh(G.box, MAT.shield); shield.scale.set(1.8, 1.9, 0.14); shield.position.set(0, 1.3, 1.0);
      const batt = new THREE.Mesh(G.box, MAT.weak); batt.scale.set(0.5, 0.6, 0.3); batt.position.set(0, 1.5, -0.95);
      g.add(shield, batt); parts.weak = batt;
    }
    if (def.flying && def.model) {
      // propeller beanie: the wacky reason it can fly
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
    markOwned(g);
    return { obj: g, key: viewKey(e) };
  }

  function bossStageIdx(e) { return Math.min(2, e.boss.phaseIdx); }

  function buildBoss(e) {
    const def = BOSSES[e.type];
    const g = new THREE.Group();
    const parts = { eyes: [] };
    const si = bossStageIdx(e);
    const h = def.stageHeights[si];
    const ch = instantiateCharacter(def.model, si + 1, h);
    const holder = new THREE.Group();
    g.add(holder);
    if (ch) holder.add(ch.root);
    else {
      const body = buildFallback(def.color, h, def.radius);
      holder.add(body);
      parts.bodyMotion = createPrimitiveCreatureRig(body, e.type, def, !!e.boss);
      Object.assign(parts, body.userData);
    }
    parts.holder = holder;
    const extra = [];
    if (def.ai === 'mega') {
      // stunned weak spot from the boss's hitboxes; ground shadow sized to the boss
      const hb = def.hitboxes.find((x) => x.onlyWhen === 'stunned');
      const belly = new THREE.Mesh(G.sphere, E(0xff3b3b)); belly.scale.setScalar(hb ? hb.r * 1.1 : 0.55);
      if (hb) belly.position.set(hb.x || 0, hb.y, hb.z || 0); belly.visible = false;
      g.add(belly, blob(def.radius * 1.3)); parts.belly = belly;
      if (ch && (e.type === 'monster' || e.type === 'sprotoBeast')) parts.rig = createHumanoidRig(ch, def); // skeleton animated in code
    } else if (e.type === 'dragon') {
      holder.rotation.y = Math.PI; // this model's head is at Tripo -X, the opposite of the other characters
      parts.groundShadow = blob(3.4); g.add(parts.groundShadow); // stays on the ground while it flies
      if (ch) parts.rig = createDragonRig(ch, def);
    } else {
      holder.position.y = -1.3; // pos.y is the floating body centre
      const orb = new THREE.Mesh(G.sphere, MAT.weak); orb.scale.setScalar(0.45);
      const aura = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0x9b59ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
      aura.rotation.x = -Math.PI / 2;
      const auraFill = new THREE.Mesh(G.disc, new THREE.MeshBasicMaterial({ color: 0x9b59ff, transparent: true, opacity: 0.08, depthWrite: false }));
      auraFill.rotation.x = -Math.PI / 2;
      scene.add(orb, aura, auraFill);
      extra.push(orb, aura, auraFill);
      Object.assign(parts, { weak: orb, aura, auraFill });
    }
    if (ch) mountCharacter(parts, ch, h);
    g.userData = parts;
    markOwned(g);
    for (const x of extra) markOwned(x);
    return { obj: g, extra, key: viewKey(e) };
  }

  /** A view is rebuilt when its model stage changes (boss phase) or when the rigged models finish loading. */
  const loaded = (model, stage) => (peekModel(CHARACTER_MODELS[model][stage - 1]) ? 1 : 0);
  function viewKey(e) {
    if (e.boss) { const si = bossStageIdx(e); return `${e.type}:${si}:${loaded(BOSSES[e.type].model, si + 1)}`; }
    const def = ENEMY_DEFS[e.type];
    if (!def.model) return e.type;
    const st = enemyStage(e);
    return `${e.type}:${st}:${loaded(def.model, st)}`;
  }

  function buildAlly() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(G.sphere, M(0x7fe3ff)); body.scale.set(0.35, 0.3, 0.35); body.position.y = 0.35;
    const hat = new THREE.Mesh(G.cone, M(0xff5ec4)); hat.scale.set(0.2, 0.3, 0.2); hat.position.y = 0.75;
    const ey = googly(0.1); ey.position.set(0, 0.45, 0.28);
    g.add(body, hat, ey);
    g.userData = { eyes: [ey] };
    return g;
  }
  const SHARED_MATS = new Set(Object.values(MAT));
  function disposeTree(obj) {
    if (!obj || !obj.traverse) return;
    obj.traverse((o) => {
      if (typeof o.userData?.releaseAsset === 'function') o.userData.releaseAsset();
      if (o.userData?.char?.dispose) o.userData.char.dispose();
      for (const m of o.material ? [].concat(o.material) : []) {
        if (m.userData?.owned && !SHARED_MATS.has(m)) m.dispose();
      }
    });
  }
  function markOwned(root) {
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      for (const m of [].concat(o.material)) {
        if (m.userData?.characterClone || SHARED_MATS.has(m)) continue;
        m.userData.owned = true;
      }
    });
  }
  const reg = createViewRegistry(scene, {
    dispose(v) {
      disposeTree(v.obj);
      scene.remove(v.obj);
      if (v.extra) v.extra.forEach((x) => { disposeTree(x); scene.remove(x); });
      if (v.obj.userData && v.obj.userData.extra) v.obj.userData.extra.forEach((x) => { disposeTree(x); scene.remove(x); });
    },
  });
  function syncView(id, make, key = null) { return reg.sync(id, make, key); }
  function releaseUnseen() { reg.endFrame(); }
  Object.assign(env, { googly, buildFallback, blob, buildEnemy, bossStageIdx, buildBoss, loaded, viewKey, buildAlly, SHARED_MATS, disposeTree, markOwned, reg, syncView, releaseUnseen });
}
