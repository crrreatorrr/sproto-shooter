import * as THREE from 'three';
import { MANUFACTURERS_BY_ID, QUALITIES_BY_ID } from '../../data/guns.js';
import { instantiateGun } from '../assets.js';

// Gun with a 3D model (e.g. the toy machine gun): model + element gem. Null if the type has none / not loaded yet.
export const GUN_MODEL_LEN = { mg: 0.7, shotgun: 0.75, sniper: 0.8, bazooka: 0.9, raygun: 0.62, bigbullets: 0.78, duckgun: 0.8 };
// Where the hands hold each model: anchors inside the part each hand grabs, as fractions of the model's size
// [x (+ = right), y (from the center, + = up), z (+ = back)]. The first-person rig slides each palm out of the
// gun from its anchor until it rests on the surface, so anchors sit inside the grip / handguard, not on it.
// Hand frames: `rake` tilts the right hand's fingers down around a raked pistol grip (`thumb` < 0 wraps the
// thumb over the grip instead of laying it along the right side); `left` picks how the
// support hand holds: 'cup' (palm up under a handguard) or 'foregrip' (wrapped around a vertical grip or the
// side of the handguard, thumb up). Calibrated with dev/fpLab.js (no hand, arm or finger more than 1 cm inside
// the gun at hip or aim).
export const HAND_FRAC = {
  mg: { grip: [0, -0.26, 0.23], fore: [0, 0.02, -0.25], left: 'cup', rake: -0.6 },
  shotgun: { grip: [0, -0.29, 0.373], fore: [0, -0.041, -0.373], left: 'cup', rake: -0.6 },
  // sniper: the pistol grip spans y -0.49..-0.09 of the model; the hand sits at its middle, under the trigger guard
  sniper: { grip: [0, -0.27, 0.145], fore: [0.108, 0.067, -0.175], left: 'foregrip', rake: -0.35 },
  bazooka: { grip: [0, -0.415, 0.208], fore: [0, -0.32, -0.042], left: 'foregrip', rake: -0.35 },
  // boss pistols: right hand wrapped round the grip's middle, left hand cupped under the front of the body
  raygun: { grip: [0, -0.298, 0.31], fore: [-0.113, -0.059, -0.13], left: 'cup', rake: -1.2 },
  bigbullets: { grip: [0, -0.401, 0.405], fore: [-0.09, -0.294, -0.206], left: 'cup', rake: -1.2, thumb: -0.3 },
  duckgun: { grip: [0, -0.4, 0.219], fore: [0, -0.258, -0.125], left: 'cup', rake: -0.6 },
};

export function mountGuns(env) {
  const { E, ELEM_COL, G, M } = env;
  const LEFT_SPEC = {
    cup: { fingers: [1, 0.25, 0.15], thumb: [0, 0.2, -1] },
    foregrip: { fingers: [0, -0.25, -1], thumb: [0.15, 1, 0.1] },
  };
  function buildGunModel(gun, length) {
    const inst = instantiateGun(gun.type, length);
    if (!inst) return null;
    const g = new THREE.Group();
    g.add(inst.root);
    if (gun.element !== 'none') {
      const gemMat = E(ELEM_COL[gun.element]);
      gemMat.userData.owned = true;
      const gem = new THREE.Mesh(G.sphereLo, gemMat);
      gem.scale.setScalar(length * 0.035); gem.position.set(inst.size.x / 2 + length * 0.01, 0, 0); gem.userData.noCollide = true; g.add(gem);
    }
    g.userData.muzzle = inst.muzzle;
    g.userData.model = true;
    g.userData.size = inst.size;
    g.userData.colliderKey = `model:${gun.type}:${length}`; // same model + length → same hand collider
    // first-person hand anchors and frames: right hand on the grip under the back half, left hand forward
    const hf = HAND_FRAC[gun.type] || HAND_FRAC.mg, sz = inst.size;
    g.userData.grip = [hf.grip[0] * sz.x, hf.grip[1] * sz.y, hf.grip[2] * sz.z];
    g.userData.fore = [hf.fore[0] * sz.x, hf.fore[1] * sz.y, hf.fore[2] * sz.z];
    g.userData.rightSpec = { fingers: [0, hf.rake, -1], thumb: [hf.thumb ?? 0.3, 1, -0.2] }; // thumb along the right side (or wrapped, < 0)
    g.userData.leftSpec = LEFT_SPEC[hf.left] || LEFT_SPEC.cup;
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
    const dims = { mg: [0.12, 0.14, 0.6], shotgun: [0.14, 0.14, 0.55], sniper: [0.09, 0.11, 0.85], bazooka: [0.2, 0.2, 0.9], raygun: [0.12, 0.16, 0.55], bigbullets: [0.16, 0.18, 0.7], duckgun: [0.16, 0.18, 0.7] }[gun.type] || [0.12, 0.14, 0.6];
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
  Object.assign(env, { GUN_MODEL_LEN, HAND_FRAC, LEFT_SPEC, buildGunModel, buildGunMesh, buildGunPickup });
}
