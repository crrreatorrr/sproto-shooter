// Campaign geometry for the current section. Arena meshes stay hidden while mode is campaign.
import * as THREE from 'three';
import { getLevelRuntime } from '../../sim/level/runtime.js';

const COLOR = {
  stone: 0x6e675f, sand: 0xc6a56e, dirt: 0x6d4b2c, hedge: 0x3f7a34, metal: 0x5c6772,
  ice: 0xd5e4ef, rock: 0x4e3c34, crate: 0x8d5e34, pillar: 0x9a9188, trim: 0xff5ec4,
};

export function createLevelView() {
  const group = new THREE.Group();
  group.name = 'campaign-level';
  const mats = new Map();
  let key = '';
  function mat(name) {
    if (!mats.has(name)) mats.set(name, new THREE.MeshStandardMaterial({ color: COLOR[name] || COLOR.stone, roughness: 0.86, metalness: name === 'metal' ? 0.35 : 0.02 }));
    return mats.get(name);
  }
  function rebuild(state) {
    const lv = state.level;
    const next = lv ? `${lv.id}:${lv.section}` : '';
    if (next === key) return;
    key = next;
    for (let i = group.children.length - 1; i >= 0; i--) {
      const c = group.children[i];
      c.geometry && c.geometry.dispose();
      group.remove(c);
    }
    if (!lv) return;
    const rt = getLevelRuntime(lv.id);
    const sec = rt.sectionById[lv.section];
    if (!sec) return;
    for (const g of sec.geometry || []) addSolid(g);
    for (const m of sec.mechanisms || []) addMarker(m);
    for (const w of sec.weapons || []) addMarker({ ...w, kind: 'rack' });
  }
  function addSolid(g) {
    if (g.kind === 'box' || g.kind === 'ramp') {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(g.size[0], g.size[1], g.size[2]), mat(g.mat));
      mesh.position.set(g.at[0], g.at[1], g.at[2]);
      if (g.yaw) mesh.rotation.y = g.yaw * Math.PI / 180;
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
    } else if (g.kind === 'cylinder') {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(g.r, g.r, g.h, 10), mat(g.mat));
      mesh.position.set(g.at[0], g.at[1] + g.h / 2, g.at[2]);
      group.add(mesh);
    }
  }
  function addMarker(m) {
    const at = m.at || m.from;
    if (!at) return;
    const color = m.kind === 'secret' ? 0xffd166 : m.kind === 'rack' ? 0x7fd34e : m.kind === 'hazard' ? 0xff5a1a : COLOR.trim;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4 }));
    mesh.position.set(at[0], at[1] || 0.6, at[2]);
    group.add(mesh);
  }
  return { group, sync: rebuild };
}
