import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { L05 } from '../../src/data/levels/L05/index.js';
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
    expect(models.filter(p => p.replace?.includes('S2-wallW'))).toHaveLength(9);
    const min = gate.at.map((v, i) => v - gate.size[i] / 2);
    const max = gate.at.map((v, i) => v + gate.size[i] / 2);
    const closed = place('S2', [{ id: gate.id, min, max }]).find(p => p.replace?.includes(gate.id));
    expect(closed).toMatchObject({ model: 'frost_gate', scale: [4, 6, .5] });
    expect(closed.at).toEqual([gate.at[0], gate.at[1] - 3, gate.at[2]]);
  });

  it('dresses stable ice beside the authored crack bands', () => {
    const models = place('S2');
    expect(models.some(p => p.model === 'frost_ice_floor' && p.replace.includes('S2-ice1'))).toBe(true);
    expect(models.some(p => p.replace?.some(id => id.startsWith('S2-band')))).toBe(false);
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
