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

const originalKitTriangles = { S1: 39088, S2: 38412, S3: 35012, S4: 35740 };
const expandedWidths = { S1: 34, S2: 40, S3: 46, S4: 48 };
const expandedLengths = { S1: 60, S2: 64, S3: 64, S4: 64 };

it.each(L07.sections)('keeps $name walls aligned and art below the original triangle count', (sec) => {
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
  expect(count).toBeLessThan(originalKitTriangles[sec.id]);
});

it('keeps the widened shoulders playable across encounter and exit handoffs', () => {
  for (const sec of L07.sections) {
    const floor = sec.geometry.find(g => g.id === `${sec.id}-floor`);
    const z0 = floor.at[2] - floor.size[2] / 2;
    const z1 = floor.at[2] + floor.size[2] / 2;
    const startX = sec.start[0] - 3.5;
    expect(floor.size[2]).toBe(expandedWidths[sec.id]);
    expect(floor.at[0] + floor.size[0] / 2 - .5 - startX).toBe(expandedLengths[sec.id]);
    expect(sec.encounters[0].activate.min[2]).toBeCloseTo(z0 + 1.2);
    expect(sec.encounters[0].activate.max[2]).toBeCloseTo(z1 - 1.2);
    if (!sec.exit) continue;

    const next = L07.sections.find(s => s.id === sec.exit.to);
    const incoming = next.geometry.find(g => g.id === `${next.id}-floor`);
    expect(sec.exit.min[0]).toBeGreaterThan(incoming.at[0] - incoming.size[0] / 2);
    expect(sec.exit.min[2]).toBeCloseTo(z0 + 2);
    expect(sec.exit.max[2]).toBeCloseTo(z1 - 2);
    expect(incoming.at[2] - incoming.size[2] / 2).toBeLessThan(sec.exit.min[2]);
    expect(incoming.at[2] + incoming.size[2] / 2).toBeGreaterThan(sec.exit.max[2]);
  }
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
  const floor = gallery.geometry.find(g => g.id === 'S3-floor');
  expect(press.at[2] + 3.77 / 2).toBeLessThan(floor.at[2] - floor.size[2] / 2);
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
