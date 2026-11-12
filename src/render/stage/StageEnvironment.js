import * as THREE from 'three';
import { STAGES, stageAssets } from '../../data/stages.js';
import { peekTexture, instantiateStatic, assetsVersion } from '../assets.js';
import { createLevelView } from '../level/levelView.js';

export function mountStage(env) {
  const { ARENA_R, E, M, bounce, hemi, scene, sun } = env;
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
  const levelView = createLevelView();
  scene.add(levelView.group);
  const arenaBits = [ground, outer, rim, edgeRing, wall, decor];
  let stageKey = '';
  function setStageMap(mat, tex, rx, ry) {
    const prev = mat.map;
    if (prev && prev.userData?.stageClone) prev.dispose();
    if (tex) {
      const clone = tex.clone();
      clone.userData.stageClone = true;
      clone.wrapS = clone.wrapT = THREE.RepeatWrapping;
      clone.repeat.set(rx, ry);
      clone.needsUpdate = true;
      mat.map = clone;
    } else mat.map = null;
    mat.needsUpdate = true;
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
    if (id === 'grove') {
      scene.fog.color.setHex(0x49445c);
      hemi.color.setHex(0xffefd5);
      hemi.groundColor.setHex(0x9d7a84);
      hemi.intensity = 1.6;
      sun.color.setHex(0xffd29e);
      sun.position.set(-23, 28, 12);
      sun.intensity = 2.12;
      bounce.color.setHex(0xc1bbef);
      bounce.intensity = .45;
    }
    edgeRing.material.color.setHex(st.ring); wall.material.color.setHex(st.ring);
    const skyTex = peekTexture(a.sky);
    sky.material.map = skyTex; sky.material.color.setHex(skyTex ? 0xffffff : st.background); sky.material.needsUpdate = true;
    const floor = peekTexture(a.floor);
    setStageMap(groundMat, floor, st.floorRepeat, st.floorRepeat);
    groundMat.color.setHex(floor ? 0xffffff : 0x4a3a66);
    const stone = peekTexture(a.stone);
    setStageMap(rimMat, stone, 60, 1);
    outer.visible = st.ground != null;
    if (st.ground != null) {
      setStageMap(outerMat, floor, 40, 40);
      outerMat.color.setHex(st.ground);
    }
    env.disposeTree(decor);
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
  Object.assign(env, { sky, groundMat, ground, outerMat, outer, rimMat, rim, edgeRing, wall, decor, levelView, arenaBits, setStageMap, applyStage });
}
