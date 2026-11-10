import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/data/tuning.js';
import { decodeInput, encodeInput } from '../src/net/inputCodec.js';
import { ARENA_SOLIDS } from '../src/sim/pvp/arena.js';
import { createMatch, hashState, replay, scriptedMatch, step } from '../src/sim/pvp/sim.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';
import { HELD_MASK, decodeUsedLog, encodeUsedTick, usedOf, wishOfUsed } from '../src/sim/pvp/used.js';

function place(p, x, z, yaw, pitch) {
  p.x = x;
  p.y = 0;
  p.z = z;
  p.vx = 0;
  p.vy = 0;
  p.vz = 0;
  p.yaw = yaw;
  p.pitch = pitch;
  p.onGround = true;
  p.grapple = null;
  p.grappleCd = 0;
  p.slideT = 0;
  p.slideCd = 0;
  p.stamina = 1;
  p.staminaLock = false;
  p.staminaDelay = 0;
}

function wish(extra) {
  return {
    yaw: extra.yaw, pitch: extra.pitch || 0, moveX: 0, moveZ: extra.moveZ || 0,
    fire: false, zoom: false, sprint: !!extra.sprint, jump: !!extra.jump,
    dash: false, reload: false, slide: !!extra.slide, grapple: !!extra.grapple, slot: -1,
  };
}

describe('arena movement', () => {
  it('gives both seats the same slide and the same stamina', () => {
    const state = createMatch(4);
    for (const p of state.players) {
      p.vx = 0;
      p.vz = 0;
      p.yaw = -Math.PI / 2;
    }
    const burst = () => state.players.map((p) => wish({ yaw: p.yaw, moveZ: 1, sprint: true }));
    for (let i = 0; i < 20; i++) step(state, burst());
    step(state, state.players.map((p) => wish({ yaw: p.yaw, moveZ: 1, sprint: true, slide: true })));
    const [a, b] = state.players;
    expect(Math.hypot(a.vx, a.vz)).toBeGreaterThan(12);
    expect(a.vx).toBeCloseTo(b.vx, 4);
    expect(a.vz).toBeCloseTo(b.vz, 4);
    expect(a.stamina).toBeCloseTo(b.stamina, 4);
    expect(a.slideT).toBeGreaterThan(0);
    expect(b.slideT).toBe(a.slideT);
  });

  it('locks sprint after the bar empties and refills before it starts again', () => {
    const state = createMatch(4);
    const p = state.players[0];
    place(p, 0, 0, 0, 0);
    const go = () => step(state, [wish({ yaw: 0, moveZ: 1, sprint: true }), wish({ yaw: 0 })]);
    let locked = false;
    for (let i = 0; i < 400; i++) {
      go();
      if (p.staminaLock) locked = true;
    }
    expect(locked).toBe(true);
    place(p, 0, 0, 0, 0);
    p.stamina = 0;
    p.staminaLock = true;
    p.staminaDelay = 0;
    for (let i = 0; i < 10; i++) go();
    expect(p.staminaLock).toBe(true);
    expect(Math.hypot(p.vx, p.vz)).toBeLessThanOrEqual(TUNING.walkSpeed + 0.05);
    for (let i = 0; i < 80; i++) go();
    expect(p.staminaLock).toBe(false);
    expect(Math.hypot(p.vx, p.vz)).toBeGreaterThan(TUNING.walkSpeed + 0.5);
  });

  it('flings off a pillar and keeps that velocity when the hook is released', () => {
    const state = createMatch(4);
    const p = state.players[0];
    // East face of the north-east pillar is x = 12.9. Aim up the face.
    place(p, 8, 14, -Math.PI / 2, 0.9);
    const hold = () => step(state, [wish({ yaw: p.yaw, pitch: 0.9, grapple: true }), wish({ yaw: 0 })]);
    let peakUp = 0;
    for (let i = 0; i < 12; i++) {
      hold();
      if (p.vy > peakUp) peakUp = p.vy;
    }
    expect(p.grapple).toBeTruthy();
    expect(p.grapple.id).toBe('ne');
    expect(peakUp).toBeGreaterThan(8);
    const heldX = p.vx;
    const heldY = p.vy;
    step(state, [wish({ yaw: p.yaw, pitch: 0.9 }), wish({ yaw: 0 })]);
    expect(p.grapple).toBeNull();
    expect(p.vx).toBeCloseTo(heldX, 4);
    expect(p.vy).toBeLessThan(heldY);
    expect(p.vy).toBeGreaterThan(heldY - TUNING.gravity / 30 - 0.02);
    let peakY = p.y;
    for (let i = 0; i < 30; i++) {
      step(state, [wish({ yaw: p.yaw, pitch: 0 }), wish({ yaw: 0 })]);
      if (p.y > peakY) peakY = p.y;
    }
    expect(peakY).toBeGreaterThan(3);
    expect(p.x).toBeGreaterThan(12);
  });

  it('does not hook the floor or the other player', () => {
    const state = createMatch(4);
    const p = state.players[0];
    place(p, 0, 0, 0, -1.2);
    step(state, [wish({ yaw: 0, pitch: -1.2, grapple: true }), wish({ yaw: 0 })]);
    expect(p.grapple).toBeNull();
    expect(p.grappleCd).toBeGreaterThan(5);
    const other = state.players[1];
    place(p, other.x, other.z + 6, 0, 0);
    p.grappleCd = 0;
    step(state, [wish({ yaw: 0, pitch: 0, grapple: true }), wish({ yaw: other.yaw })]);
    expect(p.grapple).toBeNull();
    expect(ARENA_SOLIDS.map((s) => s.id).sort()).toEqual(['ne', 'nw', 'se', 'sw']);
  });

  it('keeps a grapple press in the used log and treats it as held', () => {
    const decoded = decodeInput(encodeInput({
      seq: 1, frame: 3, yaw: 0.2, pitch: 0.4, moveX: 0, moveZ: 1, grapple: true, slide: true, fire: true,
    }));
    expect(decoded.grapple).toBe(true);
    expect(decoded.slide).toBe(true);
    const rec = usedOf(decoded);
    expect(wishOfUsed(rec).grapple).toBe(true);
    expect(rec.b & HELD_MASK & (1 << 7)).toBe(1 << 7);
    expect(rec.b & HELD_MASK & (1 << 6)).toBe(0);
    const back = decodeUsedLog([encodeUsedTick([rec, rec])]);
    expect(wishOfUsed(back[0][0]).grapple).toBe(true);
    expect(wishOfUsed(back[0][1]).slide).toBe(true);
  });

  it('moves the PvP fingerprint and the mirrored golden together', () => {
    const state = replay(scriptedMatch(7, 180));
    expect(state.outcome).toBe('draw');
    expect(state.reason).toBe('double_ko');
    expect(state.tick).toBe(65);
    expect(CONTENT_FINGERPRINT).toBe('b33eada6');
    expect(hashState(state)).toBe('532a562e');
  });
});
