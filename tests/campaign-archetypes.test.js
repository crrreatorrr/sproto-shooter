import { describe, expect, it } from 'vitest';
import { createGameState, createEnemy } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { damageEnemy } from '../src/sim/combat.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

function boot() {
  const s = createGameState({ seed: 3 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: 'L01' }] }) });
  return { s, p };
}

describe('campaign archetypes', () => {
  it('a boom midget blast hurts a neighbour', () => {
    const { s, p } = boot();
    const boom = createEnemy(s, 'boomMidget', { pos: { x: p.pos.x + 6, z: p.pos.z } });
    boom.state = 'chase';
    const pal = createEnemy(s, 'midget', { pos: { x: boom.pos.x + 1.2, z: boom.pos.z } });
    pal.state = 'chase';
    const before = pal.hp;
    damageEnemy(s, boom, { base: 400, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    expect(boom.dead).toBe(true);
    expect(pal.hp).toBeLessThan(before);
  });

  it('a kamikaze midget runs in, lights its fuse and blows up on the player', () => {
    const { s, p } = boot();
    const k = createEnemy(s, 'kamikazeMidget', { pos: { x: p.pos.x + 9, z: p.pos.z } });
    k.state = 'chase';
    const pal = createEnemy(s, 'dummy', { pos: { x: p.pos.x + 1.5, z: p.pos.z + 1.5 } });
    const start = { hp: p.hp, shield: p.shield, pal: pal.hp };
    let lit = false;
    for (let i = 0; i < 300 && !k.dead; i++) {
      simulate(s, { [p.id]: cmd() });
      if (k.ai.fuseT != null) lit = true;
    }
    expect(lit).toBe(true);
    expect(k.dead).toBe(true);
    expect(p.hp + p.shield).toBeLessThan(start.hp + start.shield);
    expect(pal.hp).toBeLessThan(start.pal); // the death blast still catches its neighbours
  });

  it('a kamikaze midget shot at range never reaches the player', () => {
    const { s, p } = boot();
    const k = createEnemy(s, 'kamikazeMidget', { pos: { x: p.pos.x + 12, z: p.pos.z } });
    k.state = 'chase';
    const before = p.hp + p.shield;
    damageEnemy(s, k, { base: 400, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    expect(k.dead).toBe(true);
    expect(k.ai.fuseT).toBeUndefined();
    expect(p.hp + p.shield).toBe(before);
  });

  it('a riot shield faces the player', () => {
    const { s, p } = boot();
    const riot = createEnemy(s, 'riotMidget', { pos: { x: 0, z: 0 } });
    riot.state = 'chase';
    riot.yaw = 0;
    p.pos = { x: 0, y: 0, z: -4 };
    const front = damageEnemy(s, riot, { base: 20, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    riot.hp = riot.maxHp;
    p.pos = { x: 0, y: 0, z: 4 };
    const back = damageEnemy(s, riot, { base: 20, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    expect(front).toBeLessThan(back);
  });

  it('a hex bubble halves the next hit on an ally', () => {
    const { s, p } = boot();
    const hex = createEnemy(s, 'hexAcolyte', { pos: { x: p.pos.x + 8, z: p.pos.z } });
    hex.state = 'chase';
    hex.ai.bubbleCd = 0.01;
    const pal = createEnemy(s, 'midget', { pos: { x: hex.pos.x + 2, z: hex.pos.z } });
    pal.state = 'chase';
    for (let i = 0; i < 5; i++) simulate(s, { [p.id]: cmd() });
    expect(pal.ai.bubble).toBeGreaterThan(0);
    const bubbled = damageEnemy(s, pal, { base: 20, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    const bare = createEnemy(s, 'midget', { pos: { x: 40, z: 40 } });
    bare.state = 'chase';
    const open = damageEnemy(s, bare, { base: 20, sourceId: p.id, sourceKind: 'gun', zone: 'body' });
    expect(bubbled).toBeLessThan(open);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('cea1f88b');
    expect(CONTENT_FINGERPRINT).toBe('b33eada6');
  });
});
