// Browser QA: accelerate the deterministic sim, but dispatch every event through the live
// UI/audio/VFX bus and draw real WebGL frames at wave transitions and during combat.
import { simulate } from '../../src/sim/simulate.js';
import { generateGun } from '../../src/sim/guns.js';
import { createPickup } from '../../src/sim/state.js';
import { damagePlayer } from '../../src/sim/combat.js';
import { GUN_TYPES } from '../../src/data/guns.js';
import { TUNING } from '../../src/data/tuning.js';
import { freezeAt } from '../../src/render/core/clock.js';
import { ensureCharacter, ensureGunModel, ensureStage } from '../../src/render/assets.js';
import { levelAssets } from '../../src/data/stages.js';
import { PLAYER_CHARACTERS } from '../../src/render/playerCharacters.js';
import { loadPlayerModel } from '../../src/render/firstPerson.js';
import { attachModel, disposeModel } from '../../src/render/pvp/actor.js';

const cmd = (o = {}) => ({ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [], ...o });

export function ammoPickups(game) {
  game.hideScreen();
  const types = [...new Set(GUN_TYPES.map((gun) => gun.ammoType)), 'unknown-ammo'];
  for (const [i, ammoType] of types.entries()) {
    createPickup(game.state, { kind: 'ammo', ammoType, amount: 1, pos: { x: i - 4, y: 1, z: -6 } });
  }
  createPickup(game.state, { kind: 'resource', resId: 'unknown-resource', pos: { x: 0, y: 1, z: -7 } });
  return game.state.tick;
}

export function defeatRun(game) {
  const s = game.state, p = s.players[s.localPlayerId];
  s.events = [];
  damagePlayer(s, p, { base: 10000, sourceKind: 'enemy' });
  const downed = p.downed;
  game.bus.emitAll(s.events);
  for (let i = 0; i < 1200 && s.wave.phase !== 'defeat'; i++) {
    simulate(s, { [p.id]: cmd() });
    game.bus.emitAll(s.events);
  }
  game.ui.update(s);
  return { downed, phase: s.wave.phase, dead: p.dead };
}

export async function waveRun(game, tier) {
  // Stop automatic frames while this harness advances the same state and presentation explicitly.
  game.frame = () => {};
  game.hideScreen();
  game.audio.toggleMute(); // accelerated events must not schedule minutes of audio at once
  const s = game.state, p = s.players[s.localPlayerId];
  const gun = generateGun({ seed: 5, level: tier + 3, forced: { type: 'mg', quality: 'legendary', wacky: 'tenthMega' } });
  gun.id = s.nextId++;
  p.guns[0] = gun;
  const phases = [], events = {};
  let renderTime = performance.now(), frames = 0;
  function step(c) {
    simulate(s, { [p.id]: c });
    for (const ev of s.events) {
      events[ev.type] = (events[ev.type] || 0) + 1;
      game.bus.emit(ev);
    }
  }
  function draw() {
    freezeAt(renderTime += 50);
    game.renderer.render(s, 1, { yaw: p.yaw, pitch: p.pitch });
    game.ui.update(s);
    frames++;
  }
  try {
    step(cmd({ actions: [
      { type: 'startMode', mode: 'waves', tier },
      { type: 'debug', op: 'setTuning', args: { key: 'godMode', value: true } },
      { type: 'debug', op: 'setTuning', args: { key: 'infiniteAmmo', value: true } },
    ] }));
    for (let i = 0; i < 60 * 60 * 8; i++) {
      const phase = `${s.wave.index}:${s.wave.phase}`;
      if (phases.at(-1) !== phase) {
        phases.push(phase);
        draw(); // loading placeholders are exercised too
        const assets = levelAssets(s.wave.index, tier);
        await Promise.all([
          ensureStage(assets.stage),
          ...[...assets.characters, ...assets.bosses].map(({ model, stage }) => ensureCharacter(model, stage)),
        ]);
        draw();
        if (s.wave.phase === 'intermission') {
          for (const panel of ['shop', 'inventory', 'skills', 'stats']) {
            game.ui.openMenu(panel);
            game.ui.update(s);
            game.ui.closeMenu();
          }
        }
      }
      let best = null, distance = Infinity;
      for (const e of s.enemies) {
        if (e.dead || e.state === 'spawning') continue;
        const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
        if (d < distance) { distance = d; best = e; }
      }
      if (!best) step(cmd({ pressed: { skip: true } }));
      else {
        const y = best.type === 'hexAuditor' ? best.pos.y : best.pos.y + best.height * best.scale * 0.5;
        step(cmd({
          yaw: Math.atan2(-(best.pos.x - p.pos.x), -(best.pos.z - p.pos.z)),
          pitch: Math.atan2(y - (p.pos.y + 1.6), distance) - p.recoil.pitch,
          held: { fire: true },
        }));
      }
      if (i % 30 === 0) game.ui.update(s);
      if (i % 600 === 0) { draw(); await new Promise((resolve) => setTimeout(resolve, 0)); }
      if (s.wave.phase === 'victory') break;
    }
    draw();
    return { phase: s.wave.phase, bosses: s.run.bossKills, kills: s.run.kills, frames, phases, events };
  } finally {
    freezeAt(null);
  }
}

