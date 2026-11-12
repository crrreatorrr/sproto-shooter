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

it.each(L06.sections)('keeps $name wall spans aligned and art under 50,000 triangles', (sec) => {
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
  expect(triangles).toBeLessThanOrEqual(50000);
});

it('isolates the Skyline atlas and puts the ceiling finish on the arcade canopy', () => {
  expect(surfaceArtPath('L06')).not.toBe(surfaceArtPath('L05'));
  expect(surfaceArtTheme('L06').layout.toArray()).toEqual([336, 336, 2]);
  expect(surfaceArtTheme('L05').layout.toArray()).toEqual([672, 1008, 4]);
  expect(kitCeilingSurface('skyline_canopy')).toBe(1);
  expect(kitCeilingSurface('skyline_shop')).toBe(0);
});
