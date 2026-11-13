import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { L07 } from '../../src/data/levels/campaign.js';
import { KIT } from '../../src/render/level/kitModels.js';
import { underworksPlacements } from '../../src/render/level/underworksDressing.js';
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
  return underworksPlacements(sec, new Map(sec.geometry.map(g => [g.id, g])));
}

it.each(L07.sections)('keeps $name walls aligned and under 50,000 art triangles', (sec) => {
  const props = dressing(sec);
  for (const side of ['N', 'S']) {
    const id = `${sec.id}-wall${side}`;
    const wall = sec.geometry.find(g => g.id === id);
    const spans = props.filter(p => p.replace?.includes(id));
    const [width, height, depth] = wall.size;
    let edge = wall.at[0] - width / 2;
    for (const prop of spans) {
      expect(prop.at[0] - prop.scale[0]).toBeCloseTo(edge);
      expect(prop.at.slice(1)).toEqual([0, wall.at[2]]);
      expect(prop.scale.slice(1)).toEqual([height, depth / 2]);
      edge = prop.at[0] + prop.scale[0];
    }
    expect(edge).toBeCloseTo(wall.at[0] + width / 2);
  }
  const count = props.reduce((sum, p) => sum + triangleCount(p.model), 0);
  expect(count).toBeGreaterThan(20_000);
  expect(count).toBeLessThanOrEqual(50_000);
});

it('fits the glowing lava hazard and inset rails to their authored bounds', () => {
  const [, cartRun, gallery] = L07.sections;
  const rail = cartRun.mechanisms.find(m => m.kind === 'rail');
  const track = dressing(cartRun).filter(p => p.model === 'underworks_track');
  expect(track[0].at[0] - 2 * track[0].scale[0]).toBeCloseTo(rail.from[0]);
  expect(track.at(-1).at[0] + 2 * track.at(-1).scale[0]).toBeCloseTo(rail.to[0]);
  expect(track.every(p => p.at[2] === rail.from[2] && p.replace.includes(`marker:${rail.id}`))).toBe(true);

  const hazard = gallery.mechanisms.find(m => m.kind === 'hazard');
  const lava = dressing(gallery).find(p => p.model === 'underworks_magma' && p.at[1] > 0);
  expect([lava.at[0] - lava.scale[0], lava.at[2] - lava.scale[2]]).toEqual([hazard.min[0], hazard.min[2]]);
  expect([lava.at[0] + lava.scale[0], lava.at[2] + lava.scale[2]]).toEqual([hazard.max[0], hazard.max[2]]);

  const crusher = gallery.mechanisms.find(m => m.kind === 'crusher');
  const press = dressing(gallery).find(p => p.model === 'underworks_press');
  expect(press.replace).toEqual([`marker:${crusher.id}`]);
  expect(press.at[0]).toBe(crusher.at[0]);
  expect(press.at[2] + 3.77 / 2).toBeLessThan(0);
});

it.each([
  ['underworks_furnace', 'underworks_firebed', 'scale'],
  ['underworks_press', 'underworks_press_plate', 'translation'],
  ['underworks_reactor', 'underworks_reactor_rotor', 'rotation'],
])('exports the authored animation for %s', (model, node, path) => {
  const gltf = gltfFor(model);
  const channels = gltf.animations.flatMap(clip => clip.channels);
  expect(channels.some(({ target }) => gltf.nodes[target.node].name === node && target.path === path)).toBe(true);
});

it('selects the Underworks art without reusing the Skyline atlas or panorama', () => {
  expect(surfaceArtPath('L07')).not.toBe(surfaceArtPath('L06'));
  expect(panoramaPath('L07')).not.toBe(panoramaPath('L06'));
  expect(surfaceArtTheme('L07').layout.toArray()).toEqual([336, 336, 2]);
  expect(kitCeilingSurface('underworks_roof')).toBe(1);
  expect(kitCeilingSurface('underworks_tunnel')).toBe(1);
  expect(kitCeilingSurface('underworks_gantry')).toBe(0);
});
