import { describe, expect, it } from 'vitest';
import { terrain } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { bindV2Section } from '../src/sim/campaign/v2.js';
import { heightAt, solidTerrain, terrainGrid } from '../src/sim/campaign/terrain.js';
import { firstSolid, groundHeight, snapToGround, terrainSolid } from '../src/sim/campaign/solids.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';
import { createGameState } from '../src/sim/state.js';
import { buildSectionMeshes } from '../src/render/level/levelView.js';

const field = terrain({
  id: 'ground',
  origin: [0, 0, -40],
  size: [40, 40],
  cell: 4,
  seed: 501,
  mat: 'snow',
  noise: { amp: 1.2, freq: 0.012, octaves: 2 },
  flat: [{ n0: 10, n1: 14 }, { x0: 8, x1: 12, n0: 30, n1: 40 }],
});

describe('section terrain', () => {
  it('keeps flats level and hills inside the amplitude', () => {
    const flat = heightAt(field, 20, -12);
    expect(flat).toBe(0);
    const strip = heightAt(field, 10, -35);
    expect(strip).toBe(0);
    const hill = heightAt(field, 4, -4);
    expect(hill).not.toBeNull();
    expect(Math.abs(hill)).toBeLessThanOrEqual(1.2);
    expect(heightAt(field, 4, -4)).toBe(hill);
    expect(heightAt(field, -5, -4)).toBeNull();
  });

  it('is walked on, stops a downward shot, and keeps a stand-in slab', () => {
    const solid = terrainSolid(field);
    expect(groundHeight([solid], 20, -12, 0.3, 2, 0.4)).toBeCloseTo(0);
    const hit = firstSolid([solid], { x: 4, y: 6, z: -4 }, { x: 0, y: -1, z: 0 }, 20);
    expect(hit.t).toBeGreaterThan(3);
    expect(hit.t).toBeLessThan(8);
    const s = createGameState({ seed: 1 });
    s.mode = 'campaign';
    s.level = { id: 'T', section: 'S' };
    bindV2Section(s, {
      id: 'S',
      terrain: field,
      geometry: [
        { kind: 'box', id: 'wall', at: [2, 2, -4], size: [1, 4, 8] },
      ],
    });
    expect(s.level.solids.some((item) => item.kind === 'terrain')).toBe(true);
    expect(s.level.solids.some((item) => item.id === 'wall')).toBe(true);
    const kept = createGameState({ seed: 1 });
    kept.mode = 'campaign';
    kept.level = { id: 'T', section: 'S' };
    const standSec = {
      id: 'S',
      terrain: field,
      geometry: [
        { kind: 'box', id: 'stand', tag: 'terrainStandIn', at: [20, -0.25, -12], size: [10, 0.5, 10] },
      ],
    };
    expect(solidTerrain(standSec)).toBeNull();
    bindV2Section(kept, standSec);
    expect(kept.level.solids.some((item) => item.id === 'stand')).toBe(true);
    expect(kept.level.solids.some((item) => item.kind === 'terrain')).toBe(false);
    const body = { pos: { x: 20, y: 3, z: -12 }, prevPos: { x: 20, y: 3, z: -12 }, vel: { x: 0, y: 0, z: 0 } };
    for (let i = 0; i < 90; i++) {
      body.prevPos = { ...body.pos };
      body.vel.y -= 22 / 60;
      body.pos.y += body.vel.y / 60;
      snapToGround(body, s.level.solids, 0.4);
    }
    expect(body.pos.y).toBeCloseTo(0, 1);
    expect(body.onGround).toBe(true);
  });

  it('shifts with the section and builds a mesh without an at vector', () => {
    const lv = makeV2Level({
      id: 'T', name: 'T',
      sections: [{ id: 'S', origin: [100, 0, 0], start: [2, 0, 2], terrain: field, geometry: [], encounters: [] }],
    });
    expect(lv.sections[0].terrain.origin).toEqual([100, 0, -40]);
    const grid = terrainGrid(field);
    expect(grid.positions.length).toBeGreaterThan(9);
    expect(grid.positions[1]).toBeCloseTo(heightAt(field, field.origin[0], field.origin[2]));
    expect(buildSectionMeshes([{ kind: 'terrain', id: 'bare', origin: [0, 0, 0], size: [8, 8] }], new Map())).toEqual([]);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('9ec1c6ea');
    expect(CONTENT_FINGERPRINT).toBe('17d87c54');
  });
});
