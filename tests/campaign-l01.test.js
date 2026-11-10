import { describe, expect, it } from 'vitest';
import { validateLevel } from '../src/data/levels/kit.js';
import { L01 } from '../src/data/levels/L01/index.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { getLevelRuntime } from '../src/sim/level/runtime.js';
import { noteV2Section } from '../src/sim/campaign/v2.js';
import { stateHash } from '../src/sim/hash.js';
import golden from './fixtures/l01-movement-golden.json';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function boot(secId = 'S1') {
  const s = createGameState({ seed: 4 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [
    { type: 'startMode', mode: 'campaign', level: 'L01' },
    { type: 'transitionDone' },
  ] }) });
  const rt = getLevelRuntime('L01');
  const sec = rt.sectionById[secId];
  if (secId !== 'S1') {
    s.level.section = secId;
    s.level.intro = null;
    noteV2Section(s, sec, rt);
  }
  return { s, p, sec };
}

function place(p, sec, x, z, y = 0) {
  p.pos = { x: sec.origin[0] + x, y, z };
  p.prevPos = { ...p.pos };
  p.vel = { x: 0, y: 0, z: 0 };
  p.grapple = null;
  p.grappleCd = 0;
}

describe('L01 movement course', () => {
  it('keeps the pins and teaches slide, hook and stamina without a required sprint', () => {
    expect(validateLevel(L01).errors).toEqual([]);
    expect(contentFingerprint(1)).toBe('cea1f88b');
    expect(CONTENT_FINGERPRINT).toBe('b33eada6');
    expect(golden.pvpGolden).toBe('532a562e');
    const ids = L01.sections.flatMap((s) => (s.grappleAnchors || []).map((a) => a.id));
    expect(ids).toEqual(['S1-hook', 'S2-hook', 'S3-hook']);
    expect(L01.sections.every((s) => !s.voidRescue)).toBe(true);
  });

  it('slides under the truck and stops a standing body', () => {
    const stood = boot();
    place(stood.p, stood.sec, 14, 10);
    for (let i = 0; i < 120; i++) simulate(stood.s, { [stood.p.id]: cmd({ yaw: -Math.PI / 2, moveZ: 1 }) });
    expect(stood.p.pos.x).toBeLessThan(19);

    const slid = boot();
    place(slid.p, slid.sec, 14, 10);
    let saw = false;
    for (let i = 0; i < 80; i++) {
      simulate(slid.s, { [slid.p.id]: cmd({
        yaw: -Math.PI / 2, moveZ: 1, held: { sprint: true },
        pressed: i === 6 ? { slide: true } : {},
      }) });
      if (slid.p.move.mode === 'slide') saw = true;
    }
    expect(saw).toBe(true);
    expect(slid.p.pos.x).toBeGreaterThan(26);
    expect(slid.p.pos.z).toBeCloseTo(10, 0);
  });

  it('flings the first hook over the boulevard wall', () => {
    const run = () => {
      const { s, p, sec } = boot();
      place(p, sec, 25.2, 10);
      const pitch = Math.atan2(5.6 - 1.6, 30 - 25.2);
      let id = null;
      let up = 0;
      for (let i = 0; i < 18; i++) {
        simulate(s, { [p.id]: cmd({ yaw: -Math.PI / 2, pitch, held: { grapple: true } }) });
        if (p.grapple) id = p.grapple.id;
        if (p.vel.y > up) up = p.vel.y;
      }
      let peak = p.pos.y;
      for (let i = 0; i < 150; i++) {
        simulate(s, { [p.id]: cmd({ yaw: -Math.PI / 2, moveZ: 1 }) });
        if (p.pos.y > peak) peak = p.pos.y;
      }
      return { s, p, id, up, peak };
    };
    const first = run();
    expect(first.id).toBe('S1-hook');
    expect(first.up).toBeGreaterThan(10);
    expect(first.peak).toBeGreaterThan(4);
    expect(first.p.pos.x).toBeGreaterThan(45);
    expect(first.p.pos.y).toBeLessThan(1);
    expect(first.p.pos.z).toBeGreaterThan(8);
    expect(first.p.pos.z).toBeLessThan(12);
    expect(first.p.grapple).toBeNull();
    expect(first.p.grappleCd).toBeGreaterThan(2);
    expect(first.p.grappleCd).toBeLessThan(6);
    const again = run();
    expect(stateHash(again.s)).toBe(stateHash(first.s));
    expect(stateHash(first.s)).toBe(golden.firstGrappleHash);
  });

  it('walks the south road and the toll stair with an empty stamina bar', () => {
    const road = boot();
    place(road.p, road.sec, 8, 18);
    road.p.stamina = 0;
    road.p.staminaLock = true;
    road.p.staminaDelay = 30;
    for (let i = 0; i < 400; i++) {
      simulate(road.s, { [road.p.id]: cmd({ yaw: -Math.PI / 2, moveZ: 1, held: { sprint: true } }) });
    }
    expect(road.p.pos.x).toBeGreaterThan(48);
    expect(road.p.staminaLock).toBe(true);
    expect(road.p.stamina).toBe(0);
    expect(road.p.move.mode).not.toBe('slide');

    const stair = boot('S5');
    place(stair.p, stair.sec, 52, 35);
    stair.p.stamina = 0;
    stair.p.staminaLock = true;
    stair.p.staminaDelay = 30;
    for (let i = 0; i < 500; i++) simulate(stair.s, { [stair.p.id]: cmd({ yaw: 0, moveZ: 1 }) });
    expect(stair.p.pos.y).toBeGreaterThan(4);
    expect(stair.p.pos.z).toBeGreaterThan(10);
    expect(stair.p.staminaLock).toBe(true);
  });

  it('picks up speed on the toll slide', () => {
    const { s, p, sec } = boot('S5');
    place(p, sec, 84, 23, 4.75);
    p.onGround = true;
    p.vel.x = 8;
    let peak = 8;
    let slid = false;
    for (let i = 0; i < 40; i++) {
      simulate(s, { [p.id]: cmd({
        yaw: -Math.PI / 2, moveZ: 1, held: { sprint: true },
        pressed: i === 2 ? { slide: true } : {},
      }) });
      peak = Math.max(peak, Math.hypot(p.vel.x, p.vel.z));
      if (p.move.mode === 'slide') slid = true;
    }
    expect(slid).toBe(true);
    expect(peak).toBeGreaterThan(14);
    expect(p.pos.y).toBeLessThan(3);
  });
});
