import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { L05 } from '../../src/data/levels/L05/index.js';
import { KIT } from '../../src/render/level/kitModels.js';
import { panoramaPath } from '../../src/render/level/campaignSurfaceArt.js';
import { frostspirePlacements } from '../../src/render/level/frostspireDressing.js';
import { mountFrostSearchlight, syncFrostSearchlight } from '../../src/render/level/frostspireLights.js';
import { searchlightYaw } from '../../src/sim/campaign/alarms.js';

function place(id, doors = []) {
  const sec = L05.sections.find(section => section.id === id);
  return frostspirePlacements(sec, new Map(sec.geometry.map(g => [g.id, g])), doors);
}

describe('Frostspire dressing', () => {
  it('tiles fortress walls independently of the gate opening', () => {
    const sec = L05.sections.find(section => section.id === 'S2');
    const gate = sec.mechanisms.find(m => m.id === 'S2-shieldGate');
    const models = place('S2');
    expect(models.some(p => p.replace?.includes(gate.id))).toBe(false);
    const west = sec.geometry.find((g) => g.id === 'S2-wallW');
    const tiles = models.filter((p) => p.replace?.includes(west.id));
    expect(tiles.reduce((width, tile) => width + tile.scale[0] * 2, 0)).toBeCloseTo(west.size[0]);
    expect(tiles[0].at[0] - tiles[0].scale[0]).toBeCloseTo(west.at[0] - west.size[0] / 2);
    expect(tiles.at(-1).at[0] + tiles.at(-1).scale[0]).toBeCloseTo(west.at[0] + west.size[0] / 2);
    const min = gate.at.map((v, i) => v - gate.size[i] / 2);
    const max = gate.at.map((v, i) => v + gate.size[i] / 2);
    const closed = place('S2', [{ id: gate.id, min, max }]).find(p => p.replace?.includes(gate.id));
    expect(closed).toMatchObject({ model: 'frost_gate', scale: [7, 6, .5] });
    expect(closed.at).toEqual([gate.at[0], gate.at[1] - 3, gate.at[2]]);
  });

  it('dresses stable ice beside the authored crack bands', () => {
    const models = place('S2');
    expect(models.some(p => p.model === 'frost_ice_floor' && p.replace.includes('S2-ice1'))).toBe(true);
    expect(models.some(p => p.replace?.some(id => id.startsWith('S2-band')))).toBe(false);
  });

  it.each([
    ['S1', 51_000], ['S2', 59_000], ['S3', 49_000], ['S4', 46_000], ['S5', 26_000],
  ])('keeps %s Blender scenery within its reduced triangle budget', (id, budget) => {
    const assets = new URL('../../public/assets/', import.meta.url);
    const counts = new Map();
    const models = place(id);
    let total = 0;
    for (const { model } of models) {
      if (!counts.has(model)) {
        const glb = gunzipSync(readFileSync(new URL(KIT.prop(model), assets)));
        const gltf = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
        counts.set(model, gltf.meshes.flatMap((mesh) => mesh.primitives)
          .reduce((count, p) => count + gltf.accessors[p.indices ?? p.attributes.POSITION].count / 3, 0));
      }
      total += counts.get(model);
    }
    expect(total).toBeLessThanOrEqual(budget);
    expect(models.filter((p) => p.model === 'frost_ridge')).toHaveLength(id === 'S4' ? 0 : 7);
    expect(readFileSync(new URL(panoramaPath('L05', id), assets)).subarray(8, 12).toString()).toBe('WEBP');
  });

  it('tracks the detection sweep and turns off the lens and beam when disabled', () => {
    const spec = L05.sections.find(sec => sec.id === 'S2').mechanisms.find(m => m.id === 'S2-lightW');
    const root = new THREE.Group();
    const head = new THREE.Group();
    const lens = new THREE.Object3D();
    head.name = 'frost_searchlight_head';
    lens.name = 'frost_searchlight_lens';
    root.add(head);
    head.add(lens);
    mountFrostSearchlight(root, spec, 0);
    const beam = root.getObjectByName('searchlight-beam');
    const level = { time: 1.5, alarmHp: { [spec.id]: { lamp: 30 } }, alarmsCut: {} };

    syncFrostSearchlight(root, level);
    expect(beam.scale.toArray()).toEqual([6, 1, 120]);
    expect(head.rotation.y).toBeCloseTo(searchlightYaw(spec, level.time) + Math.PI);
    expect(beam.rotation.y).toBe(head.rotation.y);
    expect(lens.visible && beam.visible).toBe(true);

    level.alarmHp[spec.id].lamp = 0;
    syncFrostSearchlight(root, level);
    expect(lens.visible || beam.visible).toBe(false);

    level.alarmHp[spec.id].lamp = 30;
    level.alarmsCut[spec.alarm] = true;
    syncFrostSearchlight(root, level);
    expect(lens.visible || beam.visible).toBe(false);
  });
});