export async function weaponsAndSpells(game) {
  game.frame = () => {};
  game.hideScreen();
  game.audio.toggleMute();
  const s = game.state, p = s.players[s.localPlayerId];
  const events = {}, gunCounts = {}, spells = new Set();
  const guns = ['mg', 'shotgun', 'sniper', 'bazooka', 'raygun', 'bigbullets', 'duckgun'];
  let time = performance.now();
  function step(c) {
    simulate(s, { [p.id]: c });
    for (const ev of s.events) {
      events[ev.type] = (events[ev.type] || 0) + 1;
      if (ev.type === 'cast') spells.add(ev.spellId);
      game.bus.emit(ev);
    }
    game.ui.update(s);
  }
  function draw() {
    freezeAt(time += 50);
    game.renderer.render(s, 1, { yaw: p.yaw, pitch: p.pitch });
  }
  try {
    step(cmd({ actions: [{ type: 'startMode', mode: 'waves', tier: 1 }, { type: 'debug', op: 'toggleGod' }] }));
    await Promise.all(guns.map((type) => ensureGunModel(type)));
    for (const type of guns) {
      const shots = events.shot || 0, reloads = events.reloadStart || 0;
      const g = generateGun({ seed: 21, level: 1, forced: { type, element: 'shock' } });
      g.id = s.nextId++;
      p.guns[0] = g; p.activeSlot = 0; p.reloadT = p.fireCd = p.swapT = 0;
      for (let i = 0; i < 180; i++) {
        step(cmd({ held: { fire: true }, pressed: { reload: i === 35, gooBolt: i === 10 } }));
        if (i % 45 === 0) draw();
      }
      gunCounts[type] = { shots: (events.shot || 0) - shots, reloads: (events.reloadStart || 0) - reloads };
    }
    for (const spell of ['gooBolt', 'chainZap', 'swarm', 'manaShield', 'meteor']) {
      p.spells.cd[spell] = 0;
      step(cmd({ pressed: { [spell]: true } }));
      draw();
      for (let i = 0; i < 120; i++) { step(cmd()); if (i % 40 === 0) draw(); }
    }
    return { events, guns: gunCounts, spells: [...spells] };
  } finally {
    freezeAt(null);
  }
}

