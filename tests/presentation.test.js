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

describe('event coverage matches the presentation code', () => {
  const sfx = fs.readFileSync('src/audio/sfx.js', 'utf8');
  it("has a sound for every event that lists 'audio', and lists every sound", () => {
    for (const [name, channels] of Object.entries(EVENT_COVERAGE)) {
      const has = new RegExp(`\\n    ${name}\\(`).test(sfx);
      expect(has, name).toBe(channels.includes('audio'));
    }
  });
  it('announces the campaign events a player has to notice', async () => {
    const { campaignNotice, CAMPAIGN_NOTICE_EVENTS, MODIFIER_INFO } = await import('../src/ui/hudText.js');
    for (const type of ['levelCard', 'checkpoint', 'lockdown', 'lockdownReset', 'alarm', 'modifier', 'worldGun']) {
      expect(CAMPAIGN_NOTICE_EVENTS, type).toContain(type);
      expect(EVENT_COVERAGE[type], type).toContain('ui');
    }
    expect(campaignNotice({ type: 'levelCard', title: 'Sproto Landing', lines: ['Find the gate'] })).toMatchObject({ via: 'banner', dur: 2500 });
    expect(campaignNotice({ type: 'lockdown', sealed: true }).html).toContain('LOCKDOWN');
    expect(campaignNotice({ type: 'lockdown', sealed: false }).via).toBe('toast');
    expect(campaignNotice({ type: 'lockdownReset' }).html).toContain('REWOUND');
    expect(campaignNotice({ type: 'alarm', id: 'a' }).html).toContain('ALARM');
    expect(campaignNotice({ type: 'alarm', id: 'a', cut: true }).via).toBe('toast');
    expect(campaignNotice({ type: 'worldGun', gunType: 'shotgun' }).html).toBe('Picked up Shotgun');
    // every modifier a level can hand out has a name and a line saying what it does
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
    const ids = new Set();
    for (const f of walk('src/data/levels')) for (const m of fs.readFileSync(f, 'utf8').matchAll(/modifier: '([^']+)'/g)) ids.add(m[1]);
    expect(ids.size).toBeGreaterThan(5);
    for (const id of ids) expect(MODIFIER_INFO[id], id).toBeTruthy();
  });
  it('points the damage arc at the side the hit came from', async () => {
    const { damageArcAngle } = await import('../src/ui/hudText.js');
    // yaw 0 looks down -z. dir is atan2(dx, dz) from the player to the source.
    expect(damageArcAngle(Math.PI, 0)).toBeCloseTo(0); // source at -z: straight ahead
    expect(damageArcAngle(Math.PI / 2, 0)).toBeCloseTo(Math.PI / 2); // source at +x: from the right
    expect(Math.abs(damageArcAngle(0, 0))).toBeCloseTo(Math.PI); // source at +z: behind
    expect(damageArcAngle(-Math.PI / 2, 0)).toBeCloseTo(-Math.PI / 2); // source at -x: from the left
    // turn to face +x... yaw -π/2 looks down +x, so a source at +x is ahead again
    expect(damageArcAngle(Math.PI / 2, -Math.PI / 2)).toBeCloseTo(0);
  });
  it('shows each first-run tip once', async () => {
    const { firstRunTip } = await import('../src/ui/hudText.js');
    const seen = {};
    expect(firstRunTip({ type: 'wavePre', waveIndex: 0 }, seen)).toMatch(/WASD/);
    expect(firstRunTip({ type: 'wavePre', waveIndex: 0 }, seen)).toBeNull();
    expect(firstRunTip({ type: 'damage', isWeak: false }, seen)).toBeNull();
    expect(firstRunTip({ type: 'damage', isWeak: true }, seen)).toMatch(/BONK/);
    expect(firstRunTip({ type: 'intermissionStart' }, seen)).toMatch(/shop/);
    expect(firstRunTip({ type: 'intermissionStart' }, seen)).toBeNull();
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
