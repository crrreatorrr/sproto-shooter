// Campaign director. No-op unless state.mode === 'campaign'.
// Gun stats are never written here. Power-ups only touch speed, gravity, shields, fuel and presentation flags.
import { float } from '../../core/rng.js';
import { yawTo } from '../../core/math.js';
import { BOSSES } from '../../data/enemies.js';
import { getLevelRuntime, sectionById, inBox, nearPoint } from '../level/runtime.js';
import { emit } from '../events.js';
import { createEnemy, createBoss, createProjectile, nextId } from '../state.js';
import { generateGun } from '../guns.js';
import { next } from '../../core/rng.js';
import { damagePlayer } from '../combat.js';
import { clearCampaignSpells } from '../spellbook.js';
import { beginV2, noteV2Section, v2Post, v2Pre } from './v2.js';

const snaps = new WeakMap();

export function startCampaign(state, p, levelId) {
  const rt = getLevelRuntime(levelId || 'L01');
  const first = rt.sections[0];
  state.mode = 'campaign';
  state.wave = null;
  state.bossFight = null;
  state.testMode = false;
  state.tier = rt.tier || 1;
  const jet = rt.jetpack === true;
  state.level = {
    id: rt.id, name: rt.name, stage: rt.stage, section: first.id,
    parTime: rt.parTime || 0, objective: 'Move up',
    won: false, lost: false, transition: null, intro: first.intro || null,
    cleared: {}, spawned: {}, got: {}, modifiers: {},
    fuel: jet ? 100 : 0, gravityMult: rt.gravityMult || 1,
    time: 0,
  };
  p.unlockedSlots = 4;
  clearCampaignSpells(state, p);
  p.jetpack = jet;
  p.campaignSpeed = 1;
  p.pos = { x: first.start[0], y: first.start[1], z: first.start[2] };
  p.prevPos = { ...p.pos };
  p.vel = { x: 0, y: 0, z: 0 };
  p.yaw = first.yaw || 0;
  if (rt.format === 'v2') {
    beginV2(state);
    noteV2Section(state, first, rt);
  }
  emit(state, 'modeStart', { mode: 'campaign', tier: state.tier, level: rt.id });
  if (first.intro) emit(state, 'levelCard', { title: first.intro.title, lines: first.intro.lines });
  saveCheckpoint(state, 'start');
}

export function transitionDone(state) {
  const lv = state.level;
  if (!lv || state.mode !== 'campaign') return;
  if (lv.transition) {
    lv.section = lv.transition.to;
    lv.transition = null;
    const sec = sectionById(lv.id, lv.section);
    lv.intro = sec && sec.intro ? sec.intro : null;
    if (lv.format === 'v2') noteV2Section(state, sec, getLevelRuntime(lv.id));
    if (lv.intro) emit(state, 'levelCard', { title: lv.intro.title, lines: lv.intro.lines });
  } else if (lv.intro) lv.intro = null;
}

export function campaignPre(state, dt) {
  const lv = state.level;
  if (!lv || lv.won || lv.lost) return;
  lv.time += dt;
  const p = state.players[state.localPlayerId];
  if (p.padCd > 0) p.padCd -= dt;
  const sec = sectionById(lv.id, lv.section);
  if (!sec) return;
  for (const m of sec.mechanisms || []) touchMechanism(state, p, lv, sec, m, dt);
  for (const w of sec.weapons || []) {
    if (lv.got[w.id]) continue;
    if (!nearPoint(w.at, p.pos.x, p.pos.y + 1, p.pos.z, 3.2)) continue;
    lv.got[w.id] = true;
    giveWorldGun(state, p, w.gun);
  }
  for (const c of sec.checkpoints || []) {
    if (lv.got[c.id]) continue;
    if (c.when && !flagOn(lv, c.when)) continue;
    if (Math.hypot(p.pos.x - c.at[0], p.pos.z - c.at[2]) > 2.2) continue;
    lv.got[c.id] = true;
    saveCheckpoint(state, c.id);
    emit(state, 'checkpoint', { id: c.id });
  }
  if (lv.format === 'v2') { v2Pre(state, dt); return; }
  for (const enc of sec.encounters || []) {
    if (lv.spawned[enc.id] || lv.cleared[enc.id]) continue;
    if (!inBox(enc.activate, p.pos.x, p.pos.y, p.pos.z)) continue;
    lv.spawned[enc.id] = true;
    spawnSquad(state, enc);
  }
  lv.objective = objectiveText(lv, sec);
}

