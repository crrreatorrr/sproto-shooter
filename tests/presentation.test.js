import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createSpring } from '../src/render/feel/spring.js';
import { EVENT_COVERAGE } from '../src/game/eventCoverage.js';
import { createViewRegistry } from '../src/render/views/ViewRegistry.js';

describe('spring', () => {
  it('converges within 1s at 10 Hz and zeta 0.7', () => {
    const s = createSpring(10, 0.7);
    const dt = 1 / 60;
    for (let t = 0; t < 1; t += dt) s.step(1, dt);
    expect(Math.abs(s.x - 1)).toBeLessThan(1e-3);
  });
  it('stays finite at dt 1/30', () => {
    const s = createSpring(10, 0.7);
    for (let i = 0; i < 90; i++) s.step(1, 1 / 30);
    expect(Number.isFinite(s.x)).toBe(true);
    expect(Math.abs(s.x - 1)).toBeLessThan(1e-3);
    expect(Math.abs(s.v)).toBeLessThan(1);
  });
});

describe('event coverage', () => {
  it('lists every sim emit', () => {
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
    const names = new Set();
    for (const f of walk('src/sim')) {
      const src = fs.readFileSync(f, 'utf8');
      for (const m of src.matchAll(/emit\(state,\s*'([^']+)'/g)) names.add(m[1]);
    }
    expect(names.size).toBeGreaterThan(10);
    for (const name of names) {
      const channels = EVENT_COVERAGE[name];
      expect(channels, name).toBeTruthy();
      expect(channels.length).toBeGreaterThan(0);
      for (const c of channels) expect(['audio', 'vfx', 'ui', 'feel', 'none']).toContain(c);
    }
  });
});

describe('view registry', () => {
  it('reuses a keyed view instead of building another', () => {
    const scene = { add() {}, remove() {} };
    const reg = createViewRegistry(scene);
    let built = 0;
    const make = () => ({ obj: { visible: true, parent: scene }, key: 'midget' });
    reg.sync(1, () => { built++; return make(); }, 'midget');
    reg.endFrame();
    reg.endFrame();
    reg.sync(2, () => { built++; return make(); }, 'midget');
    expect(built).toBe(1);
  });
});
