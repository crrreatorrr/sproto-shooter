// @ts-check
import * as THREE from 'three';

const lerp = (a, b, t) => a + (b - a) * t;
const PROJ_KINDS = {
  orb: { color: 0xc77dff, scale: 0.35, cap: 500 }, taxBolt: { color: 0xff3bd4, scale: 0.4, cap: 32 },
  spit: { color: 0x9be33b, scale: 0.3, cap: 64 }, gooBolt: { color: 0x7fff4a, scale: 0.28, cap: 64 },
  rocket: { color: 0xff6a3d, scale: 0.22, cap: 32 }, duckBullet: { color: 0xffe14a, scale: 0.2, cap: 128 },
  megaBullet: { color: 0xffffff, scale: 0.6, cap: 16 }, yeetGun: { color: 0xaaaaaa, scale: 0.35, cap: 16 },
  bullet: { color: 0xffc93c, scale: 0.22, cap: 600 },
  pellet: { color: 0xff5ec4, scale: 0.12, cap: 300 },
};

export function createProjectileBatches(ctx, mats) {
  const { scene } = ctx;
  const { E, G } = mats;
  const inst = {};
  const dummy = new THREE.Object3D();
  for (const [k, d] of Object.entries(PROJ_KINDS)) {
    const im = new THREE.InstancedMesh(k === 'yeetGun' ? G.box : G.sphereLo, E(d.color), d.cap);
    im.frustumCulled = false; im.count = 0;
    scene.add(im);
    inst[k] = { im, n: 0, d };
  }
  return {
    update(state, alpha, frame) {
      const { now } = frame;
      for (const k in inst) inst[k].n = 0;
      for (const pr of state.projectiles) {
        const I = inst[pr.kind]; if (!I || I.n >= I.d.cap) continue;
        dummy.position.set(lerp(pr.prevPos.x, pr.pos.x, alpha), lerp(pr.prevPos.y, pr.pos.y, alpha), lerp(pr.prevPos.z, pr.pos.z, alpha));
        const s = I.d.scale * (pr.kind === 'orb' || pr.kind === 'taxBolt' ? 1 + Math.sin(now * 0.02 + pr.id) * 0.15 : 1);
        if (pr.kind === 'rocket') { dummy.scale.set(s, s, s * 3); dummy.lookAt(dummy.position.x + pr.vel.x, dummy.position.y + pr.vel.y, dummy.position.z + pr.vel.z); }
        else if (pr.kind === 'bullet' || pr.kind === 'pellet') { dummy.scale.set(s, s, s * 2.2); dummy.lookAt(dummy.position.x + pr.vel.x, dummy.position.y + pr.vel.y, dummy.position.z + pr.vel.z); }
        else if (pr.kind === 'yeetGun') { dummy.scale.set(0.15, 0.2, 0.8); dummy.rotation.set(now * 0.02, now * 0.015, 0); }
        else { dummy.scale.setScalar(s); dummy.rotation.set(0, 0, 0); }
        dummy.updateMatrix();
        I.im.setMatrixAt(I.n++, dummy.matrix);
      }
      for (const k in inst) { inst[k].im.count = inst[k].n; inst[k].im.instanceMatrix.needsUpdate = true; }
    },
  };
}