export function campaignPost(state, dt) {
  const lv = state.level;
  if (!lv || lv.won || lv.lost) return;
  if (lv.format === 'v2') { v2Post(state, dt); return; }
  const p = state.players[state.localPlayerId];
  for (const e of state.enemies) {
    if (e.dead || !e.boss || !BOSSES[e.type] || !BOSSES[e.type].campaign) continue;
    tickDuelBoss(state, e, dt);
  }
  for (const e of state.enemies) {
    if (e.dead || e.type !== 'daycare') continue;
    e.ai.nestT = (e.ai.nestT || 1.2) - dt;
    if (e.ai.nestT > 0) continue;
    e.ai.nestT = 2.4;
    const n = state.enemies.filter((o) => !o.dead && o.summoned && o.campaignEnc === e.campaignEnc).length;
    if (n >= 2) continue;
    const baby = createEnemy(state, 'midget', { pos: { x: e.pos.x + 1, z: e.pos.z }, summoned: true });
    baby.campaignEnc = e.campaignEnc;
  }
  const rt = getLevelRuntime(lv.id);
  const sec = sectionById(lv.id, lv.section);
  if (sec) {
    for (const enc of sec.encounters) {
      if (!lv.spawned[enc.id] || lv.cleared[enc.id]) continue;
      for (const e of state.enemies) {
        if (e.dead || e.campaignEnc !== enc.id || !enc.fleeAt || !e.boss) continue;
        if (e.hp / e.maxHp <= enc.fleeAt) {
          e.dead = true;
          e.fled = true;
          emit(state, 'bossEscape', { id: e.id, bossType: e.type });
        }
      }
      const alive = state.enemies.some((e) => !e.dead && e.campaignEnc === enc.id);
      if (!alive) {
        lv.cleared[enc.id] = true;
        emit(state, 'encounterClear', { id: enc.id });
      }
    }
  }
  applyModifiers(state, p, dt);
  if (p.dead) { lv.lost = true; emit(state, 'levelLost', { level: lv.id }); return; }
  if (sec && sec.exit && sectionClear(sec, lv) && !lv.transition && inBox(sec.exit, p.pos.x, p.pos.y, p.pos.z)) {
    lv.transition = { to: sec.exit.to, kind: sec.exit.kind, card: sec.exit.card };
    emit(state, 'sectionExit', { from: sec.id, to: sec.exit.to });
  }
  if (everyEncounterClear(rt, lv)) {
    lv.won = true;
    lv.objective = 'Level clear';
    emit(state, 'levelClear', { level: lv.id, time: lv.time, par: lv.parTime });
  } else if (sec) lv.objective = objectiveText(lv, sec);
}

function sectionClear(sec, lv) {
  return (sec.encounters || []).every((e) => lv.cleared[e.id]);
}

function everyEncounterClear(rt, lv) {
  for (const s of rt.sections) for (const e of s.encounters) if (!lv.cleared[e.id]) return false;
  return rt.sections.length > 0;
}

function objectiveText(lv, sec) {
  const enc = (sec.encounters || []).find((e) => !lv.cleared[e.id]);
  if (!enc) return sec.exit ? `Exit: ${sec.name}` : 'Level clear';
  if (enc.objective.kind === 'boss') return enc.fleeAt ? 'Drive it off' : 'Defeat the boss';
  return `Clear ${sec.name}`;
}

function flagOn(lv, when) {
  if (!when) return true;
  if (when.endsWith('.cleared')) return !!lv.cleared[when.slice(0, -'.cleared'.length)];
  if (when.startsWith('switch:')) return !!lv.got[when.slice('switch:'.length)];
  return !!lv.got[when];
}

