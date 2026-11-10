// A multi-bar Sahil kite used to prove node and goja stay on the same hash.
// It is not the live L02 encounter. That script stays unattached until this matches.
import { box } from '../../data/levels/kit.js';
import { makeV2Level } from '../../data/levels/v2.js';
import { installLevel } from '../../data/levels/index.js';
import { verifyStateHash } from '../hash.js';
import { createGameState } from '../state.js';
import { simulate } from '../simulate.js';
import { startCampaign } from './campaign.js';
import { kiteCommand } from './kiteAim.js';
import { grantSpell } from '../spellbook.js';

const ATTACKS = ['bolt', 'blast', 'rugSlam'];

function kiteLevel() {
  return makeV2Level({
    id: 'kite-probe',
    name: 'Kite',
    sections: [{
      id: 'S',
      start: [8, 0, 8],
      geometry: [box({ id: 'floor', at: [16, -0.25, 16], size: [48, 0.5, 48] })],
      encounters: [{
        id: 'kite',
        activate: { min: [0, -4, 0], max: [40, 8, 40] },
        squads: [{
          id: 'boss', trigger: { type: 'onEnter' }, at: [[16, 0, 16]],
          units: [{ type: 'sahil', count: 1 }],
        }],
        script: {
          parts: [
            { id: 'p1', hp: 1500, attacks: ATTACKS },
            { id: 'p2', hp: 1500, attacks: ATTACKS },
            { id: 'p3', hp: 1500, attacks: ATTACKS },
          ],
        },
      }],
    }],
  });
}

function bossOf(state) {
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (e.boss && e.type === 'sahil') return e;
  }
  return null;
}

/** Fixed-length kite. mode is success, assisted, or fail. */
export function runSahilKiteProbe(seed = 7, mode = 'success', maxFrames = 3600) {
  installLevel(kiteLevel());
  const state = createGameState({ seed });
  const p = state.players[state.localPlayerId];
  startCampaign(state, p, 'kite-probe');
  grantSpell(state, p, 'gooBolt');
  state.tuning.infiniteAmmo = true;
  const frames = maxFrames > 0 ? maxFrames : 3600;
  for (let i = 0; i < frames; i++) {
    const cmd = kiteCommand(state, mode);
    const dx = 16 - p.pos.x, dz = 16 - p.pos.z;
    if (dx * dx + dz * dz > 14 * 14) {
      cmd.yaw = Math.atan2(-dx, -dz);
      cmd.moveZ = 1;
      cmd.held.sprint = true;
    }
    simulate(state, { [p.id]: cmd });
  }
  const boss = bossOf(state);
  const book = state.level && state.level.scripts && state.level.scripts.kite;
  return {
    seed,
    mode,
    tick: state.tick,
    hash: verifyStateHash(state),
    playerDead: !!p.dead,
    bossDead: !boss || !!boss.dead,
    bossHp: boss ? boss.hp : 0,
    part: book ? book.part : 0,
  };
}
