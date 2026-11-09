// Spell unlocks. Outside a campaign, Goo Bolt is always known. A campaign starts with none.
// God mode lends every spell and gives them back when it turns off.
import { SPELL_IDS } from '../data/skills.js';

export function syncSpellbook(state, p) {
  if (!p.spellUnlocks) p.spellUnlocks = {};
  const god = !!(state.tuning && state.tuning.godMode);
  for (let i = 0; i < SPELL_IDS.length; i++) {
    const id = SPELL_IDS[i];
    const earned = !!p.spellUnlocks[id] || (id === 'gooBolt' && state.mode !== 'campaign');
    p.perks[id] = god || earned;
  }
  if (!p.perks.manaShield && p.spells) p.spells.manaShieldOn = false;
}

export function clearCampaignSpells(state, p) {
  p.spellUnlocks = {};
  syncSpellbook(state, p);
}

export function grantSpell(state, p, id) {
  if (!p.spellUnlocks) p.spellUnlocks = {};
  p.spellUnlocks[id] = true;
  syncSpellbook(state, p);
}
