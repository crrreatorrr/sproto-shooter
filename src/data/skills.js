// Skills, perks, spells (PLAN §3.12, §7.4, §7.5)
export const SKILLS = {
  health: { id: 'health', name: 'Health', icon: '❤', color: '#ff4d6d', xpBase: 100, xpGrowth: 1.45, maxLevel: 10 },
  gunslinger: { id: 'gunslinger', name: 'Gunslinger', icon: '🎯', color: '#ffcc33', xpBase: 120, xpGrowth: 1.45, maxLevel: 10 },
  magic: { id: 'magic', name: 'Magic', icon: '🔮', color: '#9b6bff', xpBase: 80, xpGrowth: 1.45, maxLevel: 10 },
  crafting: { id: 'crafting', name: 'Crafting', icon: '🔨', color: '#4fd1c5', xpBase: 100, xpGrowth: 1.45, maxLevel: 10 },
};
export const SKILL_IDS = ['health', 'gunslinger', 'magic', 'crafting'];

export const XP = {
  health: { kill: 10, perDamage: 0.2, damageCapPerSec: 15, orb: 3, medkit: 5, bigOrb: 10, physicalBoss: 200 },
  gunslinger: { gunKill: 10, critKill: 5, weakKill: 5, weakHit: 1, weakHitCapPerSec: 10, physicalBoss: 200 },
  magic: { cast: { gooBolt: 3, chainZap: 6, swarm: 10, manaShield: 4, meteor: 25 }, per20Absorbed: 1, spellKill: 8, magicBoss: 200 },
};

export const PERKS = [
  { id: 'quickShield', skill: 'health', level: 3, name: 'Quick Shield', desc: 'Shield recharges sooner and faster.' },
  { id: 'lifesteal', skill: 'health', level: 6, name: 'Lifesteal', desc: 'Heal 2% of damage you deal (max 4 HP/s).' },
  { id: 'unkillable', skill: 'health', level: 10, name: 'Unkillable Sproto', desc: 'Once per wave, survive a lethal hit at 1 HP + 3s invulnerable.' },
  { id: 'fastHands', skill: 'gunslinger', level: 3, name: 'Fast Hands', desc: 'Weapon swaps take 0.2s.' },
  { id: 'deadeye', skill: 'gunslinger', level: 6, name: 'Deadeye', desc: '+0.5 weak-spot crit multiplier.' },
  { id: 'bottomlessMags', skill: 'gunslinger', level: 8, name: 'Bottomless Mags', desc: '15% chance shots use no ammo.' },
  { id: 'killFrenzy', skill: 'gunslinger', level: 10, name: 'Kill Frenzy', desc: 'Kills stack +4% fire rate, +3% damage (max 10, 4s).' },
  { id: 'gooBolt', skill: 'magic', level: 1, name: 'Goo Bolt [Q]', desc: 'Sticky slowing bolt.' },
  { id: 'chainZap', skill: 'magic', level: 3, name: 'Chain Zap [E]', desc: 'Lightning that jumps between enemies.' },
  { id: 'swarm', skill: 'magic', level: 6, name: 'Sproto Swarm [Z]', desc: 'Summon 5 mini Sprotos for 8s.' },
  { id: 'manaShield', skill: 'magic', level: 8, name: 'Mana Shield [X]', desc: 'Toggle: mana absorbs 60% of damage.' },
  { id: 'meteor', skill: 'magic', level: 10, name: 'Meteor Bonk [T]', desc: 'Ultimate. Full mana. Giant meteor.' },
  { id: 'craftT1', skill: 'crafting', level: 1, name: 'T1 Recipes', desc: 'Craft Common guns, ammo and medkits.' },
  { id: 'craftT2', skill: 'crafting', level: 3, name: 'T2 Recipes', desc: 'Craft Uncommon guns.' },
  { id: 'craftT3', skill: 'crafting', level: 5, name: 'T3 Recipes', desc: 'Craft Rare guns and choose the element.' },
  { id: 'craftT4', skill: 'crafting', level: 7, name: 'T4 Recipes', desc: 'Craft Epic guns and choose a part.' },
  { id: 'salvage', skill: 'crafting', level: 8, name: 'Salvage', desc: 'Break guns down into resources.' },
  { id: 'craftT5', skill: 'crafting', level: 10, name: 'Master Forger', desc: 'Craft Legendaries and reroll stats.' },
];
export const PERKS_BY_ID = Object.fromEntries(PERKS.map((p) => [p.id, p]));

export const SPELLS = {
  gooBolt: { id: 'gooBolt', name: 'Goo Bolt', key: 'Q', mana: 15, cd: 0.6, damage: 25, speed: 30, splash: 1.5 },
  chainZap: { id: 'chainZap', name: 'Chain Zap', key: 'E', mana: 30, cd: 4, damage: 40, range: 25, chains: 4, chainRange: 6, falloff: 0.8 },
  swarm: { id: 'swarm', name: 'Sproto Swarm', key: 'Z', mana: 50, cd: 15, count: 5 },
  manaShield: { id: 'manaShield', name: 'Mana Shield', key: 'X', mana: 10, drain: 4, cd: 1, absorb: 0.6, dmgPerMana: 1.5 },
  meteor: { id: 'meteor', name: 'Meteor Bonk', key: 'T', mana: 'all', cd: 30, damage: 300, radius: 6, delay: 1, knockback: 14 },
};
export const SPELL_IDS = ['gooBolt', 'chainZap', 'swarm', 'manaShield', 'meteor'];

export const xpToNext = (skillId, level) => {
  const s = SKILLS[skillId];
  return Math.round(s.xpBase * Math.pow(s.xpGrowth, level - 1));
};
