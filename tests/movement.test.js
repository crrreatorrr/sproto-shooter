import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { TUNING } from '../src/data/tuning.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { createEnemy } from '../src/sim/state.js';
import { quantizeCommand, dequantizeCommand } from '../src/server/protocol.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function boot(extra = {}) {
  const id = `T-MOVE-${Math.floor(Math.random() * 1e6)}`;
  const lv = makeV2Level({
    id, name: 'Move',
    sections: [{
      id: 'S1', start: [4, 0, 8],
      geometry: [
        box({ id: 'floor', at: [10, -0.25, 8], size: [40, 0.5, 20] }),
        box({ id: 'high', at: [6, 1, 8], size: [6, 2, 6] }),
        box({ id: 'low', at: [14, -0.25, 8], size: [8, 0.5, 8] }),
        box({ id: 'wall', at: [22, 2, 8], size: [1, 4, 6], mat: 'metal' }),
        ...(extra.geometry || []),
      ],
      noGrapple: extra.noGrapple,
      grappleAnchors: extra.anchors,
      encounters: [{
        id: 'E', objective: { kind: 'reach' },
        activate: { min: [80, -2, 0], max: [90, 4, 4] },
        squads: [],
        lockdown: extra.lockdown || null,
      }],
    }],
  });
  installLevel(lv);
  const s = createGameState({ seed: 1 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: id }] }) });
  return { s, p };
}

function frames(s, p, n, c) {
  for (let i = 0; i < n; i++) simulate(s, { [p.id]: typeof c === 'function' ? c() : c });
}

