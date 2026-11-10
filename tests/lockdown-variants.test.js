import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { createGameState } from '../src/sim/state.js';
import { simulate } from '../src/sim/simulate.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

let seq = 0;
function boot(extra = {}) {
  const id = `T-LOCK-${++seq}`;
  const lv = makeV2Level({
    id, name: 'Lock',
    sections: [{
      id: 'S1', start: [2, 0, 6],
      geometry: [box({ id: 'floor', at: [12, -0.25, 6], size: [28, 0.5, 16] })],
      mechanisms: [
        { kind: 'switch', id: 'C1', at: [4, 0, 6], opens: 'dyersGate' },
        { kind: 'door', id: 'dyersGate', at: [10, 1.5, 6], size: [0.8, 3, 3] },
        { kind: 'door', id: 'exitGate', at: [18, 1.5, 6], size: [0.8, 3, 3] },
      ],
      checkpoints: [{ id: 'cp2', at: [2, 0, 6] }],
      encounters: [{
        id: 'L1',
        objective: { kind: 'clearAll' },
        activate: { min: [6, -2, 0], max: [22, 5, 14] },
        lockdown: {
          entry: 'dyersGate', exit: extra.noExit ? null : 'exitGate',
          threshold: { min: [9, -1, 2], max: [16, 4, 10] },
          waveSec: extra.waveSec, stallSec: extra.stallSec, delaySec: extra.delaySec,
          noExit: !!extra.noExit,
        },
        squads: extra.squads || [
          { id: 'w1', trigger: { type: 'onEnter' }, at: [[12, 0, 6], [13, 0, 6], [14, 0, 6]], units: [{ type: 'midget', count: 3 }] },
          { id: 'w2', trigger: { type: 'onRemain', n: 2 }, at: [[15, 0, 6]], units: [{ type: 'midget', count: 1 }] },
        ],
      }],
    }],
  });
  installLevel(lv);
  const s = createGameState({ seed: 2 });
  const p = s.players[s.localPlayerId];
  simulate(s, { [p.id]: cmd({ actions: [{ type: 'startMode', mode: 'campaign', level: id }] }) });
  return { s, p };
}

function frames(s, p, n, extra = {}) {
  for (let i = 0; i < n; i++) simulate(s, { [p.id]: cmd(extra) });
}

describe('lockdown variants', () => {
  it('keeps a switched entry shut until the switch, then drops it after the delay', () => {
    const { s, p } = boot({ waveSec: 25, delaySec: 0.2 });
    expect(s.level.closedDoors.map((d) => d.id)).toContain('dyersGate');
    p.pos = { x: 4, y: 0, z: 6 };
    simulate(s, { [p.id]: cmd() });
    expect(s.level.got.dyersGate).toBe(true);
    expect(s.level.closedDoors.map((d) => d.id)).not.toContain('dyersGate');
    p.pos = { x: 12, y: 0, z: 6 };
    simulate(s, { [p.id]: cmd() });
    expect(s.level.v2.enc.L1.sealed).toBe(false);
    frames(s, p, 20);
    expect(s.level.v2.enc.L1.sealed).toBe(true);
    expect(s.level.closedDoors.map((d) => d.id).sort()).toEqual(['dyersGate', 'exitGate']);
  });

  it('starts the next wave on the timer while more than two are alive', () => {
    const { s, p } = boot({ waveSec: 0.25, delaySec: 0 });
    p.pos = { x: 4, y: 0, z: 6 };
    simulate(s, { [p.id]: cmd() });
    p.pos = { x: 12, y: 0, z: 6 };
    frames(s, p, 5);
    expect(s.enemies.filter((e) => !e.dead && e.campaignEnc === 'L1')).toHaveLength(3);
    frames(s, p, 20);
    expect(s.enemies.filter((e) => !e.dead && e.campaignEnc === 'L1').length).toBeGreaterThan(3);
  });

  it('marks the last two and sends them at the player', () => {
    const { s, p } = boot({
      waveSec: 30, stallSec: 0.2, delaySec: 0,
      squads: [
        { id: 'w1', trigger: { type: 'onEnter' }, at: [[12, 0, 6], [13, 0, 6], [14, 0, 6]], units: [{ type: 'midget', count: 3 }] },
      ],
    });
    p.pos = { x: 4, y: 0, z: 6 };
    simulate(s, { [p.id]: cmd() });
    p.pos = { x: 12, y: 0, z: 6 };
    simulate(s, { [p.id]: cmd() });
    const live = () => s.enemies.filter((e) => !e.dead && e.campaignEnc === 'L1');
    live()[0].dead = true;
    frames(s, p, 20);
    expect(live().every((e) => e.ai.charge && e.marked)).toBe(true);
  });

  it('does not seal an exit when noExit is set, and pushes the player out of the slab', () => {
    const { s, p } = boot({ waveSec: 25, delaySec: 0.05, noExit: true });
    p.pos = { x: 4, y: 0, z: 6 };
    simulate(s, { [p.id]: cmd() });
    p.pos = { x: 10, y: 0, z: 6 };
    frames(s, p, 8);
    expect(s.level.v2.enc.L1.sealed).toBe(true);
    expect(s.level.closedDoors.map((d) => d.id)).toEqual(['dyersGate']);
    expect(p.pos.x).toBeGreaterThan(10.4);
  });

  it('rewinds a death inside the lockdown to the checkpoint', () => {
    const { s, p } = boot({ waveSec: 25, delaySec: 0 });
    p.pos = { x: 4, y: 0, z: 6 };
    simulate(s, { [p.id]: cmd() });
    p.pos = { x: 3, y: 0, z: 6 };
    simulate(s, { [p.id]: cmd() });
    expect(s.level.checkpoint).toBe('cp2');
    p.pos = { x: 12, y: 0, z: 6 };
    simulate(s, { [p.id]: cmd() });
    expect(s.enemies.some((e) => e.campaignEnc === 'L1')).toBe(true);
    p.dead = true;
    simulate(s, { [p.id]: cmd() });
    expect(s.level.lost).not.toBe(true);
    expect(s.events.some((e) => e.type === 'lockdownReset')).toBe(true);
    expect(s.players[s.localPlayerId].dead).toBe(false);
    expect(s.enemies.filter((e) => e.campaignEnc === 'L1')).toHaveLength(0);
  });

  it('spawns an onAlert squad when the player crosses the line', () => {
    const { s, p } = boot({
      squads: [
        { id: 'a', trigger: { type: 'onAlert', zBelow: 3 }, at: [[12, 0, 4]], units: [{ type: 'midget', count: 1 }] },
      ],
    });
    p.pos = { x: 12, y: 0, z: 10 };
    simulate(s, { [p.id]: cmd() });
    expect(s.enemies.filter((e) => e.campaignEnc === 'L1')).toHaveLength(0);
    p.pos = { x: 12, y: 0, z: 1 };
    simulate(s, { [p.id]: cmd() });
    expect(s.enemies.filter((e) => e.campaignEnc === 'L1')).toHaveLength(1);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('9ec1c6ea');
    expect(CONTENT_FINGERPRINT).toBe('17d87c54');
  });
});
