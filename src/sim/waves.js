// Wave director: endless waves (the three arenas in turn, a difficulty step harder each round),
// staggered groups, bosses, intermission, defeat. PLAN §4.12
import { INTERMISSION_TIME, VICTORY_TICKETS, tierRewardMult, waveConfig, waveDifficulty, waveEndsRound, nextWaveSpell } from '../data/waves.js';
import { range, float, next } from '../core/rng.js';
import { emit } from './events.js';
import { createEnemy, createBoss, createHazard, nextId } from './state.js';
import { rollShopOffers } from './economy.js';
import { generateGun, } from './guns.js';
import { spawnGunPickup } from './drops.js';
import { rollGunType } from './drops.js';
import { grantSpell } from './spellbook.js';

export function startWaves(state) {
  state.mode = 'waves';
  state.tier = waveDifficulty(0);
  state.enemies.length = 0;
  state.projectiles.length = 0;
  state.hazards.length = 0;
  state.allies.length = 0;
  state.wave = { index: 0, phase: 'pre', t: 0, groupIdx: 0, spawnQueue: [], spawnedCount: 0, killedCount: 0, totalCount: 0, bossIds: [], intermissionT: 0 };
  initWave(state, 0);
  for (const p of Object.values(state.players)) { p.unkillableUsed = false; }
  emit(state, 'modeStart', { mode: 'waves', tier: state.tier });
}

/** Debug: drop whatever the current wave holds and start wave `idx` (0-based) of the run. */
export function jumpToWave(state, idx) {
  if (state.mode !== 'waves' || !state.wave || !(idx >= 0)) return;
  state.enemies.length = 0;
  state.projectiles.length = 0;
  state.hazards.length = 0;
  initWave(state, Math.floor(idx));
}

function initWave(state, idx) {
  const w = state.wave;
  // The difficulty step follows the wave: enemies, drops and rewards from here on read it.
  state.tier = waveDifficulty(idx);
  const cfg = waveConfig(idx);
  w.index = idx; w.phase = 'pre'; w.t = 0; w.groupIdx = 0; w.spawnQueue = []; w.spawnedCount = 0; w.killedCount = 0;
  w.totalCount = cfg.groups.reduce((n, g) => n + g.spawns.reduce((m, s) => m + s.count, 0), 0);
  w.bossIds = [];
  if (w.lateIdx != null) delete w.lateIdx;
  emit(state, 'wavePre', { waveIndex: idx, name: cfg.name, difficulty: state.tier });
}

const alive = (state) => state.enemies.filter((e) => !e.dead && !e.boss && e.type !== 'dummy').length;

function pickPoints(state, pattern, n) {
  const p = state.players[state.localPlayerId];
  const pts = state.spawnPoints.map((s, i) => ({ ...s, i, d: Math.hypot(s.x - p.pos.x, s.z - p.pos.z) })).filter((s) => s.d >= 10);
  if (!pts.length) return [state.spawnPoints[0]];
  if (pattern === 'cluster') {
    const c = pts[Math.floor(float(state.rng) * pts.length)];
    const N = state.spawnPoints.length;
    return Array.from({ length: n }, (_, k) => state.spawnPoints[(c.i + (k % 3) - 1 + N) % N]);
  }
  if (pattern === 'spread') {
    pts.sort((a, b) => b.d - a.d);
    const out = [];
    const N = state.spawnPoints.length;
    for (const s of pts) { if (out.every((o) => ((o.i - s.i + N) % N) >= 4 && ((s.i - o.i + N) % N) >= 4)) out.push(s); }
    return Array.from({ length: n }, (_, k) => out[k % out.length]);
  }
  return Array.from({ length: n }, () => pts[Math.floor(float(state.rng) * pts.length)]);
}

