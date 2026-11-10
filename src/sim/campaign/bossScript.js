// Optional multi-part script on a v2 boss encounter. Adds and targets are
// spawned here, not as encounter squads, so the canonical squad list stays
// the boss alone.
import { createEnemy } from '../state.js';
import { damagePlayer } from '../combat.js';

function scriptBook(lv, encId) {
  if (!lv.scripts) lv.scripts = {};
  if (!lv.scripts[encId]) {
    lv.scripts[encId] = { part: 0, partT: 0, spawned: {}, targets: {}, outside: false };
  }
  return lv.scripts[encId];
}

function bossOf(state, enc) {
  for (const e of state.enemies) {
    if (!e.dead && e.boss && e.campaignEnc === enc.id) return e;
  }
  return null;
}

function spawnTarget(state, enc, spec, boss, player, index) {
  const dx = player.pos.x - boss.pos.x;
  const dz = player.pos.z - boss.pos.z;
  const dist = Math.hypot(dx, dz) || 1;
  const fx = dx / dist, fz = dz / dist;
  const side = index % 2 === 0 ? 1 : -1;
  const at = spec.at || [
    boss.pos.x + fx * 3 + -fz * side * 1.6,
    0,
    boss.pos.z + fz * 3 + fx * side * 1.6,
  ];
  const e = createEnemy(state, 'midget', { pos: { x: at[0], z: at[2] } });
  e.campaignEnc = enc.id;
  e.partId = spec.id;
  e.ai.scriptTarget = true;
  const rise = spec.rise != null ? spec.rise : (String(spec.id).startsWith('pylon') ? 1.5 : 0);
  if (rise > 0) e.ai.riseT = rise;
  e.state = 'chase';
  const hp = Math.max(1, Math.round((spec.hp || 1) * (state.tuning.enemyHpMult || 1)));
  e.maxHp = hp;
  e.hp = hp;
  return e;
}

function spawnAdd(state, enc, unit, boss) {
  const type = unit[0];
  const extra = unit[2] || {};
  const e = createEnemy(state, type, { elite: !!extra.elite, pos: { x: boss.pos.x + 2, z: boss.pos.z + 2 } });
  e.campaignEnc = enc.id;
  e.state = 'chase';
  if (extra.hp) {
    const hp = Math.max(1, Math.round(extra.hp * (state.tuning.enemyHpMult || 1)));
    e.maxHp = hp;
    e.hp = hp;
  }
  return e;
}

function targetsLeft(state, prog) {
  let n = 0;
  for (const id of Object.keys(prog.targets)) {
    const e = state.enemies.find((en) => en.id === prog.targets[id]);
    if (e && !e.dead) n++;
  }
  return n;
}

function deadTargets(state, prog) {
  let n = 0;
  for (const id of Object.keys(prog.targets)) {
    const e = state.enemies.find((en) => en.id === prog.targets[id]);
    if (!e || e.dead) n++;
  }
  return n;
}

export function scriptShields(state, solidId) {
  const book = state.level && state.level.scripts;
  if (!book || !solidId) return false;
  for (const prog of Object.values(book)) {
    for (const id of Object.keys(prog.targets)) {
      const spec = (prog.specs || {})[id];
      if (!spec || !spec.shields || spec.shields.indexOf(solidId) < 0) continue;
      const e = state.enemies.find((en) => en.id === prog.targets[id]);
      if (e && !e.dead) return true;
    }
  }
  return false;
}

function applyField(state, p, center, field, dt) {
  if (!field || !p) return;
  const d = Math.hypot(p.pos.x - (field.at ? field.at[0] : center.x), p.pos.z - (field.at ? field.at[2] : center.z));
  if (d > (field.r || 0)) return;
  if (field.slow != null && field.slow < 1) p.scriptSlow = Math.min(p.scriptSlow == null ? 1 : p.scriptSlow, field.slow);
  if (field.dps) damagePlayer(state, p, { base: field.dps * dt, sourceKind: 'world', fromPos: { x: p.pos.x, y: 0, z: p.pos.z } });
}

