import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { L08 } from '../../src/data/levels/campaign.js';
import { KIT } from '../../src/render/level/kitModels.js';
import { officePlacements } from '../../src/render/level/officeDressing.js';
import { kitCeilingSurface, panoramaPath, surfaceArtPath, surfaceArtTheme } from '../../src/render/level/campaignSurfaceArt.js';

const assets = new URL('../../public/assets/', import.meta.url);
const models = new Map();
function gltfFor(model) {
  if (!models.has(model)) {
    const glb = gunzipSync(readFileSync(new URL(KIT.prop(model), assets)));
    models.set(model, JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()));
  }
  return models.get(model);
}
function triangles(model) {
  const gltf = gltfFor(model);
  return gltf.meshes.flatMap(m => m.primitives)
    .reduce((sum, p) => sum + gltf.accessors[p.indices ?? p.attributes.POSITION].count / 3, 0);
}

it.each(L08.sections)('fits $name within the section and art budget', (section) => {
  const prims = new Map(section.geometry.map(g => [g.id, g]));
  const props = officePlacements(section, prims);
  for (const side of ['N', 'S']) {
    const wall = prims.get(`${section.id}-wall${side}`);
    const [width, height, depth] = wall.size;
    const bays = props.filter(p => p.replace?.includes(wall.id));
    expect(bays).toHaveLength(8);
    let edge = wall.at[0] - width / 2;
    for (const bay of bays) {
      expect(bay.at[0] - bay.scale[0]).toBeCloseTo(edge);
      expect(bay.at.slice(1)).toEqual([0, wall.at[2]]);
      expect(bay.scale.slice(1)).toEqual([section.id === 'S4' ? 2.12 : height, depth / 2]);
      edge = bay.at[0] + bay.scale[0];
    }
    expect(edge).toBeCloseTo(wall.at[0] + width / 2);
  }
  const roof = section.id === 'S4';
  expect(props.some(p => p.model === 'office_soffit')).toBe(!roof);
  expect(props.some(p => p.model === 'office_tower')).toBe(roof);
  const laserCount = section.mechanisms.filter(m => m.kind === 'laser').length;
  const total = props.reduce((sum, p) => sum + triangles(p.model), 0) + laserCount * triangles('office_laser');
  expect(total).toBeGreaterThan(10_000);
  expect(total).toBeLessThanOrEqual(50_000);
});

it.each([
  ['office_clock', 'office_clock_hands', 'rotation'],
  ['office_fan', 'office_fan_rotor', 'rotation'],
  ['office_dish', 'office_dish_mount', 'rotation'],
  ['office_laser', 'office_laser_scan', 'translation'],
])('exports an animation for %s', (model, node, path) => {
  const gltf = gltfFor(model);
  const targets = gltf.animations.flatMap(clip => clip.channels.map(channel => channel.target));
  expect(targets.some(target => gltf.nodes[target.node].name === node && target.path === path)).toBe(true);
});

it('uses a dedicated atlas and skyline with ceiling treatment on interior modules', () => {
  expect(surfaceArtPath('L08')).not.toBe(surfaceArtPath('L07'));
  expect(panoramaPath('L08')).not.toBe(panoramaPath('L06'));
  expect(surfaceArtTheme('L08').layout.toArray()).toEqual([336, 336, 2]);
  expect(kitCeilingSurface('office_soffit')).toBe(1);
  expect(kitCeilingSurface('office_portal')).toBe(1);
  expect(kitCeilingSurface('office_parapet')).toBe(0);
});
