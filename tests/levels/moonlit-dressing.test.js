import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { L09 } from '../../src/data/levels/campaign.js';
import { KIT } from '../../src/render/level/kitModels.js';
import { moonlitPlacements } from '../../src/render/level/moonlitDressing.js';
import { kitCeilingSurface, panoramaPath, surfaceArtPath, surfaceArtTheme } from '../../src/render/level/campaignSurfaceArt.js';

const root = new URL('../../public/assets/', import.meta.url);
const models = new Map();
function gltfFor(model) {
  if (!models.has(model)) {
    const glb = gunzipSync(readFileSync(new URL(KIT.prop(model), root)));
    models.set(model, JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString()));
  }
  return models.get(model);
}
function triangleCount(model) {
  const gltf = gltfFor(model);
  return gltf.meshes.flatMap(m => m.primitives)
    .reduce((sum, p) => sum + gltf.accessors[p.indices ?? p.attributes.POSITION].count / 3, 0);
}
function dressing(sec) {
  return moonlitPlacements(sec, new Map(sec.geometry.map(g => [g.id, g])));
}

it.each(L09.sections)('fits the $name and stays under 50,000 art triangles', (sec) => {
  const props = dressing(sec);
  for (const side of ['N', 'S']) {
    const id = `${sec.id}-wall${side}`;
    const wall = sec.geometry.find(g => g.id === id);
    const bays = props.filter(p => p.replace?.includes(id));
    const [width, , depth] = wall.size;
    let edge = wall.at[0] - width / 2;
    for (const bay of bays) {
      expect(bay.at[0] - bay.scale[0]).toBeCloseTo(edge);
      expect(bay.at.slice(1)).toEqual([0, wall.at[2]]);
      expect(bay.scale[2]).toBe(depth / 2);
      edge = bay.at[0] + bay.scale[0];
    }
    expect(edge).toBeCloseTo(wall.at[0] + width / 2);
  }
  const portalCount = sec.mechanisms.filter(m => m.kind === 'portal').length;
  const triangles = props.reduce((sum, p) => sum + triangleCount(p.model), 0)
    + portalCount * triangleCount('moonlit_portal_light');
  expect(triangles).toBeGreaterThan(20_000);
  expect(triangles).toBeLessThanOrEqual(50_000);
  expect(props.some(p => p.model === 'moonlit_vault')).toBe(sec.id === 'S2');
});

it('centres the ruin portal on the existing teleport and puts the grand gate beyond the combat floor', () => {
  const [plains, , arena] = L09.sections;
  const portal = plains.mechanisms.find(m => m.kind === 'portal');
  const frame = dressing(plains).find(p => p.model === 'moonlit_portal_frame');
  expect(frame.at).toEqual([portal.at[0], 0, portal.at[2]]);
  expect(frame.yaw).toBe(-90);
  const gate = dressing(arena).find(p => p.model === 'moonlit_gate');
  const floor = arena.geometry.find(g => g.id === 'S3-floor');
  expect(gate.at[0]).toBeGreaterThan(floor.at[0] + floor.size[0] / 2);
});

it.each([
  ['moonlit_portal_light', 'moonlit_portal_light', 'rotation'],
  ['moonlit_gate', 'moonlit_gate_orbit', 'rotation'],
  ['moonlit_gate', 'moonlit_gate_core', 'translation'],
])('exports an authored animation on %s', (model, node, path) => {
  const gltf = gltfFor(model);
  const channels = gltf.animations.flatMap(clip => clip.channels);
  expect(channels.some(({ target }) => gltf.nodes[target.node].name === node && target.path === path)).toBe(true);
});

it('isolates the Moonlit atlas and keeps the panorama outside the Catacombs', () => {
  expect(surfaceArtPath('L09')).not.toBe(surfaceArtPath('L08'));
  expect(surfaceArtTheme('L09').layout.toArray()).toEqual([336, 336, 2]);
  expect(panoramaPath('L09', 'S1')).toBe(panoramaPath('L09', 'S3'));
  expect(panoramaPath('L09', 'S1')).toBeTruthy();
  expect(panoramaPath('L09', 'S2')).toBeUndefined();
  expect(panoramaPath('L08', 'S4')).toBeTruthy();
  expect(panoramaPath('L08', 'S1')).toBeUndefined();
  expect(kitCeilingSurface('moonlit_vault')).toBe(1);
  expect(kitCeilingSurface('moonlit_ruin_arch')).toBe(0);
});