export async function grapplerRun(game) {
  game.frame = () => {};
  game.hideScreen();
  const { THREE, camera, firstPerson, scene } = game.renderer;
  const state = game.state, player = state.players[state.localPlayerId];
  const look = { yaw: 0, pitch: -0.115 };
  const report = {};
  let time = performance.now();
  function draw() {
    freezeAt(time += 30);
    game.renderer.render(state, 1, look);
  }
  function step(grapple, ticks, zoom = false) {
    for (let i = 0; i < ticks; i++) {
      simulate(state, { [player.id]: cmd({ ...look, held: { grapple, zoom } }) });
      draw();
    }
  }
  try {
    state.enemies.length = 0;
    const effects = scene.getObjectByName('Grapple effects');
    const head = effects.getObjectByName('Claw');
    const jaws = [1, 2, 3].map((i) => head.getObjectByName(`Jaw_hinge_${i}`));
    const impact = effects.getObjectByName('Grapple latch flash');
    const tether = effects.getObjectByName('Grapple tether');
    const viewmodelCamera = camera.clone(false);
    viewmodelCamera.fov = TUNING.fovBase;
    viewmodelCamera.updateProjectionMatrix();
    const weapon = () => camera.children.flatMap((child) => child.children).find((object) => object.userData.gunId !== undefined);
    for (const { id, model } of PLAYER_CHARACTERS) {
      firstPerson.selectModel(model);
      const source = await loadPlayerModel(model);
      const arenaBody = { group: new THREE.Group(), capsule: new THREE.Group() };
      arenaBody.group.position.set(8, 0.5, -14);
      arenaBody.group.rotation.y = Math.PI;
      attachModel(arenaBody, source, model);
      const arenaFit = arenaBody.grappleArm.surface.length > 0;
      disposeModel(arenaBody);
      Object.assign(player.pos, { x: 0, y: 0, z: 0 });
      Object.assign(player.prevPos, player.pos);
      Object.assign(player.vel, { x: 0, y: 0, z: 0 });
      player.grappleCd = 0;
      draw();
      const launcher = camera.getObjectByName('Launcher');
      const dock = launcher.getObjectByName('Dock');
      const stowed = dock.getObjectByName('Claw');
      const docked = firstPerson.debug().mountedPath === model && launcher.visible && stowed.visible && !effects.visible;
      const { upper, lower, hand } = firstPerson.grappleArm;
      const rightHand = firstPerson.debug().arms.Right.hand;
      const rightAtRest = camera.worldToLocal(rightHand.getWorldPosition(new THREE.Vector3()));
      const gunAtRest = weapon().position.y, pitchAtRest = weapon().rotation.x;
      const wristAtRest = hand.getWorldPosition(new THREE.Vector3()).sub(player.pos);
      step(true, 3);
      const windsUp = effects.visible && tether.visible && !head.visible && stowed.visible;
      step(true, 1);
      const gunLowered = weapon().position.y < gunAtRest - 0.10 && weapon().rotation.x < pitchAtRest - 0.32
        && camera.worldToLocal(rightHand.getWorldPosition(new THREE.Vector3())).y < rightAtRest.y - 0.025;
      const launchZ = head.position.z;
      const shoulder = upper.getWorldPosition(new THREE.Vector3());
      const elbow = lower.getWorldPosition(new THREE.Vector3());
      const wrist = hand.getWorldPosition(new THREE.Vector3());
      const reach = shoulder.distanceTo(wrist) / (shoulder.distanceTo(elbow) + elbow.distanceTo(wrist));
      const extended = windsUp && effects.visible && reach > 0.95 && wrist.sub(player.pos).distanceTo(wristAtRest) > 0.045;
      step(true, 2);
      const flight = effects.visible && !stowed.visible && head.position.z < launchZ - 3 && jaws.every((jaw) => jaw.rotation.x < -0.4);
      step(true, 7);
      const latch = !!player.grapple && impact.visible && Math.abs(head.position.z - player.grapple.z) < 0.25
        && jaws.every((jaw) => Math.abs(jaw.rotation.x) < 0.16);
      step(false, 12);
      const returned = !effects.visible && stowed.visible;
      const gunRaised = Math.abs(weapon().position.y - gunAtRest) < 0.04 && Math.abs(weapon().rotation.x - pitchAtRest) < 0.07;
      player.grappleCd = 0;
      step(true, 4, true);
      const fovScale = Math.tan(camera.fov * Math.PI / 360) / Math.tan(TUNING.fovBase * Math.PI / 360);
      const handoff = Math.abs(head.scale.x - dock.getWorldScale(new THREE.Vector3()).x * fovScale) < 0.002;
      step(true, 2, true);
      viewmodelCamera.matrixWorldInverse.copy(camera.matrixWorldInverse);
      const socketOnScreen = dock.getWorldPosition(new THREE.Vector3()).project(viewmodelCamera);
      const tetherOnScreen = tether.localToWorld(new THREE.Vector3(0, -0.5, 0)).project(camera);
      const aimed = camera.fov < TUNING.fovBase - 1 && socketOnScreen.distanceTo(tetherOnScreen) < 0.002;
      const canceledAt = head.position.z;
      step(false, 3);
      const canceled = !impact.visible && head.position.z > canceledAt;
      step(false, 12);
      player.grappleCd = 0;
      step(true, 2);
      const cue = effects.visible && tether.visible && tether.material.opacity < 0.4 && !head.visible;
      step(false, 1);
      const quickTap = cue && !effects.visible && stowed.visible;
      step(false, 7);
      report[id] = { docked, flight, latch, returned, aimed, handoff, canceled, extended, quickTap, gunLowered, gunRaised, arenaFit };
    }
    return report;
  } finally {
    freezeAt(null);
  }
}
