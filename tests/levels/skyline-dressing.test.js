import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { L06 } from '../../src/data/levels/campaign.js';
import { KIT } from '../../src/render/level/kitModels.js';
import { skylinePlacements } from '../../src/render/level/skylineDressing.js';
import { kitCeilingSurface, surfaceArtPath, surfaceArtTheme } from '../../src/render/level/campaignSurfaceArt.js';

const root = new URL('../../public/assets/', import.meta.url);
const triangleCounts = new Map();

function triangleCount(model) {
  if (!triangleCounts.has(model)) {
    const glb = gunzipSync(readFileSync(new URL(KIT.prop(model), root)));
    const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
    const tris = gltf.meshes.flatMap(m => m.primitives)
      .reduce((sum, p) => sum + gltf.accessors[p.indices ?? p.attributes.POSITION].count / 3, 0);
    triangleCounts.set(model, tris);
  }
  return triangleCounts.get(model);
}

const originalKitTriangles = { S1: 27224, S2: 33872, S3: 31632, S4: 30048 };
const expandedWidths = { S1: 36, S2: 44, S3: 48, S4: 52 };

it.each(L06.sections)('keeps $name wall spans aligned and below its original triangle count', (sec) => {
  const prims = new Map(sec.geometry.map(g => [g.id, g]));
  const models = skylinePlacements(sec, prims);
  const replacements = models.filter(p => p.replace);
  expect(new Set(replacements.flatMap(p => p.replace))).toEqual(new Set([
    `${sec.id}-wallN`, `${sec.id}-wallS`,
  ]));
  for (const id of [`${sec.id}-wallN`, `${sec.id}-wallS`]) {
    const wall = prims.get(id);
    const bays = replacements.filter(p => p.replace.includes(id));
    const [w, h, d] = wall.size;
    let edge = wall.at[0] - w / 2;
    for (const bay of bays) {
      expect(bay.at[0] - bay.scale[0]).toBeCloseTo(edge);
      expect(bay.at.slice(1)).toEqual([0, wall.at[2]]);
      expect(bay.scale.slice(1)).toEqual([h, d / 2]);
      edge = bay.at[0] + bay.scale[0];
    }
    expect(edge).toBeCloseTo(wall.at[0] + w / 2);
  }
  const triangles = models.reduce((sum, p) => sum + triangleCount(p.model), 0);
  expect(triangles).toBeGreaterThan(10000);
  expect(triangles).toBeLessThan(originalKitTriangles[sec.id]);
});

it('supports both widened shoulders at each seamless handoff and preserves the issued boss start', () => {
  for (const sec of L06.sections) {
    const floor = sec.geometry.find(g => g.id === `${sec.id}-floor`);
    const half = floor.size[2] / 2;
    const z0 = floor.at[2] - half;
    const z1 = floor.at[2] + half;
    expect(floor.size[2]).toBe(expandedWidths[sec.id]);
    expect(sec.encounters[0].activate.min[2]).toBeCloseTo(z0 + 1.2);
    expect(sec.encounters[0].activate.max[2]).toBeCloseTo(z1 - 1.2);
    if (!sec.exit) continue;

    const next = L06.sections.find(s => s.id === sec.exit.to);
    const incoming = next.geometry.find(g => g.id === `${next.id}-floor`);
    expect(sec.exit.min[0]).toBeGreaterThan(incoming.at[0] - incoming.size[0] / 2);
    expect(sec.exit.min[2]).toBeCloseTo(z0 + 2);
    expect(sec.exit.max[2]).toBeCloseTo(z1 - 2);
    expect(incoming.at[2] - incoming.size[2] / 2).toBeLessThan(sec.exit.min[2]);
    expect(incoming.at[2] + incoming.size[2] / 2).toBeGreaterThan(sec.exit.max[2]);
  }
  const streets = L06.sections[3];
  expect(streets.start).toEqual([153.5, 0, 11]);
  expect(streets.geometry.find(g => g.id === 'S4-floor').size[0]).toBe(67);
});

it('isolates the Skyline atlas and puts the ceiling finish on the arcade canopy', () => {
  expect(surfaceArtPath('L06')).not.toBe(surfaceArtPath('L05'));
  expect(surfaceArtTheme('L06').layout.toArray()).toEqual([336, 336, 2]);
  expect(surfaceArtTheme('L05').layout.toArray()).toEqual([672, 1008, 4]);
  expect(kitCeilingSurface('skyline_canopy')).toBe(1);
  expect(kitCeilingSurface('skyline_shop')).toBe(0);
});
