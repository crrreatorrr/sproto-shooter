// @ts-check
import * as THREE from 'three';
import { ARENA_R } from '../../data/tuning.js';
import { STAGES, stageAssets, stageFor } from '../../data/stages.js';
import { peekTexture, instantiateStatic, assetsVersion } from '../assets.js';
import { createLevelStreamer } from '../assets/LevelStreamer.js';

export function createStage(ctx, mats) {
  const { scene } = ctx;
  const { M, E } = mats;
  const streamer = createLevelStreamer();

  const hemi = new THREE.HemisphereLight(0xffe6ff, 0x3a2a55, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d6, 1.4);
  sun.position.set(20, 40, 10);
  scene.add(sun);
  const bounce = new THREE.DirectionalLight(0xff7a3a, 0.4);
  bounce.position.set(0, 4, 40);
  scene.add(bounce);

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

  function applyStage(id) {
    const st = STAGES[id], a = stageAssets(id);
    const key = id + ':' + assetsVersion();
    if (key === stageKey) return;
    stageKey = key;
    scene.background = new THREE.Color(st.background);
    scene.fog = new THREE.Fog(st.fog, 60, 200);
    hemi.color.setHex(st.hemi.sky); hemi.groundColor.setHex(st.hemi.ground); hemi.intensity = st.hemi.intensity * 1.2;
    sun.color.setHex(st.sun.color); sun.intensity = st.sun.intensity * 0.9;
    sun.position.set(st.sun.position[0], st.sun.position[1], st.sun.position[2]);
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

  return {
    setStage(id) { streamer.setStage(id); },
    update(state, dt) {
      streamer.update(state, dt);
      applyStage(stageFor(state, streamer.override));
    },
  };
}
