// @ts-check
import * as THREE from 'three';
import { worldHitboxes } from '../../sim/collision.js';

export function createHitboxes(ctx, mats) {
  const { scene } = ctx;
  const { G } = mats;
  let show = false;
  const group = new THREE.Group();
  scene.add(group);
  const hbMats = {
    body: new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }),
    weak: new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true }),
    shield: new THREE.MeshBasicMaterial({ color: 0x00aaff, wireframe: true }),
  };
  const scratch = [];
  return {
    setShow(v) { show = v; },
    update(state) {
      group.clear();
      if (!show) return;
      for (const e of state.enemies) {
        if (e.dead) continue;
        worldHitboxes(e, scratch);
        for (const hb of scratch) {
          const m = new THREE.Mesh(hb.type === 'sphere' ? G.sphereLo : G.cyl, hbMats[hb.zone]);
          if (hb.type === 'sphere') { m.position.set(hb.x, hb.y, hb.z); m.scale.setScalar(hb.r); }
          else { m.position.set(hb.x, (hb.y0 + hb.y1) / 2, hb.z); m.scale.set(hb.r, hb.y1 - hb.y0, hb.r); }
          group.add(m);
        }
      }
    },
  };
}
