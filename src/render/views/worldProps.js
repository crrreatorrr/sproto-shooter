// @ts-check
import * as THREE from 'three';
import { QUALITIES_BY_ID } from '../../data/guns.js';
import { createViewRegistry } from './ViewRegistry.js';

const lerp = (a, b, t) => a + (b - a) * t;

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

export function createWorldViews(ctx, mats, guns) {
  const { scene } = ctx;
  const { M, G } = mats;
  const allies = createViewRegistry(scene);
  const gunViews = createViewRegistry(scene);
  const hazards = createViewRegistry(scene);
  const boxViews = new Map();

  function boxView(b) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(G.box, M(0x4fd1c5, { roughness: 0.4 }));
    base.scale.set(1.6, 1.0, 1.2); base.position.y = 0.5;
    const lid = new THREE.Mesh(G.box, M(0xffd166)); lid.scale.set(1.7, 0.2, 1.3); lid.position.y = 1.1;
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

  function buildAlly() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(G.sphere, M(0x7fe3ff)); body.scale.set(0.35, 0.3, 0.35); body.position.y = 0.35;
    const hat = new THREE.Mesh(G.cone, M(0xff5ec4)); hat.scale.set(0.2, 0.3, 0.2); hat.position.y = 0.75;
    const ey = new THREE.Group();
    const w = new THREE.Mesh(G.sphere, mats.MAT.eyeWhite); w.scale.setScalar(0.1);
    const p = new THREE.Mesh(G.sphere, mats.MAT.black); p.scale.setScalar(0.05); p.position.z = 0.062;
    ey.add(w, p); ey.userData.pupil = p;
    ey.position.set(0, 0.45, 0.28);
    g.add(body, hat, ey);
    g.userData = { eyes: [ey] };
    return g;
  }

  function buildGunPickup(gun) {
    const g = new THREE.Group();
    const mesh = guns.buildGunMesh(gun);
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

  function buildHazard(h) {
    let obj;
    if (h.kind === 'shockwave') {
      obj = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xffa64d, transparent: true, opacity: 0.7, side: THREE.DoubleSide, toneMapped: false }));
    } else if (h.kind === 'telegraphLine') {
      obj = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
      const d = h.data.dir;
      obj.scale.set(h.data.width, h.data.len, 1);
      obj.position.set(h.pos.x + d.x * h.data.len / 2, 0.04, h.pos.z + d.z * h.data.len / 2);
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

  return {
    updateBoxes(state, frame) {
      const { now } = frame;
      for (const b of state.weaponBoxes) {
        let v = boxViews.get(b.id);
        if (!v) { v = boxView(b); boxViews.set(b.id, v); }
        v.userData.glow.material.opacity = b.glow ? 0.45 + Math.sin(now * 0.005) * 0.25 : 0.15;
        v.userData.lid.position.y = 1.1 + (b.craft ? Math.abs(Math.sin(now * 0.03)) * 0.3 : 0);
      }
    },
    updateRest(state, alpha, frame) {
      const { now, dt } = frame;
      const p = state.players[state.localPlayerId];
      for (const a of state.allies) {
        const v = allies.sync(a.id, () => ({ obj: buildAlly() }));
        v.obj.position.set(lerp(a.prevPos.x, a.pos.x, alpha), a.pos.y, lerp(a.prevPos.z, a.pos.z, alpha));
        v.obj.rotation.y = a.yaw + Math.PI;
      }
      allies.endFrame();
      for (const k of state.pickups) {
        if (k.kind !== 'gun') continue;
        const v = gunViews.sync(k.id, () => ({ obj: buildGunPickup(k.gun) }));
        v.obj.position.set(lerp(k.prevPos.x, k.pos.x, alpha), lerp(k.prevPos.y, k.pos.y, alpha) + Math.sin(now * 0.003 + k.id) * 0.1, lerp(k.prevPos.z, k.pos.z, alpha));
        v.obj.userData.mesh.rotation.y += dt * 1.5;
        v.obj.scale.setScalar(p.nearGunPickupId === k.id ? 1.15 : 1);
      }
      gunViews.endFrame();
      for (const h of state.hazards) {
        const v = hazards.sync(h.id, () => ({ obj: buildHazard(h) }));
        const o = v.obj;
        if (h.kind === 'shockwave') { o.scale.set(h.radius, h.height * 2, h.radius); o.position.y = h.height / 2; o.material.opacity = 0.75 * (1 - h.radius / h.maxRadius) + 0.15; }
        else if (h.kind === 'telegraphLine') o.material.opacity = 0.2 + 0.3 * Math.abs(Math.sin(now * 0.02));
        else if (h.kind === 'meteorMarker') { const k = h.t / h.data.delay; o.userData.rock.position.y = 30 * (1 - k); o.userData.rock.rotation.x += dt * 5; o.userData.ring.material.opacity = 0.4 + 0.5 * Math.abs(Math.sin(now * 0.03)); }
        else if (h.kind === 'spawnPortal') { o.scale.setScalar(h.radius * (0.5 + h.t / h.ttl)); o.rotation.z += dt * 6; o.material.opacity = 1 - h.t / h.ttl; }
        else { o.scale.setScalar(h.radius * (0.4 + 0.6 * (h.t / h.ttl))); o.material.opacity = 0.7 * (1 - h.t / h.ttl); }
      }
      hazards.endFrame();
    },
  };
}
