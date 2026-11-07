// @ts-check
import * as THREE from 'three';
import { RESOURCES } from '../../data/drops.js';

const lerp = (a, b, t) => a + (b - a) * t;
const RES_COL = Object.fromEntries(RESOURCES.map((r) => [r.id, new THREE.Color(r.color)]));
const AMMO_COL = { bullets: new THREE.Color(0xffd166), shells: new THREE.Color(0xff6a3d), sniper: new THREE.Color(0x4fe3ff), rockets: new THREE.Color(0xb07cff) };
const PK_COL = { health: new THREE.Color(0xff4d6d), bigHealth: new THREE.Color(0xff2255), mana: new THREE.Color(0x6aa8ff), tickets: new THREE.Color(0xffd700) };

export function createPickupBatches(ctx, mats) {
  const { scene } = ctx;
  const { G } = mats;
  const PK = {};
  const dummy = new THREE.Object3D();
  for (const k of ['health', 'bigHealth', 'mana', 'ammo', 'resource', 'tickets']) {
    const geo = k === 'ammo' || k === 'resource' ? G.box : k === 'tickets' ? G.cyl : G.sphereLo;
    const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), 256);
    im.frustumCulled = false; im.count = 0;
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(256 * 3), 3);
    scene.add(im);
    PK[k] = { im, n: 0 };
  }
  return {
    update(state, alpha, frame) {
      const { now } = frame;
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
      for (const k in PK) {
        const I = PK[k];
        I.im.count = I.n;
        I.im.instanceMatrix.needsUpdate = true;
        if (I.im.instanceColor) I.im.instanceColor.needsUpdate = true;
      }
    },
  };
}
