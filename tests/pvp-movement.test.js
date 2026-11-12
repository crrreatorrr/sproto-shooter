import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/data/tuning.js';
import { decodeInput, encodeInput } from '../src/net/inputCodec.js';
import { ARENA_SOLIDS } from '../src/sim/pvp/arena.js';
import { createMatch, hashState, replay, scriptedMatch, snapshotOf, step } from '../src/sim/pvp/sim.js';
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
    fire: !!extra.fire, zoom: !!extra.zoom, sprint: !!extra.sprint, jump: !!extra.jump,
    dash: false, reload: false, slide: !!extra.slide, crouch: !!extra.crouch, grapple: !!extra.grapple, slot: -1,
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

  it('pulls toward a pillar and slows down when the hook is released', () => {
    const state = createMatch(4);
    const p = state.players[0];
    // East face of the north-east pillar is x = 12.9. Aim up the face.
    place(p, 8, 14, -Math.PI / 2, 0.9);
    const hold = () => step(state, [wish({ yaw: p.yaw, pitch: 0.9, grapple: true }), wish({ yaw: 0 })]);
    let topSpeed = 0;
    for (let i = 0; i < 18; i++) {
      hold();
      topSpeed = Math.max(topSpeed, Math.hypot(p.vx, p.vy, p.vz));
    }
    expect(p.grapple).toBeTruthy();
    expect(p.grapple.id).toBe('ne');
    expect(topSpeed).toBeGreaterThan(TUNING.grappleReleaseSpeed);
    expect(topSpeed).toBeLessThanOrEqual(TUNING.grappleSpeed + 0.0001);
    step(state, [wish({ yaw: p.yaw, pitch: 0.9 }), wish({ yaw: 0 })]);
    expect(p.grapple).toBeNull();
    expect(p.vy).toBeGreaterThan(0);
    expect(Math.hypot(p.vx, p.vy, p.vz)).toBeLessThanOrEqual(TUNING.grappleReleaseSpeed + 0.0001);
    let peakY = p.y;
    for (let i = 0; i < 30; i++) {
      step(state, [wish({ yaw: p.yaw, pitch: 0 }), wish({ yaw: 0 })]);
      if (p.y > peakY) peakY = p.y;
    }
    expect(peakY).toBeGreaterThan(3);
    expect(p.x).toBeGreaterThan(12);
  });

  it('caps downward pulls and releases after applying gravity', () => {
    const state = createMatch(4);
    const p = state.players[0];
    const yaw = -Math.PI / 2, pitch = -0.5;
    place(p, 8, 14, yaw, pitch);
    p.y = 10;
    p.onGround = false;
    const speed = () => Math.hypot(p.vx, p.vy, p.vz);
    for (let i = 0; i < 9; i++) {
      step(state, [wish({ yaw, pitch, grapple: true }), wish({ yaw: 0 })]);
      expect(p.grapple?.id).toBe('ne');
      expect(speed()).toBeLessThanOrEqual(TUNING.grappleSpeed + 0.0001);
    }
    expect(p.vy).toBeLessThan(0);
    expect(speed()).toBeGreaterThan(TUNING.grappleReleaseSpeed);
    step(state, [wish({ yaw, pitch }), wish({ yaw: 0 })]);
    expect(p.grapple).toBeNull();
    expect(speed()).toBeLessThanOrEqual(TUNING.grappleReleaseSpeed + 0.0001);
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

  it('reports a missed attempt for a pillar beyond the shorter range', () => {
    const state = createMatch(4);
    const p = state.players[0];
    const yaw = -Math.PI / 2;
    place(p, -6, 14, yaw, 0);
    step(state, [wish({ yaw, grapple: true }), wish({ yaw: 0 })]);
    expect(snapshotOf(state).players[0]).toMatchObject({ grapple: null, grappleCd: TUNING.grappleCd, grappleMiss: true });
    expect(Math.hypot(p.vx, p.vy, p.vz)).toBe(0);
    // A point-blank hit arrives in the same tick. It still counts as a hit.
    place(p, 12, 14, yaw, 0);
    step(state, [wish({ yaw, grapple: true }), wish({ yaw: 0 })]);
    expect(snapshotOf(state).players[0]).toMatchObject({ grapple: null, grappleCd: TUNING.grappleCd });
    expect(snapshotOf(state).players[0].grappleMiss).toBeUndefined();
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

  it('double jumps, cuts dash speed, slides from crouch, and refuses sprint while zoomed', () => {
    const state = createMatch(4);
    const p = state.players[0];
    place(p, 0, 0, 0, 0);
    const other = () => wish({ yaw: 0 });
    step(state, [wish({ yaw: 0, jump: true }), other()]);
    expect(p.vy).toBeGreaterThan(TUNING.jumpVel - 1);
    expect(p.onGround).toBe(false);
    expect(p.jumpsLeft).toBe(1);
    step(state, [wish({ yaw: 0, jump: true }), other()]);
    expect(p.vy).toBeGreaterThan(TUNING.doubleJumpVel - 1);
    expect(p.jumpsLeft).toBe(0);

    place(p, 0, 0, 0, 0);
    p.vy = 0;
    p.onGround = true;
    p.dashCd = 0;
    for (let i = 0; i < 8; i++) step(state, [wish({ yaw: 0, moveZ: 1, dash: i === 0 }), other()]);
    expect(p.dashT).toBe(0);
    expect(Math.hypot(p.vx, p.vz)).toBeLessThan(TUNING.dashSpeed * 0.5);

    place(p, 0, 0, 0, 0);
    p.vx = 0;
    p.vz = 0;
    p.onGround = true;
    p.slideCd = 0;
    p.moveMode = 'walk';
    step(state, [wish({ yaw: 0, moveZ: 1, sprint: true, crouch: true }), other()]);
    expect(p.slideT).toBeGreaterThan(0);
    expect(Math.hypot(p.vx, p.vz)).toBeGreaterThan(12);

    place(p, 0, 0, 0, 0);
    p.stamina = 1;
    p.staminaLock = false;
    p.zoomCancelled = false;
    step(state, [wish({ yaw: 0, moveZ: 1, sprint: true, zoom: true }), other()]);
    expect(p.zoomCancelled).toBe(true);
    expect(p.zooming).toBe(false);
    for (let i = 0; i < 20; i++) step(state, [wish({ yaw: 0, moveZ: 1, sprint: true, zoom: true }), other()]);
    expect(p.stamina).toBeLessThan(1);
    expect(Math.hypot(p.vx, p.vz)).toBeGreaterThan(TUNING.walkSpeed + 0.5);
  });

  it('goes down at 0 HP for the shared second wind, then dies', () => {
    const state = createMatch(4);
    const p = state.players[0];
    const foe = state.players[1];
    place(p, 0, 4, 0, 0);
    place(foe, 0, 0, Math.PI, 0);
    step(state, [wish({ yaw: 0 }), wish({ yaw: Math.PI })]);
    foe.hp = 500;
    foe.shield = 0;
    foe.shieldDelay = 5;
    step(state, [wish({ yaw: 0, fire: true }), wish({ yaw: Math.PI })]);
    expect(foe.downed).toBe(true);
    expect(foe.alive).toBe(true);
    expect(foe.hp).toBe(0);
    expect(foe.downedT).toBeLessThan(TUNING.secondWindTime);
    expect(foe.downedT).toBeGreaterThan(TUNING.secondWindTime - 0.05);
    let diedAt = null;
    for (let i = 0; i < 400 && foe.alive; i++) {
      step(state, [wish({ yaw: 0 }), wish({ yaw: Math.PI })]);
      if (!foe.alive) diedAt = state.tick;
    }
    expect(foe.alive).toBe(false);
    expect(diedAt).toBeGreaterThan(290);
    expect(diedAt).toBeLessThan(310);
  });

  it('moves the PvP fingerprint and the mirrored golden together', () => {
    const state = replay(scriptedMatch(7, 180));
    expect(state.phase).toBe('live');
    expect(state.players[0].downed).toBe(true);
    expect(state.players[1].downed).toBe(true);
    expect(state.tick).toBe(180);
    expect(CONTENT_FINGERPRINT).toBe('e749d2fd');
    expect(hashState(state)).toBe('da423456');
  });
});
