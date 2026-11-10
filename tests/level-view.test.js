import { describe, expect, it } from 'vitest';
import { box, sphere } from '../src/data/levels/kit.js';
import { buildLookGroup, buildSectionMeshes } from '../src/render/level/levelView.js';

describe('section meshes', () => {
  it('merges same-material solids and keeps a new material apart', () => {
    const meshes = buildSectionMeshes([
      box({ id: 'a', at: [0, 0, 0], size: [2, 1, 2], mat: 'concrete' }),
      box({ id: 'b', at: [4, 0, 0], size: [2, 1, 2], mat: 'concrete' }),
      sphere({ id: 'c', at: [0, 2, 0], r: 0.5, mat: 'gold' }),
    ], new Map());
    expect(meshes).toHaveLength(2);
    const concrete = meshes.find((m) => m.material.color.getHex() === 0x9a9590);
    expect(concrete.geometry.getAttribute('position').count).toBeGreaterThan(24);
  });

  it('builds a placeholder look from primitives', () => {
    const group = buildLookGroup([
      { kind: 'sphere', at: [0, 1, 0], r: 0.5, mat: 'toxic' },
      { kind: 'cone', at: [0, 0.2, -0.4], r: 0.15, h: 0.5, mat: 'toxic' },
    ]);
    expect(group.children).toHaveLength(2);
  });
});
