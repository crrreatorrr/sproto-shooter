import * as THREE from 'three';
import { STAGES, stageAssets } from '../../data/stages.js';
import { peekTexture, instantiateStatic, assetsVersion } from '../assets.js';
import { createAuroraSky } from './auroraSky.js';
import { panoramaPath } from '../level/campaignSurfaceArt.js';
import { createSkylineRain } from './skylineRain.js';
import { createLevelView } from '../level/levelView.js';

export function mountStage(env) {
  const { ARENA_R, E, M, bounce, hemi, scene, sun } = env;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(260, 48, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }));
  const standardSky = sky.material;
  let blockchainSky, frostspireSky;
  sky.renderOrder = -1;
  const skylineRain = createSkylineRain();
  scene.add(sky, skylineRain);
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

  function applyStage(id, levelId, sectionId) {
    const grove = id === 'grove' && levelId === 'L03';
    const bazaar = id === 'desert' && levelId === 'L02';
    const showroom = bazaar && sectionId === 'S4';
    const landing = id === 'city' && levelId === 'L01';
    const blockchain = id === 'void' && levelId === 'L04';
    const frostspire = id === 'glacier' && levelId === 'L05';
    const skyline = id === 'city' && levelId === 'L06';
    const underworks = id === 'volcano' && levelId === 'L07';
    const office = id === 'office' && levelId === 'L08';
    const roof = office && sectionId === 'S4';
    const moonlit = id === 'moonlit' && levelId === 'L09';
    const crypt = moonlit && sectionId === 'S2';
    const st = STAGES[id], a = stageAssets(id);
    const variant = office ? (roof ? 'L08-roof' : 'L08-interior')
      : moonlit ? (crypt ? 'L09-crypt' : 'L09-exterior')
      : frostspire || blockchain || skyline || underworks ? `${levelId}-${sectionId || 'S1'}`
      : bazaar ? (showroom ? 'L02-showroom' : 'L02-exterior')
        : grove || landing ? levelId : '';
    const key = id + ':' + variant + ':' + assetsVersion();
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
    const panorama = landing || frostspire || blockchain || grove || bazaar || skyline || underworks || office || moonlit ? panoramaPath(levelId, sectionId) : a.sky;
    const skyTex = panorama ? peekTexture(panorama) || (grove ? peekTexture(a.sky) : null) : null;
    if (blockchain && skyTex) {
      skyTex.wrapS = THREE.RepeatWrapping;
      const offset = { S1: -.18, S2: -.15, S3: -.25, S4: -.31, S5: -.125, SB: -.02 };
      skyTex.offset.set(offset[sectionId] ?? offset.S1, -.027);
      skyTex.needsUpdate = true;
    }
    const orchardSky = grove && skyTex && skyTex === peekTexture(panorama);
    if (orchardSky) {
      skyTex.wrapS = THREE.RepeatWrapping;
      skyTex.offset.set(.07, -.046);
      skyTex.needsUpdate = true;
      scene.fog.color.setHex(0x97a878);
      hemi.color.setHex(0xffedcf);
      hemi.groundColor.setHex(0x748859);
      hemi.intensity = 1.51;
      sun.color.setHex(0xffda9f);
      sun.intensity = 1.68;
      bounce.color.setHex(0xbbd7e1);
    }
    if (skyTex && (landing || bazaar || skyline || underworks || roof || moonlit)) {
      skyTex.offset.y = landing ? -.106 : bazaar ? -.018 : skyline ? -.088 : underworks ? -.045 : moonlit ? -.036 : -.049;
      if (landing || bazaar || skyline || underworks || roof || moonlit) {
        // Frame a different part of the painted skyline along each approach.
        skyTex.wrapS = THREE.RepeatWrapping;
        const skylineOffset = { S1: .09, S2: .195, S3: -.17, S4: .275 };
        const cavernOffset = { S1: .04, S2: -.095, S3: .19, S4: .32 };
        skyTex.offset.x = skyline ? (skylineOffset[sectionId] ?? skylineOffset.S1)
          : underworks ? (cavernOffset[sectionId] ?? cavernOffset.S1) : landing ? .10 : bazaar ? (showroom ? -.13 : .04) : moonlit ? .208 : .292;
        skyTex.needsUpdate = true;
      }
    }
    sky.material = blockchain && !skyTex ? (blockchainSky ||= createAuroraSky())
      : frostspire ? (frostspireSky ||= createAuroraSky(true)) : standardSky;
    standardSky.map = skyTex;
    standardSky.color.setHex(skyTex ? 0xffffff : skyline ? 0x242d54 : underworks ? 0x472840 : st.background);
    standardSky.needsUpdate = true;
    if (bazaar) {
      scene.fog.color.setHex(showroom ? 0x866977 : 0xb98780);
      hemi.color.setHex(showroom ? 0xd6bef1 : 0xffdfd7);
      hemi.groundColor.setHex(0xA17D78);
      hemi.intensity = showroom ? 1.38 : 1.42;
      sun.color.setHex(0xffca9d);
      sun.position.set(-22, 26, -14);
      sun.intensity = showroom ? 1.23 : 1.58;
      bounce.color.setHex(showroom ? 0x8d9bee : 0xc0a8ed);
      bounce.intensity = showroom ? .54 : .42;
    }
    if (landing) {
      scene.fog.color.setHex(0x6c5c80);
      hemi.color.setHex(0xe1c9f0);
      hemi.groundColor.setHex(0x77829a);
      hemi.intensity = 1.42;
      sun.color.setHex(0xffc4a5);
      sun.position.set(-26, 24, -15);
      sun.intensity = 1.27;
      bounce.color.setHex(0x8bbbe8);
      bounce.intensity = .54;
    }
    if (blockchain) {
      scene.fog.color.setHex(0x312445);
      hemi.color.setHex(0xe5dcff);
      hemi.groundColor.setHex(0x9d688d);
      hemi.intensity = 1.37;
      sun.color.setHex(0xd7e3ff);
      sun.position.set(-28, 32, -22);
      sun.intensity = 1.72;
      bounce.color.setHex(0x8f81e4);
      bounce.intensity = .42;
    }
    if (frostspire) {
      if (skyTex) {
        skyTex.wrapS = THREE.RepeatWrapping;
        skyTex.needsUpdate = true;
      }
      const azimuth = { S1: -.10, S2: -.26, S3: -.02, S4: -.08, S5: -.19 };
      frostspireSky.uniforms.panorama.value = skyTex;
      frostspireSky.uniforms.panoramaReady.value = skyTex ? 1 : 0;
      frostspireSky.uniforms.panoramaYaw.value = azimuth[sectionId] ?? azimuth.S1;
      scene.fog.color.setHex(0x465b7a);
      hemi.color.setHex(0xc5dbfa);
      hemi.groundColor.setHex(0x7791b0);
      hemi.intensity = 1.32;
      sun.color.setHex(0xc4deff);
      sun.position.set(-26, 34, -16);
      sun.intensity = 1.7;
      bounce.color.setHex(0x8fbaf8);
      bounce.intensity = .45;
    }
    if (skyline) {
      scene.fog.color.setHex(0x343b63);
      hemi.color.setHex(0xbfcfff);
      hemi.groundColor.setHex(0x797289);
      hemi.intensity = 1.42;
      sun.color.setHex(0xb2ccff);
      sun.position.set(16, 23, -18);
      sun.intensity = 1.58;
      bounce.color.setHex(0x9f82f8);
      bounce.intensity = .44;
    }
    if (underworks) {
      scene.fog.color.setHex(0x4a3046);
      hemi.color.setHex(0xd4b9f2);
      hemi.groundColor.setHex(0xb78386);
      hemi.intensity = 1.29;
      sun.color.setHex(0xe4cbf0);
      sun.position.set(-13, 24, -10);
      sun.intensity = 1.25;
      bounce.color.setHex(0xff8e4f);
      bounce.intensity = .86;
    }
    if (office) {
      scene.fog.color.setHex(roof ? 0x38446d : 0x293745);
      hemi.color.setHex(roof ? 0xb5c8f4 : 0xe4f0ff);
      hemi.groundColor.setHex(roof ? 0x606a84 : 0x9299a4);
      hemi.intensity = roof ? 1.16 : 1.47;
      sun.color.setHex(roof ? 0xbacafa : 0xd8edf9);
      sun.position.set(-17, 25, 14);
      sun.intensity = roof ? .94 : .86;
      bounce.color.setHex(roof ? 0x8e93f3 : 0x82d8ed);
      bounce.intensity = roof ? .55 : .44;
    }
    if (moonlit) {
      scene.fog.color.setHex(crypt ? 0x322c51 : 0x30456e);
      hemi.color.setHex(crypt ? 0xc2b2ed : 0xc1d8fc);
      hemi.groundColor.setHex(crypt ? 0x857aa4 : 0x7a86aa);
      hemi.intensity = crypt ? 1.26 : 1.20;
      sun.color.setHex(crypt ? 0xa69fe8 : 0xd7e7ff);
      sun.position.set(19, 26, -13);
      sun.intensity = crypt ? .58 : 1.46;
      bounce.color.setHex(crypt ? 0x9e70f5 : 0x6e9bec);
      bounce.intensity = crypt ? .55 : .44;
    }
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
  Object.assign(env, { sky, skylineRain, groundMat, ground, outerMat, outer, rimMat, rim, edgeRing, wall, decor, levelView, arenaBits, setStageMap, applyStage });
}
