import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { L03 } from '../../src/data/levels/L03/index.js';
import { KIT } from '../../src/render/level/kitModels.js';
import { panoramaPath } from '../../src/render/level/campaignSurfaceArt.js';
import { grovePlacements } from '../../src/render/level/groveDressing.js';

function placements(id) {
  const sec = L03.sections.find((section) => section.id === id);
  return grovePlacements(sec, new Map(sec.geometry.map((g) => [g.id, g])));
}

describe('Vegetable Grove dressing', () => {
  it('uses a leaf model for each beanstalk landing instead of a hedge or stalk', () => {
    const models = placements('S1');
    for (const id of ['S1-BS-leaf1', 'S1-BS-leaf2', 'S1-BS-leaf3', 'S1-BS-leaf4']) {
      expect(models.filter((p) => p.replace?.includes(id)).map((p) => p.model)).toEqual(['grove_leaf_step']);
    }
    expect(models.find((p) => p.model === 'grove_beanstalk').replace).toEqual(['S1-BS-stalk']);
  });

  it('adds section origins once and keeps the Hothouse wall glass behind its frame', () => {
    expect(placements('S2').find((p) => p.model === 'grove_gazebo').at).toEqual([319, -.15, -80]);
    const models = placements('S4');
    const panes = models.filter((p) => p.model === 'grove_greenhouse_glass');
    expect(panes).toHaveLength(14);
    expect(panes[0].at).toEqual([646.05, 8.51, -80]);
    const roof = L03.sections.find((s) => s.id === 'S4').geometry.find((g) => g.id === 'HH-ROOF');
    expect(panes.every((pane) => pane.scale[2] * 45 === roof.size[2])).toBe(true);
    const frames = models.filter((p) => p.model === 'grove_greenhouse_frame');
    expect(frames.length).toBeGreaterThan(10);
    expect(frames.every((p) => !p.replace)).toBe(true);
  });

  it('keeps the Rootway arch piers centered on their colliders', () => {
    const section = L03.sections.find((s) => s.id === 'S5');
    const arches = placements('S5').filter((prop) => prop.model === 'grove_wide_root_arch');
    expect(arches).toHaveLength(3);
    for (const arch of arches) {
      const piers = section.geometry.filter((solid) => arch.replace.includes(solid.id) && solid.kind === 'cylinder');
      expect(piers.map((pier) => pier.at[0]).sort((a, b) => a - b))
        .toEqual([arch.at[0] - 7.3 * arch.scale[0], arch.at[0] + 7.3 * arch.scale[0]]);
    }
  });

  it.each([
    ['S1', 185_000], ['S2', 70_000], ['S3', 84_000],
    ['S4', 110_000], ['S5', 56_000], ['S6', 83_000],
  ])('keeps %s Blender scenery within its reduced triangle budget', (id, budget) => {
    const assets = new URL('../../public/assets/', import.meta.url);
    const triangles = new Map();
    let total = 0;
    const props = placements(id);
    for (const { model } of props) {
      if (!triangles.has(model)) {
        const glb = gunzipSync(readFileSync(new URL(KIT.prop(model), assets)));
        const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
        const count = gltf.meshes.flatMap((mesh) => mesh.primitives)
          .reduce((n, p) => n + gltf.accessors[p.indices ?? p.attributes.POSITION].count / 3, 0);
        triangles.set(model, count);
      }
      total += triangles.get(model);
    }
    expect(total).toBeLessThanOrEqual(budget);
    expect(props.some((p) => p.model === 'grove_orchard_rise')).toBe(true);
    expect(readFileSync(new URL(panoramaPath('L03', id), assets)).subarray(8, 12).toString()).toBe('WEBP');
  });
});
