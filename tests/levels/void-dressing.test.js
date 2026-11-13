import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { L04 } from '../../src/data/levels/L04/index.js';
import { KIT } from '../../src/render/level/kitModels.js';
import { panoramaPath } from '../../src/render/level/campaignSurfaceArt.js';
import { voidPlacements } from '../../src/render/level/voidDressing.js';

function placements(id, doors = []) {
  const sec = L04.sections.find((section) => section.id === id);
  return voidPlacements(sec, new Map(sec.geometry.map((g) => [g.id, g])), doors);
}

describe('Blockchain Void dressing', () => {
  it('uses the authored bridge slabs and keeps the resonant relay on its post', () => {
    const models = placements('S1');
    const bridge = models.filter((p) => p.model === 'void_bridge');
    expect(bridge).toHaveLength(6);
    expect(bridge[0].replace).toEqual(['eb1-1', 'marker:eb1']);
    expect(bridge.every((p) => p.at[2] === 60 && p.scale[2] === 2)).toBe(true);
    expect(models.find((p) => p.model === 'void_relay')).toMatchObject({
      at: [37, -2, 50], replace: ['s1.c1post', 'marker:c1'],
    });
  });

  it('centres the vault on its authored doorway and replaces only the side walls', () => {
    const vault = placements('S5').find((p) => p.model === 'void_vault');
    expect(vault).toMatchObject({
      at: [1072.5, 0, 60], yaw: 270, replace: ['s5.vaultW1', 's5.vaultW2'],
    });
  });

  it.each([
    ['S1', 55_000], ['S2', 68_000], ['S3', 56_000],
    ['S4', 45_000], ['S5', 44_000], ['SB', 44_000],
  ])('keeps %s Blender scenery within its reduced triangle budget', (id, budget) => {
    const assets = new URL('../../public/assets/', import.meta.url);
    const counts = new Map();
    const models = placements(id);
    let triangles = 0;
    for (const { model } of models) {
      if (!counts.has(model)) {
        const glb = gunzipSync(readFileSync(new URL(KIT.prop(model), assets)));
        const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
        counts.set(model, gltf.meshes.flatMap((mesh) => mesh.primitives)
          .reduce((n, p) => n + gltf.accessors[p.indices ?? p.attributes.POSITION].count / 3, 0));
      }
      triangles += counts.get(model);
    }
    expect(triangles).toBeLessThanOrEqual(budget);
    expect(models.filter((p) => p.model === 'void_debris_belt')).toHaveLength(8);
    expect(readFileSync(new URL(panoramaPath('L04', id), assets)).subarray(8, 12).toString()).toBe('WEBP');
  });

  it('replaces the Exchange gate only when the simulation reports a closed door', () => {
    const id = 'sb.gate';
    expect(placements('SB').some((p) => p.replace?.includes(id))).toBe(false);
    const models = placements('SB', [{ id, min: [1127.4, 0, 57], max: [1128, 6, 63] }]);
    const gate = models.find((p) => p.replace?.includes(id));
    expect(gate).toMatchObject({ model: 'void_bulkhead', at: [1127.7, 0, 60], yaw: 90 });
    expect(gate.scale[0]).toBe(3);
    expect(gate.scale[2]).toBeCloseTo(.3);
  });
});
