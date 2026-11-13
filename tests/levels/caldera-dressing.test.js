import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { L10 } from '../../src/data/levels/campaign.js';
import { calderaPlacements } from '../../src/render/level/calderaDressing.js';
import { kitCeilingSurface, panoramaPath, surfaceArtPath, surfaceArtTheme } from '../../src/render/level/campaignSurfaceArt.js';
import { KIT } from '../../src/render/level/kitModels.js';

const assets = new URL('../../public/assets/', import.meta.url);
const models = new Map();
function gltf(model) {
  if (!models.has(model)) {
    const bytes = gunzipSync(readFileSync(new URL(KIT.prop(model), assets)));
    models.set(model, JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12))));
  }
  return models.get(model);
}
function triangleCount(model) {
  const data = gltf(model);
  return data.meshes.flatMap(m => m.primitives)
    .reduce((total, p) => total + data.accessors[p.indices ?? p.attributes.POSITION].count / 3, 0);
}
function dressing(section) {
  return calderaPlacements(section, new Map(section.geometry.map(g => [g.id, g])));
}

it.each(L10.sections)('tiles the walls of $name and stays within the art budget', (section) => {
  const props = dressing(section);
  for (const side of ['N', 'S']) {
    const id = `${section.id}-wall${side}`;
    const wall = section.geometry.find(g => g.id === id);
    const [width, height, depth] = wall.size;
    let edge = wall.at[0] - width / 2;
    for (const tile of props.filter(p => p.replace?.includes(id))) {
      expect(tile.at[0] - tile.scale[0]).toBeCloseTo(edge);
      expect(tile.at.slice(1)).toEqual([0, wall.at[2]]);
      expect(tile.scale.slice(1)).toEqual([height, depth / 2]);
      edge = tile.at[0] + tile.scale[0];
    }
    expect(edge).toBeCloseTo(wall.at[0] + width / 2);
  }
  const pads = section.mechanisms.filter(m => m.kind === 'jumpPad').length;
  const tanks = section.mechanisms.filter(m => m.kind === 'fuel').length;
  const tris = props.reduce((total, p) => total + triangleCount(p.model), 0)
    + pads * triangleCount('caldera_vent') + tanks * triangleCount('caldera_fuel');
  expect(tris).toBeLessThanOrEqual(50_000);
  expect(props.some(p => p.model === 'caldera_overhang')).toBe(section.id === 'S1');
});

it('matches the rope deck and lava visual to the authored mechanisms', () => {
  const [ridge, fields, arena] = L10.sections;
  const bridge = ridge.mechanisms.find(m => m.kind === 'bridge');
  const deck = dressing(ridge).find(p => p.model === 'caldera_bridge');
  expect(deck.at).toEqual([(bridge.from[0] + bridge.to[0]) / 2, .001, bridge.from[2]]);
  expect(deck.scale[2] * 2).toBe(bridge.width);
  const hazard = fields.mechanisms.find(m => m.kind === 'hazard');
  const magma = dressing(fields).find(p => p.model === 'underworks_magma' && p.at[1] > 0);
  expect(magma.at).toEqual([(hazard.min[0] + hazard.max[0]) / 2, .008, (hazard.min[2] + hazard.max[2]) / 2]);
  expect(magma.scale).toEqual([(hazard.max[0] - hazard.min[0]) / 2, 1, (hazard.max[2] - hazard.min[2]) / 2]);
  const shrine = dressing(arena).find(p => p.model === 'caldera_shrine');
  const pos = gltf(shrine.model).meshes[0].primitives[0].attributes.POSITION;
  const front = gltf(shrine.model).accessors[pos].max[2] * shrine.scale[2];
  expect(shrine.yaw).toBe(-90);
  expect(shrine.at[0] - front).toBeGreaterThan(arena.exit.max[0]);
});

it.each([
  ['caldera_shrine', 'caldera_shrine_core', 'translation'],
  ['caldera_shrine', 'caldera_shrine_orbit', 'rotation'],
  ['caldera_brazier', 'caldera_brazier_flame', 'scale'],
  ['caldera_vent', 'caldera_vent_plume', 'rotation'],
])('preserves the Blender animation in %s', (model, node, path) => {
  const data = gltf(model);
  const channels = data.animations.flatMap(clip => clip.channels);
  expect(channels.some(({ target }) => data.nodes[target.node].name === node && target.path === path)).toBe(true);
});

it('uses a separate Caldera atlas and paints the overhang underside', () => {
  expect(surfaceArtPath('L10')).not.toBe(surfaceArtPath('L07'));
  expect(surfaceArtTheme('L10').layout.toArray()).toEqual([336, 336, 2]);
  expect(panoramaPath('L10', 'S4')).toBe(panoramaPath('L10', 'S1'));
  expect(panoramaPath('L10', 'S4')).not.toBe(panoramaPath('L07', 'S4'));
  expect(kitCeilingSurface('caldera_overhang')).toBe(1);
  expect(kitCeilingSurface('caldera_wall')).toBe(0);
});
