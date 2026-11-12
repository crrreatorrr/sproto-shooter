import { describe, expect, it } from 'vitest';
import { L03 } from '../../src/data/levels/L03/index.js';
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
    const frames = models.filter((p) => p.model === 'grove_greenhouse_frame');
    expect(frames.length).toBeGreaterThan(10);
    expect(frames.every((p) => !p.replace)).toBe(true);
  });
});
