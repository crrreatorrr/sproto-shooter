// Wave director: 3 waves, staggered groups, bosses, intermission, victory/defeat. PLAN §4.12
import { WAVES, INTERMISSION_TIME, VICTORY_TICKETS, tierRewardMult } from '../data/waves.js';
import { range, float, next } from '../core/rng.js';
import { emit } from './events.js';
import { createEnemy, createBoss, createHazard, nextId } from './state.js';
import { rollShopOffers } from './economy.js';
import { generateGun, } from './guns.js';
import { spawnGunPickup } from './drops.js';
import { rollGunType } from './drops.js';

export function startWaves(state, tier) {
  state.mode = 'waves';
  state.tier = tier;
  state.enemies.length = 0;
  state.projectiles.length = 0;
  state.hazards.length = 0;
  state.allies.length = 0;
  state.wave = { index: 0, phase: 'pre', t: 0, groupIdx: 0, spawnQueue: [], spawnedCount: 0, killedCount: 0, totalCount: 0, bossIds: [], intermissionT: 0 };
  initWave(state, 0);
  for (const p of Object.values(state.players)) { p.unkillableUsed = false; }
  emit(state, 'modeStart', { mode: 'waves', tier });
}

function initWave(state, idx) {
  const w = state.wave;
  const cfg = WAVES[idx];
  w.index = idx; w.phase = 'pre'; w.t = 0; w.groupIdx = 0; w.spawnQueue = []; w.spawnedCount = 0; w.killedCount = 0;
  w.totalCount = cfg.groups.reduce((n, g) => n + g.spawns.reduce((m, s) => m + s.count, 0), 0);
  w.bossIds = [];
  emit(state, 'wavePre', { waveIndex: idx, name: cfg.name });
}

const alive = (state) => state.enemies.filter((e) => !e.dead && !e.boss && e.type !== 'dummy').length;

function pickPoints(state, pattern, n) {
  const p = state.players[state.localPlayerId];
  const pts = state.spawnPoints.map((s, i) => ({ ...s, i, d: Math.hypot(s.x - p.pos.x, s.z - p.pos.z) })).filter((s) => s.d >= 10);
  if (!pts.length) return [state.spawnPoints[0]];
  if (pattern === 'cluster') {
    const c = pts[Math.floor(float(state.rng) * pts.length)];
    return Array.from({ length: n }, (_, k) => state.spawnPoints[(c.i + (k % 3) - 1 + 12) % 12]);
  }
  if (pattern === 'spread') {
    pts.sort((a, b) => b.d - a.d);
    const out = [];
    for (const s of pts) { if (out.every((o) => Math.abs(((o.i - s.i + 12) % 12)) >= 3 && Math.abs(((s.i - o.i + 12) % 12)) >= 3)) out.push(s); }
    return Array.from({ length: n }, (_, k) => out[k % out.length]);
  }
  return Array.from({ length: n }, () => pts[Math.floor(float(state.rng) * pts.length)]);
}

export function waveDirector(state, dt) {
  const w = state.wave;
  if (state.mode !== 'waves' || !w) return;
  const cfg = WAVES[w.index];
  const p = state.players[state.localPlayerId];
  w.t += dt;
  state.run.time += dt;

  if (p.dead && w.phase !== 'defeat' && w.phase !== 'victory') {
    w.phase = 'defeat'; w.t = 0;
    const lost = Math.floor(state.run.ticketsEarned * 0.5);
    p.tickets = Math.max(0, p.tickets - lost);
    emit(state, 'defeat', { tier: state.tier, ticketsLost: lost });
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
        cfg.boss.types.forEach((type, i) => {
          const ang = (i / cfg.boss.types.length) * Math.PI * 2 + Math.atan2(-p.pos.x, -p.pos.z);
          const pos = { x: Math.sin(ang) * -16, z: Math.cos(ang) * -16 };
          const b = createBoss(state, type, { pos, paired });
          w.bossIds.push(b.id);
          emit(state, 'bossSpawn', { id: b.id, bossType: type });
        });
        w.phase = 'boss'; w.t = 0;
      }
      break;
    case 'boss': {
      const bossesAlive = state.enemies.some((e) => !e.dead && w.bossIds.includes(e.id));
      if (!bossesAlive && alive(state) === 0) { w.phase = 'cleared'; w.t = 0; clearWave(state); }
      break;
    }
    case 'cleared':
      if (w.t >= 2) {
        if (w.index >= WAVES.length - 1) {
          w.phase = 'victory'; w.t = 0;
          const tk = Math.round(VICTORY_TICKETS * tierRewardMult(state.tier));
          p.tickets += tk; state.run.ticketsEarned += tk;
          const gun = generateGun({ seed: next(state.rng), level: state.tier, forced: { type: rollGunType(state.rng), quality: 'legendary' } });
          gun.id = nextId(state);
          spawnGunPickup(state, gun, { x: 0, z: 0 }, 'boss');
          rollShopOffers(state);
          emit(state, 'victory', { tier: state.tier, tickets: tk });
        } else {
          w.phase = 'intermission'; w.t = 0; w.intermissionT = INTERMISSION_TIME;
          rollShopOffers(state);
          for (const pl of Object.values(state.players)) pl.unkillableUsed = false;
          emit(state, 'intermissionStart', { waveIndex: w.index });
        }
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
  const cfg = WAVES[w.index];
  const p = state.players[state.localPlayerId];
  const tk = Math.round(cfg.clearTickets * tierRewardMult(state.tier));
  p.tickets += tk; state.run.ticketsEarned += tk;
  emit(state, 'waveCleared', { waveIndex: w.index, tickets: tk });
  emit(state, 'ticketsGained', { amount: tk, reason: 'Wave clear' });
}