export function waveDirector(state, dt) {
  const w = state.wave;
  if (state.mode !== 'waves' || !w) return;
  const cfg = waveConfig(w.index);
  const p = state.players[state.localPlayerId];
  w.t += dt;
  state.run.time += dt;

  if (p.dead && w.phase !== 'defeat') {
    w.phase = 'defeat'; w.t = 0;
    const lost = Math.floor(state.run.ticketsEarned * 0.5);
    p.tickets = Math.max(0, p.tickets - lost);
    emit(state, 'defeat', { tier: state.tier, waveIndex: w.index, ticketsLost: lost });
    return;
  }

  switch (w.phase) {
    case 'pre':
      if (w.t >= 3) { w.phase = 'combat'; w.t = 0; emit(state, 'waveStart', { waveIndex: w.index, name: cfg.name }); }
      break;
    case 'combat': {
      while (w.groupIdx < cfg.groups.length) {
        const g = cfg.groups[w.groupIdx];
        const ready = w.t >= g.at || (g.aliveBelow != null && alive(state) + w.spawnQueue.length <= g.aliveBelow && w.t >= 2);
        if (!ready) break;
        const list = [];
        for (const s of g.spawns) for (let i = 0; i < s.count; i++) list.push({ type: s.type, elite: i < s.elites });
        const pts = pickPoints(state, g.pattern, list.length);
        list.forEach((it, i) => w.spawnQueue.push({ ...it, delay: i * 0.35, pt: pts[i] }));
        w.groupIdx++;
      }
      for (const q of w.spawnQueue) q.delay -= dt;
      for (let i = 0; i < w.spawnQueue.length; i++) {
        const q = w.spawnQueue[i];
        if (q.delay > 0 || alive(state) >= cfg.maxAlive) continue;
        w.spawnQueue.splice(i--, 1);
        const pos = { x: q.pt.x + range(state.rng, -0.8, 0.8), z: q.pt.z + range(state.rng, -0.8, 0.8) };
        createHazard(state, { kind: 'spawnPortal', pos: { x: pos.x, y: 0, z: pos.z }, radius: 1.2, ttl: 0.8 });
        createEnemy(state, q.type, { elite: q.elite, pos });
        w.spawnedCount++;
      }
      if (w.groupIdx >= cfg.groups.length && !w.spawnQueue.length && alive(state) === 0) {
        if (cfg.boss) { w.phase = 'bossIntro'; w.t = 0; emit(state, 'bossIntro', { types: cfg.boss.types }); }
        else { w.phase = 'cleared'; w.t = 0; clearWave(state); }
      }
      break;
    }
    case 'bossIntro':
      if (w.t >= cfg.boss.introDelay) {
        const paired = cfg.boss.types.length > 1;
        // spawn across the arena from the player; paired bosses spread ±50°
        const away = Math.atan2(-p.pos.x, -p.pos.z) + (Math.hypot(p.pos.x, p.pos.z) < 1 ? Math.PI : 0);
        cfg.boss.types.forEach((type, i) => {
          const ang = away + (paired ? (i === 0 ? -0.9 : 0.9) : 0);
          const pos = { x: Math.sin(ang) * 22, z: Math.cos(ang) * 22 };
          const b = createBoss(state, type, { pos, paired });
          w.bossIds.push(b.id);
          emit(state, 'bossSpawn', { id: b.id, bossType: type });
        });
        w.phase = 'boss'; w.t = 0;
      }
      break;
    case 'boss': {
      const bossCount = state.enemies.filter((e) => !e.dead && w.bossIds.includes(e.id)).length;
      // A late boss (difficulty 7 and up) walks in once only one of the others is left standing.
      const late = cfg.boss.late || [];
      if ((w.lateIdx || 0) < late.length && bossCount <= 1) {
        const type = late[w.lateIdx || 0];
        w.lateIdx = (w.lateIdx || 0) + 1;
        const away = Math.atan2(-p.pos.x, -p.pos.z) + (Math.hypot(p.pos.x, p.pos.z) < 1 ? Math.PI : 0);
        const b = createBoss(state, type, { pos: { x: Math.sin(away) * 22, z: Math.cos(away) * 22 } });
        b.maxHp = Math.round(b.maxHp * cfg.boss.lateHp); b.hp = b.maxHp;
        w.bossIds.push(b.id);
        emit(state, 'bossIntro', { types: [type] });
        emit(state, 'bossSpawn', { id: b.id, bossType: type });
        break;
      }
      if (bossCount === 0 && alive(state) === 0) { w.phase = 'cleared'; w.t = 0; clearWave(state); }
      break;
    }
    case 'cleared':
      if (w.t >= 2) {
        // The run never ends in a win. Closing a round of the three arenas pays the old victory prize:
        // Run Cash and a Legendary gun in the middle of the arena, there to grab during the intermission.
        if (waveEndsRound(w.index)) {
          const tk = Math.round(VICTORY_TICKETS * tierRewardMult(state.tier));
          p.tickets += tk; state.run.ticketsEarned += tk;
          const gun = generateGun({ seed: next(state.rng), level: state.tier, forced: { type: rollGunType(state.rng), quality: 'legendary' } });
          gun.id = nextId(state);
          spawnGunPickup(state, gun, { x: 0, z: 0 }, 'boss');
          emit(state, 'roundCleared', { waveIndex: w.index, tickets: tk });
          emit(state, 'ticketsGained', { amount: tk, reason: 'Round clear' });
        }
        w.phase = 'intermission'; w.t = 0; w.intermissionT = INTERMISSION_TIME;
        rollShopOffers(state);
        for (const pl of Object.values(state.players)) pl.unkillableUsed = false;
        emit(state, 'intermissionStart', { waveIndex: w.index });
      }
      break;
    case 'intermission':
      w.intermissionT -= dt;
      if (w.intermissionT <= 0 || (p.cmd && p.cmd.pressed.skip)) {
        emit(state, 'intermissionEnd', { waveIndex: w.index });
        initWave(state, w.index + 1);
      }
      break;
  }
}

function clearWave(state) {
  const w = state.wave;
  const cfg = waveConfig(w.index);
  const p = state.players[state.localPlayerId];
  const tk = Math.round(cfg.clearTickets * tierRewardMult(state.tier));
  p.tickets += tk; state.run.ticketsEarned += tk;
  emit(state, 'waveCleared', { waveIndex: w.index, tickets: tk });
  emit(state, 'ticketsGained', { amount: tk, reason: 'Wave clear' });
  // Each cleared wave teaches the next spell (data/waves.js WAVE_SPELLS).
  const spell = nextWaveSpell(p.spellUnlocks, state.tier);
  if (spell) { grantSpell(state, p, spell); emit(state, 'spellUnlocked', { playerId: p.id, spellId: spell }); }
  // A new wave is a fresh start for Second Wind.
  for (const pl of Object.values(state.players)) if (pl.downCount != null) delete pl.downCount;
}
