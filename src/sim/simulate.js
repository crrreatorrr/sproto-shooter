// Pure sim entry point. No rendering, DOM, unseeded randomness or wall clock in src/sim or src/data. PLAN §1.5
import { applyActions, bossFightDirector } from './actions.js';
import { playerInput, playerMovement, playerCombat, playerVitals } from './player.js';
import { spells } from './spells.js';
import { enemyAI } from './enemies.js';
import { bosses } from './bosses.js';
import { projectiles, hazards, statusEffects, pickups, allies, cleanup, snapshotPrev } from './world.js';
import { crafting } from './economy.js';
import { progression } from './progression.js';
import { waveDirector } from './waves.js';
import { campaignPre, campaignPost } from './campaign/campaign.js';
import { snapScripted } from './campaign/scriptSnap.js';

export const DT = 1 / 60;

export function simulate(state, commands, dt = DT) {
  state.events.length = 0;
  state.tick++;
  state.time += dt;
  snapshotPrev(state);
  playerInput(state, commands);
  applyActions(state, commands);
  if (state.mode === 'campaign') campaignPre(state, dt);
  playerMovement(state, dt);
  playerCombat(state, dt);
  spells(state, dt);
  allies(state, dt);
  waveDirector(state, dt);
  bossFightDirector(state);
  enemyAI(state, dt);
  bosses(state, dt);
  hazards(state, dt);
  projectiles(state, dt);
  statusEffects(state, dt);
  playerVitals(state, dt);
  pickups(state, dt);
  crafting(state, dt);
  progression(state);
  if (state.mode === 'campaign') campaignPost(state, dt);
  snapScripted(state);
  cleanup(state);
}
