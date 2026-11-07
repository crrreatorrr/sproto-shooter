// @ts-check
import * as THREE from 'three';
import { QUALITIES_BY_ID, MANUFACTURERS_BY_ID } from '../../data/guns.js';
import { ELEM_COL } from '../materials/geometries.js';

/** Shared by world pickups and the viewmodel. `forView` keeps the gun at unit scale. */
export function createGunFactory(mats) {
  const { M, E, G } = mats;
  function buildGunMesh(gun, forView = false) {
    const g = new THREE.Group();
    const man = MANUFACTURERS_BY_ID[gun.manufacturer];
    const q = QUALITIES_BY_ID[gun.quality];
    const bodyMat = M(man.color, { roughness: 0.4, metalness: 0.3 });
    const accent = M(new THREE.Color(q.color), { emissive: new THREE.Color(q.color), emissiveIntensity: 0.35 });
    const elCol = ELEM_COL[gun.element];
    const dims = { mg: [0.12, 0.14, 0.6], shotgun: [0.14, 0.14, 0.55], sniper: [0.09, 0.11, 0.85], bazooka: [0.2, 0.2, 0.9] }[gun.type];
    const body = new THREE.Mesh(G.box, bodyMat); body.scale.set(dims[0], dims[1], dims[2]);
    g.add(body);
    if (gun.type === 'bazooka') {
      const tube = new THREE.Mesh(G.cyl, bodyMat); tube.scale.set(0.13, 0.95, 0.13); tube.rotation.x = Math.PI / 2;
      g.add(tube);
    } else {
      const barrelLen = gun.parts.barrel === 'long' ? 0.45 : gun.parts.barrel === 'short' ? 0.18 : 0.3;
      const barrel = new THREE.Mesh(G.cyl, M(0x333333, { metalness: 0.7 }));
      barrel.scale.set(gun.type === 'shotgun' ? 0.05 : 0.03, barrelLen, gun.type === 'shotgun' ? 0.05 : 0.03);
      barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -dims[2] / 2 - barrelLen / 2);
      g.add(barrel);
      if (gun.type === 'shotgun') { const b2 = barrel.clone(); barrel.position.x = -0.03; b2.position.x = 0.03; g.add(b2); }
    }
    const grip = new THREE.Mesh(G.box, M(0x3a2a1a)); grip.scale.set(0.07, 0.18, 0.08); grip.position.set(0, -0.14, 0.12); grip.rotation.x = 0.3;
    const mag = new THREE.Mesh(G.box, accent);
    mag.scale.set(0.06, gun.parts.mag === 'drum' ? 0.16 : 0.2, gun.parts.mag === 'drum' ? 0.16 : 0.08);
    mag.position.set(0, -0.15, -0.08);
    g.add(grip, mag);
    if (gun.parts.scope !== 'stock' || gun.type === 'sniper') {
      const sc = new THREE.Mesh(G.cyl, M(0x222222));
      sc.scale.set(0.035, gun.type === 'sniper' || gun.parts.scope === 'longScope' ? 0.3 : 0.12, 0.035);
      sc.rotation.x = Math.PI / 2; sc.position.set(0, 0.11, 0); g.add(sc);
    }
    const stripe = new THREE.Mesh(G.box, accent); stripe.scale.set(dims[0] * 1.05, 0.025, dims[2] * 0.6); stripe.position.y = dims[1] / 2;
    g.add(stripe);
    if (gun.element !== 'none') {
      const gem = new THREE.Mesh(G.sphereLo, E(elCol)); gem.scale.setScalar(0.04); gem.position.set(dims[0] / 2 + 0.01, 0, 0); g.add(gem);
    }
    if (gun.wacky === 'rubberDuck') {
      const duck = new THREE.Mesh(G.sphereLo, M(0xffe14a)); duck.scale.setScalar(0.07); duck.position.set(0, 0.12, 0.15); g.add(duck);
    }
    if (!forView) g.scale.setScalar(1.6);
    return g;
  }
  return { buildGunMesh };
}
