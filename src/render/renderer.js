// Three.js renderer. Reads state only; interpolates prevPos -> pos with alpha. Placeholder low-poly "Sproto" art.
import * as THREE from 'three';
import { TUNING, ARENA_R } from '../data/tuning.js';
import { ENEMIES, BOSSES } from '../data/enemies.js';
import { QUALITIES_BY_ID, ELEMENTS_BY_ID, MANUFACTURERS_BY_ID, zoomFovFor } from '../data/guns.js';
import { RESOURCES } from '../data/drops.js';
import { worldHitboxes } from '../sim/collision.js';
import { createFirstPerson, FP } from './firstPerson.js';
import { createDragonRig } from './dragonRig.js';
import { createHumanoidRig } from './humanoidRig.js';
import { ENEMIES as ENEMY_DEFS, enemyStage } from '../data/enemies.js';
import { STAGES, stageAssets, stageFor, CHARACTER_MODELS, levelAssets } from '../data/stages.js';
import { peekTexture, instantiateStatic, instantiateCharacter, assetsVersion, peekModel, ensureStage, stageReady, ensureCharacter, characterReady, pendingDownloads, PRIORITY, ensureGunModel, instantiateGun } from './assets.js';

const lerp = (a, b, t) => a + (b - a) * t;
const ELEM_COL = { none: 0xffe9a8, fire: 0xff7a1a, shock: 0x4fe3ff, goo: 0x9be33b };

