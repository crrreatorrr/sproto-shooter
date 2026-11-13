import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { L02 } from '../../src/data/levels/L02/index.js';
import { bazaarPaving, bazaarPlacements } from '../../src/render/level/bazaarDressing.js';
import { panoramaPath } from '../../src/render/level/campaignSurfaceArt.js';
import { KIT } from '../../src/render/level/kitModels.js';

function scenery(section) {
  return bazaarPlacements(section, new Map(section.geometry.map((solid) => [solid.id, solid])));
}

const assets = new URL('../../public/assets/', import.meta.url);

it.each(L02.sections)('loads the $name scenery within the section art budget', (section) => {
  const counts = new Map();
  let total = 0;
  for (const { model } of scenery(section)) {
    if (!counts.has(model)) {
      const glb = gunzipSync(readFileSync(new URL(KIT.prop(model), assets)));
      const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
      const triangles = gltf.meshes.flatMap((mesh) => mesh.primitives)
        .reduce((count, p) => count + gltf.accessors[p.indices ?? p.attributes.POSITION].count / 3, 0);
      counts.set(model, triangles);
    }
    total += counts.get(model);
  }
  expect(counts.has('bazaar2_city')).toBe(true);
  expect(total).toBeLessThan(20_000);
  expect(readFileSync(new URL(panoramaPath('L02', section.id), assets)).subarray(8, 12).toString()).toBe('WEBP');
  expect(bazaarPaving(section)).toHaveLength(section.id === 'S3' ? 0 : 1);
});

it('keeps rooftop piers and the fountain outside the two widened streets', () => {
  const market = L02.sections.find((section) => section.id === 'SM');
  const [ox, , oz] = market.origin;
  const overlapsStreet = (x, z, r) =>
    (x + r > 2 && x - r < 102 && z + r > 50 && z - r < 70)
    || (x + r > 81 && x - r < 99 && z + r > 54 && z - r < 236);
  const supports = scenery(market).filter((item) => item.model === 'bazaar2_support');
  expect(supports).toHaveLength(28);
  for (const support of supports) {
    expect(overlapsStreet(support.at[0] - ox, support.at[2] - oz, support.scale[0])).toBe(false);
  }
  const fountain = market.geometry.find((solid) => solid.id === 'sm-fountain');
  expect(overlapsStreet(fountain.at[0] - ox, fountain.at[2] - oz, fountain.r)).toBe(false);
});