export function tickBossScript(state, enc, dt) {
  const script = enc.script;
  if (!script || !script.parts || !script.parts.length) return;
  const p = state.players[state.localPlayerId];
  const boss = bossOf(state, enc);
  if (!boss) {
    if (p && p.scriptSlow != null) delete p.scriptSlow;
    return;
  }
  const lv = state.level;
  const prog = scriptBook(lv, enc.id);
  const part = script.parts[prog.part];
  if (!part) return;
  prog.partT += dt;
  if (!prog.center) prog.center = { x: boss.pos.x, z: boss.pos.z };
  const last = prog.part >= script.parts.length - 1;
  boss.boss.scripted = true;
  boss.boss.attackList = Array.isArray(part.attacks) ? part.attacks : null;
  boss.boss.attackScale = part.attacks && part.attacks.bolts === 'half' ? 2 : 1;
  if (part.duelStage) boss.boss.phaseIdx = part.duelStage - 1;
  if (p && p.scriptSlow != null) delete p.scriptSlow;

  if (!prog.specs) prog.specs = {};
  (part.targets || []).forEach((spec, i) => {
    if (prog.targets[spec.id]) return;
    const e = spawnTarget(state, enc, spec, boss, p, i);
    prog.targets[spec.id] = e.id;
    prog.specs[spec.id] = spec;
  });
  if (part.immune && (part.targets || []).length) boss.boss.invuln = targetsLeft(state, prog) > 0;
  else boss.boss.invuln = !!part.immune && !(part.targets || []).length && prog.partT < (part.seconds || 0);
  boss.boss.scriptHold = !part.immune && !last;

  (part.adds || []).forEach((add, i) => {
    const key = `${part.id}:${i}`;
    if (prog.spawned[key]) return;
    let ready = false;
    if (add.t != null) ready = prog.partT >= add.t;
    if (add.on === 'firstLoom' || add.on === 'firstTarget') ready = deadTargets(state, prog) >= 1;
    if (add.on === 'secondPylon' || add.on === 'secondTarget') ready = deadTargets(state, prog) >= 2;
    if (add.onBossHp != null && boss.maxHp > 0) ready = (boss.hp / boss.maxHp) * 100 <= add.onBossHp;
    if (!ready) return;
    prog.spawned[key] = true;
    for (const unit of add.units || []) {
      const count = unit[1] || 1;
      for (let n = 0; n < count; n++) spawnAdd(state, enc, unit, boss);
    }
  });

  for (const id of Object.keys(prog.targets)) {
    const e = state.enemies.find((en) => en.id === prog.targets[id]);
    if (e && !e.dead && e.ai.riseT > 0) e.ai.riseT -= dt;
  }
  if (part.immune && (part.targets || []).length && targetsLeft(state, prog) > 0 && p) {
    const dx = p.pos.x - prog.center.x, dz = p.pos.z - prog.center.z;
    const d = Math.hypot(dx, dz) || 1;
    boss.pos.x = prog.center.x - (dx / d) * 30;
    boss.pos.z = prog.center.z - (dz / d) * 30;
    boss.pos.y = part.perch != null ? part.perch : 6;
  }
  if (part.pit) applyField(state, p, prog.center, part.pit, dt);
  for (const pool of part.pools || []) applyField(state, p, prog.center, pool, dt);
  for (const vent of part.vents || []) {
    if (!vent.period || ((prog.partT + (vent.offset || 0)) % vent.period) / vent.period < 0.45) {
      applyField(state, p, prog.center, vent, dt);
    }
  }
  if (part.ring && p) {
    const d = Math.hypot(p.pos.x - prog.center.x, p.pos.z - prog.center.z);
    const outside = d > part.ring;
    if (outside && !prog.outside) damagePlayer(state, p, { base: 12, sourceKind: 'world', fromPos: { x: prog.center.x, y: 0, z: prog.center.z } });
    prog.outside = outside;
  } else prog.outside = false;

  const targetsDone = !(part.targets || []).length || (part.targets || []).every((spec) => {
    const e = state.enemies.find((en) => en.id === prog.targets[spec.id]);
    return !e || e.dead;
  });
  const barDone = !part.immune && (boss.boss.barEmpty || boss.dead);
  const timed = part.immune && !(part.targets || []).length && prog.partT >= (part.seconds || 0);
  if (!(targetsDone && part.immune) && !barDone && !timed) return;
  if (last && !part.immune) return;
  if (part.kind === 'entry') {
    boss.boss.stunT = 3;
    boss.boss.action = { id: 'stunned', t: 0 };
  }
  boss.pos.x = prog.center.x;
  boss.pos.z = prog.center.z;
  boss.pos.y = 0;
  prog.part += 1;
  prog.partT = 0;
  prog.targets = {};
  boss.boss.barEmpty = false;
  boss.boss.invuln = false;
  const next = script.parts[prog.part];
  if (!next) return;
  if (next.hp) {
    boss.maxHp = next.hp;
    boss.hp = next.hp;
  }
}