function touchMechanism(state, p, lv, sec, m, dt) {
  const x = p.pos.x, y = p.pos.y, z = p.pos.z;
  if (m.kind === 'switch' && !lv.got[m.id] && nearPoint(m.at, x, y + 1, z, 1.5)) {
    lv.got[m.id] = true;
    emit(state, 'switch', { id: m.id });
  }
  if (m.kind === 'door' && !lv.got[m.id] && flagOn(lv, m.opens)) {
    lv.got[m.id] = true;
    emit(state, 'door', { id: m.id, open: true });
  }
  if (m.kind === 'jumpPad' && !(p.padCd > 0) && nearPoint(m.at, x, 0, z, m.r || 1.4) && p.onGround) {
    p.vel.y = m.power || 11;
    p.onGround = false;
    p.padCd = 0.7;
    emit(state, 'jumpPad', { id: m.id });
  }
  if (m.kind === 'hazard' && inBox(m, x, y, z)) {
    if (m.dps) damagePlayer(state, p, { base: m.dps * dt, sourceKind: 'world', fromPos: { x: m.min[0], y: 0, z: m.min[2] } });
    if (m.slow) { const k = m.slow; p.vel.x *= k; p.vel.z *= k; }
  }
  if ((m.kind === 'jetpack' || m.kind === 'fuel') && !lv.got[m.id] && nearPoint(m.at, x, y + 1, z, 1.8)) {
    lv.got[m.id] = true;
    p.jetpack = true;
    lv.fuel = Math.max(lv.fuel, m.kind === 'fuel' ? 100 : 80);
    emit(state, 'jetpack', { id: m.id });
  }
  if (m.kind === 'power' && !lv.got[m.id] && nearPoint(m.at, x, y + 1, z, 1.8)) {
    lv.got[m.id] = true;
    grantModifier(state, p, m.modifier);
  }
  if (m.kind === 'secret' && !lv.got[m.id] && nearPoint(m.at, x, y + 1, z, 1.7)) {
    lv.got[m.id] = true;
    grantModifier(state, p, m.modifier);
    emit(state, 'secret', { id: m.id, modifier: m.modifier });
  }
  if (m.kind === 'portal' && !lv.got[m.id] && nearPoint(m.at, x, y + 1, z, 1.4)) {
    lv.got[m.id] = true;
    p.pos.x = m.to[0]; p.pos.z = m.to[2];
    emit(state, 'portal', { id: m.id });
  }
  if (m.kind === 'zipline' && nearPoint(m.from, x, y + 1, z, 1.6)) {
    p.pos.x += Math.sign((m.to[0] - m.from[0]) || 1) * (m.speed || 16) * dt;
    p.pos.y = Math.max(p.pos.y, 0);
  }
  if (m.kind === 'rail' && Math.abs(p.pos.z - m.from[2]) < 2 && p.pos.x >= m.from[0] && p.pos.x <= m.to[0]) {
    p.vel.x += (m.speed || 10) * dt * 3;
  }
  if (m.kind === 'mover' && Math.abs(p.pos.x - m.from[0]) < 1.6) {
    p.vel.x += (m.speed || 2) * dt;
  }
  if (m.kind === 'laser' && !lv.got[m.id] && nearPoint(m.at, x, y + 1, z, 1.3)) {
    damagePlayer(state, p, { base: (m.dps || 12) * dt, sourceKind: 'world', fromPos: { x: m.at[0], y: m.at[1], z: m.at[2] } });
  }
  if (m.kind === 'barrel' && !lv.got[m.id]) {
    const hit = state.enemies.some((e) => e.dead && e.campaignEnc && Math.hypot(e.pos.x - m.at[0], e.pos.z - m.at[2]) < 2.2);
    if (hit || nearPoint(m.at, x, y + 1, z, 1.2) && p.cmd && p.cmd.held && p.cmd.held.fire) {
      lv.got[m.id] = true;
      emit(state, 'barrel', { id: m.id, pos: { x: m.at[0], y: m.at[1], z: m.at[2] } });
    }
  }
}

const MOD_SPEED = { turbo: 1.35, taxSeason: 0.82, redTape: 0.9 };

function grantModifier(state, p, id) {
  if (!id || state.level.modifiers[id]) return;
  state.level.modifiers[id] = true;
  emit(state, 'modifier', { id });
  if (MOD_SPEED[id]) p.campaignSpeed = (p.campaignSpeed || 1) * MOD_SPEED[id];
  if (id === 'moonBoots') state.level.gravityMult = 0.6;
  if (id === 'fuel') { p.jetpack = true; state.level.fuel = 100; state.level.modifiers.fuelInfinite = true; }
  if (id === 'overshield' || id === 'ironSproto') {
    p.maxShield += id === 'ironSproto' ? 80 : 40;
    p.shield = p.maxShield;
  }
  if (id === 'swarmSurge') {
    const enc = Object.keys(state.level.spawned).find((k) => !state.level.cleared[k]);
    for (let i = 0; i < 3; i++) {
      const e = createEnemy(state, 'midget', { pos: { x: p.pos.x + 6, z: p.pos.z + i }, summoned: true });
      e.campaignEnc = enc || 'surge';
    }
  }
}

function applyModifiers(state, p, dt) {
  const mods = state.level.modifiers;
  if (mods.bigHead) for (const e of state.enemies) if (!e.dead) e.bigHeadT = 999;
  if (mods.floorIsLava) damagePlayer(state, p, { base: 6 * dt, sourceKind: 'world', fromPos: p.pos });
  if (mods.fuelInfinite) state.level.fuel = 100;
}

function giveWorldGun(state, p, type) {
  const slot = p.guns.findIndex((g, i) => !g && i < p.unlockedSlots);
  if (slot < 0) return;
  const g = generateGun({
    seed: next(state.rng), level: state.tier,
    forced: { type, quality: 'common', manufacturer: 'reliable', element: 'none' },
  });
  g.id = nextId(state);
  g.source = 'world';
  p.guns[slot] = g;
  emit(state, 'worldGun', { type, slot });
}

