// Use-based XP: each skill levels from its own actions; perks unlock automatically. PLAN §4.7, §7.4
import { SKILLS, XP, PERKS, xpToNext } from '../data/skills.js';
import { TUNING } from '../data/tuning.js';
import { RECIPES_BY_ID, SALVAGE_XP, REROLL_XP } from '../data/recipes.js';
import { emit } from './events.js';

export function addXp(state, p, skillId, amount) {
  if (amount <= 0) return;
  amount *= 1 + 0.1 * (state.tier - 1);
  const s = p.skills[skillId];
  if (s.level >= SKILLS[skillId].maxLevel) return;
  s.xp += amount; s.total += amount;
  state.run.xpGained[skillId] += amount;
  emit(state, 'xpGain', { playerId: p.id, skill: skillId, amount });
  while (s.level < SKILLS[skillId].maxLevel && s.xp >= xpToNext(skillId, s.level)) {
    s.xp -= xpToNext(skillId, s.level);
    s.level++;
    emit(state, 'levelUp', { playerId: p.id, skill: skillId, level: s.level });
    for (const perk of PERKS) {
      if (perk.skill === skillId && perk.level === s.level && !p.perks[perk.id]) {
        p.perks[perk.id] = true;
        emit(state, 'perkUnlocked', { playerId: p.id, perkId: perk.id });
      }
    }
    applySkillPassives(state, p);
  }
  if (s.level >= SKILLS[skillId].maxLevel) s.xp = 0;
}

/** Recompute derived stats from skill levels + shop upgrades. Keeps HP fraction, adds the delta. */
export function applySkillPassives(state, p) {
  const h = p.skills.health.level, m = p.skills.magic.level;
  const newMaxHp = Math.round(TUNING.maxHp * (1 + 0.08 * (h - 1)));
  if (newMaxHp !== p.maxHp) { p.hp += newMaxHp - p.maxHp; p.maxHp = newMaxHp; }
  const newMana = TUNING.maxMana + 15 * (m - 1);
  if (newMana !== p.maxMana) { p.mana += newMana - p.maxMana; p.maxMana = newMana; }
  const up = state.shop.upgrades;
  p.maxShield = TUNING.maxShield + 25 * up.shieldCap;
  p.shield = Math.min(p.shield, p.maxShield);
  for (const k of Object.keys(p.ammoCap)) p.ammoCap[k] = Math.round(TUNING.ammoCap[k] * (1 + 0.25 * up.ammoCap));
}

/** Consume this tick's events and award XP. Runs inside simulate (authoritative). */
export function progression(state) {
  const n = state.events.length;
  for (let i = 0; i < n; i++) {
    const ev = state.events[i];
    switch (ev.type) {
      case 'kill': {
        if (ev.isDummy) break;
        const p = state.players[ev.killerId] || state.players[state.localPlayerId];
        if (!p) break;
        const em = ev.elite ? 3 : 1;
        addXp(state, p, 'health', XP.health.kill * em);
        if (ev.sourceKind === 'gun' || (ev.sourceKind === 'splash' && !ev.spell)) {
          let g = XP.gunslinger.gunKill;
          if (ev.wasCrit) g += XP.gunslinger.critKill;
          if (ev.wasWeak) g += XP.gunslinger.weakKill;
          addXp(state, p, 'gunslinger', g * em);
        }
        if (ev.sourceKind === 'spell') addXp(state, p, 'magic', XP.magic.spellKill * em);
        if (ev.bossTag === 'physical') { addXp(state, p, 'health', XP.health.physicalBoss); addXp(state, p, 'gunslinger', XP.gunslinger.physicalBoss); }
        if (ev.bossTag === 'magic') addXp(state, p, 'magic', XP.magic.magicBoss);
        break;
      }
      case 'damage': {
        const p = state.players[ev.sourceId];
        if (p && ev.isWeak && ev.sourceKind === 'gun' && p.xpCaps.weak < 10) { p.xpCaps.weak += 1; addXp(state, p, 'gunslinger', XP.gunslinger.weakHit); }
        break;
      }
      case 'playerDamaged': {
        const p = state.players[ev.playerId];
        if (!p || ev.sourceKind === 'self') break;
        const amt = Math.min(ev.amount * XP.health.perDamage, Math.max(0, 15 - p.xpCaps.dmg));
        p.xpCaps.dmg += amt;
        addXp(state, p, 'health', amt);
        if (ev.absorbed > 0) addXp(state, p, 'magic', (ev.absorbed / 20) * XP.magic.per20Absorbed);
        break;
      }
      case 'pickup': {
        const p = state.players[ev.playerId];
        if (!p) break;
        if (ev.kind === 'health') addXp(state, p, 'health', XP.health.orb);
        if (ev.kind === 'bigHealth') addXp(state, p, 'health', XP.health.bigOrb);
        if (ev.kind === 'medkit') addXp(state, p, 'health', XP.health.medkit);
        break;
      }
      case 'cast': {
        const p = state.players[ev.playerId];
        if (p) addXp(state, p, 'magic', XP.magic.cast[ev.spellId] || 0);
        break;
      }
      case 'craftComplete': {
        const p = state.players[ev.playerId];
        const r = RECIPES_BY_ID[ev.recipeId];
        if (p && r) addXp(state, p, 'crafting', r.xp);
        break;
      }
      case 'salvage': { const p = state.players[ev.playerId]; if (p) addXp(state, p, 'crafting', SALVAGE_XP); break; }
      case 'reroll': { const p = state.players[ev.playerId]; if (p) addXp(state, p, 'crafting', REROLL_XP); break; }
    }
  }
}