describe('slide, grapple, stamina', () => {
  it('drains sprint, then refuses it until the bar refills', () => {
    const { s, p } = boot();
    p.pos = { x: 4, y: 0, z: 8 };
    frames(s, p, 10, cmd({ moveZ: 1, held: { sprint: true } }));
    expect(p.stamina).toBeLessThan(1);
    let locked = false;
    for (let i = 0; i < 400; i++) {
      simulate(s, { [p.id]: cmd({ moveZ: 1, held: { sprint: true } }) });
      if (p.staminaLock) locked = true;
    }
    expect(locked).toBe(true);
    p.stamina = 0;
    p.staminaLock = true;
    p.staminaDelay = 0;
    frames(s, p, 15, cmd({}));
    expect(p.staminaLock).toBe(true);
    frames(s, p, 80, cmd({}));
    expect(p.staminaLock).toBe(false);
  });

  it('slides from a sprint, hops, and will not chain until the hop cooldown ends', () => {
    const { s, p } = boot();
    p.pos = { x: 8, y: 0, z: 8 };
    p.vel = { x: 9, y: 0, z: 0 };
    p.yaw = -Math.PI / 2;
    const before = p.stamina == null ? 1 : p.stamina;
    simulate(s, { [p.id]: cmd({ yaw: p.yaw, moveZ: 1, held: { sprint: true }, pressed: { slide: true } }) });
    expect(p.move.mode).toBe('slide');
    expect(Math.hypot(p.vel.x, p.vel.z)).toBeGreaterThan(12);
    expect(p.stamina).toBeLessThan(before);
    simulate(s, { [p.id]: cmd({ yaw: p.yaw, pressed: { jump: true } }) });
    expect(p.move.mode).toBe('air');
    expect(p.move.slideCd).toBeGreaterThan(0.5);
    const cd = p.move.slideCd;
    p.onGround = true;
    p.vel = { x: 10, y: 0, z: 0 };
    simulate(s, { [p.id]: cmd({ yaw: p.yaw, pressed: { slide: true } }) });
    expect(p.move.mode).not.toBe('slide');
    expect(p.move.slideCd).toBeLessThan(cd);
  });

  it('picks up speed when the slide points downhill', () => {
    const { s, p } = boot();
    p.pos = { x: 8.2, y: 2, z: 8 };
    p.prevPos = { ...p.pos };
    p.onGround = true;
    p.vel = { x: 8, y: 0, z: 0 };
    p.yaw = -Math.PI / 2;
    p.move.mode = 'slide';
    p.move.slideT = 0.7;
    const start = Math.hypot(p.vel.x, p.vel.z);
    simulate(s, { [p.id]: cmd({ yaw: p.yaw }) });
    expect(Math.hypot(p.vel.x, p.vel.z)).toBeGreaterThan(start * 0.95);
  });

  it('hooks a wall, flings on release, and ignores a no-grapple box', () => {
    const { s, p } = boot();
    p.pos = { x: 16, y: 0, z: 8 };
    p.yaw = -Math.PI / 2;
    p.pitch = 0;
    const foe = createEnemy(s, 'midget', { pos: { x: 18, z: 8 } });
    foe.state = 'chase';
    simulate(s, { [p.id]: cmd({ yaw: p.yaw, held: { grapple: true } }) });
    expect(p.grapple).toBeTruthy();
    expect(p.grapple.id).not.toBe(foe.id);
    const pulled = p.vel.x;
    expect(pulled).toBeGreaterThan(0);
    const stam = p.stamina;
    simulate(s, { [p.id]: cmd({ yaw: p.yaw, held: { grapple: true } }) });
    expect(p.stamina).toBeCloseTo(stam, 5);
    const flung = { x: p.vel.x, y: p.vel.y, z: p.vel.z };
    simulate(s, { [p.id]: cmd({ yaw: p.yaw }) });
    expect(p.grapple).toBeNull();
    expect(p.vel.x).toBeCloseTo(flung.x, 4);
    expect(p.vel.z).toBeCloseTo(flung.z, 4);
    expect(p.grappleCd).toBeGreaterThan(5);
    p.grappleCd = 0;
    p.pos = { x: 16, y: 0, z: 8 };
    s.level.noGrapple = [{ min: [20, 0, 4], max: [24, 6, 12] }];
    simulate(s, { [p.id]: cmd({ yaw: p.yaw, held: { grapple: true } }) });
    expect(p.grapple).toBeNull();
  });

  it('an upward hook flings the player over a gap and keeps that speed', () => {
    const id = 'T-FLING';
    const lv = makeV2Level({
      id, name: 'Fling',
      sections: [{
        id: 'S1', start: [2, 0, 8],
        geometry: [
          box({ id: 'near', at: [4, -0.25, 8], size: [8, 0.5, 8] }),
          box({ id: 'lip', at: [16, 6, 8], size: [1, 12, 6], mat: 'metal' }),
          box({ id: 'far', at: [24, -0.25, 8], size: [8, 0.5, 8] }),
        ],
        encounters: [{ id: 'E', objective: { kind: 'reach' }, activate: { min: [80, -2, 0], max: [90, 4, 4] }, squads: [] }],
      }],
    });
    installLevel(lv);
    const s = createGameState({ seed: 1 });
    const p = s.players[s.localPlayerId];
    simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: id }] }) });
    p.pos = { x: 4, y: 0, z: 8 };
    p.yaw = -Math.PI / 2;
    p.pitch = 0.55;
    let up = 0;
    let along = 0;
    for (let i = 0; i < 24; i++) {
      simulate(s, { [p.id]: cmd({ yaw: p.yaw, pitch: 0.55, held: { grapple: true } }) });
      if (p.vel.y > up) up = p.vel.y;
      if (p.vel.x > along) along = p.vel.x;
    }
    expect(up).toBeGreaterThan(10);
    expect(along).toBeGreaterThan(8);
    const heldX = p.vel.x;
    simulate(s, { [p.id]: cmd({ yaw: p.yaw, pitch: 0.55, moveZ: 1 }) });
    expect(p.grapple).toBeNull();
    expect(p.vel.x).toBeGreaterThan(heldX * 0.9);
    let peak = p.pos.y;
    for (let i = 0; i < 40; i++) {
      simulate(s, { [p.id]: cmd({ yaw: p.yaw, moveZ: 1 }) });
      if (p.pos.y > peak) peak = p.pos.y;
    }
    expect(peak).toBeGreaterThan(3);
    expect(p.pos.x).toBeGreaterThan(14);
  });

  it('puts grapple on the run log and keeps the PvP fingerprint', () => {
    const back = dequantizeCommand(quantizeCommand(cmd({ held: { grapple: true }, pressed: { grapple: true } })));
    expect(back.held.grapple).toBe(true);
    expect(back.pressed.grapple).toBe(true);
    expect(CONTENT_FINGERPRINT).toBe('17d87c54');
    expect(contentFingerprint(1)).toBe('9ec1c6ea');
  });
});
