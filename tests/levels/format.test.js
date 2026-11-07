import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { TUNING } from '../../src/data/tuning.js';
import { getLevelData } from '../../src/data/levels/index.js';
import {
  validateLevel, flattenGeometry, box, ramp, stairs, cylinder, terrain, corridor, room,
  tower, ledgePath, bridge, coverCluster, car, crateStack, trench, catwalk, floatingIsland,
  rack, checkpoint,
} from '../../src/data/levels/kit.js';
import { buildLevelRuntime, getLevelRuntime, isLegacyArena, resetLevelRuntimeForTests } from '../../src/sim/level/runtime.js';
import { clampToArena } from '../../src/sim/collision.js';
import { createGameState } from '../../src/sim/state.js';

function shell(geometry, extra = {}) {
  return {
    id: 'sample', name: 'Sample',
    bounds: { min: [-80, -30, -80], max: [80, 60, 80] },
    geometry, volumes: [], mechanisms: [], weapons: [], checkpoints: [], encounters: [], spawners: [],
    ...extra,
  };
}

function pointInYaw0(box, x, y, z) {
  const [cx, cy, cz] = box.at;
  const [sx, sy, sz] = box.size;
  return Math.abs(x - cx) <= sx / 2 + 1e-6 && Math.abs(y - cy) <= sy / 2 + 1e-6 && Math.abs(z - cz) <= sz / 2 + 1e-6;
}

describe('arena level', () => {
  it('is the legacy circle and the runtime caches it', () => {
    const level = getLevelData('arena');
    const report = validateLevel(level);
    expect(report.ok, report.errors.join('; ')).toBe(true);
    expect(level.legacy).toBe(true);
    expect(level.radius).toBe(TUNING.arenaRadius);
    expect(level.geometry).toEqual([]);
    resetLevelRuntimeForTests();
    const a = getLevelRuntime('arena');
    const b = getLevelRuntime('arena');
    expect(b).toBe(a);
    expect(a.radius).toBe(45);
    expect(a.legacy).toBe(true);
    expect(a.colliders).toEqual([]);
    expect(a.spatial).toBeNull();
    expect(a.nav).toBeNull();
    resetLevelRuntimeForTests();
    expect(getLevelRuntime('arena')).not.toBe(a);
  });

  it('rejects an unknown level id', () => {
    expect(() => getLevelRuntime('nope')).toThrow(/unknown level/);
  });

  it('new games are the arena, and the circle clamp is unchanged', () => {
    const state = createGameState({ seed: 1 });
    expect(state.level).toEqual({ id: 'arena' });
    expect(isLegacyArena(state)).toBe(true);
    expect(isLegacyArena({})).toBe(true);
    expect(isLegacyArena({ level: { id: 'L01' } })).toBe(false);
    const ent = { pos: { x: 100, y: 0, z: 0 }, vel: { x: 5, y: 0, z: 0 } };
    expect(clampToArena(ent, TUNING.playerRadius)).toBe(true);
    expect(ent.pos.x).toBeCloseTo(TUNING.arenaRadius - TUNING.playerRadius);
    expect(ent.pos.z).toBe(0);
    expect(ent.vel.x).toBe(0);
  });
});

