// Browser QA: accelerate the deterministic sim, but dispatch every event through the live
// UI/audio/VFX bus and draw real WebGL frames at wave transitions and during combat.
import { simulate } from '../../src/sim/simulate.js';
import { generateGun } from '../../src/sim/guns.js';
import { createPickup } from '../../src/sim/state.js';
import { damagePlayer } from '../../src/sim/combat.js';
import { GUN_TYPES } from '../../src/data/guns.js';
import { freezeAt } from '../../src/render/core/clock.js';
import { ensureCharacter, ensureGunModel, ensureStage } from '../../src/render/assets.js';
import { levelAssets } from '../../src/data/stages.js';

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
