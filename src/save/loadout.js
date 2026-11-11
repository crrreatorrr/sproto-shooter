// Wave Mode progress kept on this device: skill levels, the guns you carry and your best tier.
// Game layer only. The sim never reads this file; a save reaches it as one `loadLoadout` action at the
// start of a Wave Mode run (src/sim/actions.js), which the sim checks and applies itself.
//
// This is not part of the campaign profile and is never sent to the hub: the hub save strips economic
// keys such as `guns` (ECONOMIC_KEY in src/hub/link.js), and nothing here has value outside this device.
// It cannot reach a rewarded run or a wager: a rewarded run is built from the server's issuance by
// buildIssuedState and accepts no action but transitionDone, the sim ignores `loadLoadout` outside
// Wave Mode, and Free 1v1 and wagers run a separate sim with fixed guns.
import { SKILL_IDS } from '../data/skills.js';

export const LOADOUT_KEY = 'sproto-shooter-loadout';
export const LOADOUT_VERSION = 1;
/** Guns kept: the five you can carry, plus up to three that did not fit a slot when loaded. */
export const MAX_SAVED_GUNS = 8;
const MAX_TIER = 10;

const int = (v, lo, hi, fallback) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};
const str = (v) => (typeof v === 'string' && v.length <= 32 ? v : null);

/** What the sim needs to rebuild a gun (generateGun is seeded), and the slot it sat in. */
export function gunSpec(gun, slot) {
  if (!gun || typeof gun !== 'object') return null;
  const type = str(gun.type), quality = str(gun.quality);
  if (!type || !quality || !Number.isFinite(gun.seed)) return null;
  const parts = {};
  if (gun.parts && typeof gun.parts === 'object') for (const k of ['barrel', 'grip', 'mag', 'scope']) { const id = str(gun.parts[k]); if (id) parts[k] = id; }
  return {
    slot: int(slot, 0, 4, 0), seed: gun.seed >>> 0, level: int(gun.level, 1, MAX_TIER, 1), type, quality,
    manufacturer: str(gun.manufacturer), element: str(gun.element), wacky: str(gun.wacky), parts, arcane: !!gun.arcane,
  };
}

/** Any stored blob to the current shape. Unknown ids are left for the sim to reject. */
export function normalizeLoadout(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const skills = {};
  for (const id of SKILL_IDS) {
    const s = src.skills && typeof src.skills === 'object' ? src.skills[id] : null;
    skills[id] = { level: int(s && s.level, 1, 10, 1), xp: Math.max(0, Number(s && s.xp) || 0), total: Math.max(0, Number(s && s.total) || 0) };
  }
  const guns = (Array.isArray(src.guns) ? src.guns : []).map((g) => gunSpec(g, g && g.slot)).filter(Boolean).slice(0, MAX_SAVED_GUNS);
  return { v: LOADOUT_VERSION, skills, guns, bestTier: int(src.bestTier, 0, MAX_TIER, 0) };
}

/** Read the player's Wave Mode loadout out of a game state. `bestTier` carries over from the last save. */
export function loadoutFromState(state, bestTier = 0) {
  const p = state.players[state.localPlayerId];
  const guns = [];
  p.guns.forEach((g, slot) => { const spec = gunSpec(g, slot); if (spec) guns.push(spec); });
  const skills = {};
  for (const id of SKILL_IDS) skills[id] = { level: p.skills[id].level, xp: p.skills[id].xp, total: p.skills[id].total };
  return normalizeLoadout({ skills, guns, bestTier });
}

/** The action that puts a saved loadout on the player. */
export function loadoutAction(loadout) {
  const l = normalizeLoadout(loadout);
  return { type: 'loadLoadout', skills: l.skills, guns: l.guns };
}

/** True when there is nothing worth applying (a fresh device). */
export function loadoutEmpty(loadout) {
  const l = normalizeLoadout(loadout);
  return !l.guns.length && SKILL_IDS.every((id) => l.skills[id].level === 1 && l.skills[id].xp === 0);
}

function store() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function readLoadout() {
  const ls = store();
  if (!ls) return normalizeLoadout(null);
  try { return normalizeLoadout(JSON.parse(ls.getItem(LOADOUT_KEY) || 'null')); } catch { return normalizeLoadout(null); }
}

export function writeLoadout(loadout) {
  const next = normalizeLoadout(loadout);
  const ls = store();
  if (ls) { try { ls.setItem(LOADOUT_KEY, JSON.stringify(next)); } catch { /* storage full or blocked: play on, unsaved */ } }
  return next;
}
