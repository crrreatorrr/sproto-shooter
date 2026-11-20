import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/data/tuning.js';

// The universal melee swing (art/blender/scripts/build_melee_swing.py): one keyed node the viewmodel
// adds to whatever gun is held, so every gun type shares it.
function readGlb(path) {
  const b = fs.readFileSync(path);
  expect(b.toString('ascii', 0, 4)).toBe('glTF');
  const len = b.readUInt32LE(12);
  return JSON.parse(b.toString('utf8', 20, 20 + len));
}

describe('melee swing clip', () => {
  const gltf = readGlb('public/assets/models/gear/melee_swing.glb');
  const anim = gltf.animations.find((a) => a.name === 'Melee swing');

  it('is one node with one translation + rotation clip', () => {
    expect(gltf.nodes.map((n) => n.name)).toEqual(['Melee']);
    expect(gltf.meshes || []).toEqual([]);
    expect(anim.channels.map((c) => c.target.path).sort()).toEqual(['rotation', 'translation']);
  });

  it('starts and ends at rest and finishes inside the melee cooldown', () => {
    const times = gltf.accessors[anim.samplers[0].input];
    expect(times.min[0]).toBe(0);
    expect(times.max[0]).toBeGreaterThan(0.3);
    expect(times.max[0]).toBeLessThan(TUNING.melee.cooldown);
  });

  it('is wired into the viewmodel for every gun, not per type', () => {
    const vm = fs.readFileSync('src/render/viewmodel/Viewmodel.js', 'utf8');
    const frame = fs.readFileSync('src/render/frame/firstPersonView.js', 'utf8');
    expect(vm).toContain("'models/gear/melee_swing.glb'");
    expect(vm).toMatch(/bus\.on\('melee'/);
    expect(frame).toMatch(/meleeOffset\(/);
    expect(frame).not.toMatch(/meleeOffset\([^)]*type/);
  });
});