export function createRenderer(container, bus) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true; // first-person body clipping (firstPerson.js)
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2a1b4a);
  scene.fog = new THREE.Fog(0x2a1b4a, 40, 110);
  const camera = new THREE.PerspectiveCamera(TUNING.fovBase, container.clientWidth / container.clientHeight, 0.05, 300);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  const hemi = new THREE.HemisphereLight(0xffe6ff, 0x3a2a55, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d6, 1.4);
  sun.position.set(20, 40, 10);
  scene.add(sun);
  const bounce = new THREE.DirectionalLight(0xff7a3a, 0.4);
  bounce.position.set(0, 4, 40);
  scene.add(bounce);
  // the first-person gun is drawn on its own layer in a second, depth-cleared pass (never clips into walls)
  const VM_LAYER = 1;
  for (const l of [hemi, sun, bounce]) l.layers.enable(VM_LAYER);

  // ---------- shared materials/geometries ----------
  const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...extra });
  const E = (color, intensity = 1) => new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: intensity < 1, opacity: intensity });
  const G = {
    sphere: new THREE.SphereGeometry(1, 16, 12),
    sphereLo: new THREE.SphereGeometry(1, 8, 6),
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
    capsule: new THREE.CapsuleGeometry(1, 1, 6, 12),
    cone: new THREE.ConeGeometry(1, 1, 10),
    torus: new THREE.TorusGeometry(1, 0.06, 6, 48),
    ring: new THREE.RingGeometry(0.85, 1, 48),
    disc: new THREE.CircleGeometry(1, 24),
    plane: new THREE.PlaneGeometry(1, 1),
  };
  const MAT = {
    white: M(0xffffff), black: M(0x111111, { roughness: 0.3 }), eyeWhite: M(0xffffff, { roughness: 0.2 }),
    weak: E(0xffee55), shield: M(0x9fb4ff, { metalness: 0.6, roughness: 0.3, transparent: true, opacity: 0.85 }),
    flash: E(0xffffff), blob: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    crown: M(0xffd700, { metalness: 0.8, roughness: 0.2, emissive: 0x553300 }),
  };

  // ---------- arena + stage environment (Sproto Duel stages) ----------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(260, 48, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
  sky.renderOrder = -1;
  scene.add(sky);
  const groundMat = M(0xffffff, { roughness: 0.92 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(ARENA_R, 128), groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const outerMat = M(0x1b1033, { roughness: 1 });
  const outer = new THREE.Mesh(new THREE.RingGeometry(ARENA_R + 0.5, 220, 96), outerMat);
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.6;
  scene.add(outer);
  const rimMat = M(0x8a8296, { roughness: 0.9 });
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_R + 0.5, ARENA_R + 0.5, 1.4, 128, 1, true), rimMat);
  rim.position.y = 0.1; rimMat.side = THREE.DoubleSide;
  scene.add(rim);
  const edgeRing = new THREE.Mesh(new THREE.TorusGeometry(ARENA_R, 0.18, 8, 160), E(0xff5ec4));
  edgeRing.rotation.x = -Math.PI / 2; edgeRing.position.y = 0.1;
  scene.add(edgeRing);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_R, ARENA_R, 3, 128, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff5ec4, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }));
  wall.position.y = 1.5;
  scene.add(wall);
  const decor = new THREE.Group();
  scene.add(decor);
  let stageKey = '';
  let stageOverride = null;

  /**
   * Level-scoped loading. Each check requests only:
   *  - now:   the current stage + every enemy model the current wave spawns + anything alive on screen
   *  - later: this wave's boss models (all phases) once the above is in; the NEXT wave's stage and
   *           enemies only once this wave is cleared (intermission), so level 1 downloads level-1 assets only.
   */
  let needsT = 0;
  function requestNeeds(state) {
    const { NOW, LATER } = PRIORITY;
    const stageId = stageFor(state, stageOverride);
    ensureStage(stageId, NOW);
    for (const g of state.players[state.localPlayerId].guns) if (g) ensureGunModel(g.type, NOW);
    for (const k of state.pickups || []) if (k.kind === 'gun') ensureGunModel(k.gun.type, LATER);
    for (const e of state.enemies) {
      if (e.dead) continue;
      if (e.boss) { const b = BOSSES[e.type]; b.phases.forEach((_, i) => ensureCharacter(b.model, i + 1, NOW)); continue; }
      const def = ENEMY_DEFS[e.type];
      if (def.model) ensureCharacter(def.model, enemyStage(e), NOW);
    }
    if (state.mode !== 'waves' || !state.wave) return;
    const w = state.wave;
    const lvl = levelAssets(w.index, state.tier);
    for (const c of lvl.characters) ensureCharacter(c.model, c.stage, NOW);
    const coreReady = stageReady(lvl.stage) && lvl.characters.every((c) => characterReady(c.model, c.stage));
    if (coreReady) for (const c of lvl.bosses) ensureCharacter(c.model, c.stage, w.phase === 'bossIntro' || w.phase === 'boss' ? NOW : LATER);
    const between = w.phase === 'cleared' || w.phase === 'intermission';
    const next = between ? levelAssets(w.index + 1, state.tier) : null;
    if (next) {
      ensureStage(next.stage, LATER);
      for (const c of next.characters) ensureCharacter(c.model, c.stage, LATER);
    }
  }

  function applyStage(id) {
    const st = STAGES[id], a = stageAssets(id);
    const key = id + ':' + assetsVersion();
    if (key === stageKey) return;
    stageKey = key;
    scene.background = new THREE.Color(st.background);
    scene.fog = new THREE.Fog(st.fog, 60, 200);
    hemi.color.setHex(st.hemi.sky); hemi.groundColor.setHex(st.hemi.ground); hemi.intensity = st.hemi.intensity * 1.2;
    sun.color.setHex(st.sun.color); sun.intensity = st.sun.intensity * 0.9; sun.position.set(...st.sun.position);
    bounce.color.setHex(st.bounce.color); bounce.intensity = st.bounce.intensity;
    edgeRing.material.color.setHex(st.ring); wall.material.color.setHex(st.ring);
    const skyTex = peekTexture(a.sky);
    sky.material.map = skyTex; sky.material.color.setHex(skyTex ? 0xffffff : st.background); sky.material.needsUpdate = true;
    const floor = peekTexture(a.floor);
    if (floor) { const f = floor.clone(); f.wrapS = f.wrapT = THREE.RepeatWrapping; f.repeat.set(st.floorRepeat, st.floorRepeat); f.needsUpdate = true; groundMat.map = f; }
    else groundMat.map = null;
    groundMat.color.setHex(floor ? 0xffffff : 0x4a3a66); groundMat.needsUpdate = true;
    const stone = peekTexture(a.stone);
    if (stone) { const t = stone.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 1); t.needsUpdate = true; rimMat.map = t; } else rimMat.map = null;
    rimMat.needsUpdate = true;
    outer.visible = st.ground != null;
    if (st.ground != null) {
      if (floor) { const f = floor.clone(); f.wrapS = f.wrapT = THREE.RepeatWrapping; f.repeat.set(40, 40); f.needsUpdate = true; outerMat.map = f; } else outerMat.map = null;
      outerMat.color.setHex(st.ground); outerMat.needsUpdate = true;
    }
    decor.clear();
    // pillars just outside the ring, props further out
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2 + 0.1;
      const pl = instantiateStatic(a.pillar, 6.5);
      if (!pl) break;
      pl.position.set(Math.cos(ang) * (ARENA_R + 4), 0, Math.sin(ang) * (ARENA_R + 4));
      pl.rotation.y = -ang;
      decor.add(pl);
    }
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + 0.26;
      const r = ARENA_R + 16 + (i % 3) * 9;
      const pr = instantiateStatic(a.prop, st.propHeight * (0.9 + (i % 4) * 0.12));
      if (!pr) break;
      pr.position.set(Math.cos(ang) * r, st.ground == null ? -1 : 0, Math.sin(ang) * r);
      pr.rotation.y = -ang + Math.PI / 2;
      decor.add(pr);
    }
  }

  // weapon boxes
  const boxViews = new Map();
  function boxView(b) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(G.box, M(0x4fd1c5, { roughness: 0.4 }));
    base.scale.set(1.6, 1.0, 1.2); base.position.y = 0.5;
    const lid = new THREE.Mesh(G.box, M(0xffd166)); lid.scale.set(1.7, 0.2, 1.3); lid.position.y = 1.1;
    const sign = new THREE.Mesh(G.box, E(0xffffff)); sign.scale.set(0.9, 0.35, 0.02);
    const glow = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0x4fd1c5, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03; glow.scale.setScalar(b.interactRadius);
    const label = makeLabel('WEAPON BOX', '#4fd1c5');
    label.position.y = 2.2;
    g.add(base, lid, glow, label);
    g.position.set(b.pos.x, 0, b.pos.z);
    g.userData = { lid, glow };
    scene.add(g);
    return g;
  }

  function makeLabel(text, color) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 8, 256, 48);
    g.fillStyle = color; g.fillText(text, 128, 43);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    s.scale.set(2.4, 0.6, 1);
    return s;
  }

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
    const body = new THREE.Mesh(G.capsule, bodyMat); body.scale.set(radius, Math.max(0.1, (height - radius * 2) / 2 + radius * 0.6), radius); body.position.y = height / 2;
    g.add(body);
    const eyes = [];
    for (const x of [-0.18, 0.18]) { const ey = googly(0.13); ey.position.set(x * radius * 2, height * 0.8, radius * 0.9); g.add(ey); eyes.push(ey); }
    g.userData = { bodyMat, eyes };
    return g;
  }

  function blob(r) { const b = new THREE.Mesh(G.disc, MAT.blob); b.rotation.x = -Math.PI / 2; b.position.y = 0.02; b.scale.setScalar(r); return b; }

  /** Enemy view: Sproto Duel rigged character for its stage, plus gameplay markers (crown, shield plate, battery). */
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
    if (ch) { holder.add(ch.root); parts.char = ch; ch.play('idle'); }
    else { const f = buildFallback(def.color, h, def.radius); holder.add(f); Object.assign(parts, f.userData); }
    parts.holder = holder;
    const extra = [];
    if (def.ai === 'mega') {
      // stunned weak spot from the boss's hitboxes; ground shadow sized to the boss
      const hb = def.hitboxes.find((x) => x.onlyWhen === 'stunned');
      const belly = new THREE.Mesh(G.sphere, E(0xff3b3b)); belly.scale.setScalar(hb ? hb.r * 1.1 : 0.55);
      if (hb) belly.position.set(hb.x || 0, hb.y, hb.z || 0); belly.visible = false;
      g.add(belly, blob(def.radius * 1.3)); parts.belly = belly;
      if (ch && def.rig === 'humanoid') parts.rig = createHumanoidRig(ch, def); // skeleton animated in code
    } else if (e.type === 'dragon') {
      holder.rotation.y = Math.PI; // this model's head is at Tripo -X, the opposite of the other characters
      g.add(blob(3.4));
      if (ch) parts.rig = createDragonRig(ch);
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
    g.userData = parts;
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

  // ---------- views sync ----------
  const views = new Map(); // id -> {obj, kind}
  const seen = new Set();
  function dropView(v) {
    scene.remove(v.obj);
    if (v.extra) v.extra.forEach((x) => scene.remove(x));
    if (v.obj.userData.extra) v.obj.userData.extra.forEach((x) => scene.remove(x));
  }
  function syncView(id, make, key = null) {
    seen.add(id);
    let v = views.get(id);
    if (v && key != null && v.key !== key) { dropView(v); v = null; }
    if (!v) { v = make(); views.set(id, v); if (v.obj.parent !== scene) scene.add(v.obj); }
    return v;
  }
  function releaseUnseen() {
    for (const [id, v] of views) {
      if (!seen.has(id)) { dropView(v); views.delete(id); }
    }
    seen.clear();
  }

  /** One mesh from a projectile GLB, centred, nose turned to +Z and fitted to d.len metres. */
  async function loadProjectileModel(d) {
    try {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
      const g = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`${import.meta.env.BASE_URL}assets/${d.model}`);
      let mesh = null;
      g.scene.traverse((o) => { if (!mesh && o.isMesh) mesh = o; });
      if (!mesh) return null;
      const geo = mesh.geometry.clone();
      geo.applyMatrix4(mesh.matrixWorld);
      geo.computeBoundingBox();
      const c = geo.boundingBox.getCenter(new THREE.Vector3());
      geo.translate(-c.x, -c.y, -c.z);
      geo.rotateY(d.noseYaw || 0);
      geo.computeBoundingBox();
      const sz = geo.boundingBox.getSize(new THREE.Vector3());
      const k = d.len / Math.max(1e-4, sz.z);
      geo.scale(k, k, k);
      let material = mesh.material;
      if (d.glow && material.emissive) { material = material.clone(); material.emissive.set(d.glow); material.emissiveIntensity = 0.7; } // readable against the sky
      return { geometry: geo, material };
    } catch (err) { console.warn('[projectiles] model failed', d.model, err.message); return null; }
  }

  // ---------- instanced projectiles ----------
  const PROJ_KINDS = {
    orb: { color: 0xc77dff, scale: 0.35, cap: 500 }, taxBolt: { color: 0xff3bd4, scale: 0.4, cap: 32 },
    spit: { color: 0x9be33b, scale: 0.3, cap: 64 }, gooBolt: { color: 0x7fff4a, scale: 0.28, cap: 64 },
    rocket: { color: 0xff6a3d, scale: 0.22, cap: 32 }, duckBullet: { color: 0xffe14a, scale: 0.2, cap: 128 },
    megaBullet: { color: 0xffffff, scale: 0.6, cap: 16 }, yeetGun: { color: 0xaaaaaa, scale: 0.35, cap: 16 },
    bullet: { color: 0xffc93c, scale: 0.22, cap: 600 },
    flame: { color: 0xff7a1a, scale: 0.4, cap: 300 }, fireball: { color: 0xff4a1a, scale: 0.6, cap: 16 },
    pellet: { color: 0xff5ec4, scale: 0.12, cap: 300 },
    // boss projectiles drawn with 3D models (`model`, fitted to `len` metres, nose along +Z); a sphere until loaded
    monsterBullet: { color: 0x4a5a2a, scale: 0.35, cap: 200, model: 'models/projectiles/monster_bullet.glb', len: 0.9, noseYaw: -Math.PI / 2 },
    missile: { color: 0xff8a1a, scale: 0.4, cap: 64, model: 'models/projectiles/missile.glb', len: 1.3, noseYaw: -Math.PI / 2, glow: 0xff6a10 },
  };
  const inst = {};
  const dummy = new THREE.Object3D();
  for (const [k, d] of Object.entries(PROJ_KINDS)) {
    const im = new THREE.InstancedMesh(k === 'yeetGun' ? G.box : G.sphereLo, E(d.color), d.cap);
    im.frustumCulled = false; im.count = 0;
    scene.add(im);
    inst[k] = { im, n: 0, d, modeled: false };
    if (d.model) {
      loadProjectileModel(d).then((m) => { if (!m) return; im.geometry = m.geometry; im.material = m.material; inst[k].modeled = true; });
    }
  }

  // pickups instanced
  const PK = {};
  const pickupKinds = ['health', 'bigHealth', 'mana', 'ammo', 'resource', 'tickets'];
  for (const k of pickupKinds) {
    const geo = k === 'ammo' || k === 'resource' ? G.box : k === 'tickets' ? G.cyl : G.sphereLo;
    const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 256);
    im.frustumCulled = false; im.count = 0;
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(256 * 3), 3);
    scene.add(im);
    PK[k] = { im, n: 0 };
  }
  const RES_COL = Object.fromEntries(RESOURCES.map((r) => [r.id, new THREE.Color(r.color)]));
  const AMMO_COL = { bullets: new THREE.Color(0xffd166), shells: new THREE.Color(0xff6a3d), sniper: new THREE.Color(0x4fe3ff), rockets: new THREE.Color(0xb07cff) };
  const PK_COL = { health: new THREE.Color(0xff4d6d), bigHealth: new THREE.Color(0xff2255), mana: new THREE.Color(0x6aa8ff), tickets: new THREE.Color(0xffd700) };

  // Gun with a 3D model (e.g. the toy machine gun): model + element gem. Null if the type has none / not loaded yet.
  const GUN_MODEL_LEN = { mg: 0.7, shotgun: 0.75, sniper: 0.8, bazooka: 0.9 };
  // where the hands hold each model, as fractions of its height (y, from the center) and length (z, + = back)
  // Measured on the toy models from side views (gun drawn without arms, markers on the real grip/handguard).
  const HAND_FRAC = {
    mg: { grip: [-0.283, 0.257], fore: [-0.165, -0.214] },
    shotgun: { grip: [-0.207, 0.24], fore: [-0.166, -0.293] },
    sniper: { grip: [-0.311, 0.1375], fore: [0, -0.25] },
    bazooka: { grip: [-0.276, 0.25], fore: [-0.23, -0.278] },
  };
  function buildGunModel(gun, length) {
    const inst = instantiateGun(gun.type, length);
    if (!inst) return null;
    const g = new THREE.Group();
    g.add(inst.root);
    if (gun.element !== 'none') {
      const gem = new THREE.Mesh(G.sphereLo, E(ELEM_COL[gun.element]));
      gem.scale.setScalar(length * 0.035); gem.position.set(inst.size.x / 2 + length * 0.01, 0, 0); g.add(gem);
    }
    g.userData.muzzle = inst.muzzle;
    g.userData.model = true;
    // first-person hand targets: right hand on the grip under the back half, left hand on the handguard
    const hf = HAND_FRAC[gun.type] || HAND_FRAC.mg, sz = inst.size;
    g.userData.grip = [0, hf.grip[0] * sz.y, hf.grip[1] * sz.z];
    g.userData.fore = [0, hf.fore[0] * sz.y, hf.fore[1] * sz.z];
    return g;
  }

  function buildGunMesh(gun, forView = false) {
    if (!forView && GUN_MODEL_LEN[gun.type]) {
      const m = buildGunModel(gun, GUN_MODEL_LEN[gun.type] * 1.6);
      if (m) return m;
    }
    const g = new THREE.Group();
    const man = MANUFACTURERS_BY_ID[gun.manufacturer];
    const q = QUALITIES_BY_ID[gun.quality];
    const bodyMat = M(man.color, { roughness: 0.4, metalness: 0.3 });
    const accent = M(new THREE.Color(q.color), { emissive: new THREE.Color(q.color), emissiveIntensity: 0.35 });
    const elCol = ELEM_COL[gun.element];
    const dims = { mg: [0.12, 0.14, 0.6], shotgun: [0.14, 0.14, 0.55], sniper: [0.09, 0.11, 0.85], bazooka: [0.2, 0.2, 0.9] }[gun.type];
    const body = new THREE.Mesh(G.box, bodyMat); body.scale.set(...dims);
    g.add(body);
    if (gun.type === 'bazooka') {
      const tube = new THREE.Mesh(G.cyl, bodyMat); tube.scale.set(0.13, 0.95, 0.13); tube.rotation.x = Math.PI / 2;
      g.add(tube);
    } else {
      const barrelLen = gun.parts.barrel === 'long' ? 0.45 : gun.parts.barrel === 'short' ? 0.18 : 0.3;
      const barrel = new THREE.Mesh(G.cyl, M(0x333333, { metalness: 0.7 })); barrel.scale.set(gun.type === 'shotgun' ? 0.05 : 0.03, barrelLen, gun.type === 'shotgun' ? 0.05 : 0.03);
      barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -dims[2] / 2 - barrelLen / 2);
      g.add(barrel);
      if (gun.type === 'shotgun') { const b2 = barrel.clone(); b2.position.x = 0.06; barrel.position.x = -0.03; b2.position.x = 0.03; g.add(b2); }
    }
    const grip = new THREE.Mesh(G.box, M(0x3a2a1a)); grip.scale.set(0.07, 0.18, 0.08); grip.position.set(0, -0.14, 0.12); grip.rotation.x = 0.3;
    const mag = new THREE.Mesh(G.box, accent); mag.scale.set(0.06, gun.parts.mag === 'drum' ? 0.16 : 0.2, gun.parts.mag === 'drum' ? 0.16 : 0.08); mag.position.set(0, -0.15, -0.08);
    g.add(grip, mag);
    if (gun.parts.scope !== 'stock' || gun.type === 'sniper') {
      const sc = new THREE.Mesh(G.cyl, M(0x222222)); sc.scale.set(0.035, gun.type === 'sniper' || gun.parts.scope === 'longScope' ? 0.3 : 0.12, 0.035);
      sc.rotation.x = Math.PI / 2; sc.position.set(0, 0.11, 0); g.add(sc);
    }
    const stripe = new THREE.Mesh(G.box, accent); stripe.scale.set(dims[0] * 1.05, 0.025, dims[2] * 0.6); stripe.position.y = dims[1] / 2;
    g.add(stripe);
    if (gun.element !== 'none') {
      const gem = new THREE.Mesh(G.sphereLo, E(elCol)); gem.scale.setScalar(0.04); gem.position.set(dims[0] / 2 + 0.01, 0, 0); g.add(gem);
    }
    if (gun.wacky === 'rubberDuck') { const duck = new THREE.Mesh(G.sphereLo, M(0xffe14a)); duck.scale.setScalar(0.07); duck.position.set(0, 0.12, 0.15); g.add(duck); }
    if (!forView) g.scale.setScalar(1.6);
    const barrelLen = gun.type === 'bazooka' ? 0.475 - dims[2] / 2 : gun.parts.barrel === 'long' ? 0.45 : gun.parts.barrel === 'short' ? 0.18 : 0.3;
    g.userData.muzzle = new THREE.Vector3(0, 0.02, -dims[2] / 2 - barrelLen);
    return g;
  }

  // gun pickups: mesh + beam
  function buildGunPickup(gun) {
    const g = new THREE.Group();
    const mesh = buildGunMesh(gun);
    mesh.rotation.y = Math.PI / 2;
    g.add(mesh);
    const q = QUALITIES_BY_ID[gun.quality];
    const h = 2 + q.idx * 1.5;
    const beam = new THREE.Mesh(G.cyl, new THREE.MeshBasicMaterial({ color: new THREE.Color(q.color), transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }));
    beam.scale.set(0.12 + q.idx * 0.04, h, 0.12 + q.idx * 0.04); beam.position.y = h / 2 - 0.5;
    g.add(beam);
    g.userData = { mesh };
    return g;
  }

  // ---------- hazards ----------
  function buildHazard(h) {
    let obj;
    if (h.kind === 'shockwave') {
      obj = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xffa64d, transparent: true, opacity: 0.7, side: THREE.DoubleSide, toneMapped: false }));
    } else if (h.kind === 'telegraphLine') {
      obj = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
      const d = h.data.dir;
      obj.scale.set(h.data.width, h.data.len, 1);
      obj.position.set(h.pos.x + d.x * h.data.len / 2, 0.04, h.pos.z + d.z * h.data.len / 2);
      // plane's local +Y ends up along dir on the ground
      obj.rotation.set(-Math.PI / 2, 0, Math.atan2(-d.x, -d.z));
    } else if (h.kind === 'meteorMarker') {
      obj = new THREE.Group();
      const ring = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xff3b1a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, toneMapped: false }));
      ring.rotation.x = -Math.PI / 2; ring.scale.setScalar(h.radius);
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.4), M(0x5a3b2a, { emissive: 0xff4400, emissiveIntensity: 0.6 }));
      obj.add(ring, rock); obj.userData = { rock, ring };
    } else if (h.kind === 'spawnPortal') {
      obj = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xff5ec4, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }));
      obj.rotation.x = -Math.PI / 2;
    } else {
      obj = new THREE.Mesh(G.ring, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide, toneMapped: false }));
      obj.rotation.x = -Math.PI / 2;
    }
    if (h.kind !== 'telegraphLine') obj.position.set(h.pos.x, h.pos.y + 0.03, h.pos.z);
    return obj;
  }

  // ---------- VFX: tracers, confetti, explosions, flashes ----------
  const TRACER_N = 96;
  const tracerGeo = new THREE.BufferGeometry();
  const tracerPos = new Float32Array(TRACER_N * 6);
  const tracerCol = new Float32Array(TRACER_N * 6);
  tracerGeo.setAttribute('position', new THREE.BufferAttribute(tracerPos, 3));
  tracerGeo.setAttribute('color', new THREE.BufferAttribute(tracerCol, 3));
  const tracerLines = new THREE.LineSegments(tracerGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, toneMapped: false }));
  tracerLines.frustumCulled = false;
  scene.add(tracerLines);
  const tracers = Array.from({ length: TRACER_N }, () => ({ life: 0, max: 0.06 }));
  let tracerIdx = 0;
  function addTracer(from, to, color, life = 0.06, jag = false) {
    if (jag) {
      // zigzag lightning in 4 segments
      let prev = from;
      for (let i = 1; i <= 4; i++) {
        const t = i / 4;
        const p = i === 4 ? to : { x: lerp(from.x, to.x, t) + (Math.random() - 0.5) * 0.8, y: lerp(from.y, to.y, t) + (Math.random() - 0.5) * 0.8, z: lerp(from.z, to.z, t) + (Math.random() - 0.5) * 0.8 };
        addTracer(prev, p, color, 0.18, false);
        prev = p;
      }
      return;
    }
    const i = tracerIdx++ % TRACER_N;
    tracers[i].life = life; tracers[i].max = life;
    tracerPos.set([from.x, from.y, from.z, to.x, to.y, to.z], i * 6);
    const c = new THREE.Color(color);
    tracerCol.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
  }

  const CONF_N = 1500;
  const confGeo = new THREE.PlaneGeometry(0.12, 0.08);
  const confetti = new THREE.InstancedMesh(confGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), CONF_N);
  confetti.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CONF_N * 3), 3);
  confetti.frustumCulled = false;
  scene.add(confetti);
  const cp = new Float32Array(CONF_N * 3), cv = new Float32Array(CONF_N * 3), cl = new Float32Array(CONF_N), cr = new Float32Array(CONF_N);
  let confIdx = 0;
  const CONF_COLORS = [0xff5ec4, 0xffd166, 0x4fe3ff, 0x7fd34e, 0xff8a3d, 0xb07cff, 0xffffff].map((c) => new THREE.Color(c));
  function burstConfetti(pos, n, speed = 6, colors = CONF_COLORS) {
    for (let k = 0; k < n; k++) {
      const i = confIdx++ % CONF_N;
      cp[i * 3] = pos.x; cp[i * 3 + 1] = pos.y; cp[i * 3 + 2] = pos.z;
      const a = Math.random() * Math.PI * 2, u = Math.random() * 0.8 + 0.2;
      cv[i * 3] = Math.cos(a) * speed * u; cv[i * 3 + 1] = Math.random() * speed + 2; cv[i * 3 + 2] = Math.sin(a) * speed * u;
      cl[i] = 1.2 + Math.random() * 0.8; cr[i] = Math.random() * 10;
      confetti.setColorAt(i, colors[(Math.random() * colors.length) | 0]);
    }
    confetti.instanceColor.needsUpdate = true;
  }

  const booms = [];
  function addBoom(pos, radius, color, life = 0.35) {
    const m = new THREE.Mesh(G.sphereLo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }));
    m.position.set(pos.x, pos.y, pos.z);
    scene.add(m);
    booms.push({ m, life, max: life, radius });
  }
  const flashLight = new THREE.PointLight(0xffcc66, 0, 12);
  scene.add(flashLight);
  let flashT = 0;

  // ---------- viewmodel ----------
  const vmRoot = new THREE.Group();
  camera.add(vmRoot);
  const vmLight = new THREE.PointLight(0xffffff, 0.6, 3); vmLight.position.set(0.3, 0.3, 0); camera.add(vmLight);
  vmLight.layers.enable(VM_LAYER);
  flashLight.layers.enable(VM_LAYER);
  let vmGun = null, vmGunKey = null;
  const muzzleFlash = new THREE.Mesh(G.sphereLo, E(0xffdd66)); muzzleFlash.visible = false;
  vmRoot.add(muzzleFlash);
  const setVmLayer = (o) => o.traverse((c) => c.layers.set(VM_LAYER));
  setVmLayer(vmRoot);
  // Viewmodel pose: [x, y, z] at rest / aiming, plus yaw/roll at rest. Modeled guns sit big in the lower right,
  // barrel angled in toward the crosshair; aiming pulls them to the center.
  const VM_POSE = {
    box: { rest: FP.hip.pos, ads: FP.ads.pos, yaw: 0, roll: 0, scale: FP.gunScale }, // placeholder while a model loads
    model: { rest: [0.2, -0.17, -0.5], ads: [0, -0.27, -0.45], yaw: 0.06, roll: -0.03, scale: 1 },
    // slim shotgun sits a little higher; its barrel is the top of the model, so aiming can stay close to center
    shotgun: { rest: [0.19, -0.15, -0.5], ads: [0, -0.16, -0.45], yaw: 0.06, roll: -0.03, scale: 1 },
    // bazooka: same rules as the other guns, a little lower because the tube is tall; aiming keeps its top
    // below the crosshair
    bazooka: { len: 0.72, rest: [0.22, -0.22, -0.55], ads: [0, -0.3, -0.55], yaw: 0.06, roll: -0.03, scale: 1 },
  };
  const fp = createFirstPerson(camera); // first-person arms (main): drawn in the viewmodel pass with the gun
  const vm = { kick: 0, swayX: 0, swayY: 0, bob: 0, reload: 0, swap: 0, lastYaw: 0, lastPitch: 0 };

  // ---------- reload animations ----------
  // Procedural, per gun type, driven by reload progress t (0..1) so they always fit the real reload time.
  // Returns camera-space offsets { x, y, z } and local rotations { rx, ry, rz }.
  const smooth = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
  const pulse = (t, c, w) => Math.exp(-(((t - c) / w) ** 2));
  const RELOAD_ANIM = {
    // magazine swap: tilt the gun over, mag out, slap a new one in, rack the charging handle
    mg: (t, e) => ({
      x: 0.03 * e, y: -0.08 * e - 0.03 * pulse(t, 0.35, 0.06) + 0.035 * pulse(t, 0.6, 0.04), z: 0.04 * pulse(t, 0.82, 0.04),
      rx: 0.25 * e - 0.1 * pulse(t, 0.35, 0.06) + 0.1 * pulse(t, 0.82, 0.04), ry: 0.1 * e, rz: 0.5 * e - 0.12 * pulse(t, 0.6, 0.04),
    }),
    // shell by shell: gun canted up and left, a push per shell, then a big pump
    shotgun: (t, e) => {
      let push = 0;
      for (let i = 0; i < 5; i++) push += pulse(t, 0.22 + i * 0.12, 0.03);
      return { x: -0.02 * e, y: -0.06 * e, z: -0.02 * push + 0.07 * pulse(t, 0.88, 0.04),
        rx: 0.35 * e + 0.05 * push, ry: -0.15 * e, rz: -0.35 * e };
    },
    // bolt action + mag: turn the gun to show its side, bolt up and back, swap the mag, bolt home
    sniper: (t, e) => ({
      x: 0.02 * e, y: -0.07 * e - 0.04 * pulse(t, 0.5, 0.05) + 0.03 * pulse(t, 0.62, 0.04), z: 0.04 * pulse(t, 0.25, 0.05) - 0.04 * pulse(t, 0.86, 0.04),
      rx: 0.15 * e, ry: 0.25 * e, rz: 0.35 * e + 0.15 * pulse(t, 0.25, 0.05) - 0.12 * pulse(t, 0.86, 0.04),
    }),
    // lower the tube, load a rocket at the back, lift it back up
    bazooka: (t, e) => ({
      x: 0, y: -0.22 * e + 0.03 * pulse(t, 0.6, 0.05), z: 0.06 * e - 0.05 * pulse(t, 0.6, 0.05),
      rx: -0.45 * e, ry: 0.1 * e, rz: 0.15 * e,
    }),
  };
  const NO_RELOAD = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
  function reloadOffsets(type, reloadT, total) {
    if (!(reloadT > 0) || !total) return NO_RELOAD;
    const t = Math.min(1, Math.max(0, 1 - reloadT / total));
    const e = smooth(0, 0.15, t) * (1 - smooth(0.85, 1, t)); // ease in and out of the reload pose
    return (RELOAD_ANIM[type] || RELOAD_ANIM.mg)(t, e);
  }

  // ---------- camera feel ----------
  const feel = { trauma: 0, fovPunch: 0, fov: TUNING.fovBase, landDip: 0 };
  function addTrauma(t) { feel.trauma = Math.min(1, feel.trauma + t); }

  // ---------- event listeners ----------
  bus.on('shot', (ev) => {
    vm.kick = Math.min(1, vm.kick + (ev.gunType === 'mg' ? 0.25 : 1));
    muzzleFlash.visible = true; flashT = 0.05;
    const big = ev.gunType !== 'mg';
    muzzleFlash.scale.setScalar(big ? 0.12 : 0.07 * (ev.manufacturer === 'blastco' ? 1.6 : 1));
    muzzleFlash.material.color.set(ELEM_COL[ev.element]);
    addTrauma(ev.mega ? 0.5 : ev.gunType === 'mg' ? 0.03 : ev.gunType === 'sniper' ? 0.25 : 0.2);
    feel.fovPunch += ev.gunType === 'mg' ? 0.2 : 2;
  });
  bus.on('tracer', (ev) => {
    const col = ev.zap ? 0x9ff3ff : ELEM_COL[ev.element] || 0xffe9a8;
    let from = ev.from;
    if (!ev.zap) {
      // start at viewmodel muzzle for player's shots
      const mp = new THREE.Vector3(); muzzleFlash.getWorldPosition(mp);
      if (Math.hypot(ev.from.x - camera.position.x, ev.from.z - camera.position.z) < 1.5) from = { x: mp.x, y: mp.y, z: mp.z };
    }
    addTracer(from, ev.to, col, ev.zap ? 0.18 : ev.gunType === 'sniper' ? 0.15 : 0.05, !!ev.zap);
    if (ev.mega) addTracer(from, ev.to, 0xffffff, 0.2);
  });
  bus.on('impact', (ev) => burstConfetti({ ...ev.pos, y: Math.max(0.05, ev.pos.y) }, 3, 2, [new THREE.Color(ELEM_COL[ev.element])]));
  bus.on('damage', (ev) => {
    if (ev.isWeak) burstConfetti(ev.pos, 6, 3, [new THREE.Color(0xffee55), new THREE.Color(0xffffff)]);
    else if (Math.random() < 0.4) burstConfetti(ev.pos, 2, 2, [new THREE.Color(ELEM_COL[ev.element])]);
  });
  bus.on('kill', (ev) => {
    if (ev.isDummy) return;
    const big = ev.bossTag ? 4 : ev.elite ? 2 : 1;
    burstConfetti(ev.pos, 40 * big, 7 * Math.sqrt(big));
    addBoom(ev.pos, ev.bossTag ? 6 : 1.2, 0xffffff, 0.2);
    addTrauma(ev.bossTag ? 0.8 : 0.08);
  });
  bus.on('explosion', (ev) => {
    addBoom(ev.pos, ev.radius, ELEM_COL[ev.element] === 0xffe9a8 ? 0xffa040 : ELEM_COL[ev.element], 0.4);
    burstConfetti(ev.pos, 12, 6, [new THREE.Color(0xffa040), new THREE.Color(0xffe14a), new THREE.Color(0x666666)]);
    flashLight.position.set(ev.pos.x, ev.pos.y + 1, ev.pos.z); flashLight.intensity = 30; flashLight.color.set(0xffaa55);
    const d = Math.hypot(ev.pos.x - camera.position.x, ev.pos.z - camera.position.z);
    addTrauma(Math.max(0, 0.6 - d / 25) * (ev.radius / 4));
  });
  bus.on('meteorImpact', (ev) => { addBoom({ ...ev.pos, y: 0.5 }, 7, 0xff4400, 0.7); burstConfetti(ev.pos, 150, 12); addTrauma(1); });
  bus.on('splat', (ev) => burstConfetti(ev.pos, ev.element === 'fire' ? 18 : 10, 3, ev.element === 'fire' ? [new THREE.Color(0xff7a1a), new THREE.Color(0xffd166), new THREE.Color(0x553322)] : [new THREE.Color(0x9be33b), new THREE.Color(0x5aa02c)]));
  bus.on('playerDamaged', (ev) => addTrauma(ev.noDamage ? 0.3 : Math.min(0.5, ev.amount / 40)));
  bus.on('land', (ev) => { feel.landDip = Math.min(0.25, ev.speed / 60); });
  bus.on('dash', () => { feel.fovPunch += 8; });
  bus.on('slide', () => { feel.fovPunch += 4; });
  bus.on('reloadStart', (ev) => { vm.reload = 1; vm.reloadTime = ev.time || 1.5; });
  bus.on('swap', () => { vm.swap = 1; });
  bus.on('gunPickedUp', () => { vm.swap = 1; });
  bus.on('stomp', (ev) => burstConfetti({ ...ev.pos, y: 0.1 }, 8, 3, [new THREE.Color(0xff5ec4)]));
  bus.on('pound', (ev) => { addBoom({ ...ev.pos, y: 0.2 }, 3.2, 0x9fb4ff, 0.3); addTrauma(0.2); });
  bus.on('bossStunned', (ev) => { addTrauma(0.6); burstConfetti({ ...ev.pos, y: 4 }, 30, 5, [new THREE.Color(0xffee55)]); });
  bus.on('bossTeleport', (ev) => burstConfetti(ev.pos, 40, 5, [new THREE.Color(0xb07cff), new THREE.Color(0x222222)]));
  bus.on('allyPoof', (ev) => burstConfetti({ ...ev.pos, y: 0.4 }, 10, 2));
  bus.on('craftComplete', (ev) => burstConfetti({ ...ev.pos, y: 1.5 }, 30, 4, [new THREE.Color(0x4fd1c5), new THREE.Color(0xffd166)]));
  bus.on('levelUp', () => feel.fovPunch += 3);
  bus.on('duckBounce', (ev) => burstConfetti(ev.pos, 2, 2, [new THREE.Color(0xffe14a)]));

  // ---------- frame ----------
  let showHitboxes = false;
  const hbGroup = new THREE.Group(); scene.add(hbGroup);
  const hbMats = { body: new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }), weak: new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true }), shield: new THREE.MeshBasicMaterial({ color: 0x00aaff, wireframe: true }) };
  const _hb = [];
  let lastNow = performance.now();

  function render(state, alpha, look, opts = {}) {
    const now = performance.now();
    const fdt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    const p = state.players[state.localPlayerId];
    const t = state.time;

    // camera
    const px = lerp(p.prevPos.x, p.pos.x, alpha), py = lerp(p.prevPos.y, p.pos.y, alpha), pz = lerp(p.prevPos.z, p.pos.z, alpha);
    const eyeT = p.dead ? 0.3 : p.downed ? TUNING.downedEye : p.move.mode === 'slide' ? TUNING.slideEye : TUNING.eyeHeight;
    feel.eye = feel.eye == null ? eyeT : lerp(feel.eye, eyeT, Math.min(1, fdt * 14));
    const speed = Math.hypot(p.vel.x, p.vel.z);
    if (p.onGround && speed > 1) vm.bob += fdt * speed * 1.4;
    const bobY = p.onGround ? Math.sin(vm.bob * 2) * 0.03 * Math.min(1, speed / 6) : 0;
    feel.landDip = Math.max(0, feel.landDip - fdt * 1.2);
    camera.position.set(px, py + feel.eye + bobY - feel.landDip * 0.4, pz);
    feel.trauma = Math.max(0, feel.trauma - fdt * 1.6);
    const sh = feel.trauma * feel.trauma * (opts.shake ?? 1);
    const n1 = Math.sin(now * 0.047) + Math.sin(now * 0.031), n2 = Math.sin(now * 0.043 + 1) + Math.sin(now * 0.029 + 2);
    camera.rotation.y = look.yaw + p.recoil.yaw + n1 * 0.02 * sh;
    camera.rotation.x = look.pitch + p.recoil.pitch + n2 * 0.02 * sh;
    camera.rotation.z = (Math.sin(now * 0.037) * 0.03 * sh) + (p.move.mode === 'slide' ? 0.06 : 0) + (p.downed ? 0.25 : 0);
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
        if (vmGun) vmRoot.remove(vmGun);
        vmGun = modeled || buildGunMesh(gun, true);
        vmGun.userData.gunId = gun.id;
        vmGun.userData.type = gun.type;
        vmGun.userData.pose = modeled ? VM_POSE[gun.type] || VM_POSE.model : VM_POSE.box;
        vmGun.scale.setScalar(vmGun.userData.pose.scale);
        setVmLayer(vmGun);
        vmRoot.add(vmGun);
      }
    }
    vm.kick = Math.max(0, vm.kick - fdt * 8);
    vm.swap = Math.max(0, vm.swap - fdt * 4);
    vm.reload = p.reloadT > 0 ? 1 : Math.max(0, vm.reload - fdt * 6);
    const dyaw = look.yaw - vm.lastYaw, dpitch = look.pitch - vm.lastPitch;
    vm.lastYaw = look.yaw; vm.lastPitch = look.pitch;
    vm.swayX = lerp(vm.swayX, Math.max(-0.05, Math.min(0.05, dyaw * 0.6)), Math.min(1, fdt * 10));
    vm.swayY = lerp(vm.swayY, Math.max(-0.05, Math.min(0.05, dpitch * 0.6)), Math.min(1, fdt * 10));
    const ads = p.zooming ? 1 : 0;
    vm.ads = lerp(vm.ads || 0, ads, Math.min(1, fdt * 14));
    vmRoot.visible = !p.dead;
    if (vmGun) {
      const pose = vmGun.userData.pose, ia = 1 - vm.ads;
      const r = reloadOffsets(vmGun.userData.type, p.reloadT, vm.reloadTime);
      const steady = 1 - 0.75 * vm.ads; // less sway and bob while aiming
      const ad = pose.ads;
      vmGun.position.set(
        lerp(pose.rest[0], ad[0], vm.ads) + vm.swayX * steady + r.x,
        lerp(pose.rest[1], ad[1], vm.ads) - vm.swayY * steady + r.y - vm.swap * 0.25 + Math.sin(vm.bob * 2) * 0.006 * steady,
        lerp(pose.rest[2], ad[2], vm.ads) + vm.kick * 0.05 + r.z);
      vmGun.rotation.set(vm.kick * 0.25 + r.rx, pose.yaw * ia + vm.swayX * steady + r.ry, pose.roll * ia + r.rz);
      vmGun.updateMatrix();
      muzzleFlash.position.copy(vmGun.userData.muzzle).applyMatrix4(vmGun.matrix);
    }
    if (vmGun && gun) fp.setGun(vmGun, gun.type);
    fp.update(vmRoot.visible);
    if (fp.ready && !fp.root.userData.vmLayer) { setVmLayer(fp.root); fp.root.userData.vmLayer = true; }
    flashT -= fdt;
    if (flashT <= 0) muzzleFlash.visible = false;
    flashLight.intensity = Math.max(0, flashLight.intensity - fdt * 120);

    // weapon boxes
    for (const b of state.weaponBoxes) {
      let v = boxViews.get(b.id);
      if (!v) { v = boxView(b); boxViews.set(b.id, v); }
      v.userData.glow.material.opacity = b.glow ? 0.45 + Math.sin(now * 0.005) * 0.25 : 0.15;
      v.userData.lid.position.y = 1.1 + (b.craft ? Math.abs(Math.sin(now * 0.03)) * 0.3 : 0);
    }

    // enemies
    needsT -= fdt;
    if (needsT <= 0) { needsT = 0.25; requestNeeds(state); }
    applyStage(stageFor(state, stageOverride));
    for (const e of state.enemies) {
      // Model-swap only when the needed stage model is loaded (avoid flicker between fallback and model).
      const v = syncView(e.id, () => (e.boss ? buildBoss(e) : buildEnemy(e)), viewKey(e));
      const o = v.obj, u = o.userData;
      const ex = lerp(e.prevPos.x, e.pos.x, alpha), ey = lerp(e.prevPos.y, e.pos.y, alpha), ez = lerp(e.prevPos.z, e.pos.z, alpha);
      o.position.set(ex, ey, ez);
      o.rotation.y = e.yaw + Math.PI;
      // flash / status tint
      const tint = e.hitFlash > 0 ? [0.9, 0.9, 0.9] : e.status.burn ? [0.45, 0.12, 0] : e.status.goo ? [0.08, 0.3, 0] : [0, 0, 0];
      if (u.char) u.char.setTint(...tint);
      else if (u.bodyMat) { u.bodyMat.emissive.setRGB(...tint); }
      // scale: pop in while spawning, wobble when staggered
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
      if (u.crown) u.crown.rotation.y += fdt * 2;
      if (u.prop) u.prop.rotation.y += fdt * 40;
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
          const map = e.type === 'dragon' ? {} : BOSSES[e.type].ai === 'mega'
            ? { intro: 'victory', transition: 'hit', chase: 'run', charge: e.boss.action.t < 0.8 ? 'castBig' : 'run', stunned: 'stun', slam: 'jump', volley: 'castBig', summon: 'victory', melee: 'castBig', missiles: 'cast' }
            : { intro: 'victory', transition: 'hit', drift: 'idle', ring: 'cast', fan: 'cast', spiral: 'cast', taxBolts: 'castBig', spiralRing: 'castBig', teleport: 'castBig' };
          const clip = map[act] || 'idle';
          ch.play(clip, { speed: act === 'charge' && e.boss.action.t >= 0.8 ? 1.8 : 1 });
        }
        ch.update(fdt);
        if (u.rig) u.rig.update(fdt, { moving: !!e.ai.moving, speed: spd, action: e.boss ? e.boss.action.id : null, actionT: e.boss ? e.boss.action.t : 0 });
      }
      if (e.boss) {
        if (e.type === 'dragon') {
          o.position.y = ey + (e.ai.moving ? Math.abs(Math.sin(now * 0.008)) * 0.12 : Math.sin(now * 0.002) * 0.05);
        } else if (BOSSES[e.type].ai === 'mega') {
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
      if (pr.kind === 'rocket') { dummy.scale.set(s, s, s * 3); dummy.lookAt(dummy.position.x + pr.vel.x, dummy.position.y + pr.vel.y, dummy.position.z + pr.vel.z); }
      else if (pr.kind === 'bullet' || pr.kind === 'pellet') { dummy.scale.set(s, s, s * 2.2); dummy.lookAt(dummy.position.x + pr.vel.x, dummy.position.y + pr.vel.y, dummy.position.z + pr.vel.z); }
      else if (pr.kind === 'yeetGun') { dummy.scale.set(0.15, 0.2, 0.8); dummy.rotation.set(now * 0.02, now * 0.015, 0); }
      else if (I.d.model) { // modeled boss projectiles fly nose-first
        dummy.scale.setScalar(I.modeled ? 1 : s);
        dummy.lookAt(dummy.position.x + pr.vel.x, dummy.position.y + pr.vel.y, dummy.position.z + pr.vel.z);
        if (pr.kind === 'missile') dummy.rotateZ(now * 0.01 + pr.id); // spin
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
      dummy.position.set(lerp(pk.prevPos.x, pk.pos.x, alpha), lerp(pk.prevPos.y, pk.pos.y, alpha) + Math.sin(now * 0.004 + pk.id) * 0.08, lerp(pk.prevPos.z, pk.pos.z, alpha));
      const s = pk.kind === 'bigHealth' ? 0.4 : pk.kind === 'resource' ? (pk.resId === 'bossCore' || pk.resId === 'manaCrystal' ? 0.35 : 0.2) : pk.kind === 'tickets' ? 0.18 : 0.22;
      dummy.rotation.set(pk.kind === 'tickets' ? Math.PI / 2 : 0, now * 0.003 + pk.id, 0);
      dummy.scale.set(s, pk.kind === 'tickets' ? 0.05 / 0.18 * s : s, s);
      if (pk.ttl < 5) dummy.scale.multiplyScalar(Math.sin(now * 0.03) > 0 ? 1 : 0.5);
      dummy.updateMatrix();
      I.im.setMatrixAt(I.n, dummy.matrix);
      const col = pk.kind === 'resource' ? RES_COL[pk.resId] : pk.kind === 'ammo' ? AMMO_COL[pk.ammoType] : PK_COL[pk.kind];
      I.im.setColorAt(I.n, col);
      I.n++;
    }
    for (const k in PK) { const I = PK[k]; I.im.count = I.n; I.im.instanceMatrix.needsUpdate = true; if (I.im.instanceColor) I.im.instanceColor.needsUpdate = true; }

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
    if (debugCam) { debugCam.layers.enableAll(); renderer.render(scene, debugCam); return; }
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
  }

  const _v = new THREE.Vector3();
  function project(pos) {
    _v.set(pos.x, pos.y, pos.z).project(camera);
    return { x: (_v.x * 0.5 + 0.5) * renderer.domElement.clientWidth, y: (-_v.y * 0.5 + 0.5) * renderer.domElement.clientHeight, behind: _v.z > 1 };
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  return {
    render, project, resize, canvas: renderer.domElement, camera,
    setShowHitboxes(v) { showHitboxes = v; },
    setStage(id) { stageOverride = id || null; },
    firstPerson: fp,
    THREE, scene,
    pendingDownloads,
    info: () => renderer.info,
  };
}
