// Campaign meta and local settings. Game layer only. The sim never reads this.
// Run Cash (the in-run kill/shop/gacha total) is not stored here and is never
// sent to the hub. `save.put` has no compare-and-swap: the later `updatedAt`
// wins, a tie keeps the local copy, and the other copy is a lost update.
// Economic fields are stripped either way, so there is nothing to merge.
import { nonEconomicSave } from '../hub/link.js';

const KEY = 'sproto-campaign-profile';
export const PROFILE_VERSION = 2;

function clamp(value, lo, hi, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

export function defaultSettings() {
  return {
    sensitivity: 1,
    hitstop: true,
    shake: 1,
    fxQuality: 'high',
    screenFx: 1,
    volumes: { master: 1, music: 1, sfx: 1 },
  };
}

function settingsOf(value) {
  const src = value && typeof value === 'object' ? value : {};
  const volumes = src.volumes && typeof src.volumes === 'object' ? src.volumes : {};
  const fx = src.fxQuality;
  return {
    sensitivity: clamp(src.sensitivity, 0.3, 3, 1),
    hitstop: typeof src.hitstop === 'boolean' ? src.hitstop : true,
    shake: clamp(src.shake, 0, 1.5, 1),
    fxQuality: fx === 'low' || fx === 'medium' || fx === 'high' ? fx : 'high',
    screenFx: clamp(src.screenFx, 0, 1, 1),
    volumes: {
      master: clamp(volumes.master, 0, 1, 1),
      music: clamp(volumes.music, 0, 1, 1),
      sfx: clamp(volumes.sfx, 0, 1, 1),
    },
  };
}

function ids(value, fallback) {
  const list = Array.isArray(value) ? value.filter((id) => typeof id === 'string' && id) : fallback.slice();
  return list;
}

/** Read any older blob, drop economic fields, and return the version-2 shape. */
export function migrateProfile(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const unlocked = ids(src.unlocked, ['L01']);
  if (!unlocked.includes('L01')) unlocked.unshift('L01');
  const updatedAt = Number.isFinite(src.updatedAt) ? src.updatedAt : 0;
  return {
    v: PROFILE_VERSION,
    unlocked,
    modifiers: ids(src.modifiers, []),
    settings: settingsOf(src.settings),
    updatedAt,
  };
}

/** Non-economic cloud body. Run Cash cannot ride along. */
export function cloudBody(profile) {
  const next = migrateProfile(profile);
  return nonEconomicSave({
    v: next.v,
    unlocked: next.unlocked,
    modifiers: next.modifiers,
    settings: next.settings,
    updatedAt: next.updatedAt,
  });
}

function sameBody(a, b) {
  const left = cloudBody({ ...a, updatedAt: 0 });
  const right = cloudBody({ ...b, updatedAt: 0 });
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * Later `updatedAt` wins. Equal timestamps keep local. The discarded copy is
 * a lost update when the two bodies differ. No field-level merge.
 */
export function resolveCloudConflict(local, remoteResult) {
  const left = migrateProfile(local);
  const remoteData = remoteResult && remoteResult.data ? remoteResult.data : null;
  if (!remoteData) return { profile: left, conflict: 'local', lostUpdate: false };
  const right = migrateProfile(remoteData);
  const differ = !sameBody(left, right);
  if (right.updatedAt > left.updatedAt) {
    return { profile: right, conflict: 'remote', lostUpdate: left.updatedAt > 0 && differ };
  }
  if (left.updatedAt > right.updatedAt) {
    return { profile: left, conflict: 'local', lostUpdate: false };
  }
  return { profile: left, conflict: differ ? 'local' : 'same', lostUpdate: differ };
}

function store() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function loadProfile() {
  const ls = store();
  if (!ls) return migrateProfile(null);
  try {
    const raw = ls.getItem(KEY);
    if (!raw) return migrateProfile(null);
    return migrateProfile(JSON.parse(raw));
  } catch {
    return migrateProfile(null);
  }
}

export function saveProfile(p, { stamp = true } = {}) {
  const ls = store();
  const next = migrateProfile(stamp ? { ...p, updatedAt: Date.now() } : p);
  if (!ls) return next;
  ls.setItem(KEY, JSON.stringify(cloudBody(next)));
  return next;
}

export function unlockLevel(id) {
  const p = loadProfile();
  if (id && !p.unlocked.includes(id)) p.unlocked.push(id);
  return saveProfile(p);
}

export function rememberModifier(id) {
  const p = loadProfile();
  if (id && !p.modifiers.includes(id)) p.modifiers.push(id);
  return saveProfile(p);
}

/**
 * Pull the hub save when this visit is a real session. Offline and failed
 * inits keep the local profile. A remote win replaces local non-economic
 * fields. A local win is written back. Run Cash is never part of either body.
 */
export async function syncNonEconomicProfile(link) {
  const local = loadProfile();
  if (!link?.bankable || typeof link.loadCloud !== 'function') {
    return { profile: local, conflict: 'offline', lostUpdate: false };
  }
  const remote = await link.loadCloud();
  const decision = resolveCloudConflict(local, remote);
  if (decision.conflict === 'remote') saveProfile(decision.profile, { stamp: false });
  else if (decision.conflict === 'local' && typeof link.saveCloud === 'function') await link.saveCloud(cloudBody(local));
  return decision;
}
