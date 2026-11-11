// Synthetic, server-owned setup for regression coverage. These are NOT real
// issued reward traces: placement, death and inventory setup are trusted inputs.
import { box } from '../../src/data/levels/kit.js';
import { makeV2Level } from '../../src/data/levels/v2.js';
import { installLevel } from '../../src/data/levels/index.js';
import { createGameState, createEnemy, createPickup } from '../../src/sim/state.js';
import { simulate } from '../../src/sim/simulate.js';
import { generateGun } from '../../src/sim/guns.js';
import { restoreCheckpoint } from '../../src/sim/campaign/campaign.js';
import { verifyStateHash } from '../../src/sim/hash.js';

export const SYNTHETIC_SCOPE = 'synthetic server-owned setup; not an issued reward trace';
export const command = (extra = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...extra });
export function step(state, extra = {}) {
  simulate(state, { [state.localPlayerId]: command(extra) });
  return state.events.map((event) => ({ ...event }));
}
function place(player, x, y, z) {
  player.pos = { x, y, z };
  player.prevPos = { ...player.pos };
  player.vel = { x: 0, y: 0, z: 0 };
}
const unreachable = { id: 'pending', objective: { kind: 'reach' }, activate: { min: [80, -2, 0], max: [90, 4, 4] }, squads: [] };
function section(extra = {}) {
  return { id: 'S1', start: [2, 0, 6], geometry: [box({ id: 'floor', at: [12, -0.25, 6], size: [28, 0.5, 16] })], encounters: [unreachable], ...extra };
}
function boot(id, sections) {
  installLevel(makeV2Level({ id, name: 'Synthetic corpus', sections }));
  const state = createGameState({ seed: 7 });
  step(state, { actions: [{ type: 'startMode', mode: 'campaign', level: id }] });
  return state;
}

export function lockdownScenario() {
  const state = boot('T-CORPUS-LOCK', [section({
    checkpoints: [{ id: 'cp2', at: [2, 0, 6] }],
    mechanisms: [
      { kind: 'switch', id: 'switch', at: [4, 0, 6], opens: 'entry' },
      { kind: 'door', id: 'entry', at: [10, 1.5, 6], size: [0.8, 3, 3] },
      { kind: 'door', id: 'exit', at: [18, 1.5, 6], size: [0.8, 3, 3] },
    ],
    encounters: [{ id: 'lock', objective: { kind: 'clearAll' },
      activate: { min: [6, -2, 0], max: [22, 5, 14] },
      lockdown: { entry: 'entry', exit: 'exit', threshold: { min: [9, -1, 2], max: [16, 4, 10] }, waveSec: 25, delaySec: 0 },
      squads: [{ id: 'wave', trigger: { type: 'onEnter' }, at: [[12, 0, 6]], units: [{ type: 'midget', count: 1 }] }],
    }],
  })]);
  const player = state.players[state.localPlayerId];
  place(player, 4, 0, 6); step(state);
  place(player, 3, 0, 6); step(state);
  place(player, 12, 0, 6); step(state);
  const checkpoint = state.level.checkpoint;
  const sealed = state.level.v2.enc.lock.sealed;
  const spawned = state.enemies.some((enemy) => enemy.campaignEnc === 'lock');
  const cloned = JSON.parse(JSON.stringify(state));
  const originalHash = verifyStateHash(state);
  const jsonHash = verifyStateHash(cloned);
  // Known limitation: checkpoint snapshots live in a WeakMap, outside JSON.
  // Assert the limitation explicitly until a separate production fix lands.
  const jsonRestoreSupported = restoreCheckpoint(cloned);
  player.dead = true;
  const events = step(state);
  return { state, checkpoint, sealed, spawned, originalHash, jsonHash, jsonRestoreSupported, events };
}

export function voidScenario() {
  const state = boot('T-CORPUS-VOID', [section({ start: [4, 0, 6],
    voids: [{ id: 'gap', min: [-10, -200, -10], max: [40, -40, 40], penalty: 0.25, invuln: 1, mode: 'lastSafe', to: [4, 0, 6] }],
  })]);
  step(state);
  const player = state.players[state.localPlayerId];
  player.shield = 0;
  const damageBefore = state.run.damageTaken;
  place(player, 20, -50, 6);
  const events = step(state);
  return { state, damageBefore, events };
}

export function pickupsScenario() {
  const state = boot('T-CORPUS-PICKUPS', [section()]);
  const player = state.players[state.localPlayerId];
  player.ammo.bullets = 0;
  const ammo = createPickup(state, { kind: 'ammo', ammoType: 'bullets', amount: 10, pos: { x: player.pos.x, y: 0.7, z: player.pos.z } });
  const ammoEvents = step(state);
  const collectedAmmo = player.ammo.bullets;
  const gun = generateGun({ seed: 5, level: 1, forced: { type: 'bigbullets', quality: 'common', manufacturer: 'reliable', element: 'none' } });
  gun.id = 9001;
  const pickup = createPickup(state, { kind: 'gun', gun, pos: { x: player.pos.x, y: 0.6, z: player.pos.z } });
  const gunEvents = step(state, { actions: [{ type: 'pickupGun', pickupId: pickup.id }] });
  for (let i = 0; i < 30; i++) step(state);
  const target = createEnemy(state, 'dummy', { pos: { x: player.pos.x, z: player.pos.z - 10 } });
  target.state = 'idle';
  const hpBefore = target.hp;
  step(state, { pitch: Math.atan2(target.pos.y + 0.8 - (player.pos.y + 1.6), 10), held: { fire: true } });
  const projectileCreated = state.projectiles.some((shot) => shot.kind === 'bigBullet');
  for (let i = 0; i < 30; i++) step(state);
  return { state, ammo, collectedAmmo, ammoEvents, gunEvents, gunId: gun.id, projectileCreated, hpBefore, hpAfter: target.hp };
}

export function transitionScenario() {
  const state = boot('T-CORPUS-TRANSITION', [
    section({ encounters: [], exit: { min: [4, -2, 4], max: [8, 4, 8] } }),
    section({ id: 'S2', start: [20, 0, 6], intro: { title: 'Second section', lines: ['Synthetic fixture'] } }),
  ]);
  place(state.players[state.localPlayerId], 6, 0, 6);
  const exitEvents = step(state);
  const pending = state.level.transition && { ...state.level.transition };
  step(state, { actions: [{ type: 'transitionDone' }] });
  const arrivedSection = state.level.section;
  const introTitle = state.level.intro && state.level.intro.title;
  step(state, { actions: [{ type: 'transitionDone' }] });
  return { state, pending, arrivedSection, introTitle, exitEvents };
}
