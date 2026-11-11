import * as THREE from 'three';
import { KIT, kitGeometry, kitMaterial } from '../level/kitModels.js';

export function mountWorld(env) {
  const { E, G, M, scene } = env;
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
      // A cartoon bomb falls on the marker. The rock stands in until the model has loaded.
      const bomb = kitGeometry(KIT.bomb);
      const rock = bomb
        ? new THREE.Mesh(bomb.geometry, kitMaterial())
        : new THREE.Mesh(new THREE.DodecahedronGeometry(1.4), M(0x5a3b2a, { emissive: 0xff4400, emissiveIntensity: 0.6 }));
      if (bomb) { rock.scale.setScalar(1.3); rock.userData.kit = true; }
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
  Object.assign(env, { boxViews, boxView, makeLabel, buildHazard });
}