describe('level format', () => {
  const pieces = [
    corridor([[0, 0, 0], [0, 0, 12], [8, 4, 12]], 3, 3, { id: 'hall', roof: true }),
    room([0, 0, 0], [12, 4, 10], { id: 'rm', doors: [{ wall: 'n', u: 0.5, width: 2, height: 2.5 }], roof: true }),
    tower([0, 0, 0], 3, 4, { id: 'tw', stairs: 'spiral' }),
    ledgePath([[0, 2, 0], [10, 2, 4], [16, 6, 8]], 3, { id: 'ledge', drop: 'outer' }),
    bridge([0, 3, 0], [12, 3, 2], 2, { id: 'br' }),
    coverCluster([4, 0, 4], 9, { id: 'cov' }),
    car([2, 0, 2], 30),
    crateStack([1, 0, 1], 4),
    trench([[0, 0, 0], [10, 0, 0]], 2, 1.5),
    catwalk([[0, 0, 0], [8, 0, 6]], 1.5, 4),
    floatingIsland([0, 12, 0], 6, 5),
    stairs({ id: 'st', at: [0, 1, 0], size: [2, 1, 4], mat: 'stone' }),
    cylinder({ id: 'col', at: [3, 0, 3], r: 1, h: 4, mat: 'pillar' }),
    terrain({ id: 'ground', origin: [0, 0, 0], size: [20, 20], cell: 2, seed: 3, noise: { amp: 4, freq: 0.02, octaves: 2 } }),
  ];

  it('accepts every primitive and composite helper', () => {
    for (const piece of pieces) {
      const report = validateLevel(shell([piece]));
      expect(report.ok, `${piece.id || piece.kind}: ${report.errors.join('; ')}`).toBe(true);
    }
  });

  it('rejects thin solids, duplicate ids and a rack with no reason', () => {
    const thin = validateLevel(shell([box({ id: 'thin', at: [0, 1, 0], size: [0.2, 1, 1], mat: 'stone' })]));
    expect(thin.ok).toBe(false);
    expect(thin.errors.join(' ')).toMatch(/thinner than 0.5/);
    const dup = validateLevel(shell(
      [box({ id: 'a', at: [0, 1, 0], size: [1, 1, 1], mat: 'stone' })],
      { checkpoints: [checkpoint({ id: 'a', at: [0, 0, 0], when: 'start' })] },
    ));
    expect(dup.errors.join(' ')).toMatch(/duplicate id a/);
    const rackless = validateLevel(shell([], { weapons: [rack({ id: 'snp1', at: [0, 1, 0], gun: 'sniper' })] }));
    expect(rackless.errors.join(' ')).toMatch(/why/);
    const steep = validateLevel(shell([ramp({ id: 'cliff', at: [0, 2, 0], size: [4, 8, 4], mat: 'stone' })]));
    expect(steep.ok).toBe(true);
    expect(steep.warnings.join(' ')).toMatch(/not walkable/);
  });

  it('compiles colliders without mutating authored data', () => {
    const slab = box({ id: 'slab', at: [0, 1, 0], size: [4, 2, 2], yaw: 90, mat: 'stone' });
    const authoredSize = slab.size;
    const rt = buildLevelRuntime(shell([
      slab,
      ramp({ id: 'up', at: [0, 2, 8], size: [6, 12, 20], yaw: 30, mat: 'stone' }),
      terrain({ id: 'hf', origin: [0, 0, 0], size: [20, 20], cell: 2, seed: 8, noise: { amp: 4, freq: 0.05, octaves: 1 } }),
    ]));
    expect(slab.aabb).toBeUndefined();
    expect(slab.size).toBe(authoredSize);
    const compiled = rt.colliders.find((c) => c.id === 'slab');
    expect(compiled.aabb.min[0]).toBeCloseTo(-1);
    expect(compiled.aabb.max[0]).toBeCloseTo(1);
    expect(compiled.aabb.min[2]).toBeCloseTo(-2);
    expect(compiled.aabb.max[2]).toBeCloseTo(2);
    const up = rt.colliders.find((c) => c.id === 'up');
    expect(up.slopeDeg).toBeCloseTo(Math.atan2(12, 20) * 180 / Math.PI);
    const hf = rt.heightfields[0];
    expect(hf.heights).toBeNull();
    expect(hf.cols).toBe(11);
    expect(hf.rows).toBe(11);
    expect(hf.aabb.max[1]).toBeCloseTo(4);
    expect(() => buildLevelRuntime(shell([box({ id: 'bad', at: [0, 0, 0], size: [0.1, 1, 1], mat: 'stone' })]))).toThrow(/invalid/);
  });

  it('cuts a doorway and keeps a corridor hall clear', () => {
    const rm = room([0, 0, 0], [10, 4, 10], { id: 'rm', doors: [{ wall: 'n', width: 2, height: 2.5 }] });
    const parts = flattenGeometry([rm]);
    expect(parts.some((p) => pointInYaw0(p, 5, 1, 0))).toBe(false);
    expect(parts.some((p) => pointInYaw0(p, 1, 2, 0))).toBe(true);
    const hall = corridor([[0, 0, 0], [0, 0, 10]], 3, 3, { id: 'hall' });
    const hallParts = flattenGeometry([hall]);
    expect(hallParts.some((p) => pointInYaw0(p, 0, 1, 5))).toBe(false);
    expect(hallParts.some((p) => pointInYaw0(p, 1.75, 1, 5))).toBe(true);
    const across = corridor([[0, 0, 0], [10, 0, 0]], 2, 2, { id: 'ax' });
    const walls = flattenGeometry([across]).filter((p) => String(p.id).includes('wall'));
    const zs = walls.map((w) => w.at[2]).sort((a, b) => a - b);
    expect(zs[0]).toBeCloseTo(-1.25);
    expect(zs[1]).toBeCloseTo(1.25);
  });

  it('places cover from a seed, not Math.random', () => {
    expect(JSON.stringify(coverCluster([0, 0, 0], 4))).toBe(JSON.stringify(coverCluster([0, 0, 0], 4)));
    expect(JSON.stringify(coverCluster([0, 0, 0], 4))).not.toBe(JSON.stringify(coverCluster([0, 0, 0], 5)));
    const src = fs.readFileSync('src/data/levels/kit.js', 'utf8');
    expect(src).not.toMatch(/Math\.random/);
  });
});

describe('arena radius routing', () => {
  it('reads the circle radius from the level runtime', () => {
    const files = [
      'src/sim/collision.js',
      'src/sim/enemies.js',
      'src/sim/world.js',
      'src/sim/bosses.js',
      'src/render/renderer.js',
    ];
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src, file).toContain("getLevelRuntime('arena')");
      expect(src, file).not.toMatch(/import\s*\{[^}]*\bARENA_R\b/);
    }
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(d, e.name);
      return e.isDirectory() ? walk(p) : [p];
    });
    for (const file of [...walk('src/sim'), ...walk('src/render'), ...walk('src/data')]) {
      if (file.endsWith(`${path.sep}tuning.js`)) continue;
      const src = fs.readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(/import\s*\{[^}]*\bARENA_R\b/);
    }
  });
});