function spawnSquad(state, enc) {
  const squad = enc.squads[0];
  let i = 0;
  for (const u of squad.units) {
    for (let n = 0; n < u.count; n++) {
      const at = squad.at[i] || squad.at[squad.at.length - 1];
      i++;
      const boss = BOSSES[u.type] && BOSSES[u.type].campaign;
      const e = boss
        ? createBoss(state, u.type, { pos: { x: at[0], z: at[2] } })
        : createEnemy(state, u.type, { pos: { x: at[0], z: at[2] } });
      e.campaignEnc = enc.id;
      if (boss) emit(state, 'bossSpawn', { id: e.id, bossType: u.type });
    }
  }
}

function tickDuelBoss(state, e, dt) {
  const def = BOSSES[e.type];
  const frac = e.hp / e.maxHp;
  e.boss.phaseIdx = frac <= 0.33 ? 2 : frac <= 0.66 ? 1 : 0;
  const t = livingPlayer(state);
  if (t) {
    const dx = t.pos.x - e.pos.x, dz = t.pos.z - e.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    e.yaw = yawTo(e.pos, t.pos);
    const spd = d > 3.5 ? def.speed : def.speed * 0.25;
    e.vel.x = (dx / d) * spd;
    e.vel.z = (dz / d) * spd;
  }
  e.pos.x += e.vel.x * dt;
  e.pos.z += e.vel.z * dt;
  e.ai.atk = (e.ai.atk == null ? 0.8 : e.ai.atk) - dt;
  if (e.ai.atk > 0 || !t) return;
  e.ai.atk = def.attackEvery || 1.6;
  const name = def.attacks[Math.floor(float(state.rng) * def.attacks.length)];
  bossAttack(state, e, def, t, name);
}

function livingPlayer(state) {
  for (const p of Object.values(state.players)) if (!p.dead) return p;
  return null;
}

function bossAttack(state, e, def, t, name) {
  emit(state, 'bossAttack', { id: e.id, bossType: e.type, attack: name });
  const from = { x: e.pos.x, y: e.pos.y + e.height * 0.6, z: e.pos.z };
  const dx = t.pos.x - from.x, dy = t.pos.y + 1.1 - from.y, dz = t.pos.z - from.z;
  const dl = Math.hypot(dx, dy, dz) || 1;
  const shot = (speed, dmg, extra = {}) => createProjectile(state, {
    kind: 'bullet', faction: 'enemy', ownerId: e.id, sourceKind: 'boss', pos: { ...from },
    vel: { x: (dx / dl) * speed, y: (dy / dl) * speed, z: (dz / dl) * speed },
    radius: 0.25, damage: dmg * e.dmgMult, ttl: 3, ...extra,
  });
  if (name === 'summon') {
    const n = state.enemies.filter((o) => !o.dead && o.summoned && o.campaignEnc === e.campaignEnc).length;
    if (n < 3) {
      const m = createEnemy(state, 'midget', { pos: { x: e.pos.x + 2, z: e.pos.z }, summoned: true });
      m.campaignEnc = e.campaignEnc;
    }
    return;
  }
  if (name === 'slam' || name === 'rugSlam') {
    damagePlayer(state, t, { base: 18 * (Math.hypot(t.pos.x - e.pos.x, t.pos.z - e.pos.z) < 4.5 ? 1 : 0), sourceKind: 'boss', fromPos: e.pos });
    return;
  }
  if (name === 'flash') {
    damagePlayer(state, t, { base: 8, sourceKind: 'boss', fromPos: e.pos });
    return;
  }
  if (name === 'drone') { shot(16, 8, { homing: 1.2, homingSpeed: 16 }); return; }
  if (name === 'blast' || name === 'cloud' || name === 'breath') { shot(22, 12, { radius: 0.4 }); return; }
  if (name === 'fly') { e.pos.y = 1.2; return; }
  shot(26, 7);
}

function bucket(state) {
  let b = snaps.get(state);
  if (!b) { b = {}; snaps.set(state, b); }
  return b;
}

export function saveCheckpoint(state, id) {
  const lv = state.level;
  if (!lv) return;
  bucket(state)[id] = structuredClone(state);
  lv.checkpoint = id;
}

export function restoreCheckpoint(state) {
  const lv = state.level;
  if (!lv) return false;
  const b = snaps.get(state);
  const snap = b && (b[lv.checkpoint] || b.start);
  if (!snap) return false;
  const fresh = structuredClone(snap);
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, fresh);
  snaps.set(state, b);
  return true;
}

export function campaignFuel(state) {
  return state.level ? state.level.fuel : 0;
}
