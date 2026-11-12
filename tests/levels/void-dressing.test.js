import { describe, expect, it } from 'vitest';
import { L04 } from '../../src/data/levels/L04/index.js';
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
