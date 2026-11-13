// Campaign progress: the levels you unlocked, the secret modifiers you found and the furthest Wave
// Mode wave you cleared. Game layer only. The sim never reads this.
//
// Progress belongs to whoever earned it (hub-sdk `createProgressStore`):
// - play without a hub session is this browser's own progress, under PROGRESS_KEY;
// - a hub visit's progress belongs to that hub account: `PROGRESS_KEY@<playerId>` in this browser,
//   plus the account's cloud save, so it follows the account to other devices.
// Progress from one account never shows in another, and device progress never moves into an account.
//
// Progress only advances, through `update`. Every copy (this tab, other tabs, other devices, the cloud)
// is combined with `mergeProgress`, which keeps the union of unlocks and the best wave, so no order of
// reads and writes loses anything earned. Settings, the Wave Mode loadout (guns that can be dropped)
// and the current run can go back, so they are not here: src/save/settings.js and src/save/loadout.js.
import { createProgressStore, hubVisitStarting } from '@metaverse/hub-sdk';
import { HUB_GAME_ID } from '../hub/config.js';
import { nonEconomicSave } from '../hub/link.js';

export const PROGRESS_KEY = 'sproto-shooter-progress';
export const PROGRESS_VERSION = 3;
/** The single unscoped profile every browser kept before progress had owners. Device progress only. */
export const LEGACY_PROFILE_KEY = 'sproto-campaign-profile';
/** The Wave Mode loadout kept the best wave before it moved here. Device progress only. */
export const LEGACY_LOADOUT_KEY = 'sproto-shooter-loadout';
/** The old build's cloud-save retry: `{ playerId, data }`, an account's progress that never reached the cloud. */
export const LEGACY_OUTBOX_KEY = 'sproto-shooter:hub-cloud-outbox';

export const FIRST_LEVEL = 'L01';
/** Far above the ten levels and fifteen modifiers that exist, so ids from a newer build are kept too. */
export const MAX_LEVEL_IDS = 64;
export const MAX_MODIFIER_IDS = 128;
export const MAX_BEST_WAVE = 9999;
const ID = /^[A-Za-z0-9_-]{1,32}$/;

/**
 * A sorted set of well-formed ids, at most `max` of them (the lowest when there are more). Ids this build
 * does not know are kept, so an older tab or device cannot erase what a newer one unlocked. Keeping the
 * lowest `max` of a union is associative, so the cap does not break the merge.
 */
function idSet(value, max, except = null) {
  const list = Array.isArray(value) ? value : [];
  const ids = [...new Set(list.filter((id) => typeof id === 'string' && ID.test(id) && id !== except))].sort();
  return ids.slice(0, max);
}

function wave(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.min(MAX_BEST_WAVE, Math.max(0, n)) : 0;
}

export function emptyProgress() {
  return { v: PROGRESS_VERSION, unlocked: [FIRST_LEVEL], modifiers: [], bestWave: 0 };
}

/**
 * Anything stored or synced to valid progress. Reads the current shape, the version-2 cloud and local
 * profile (`{ v: 2, unlocked, modifiers, settings, updatedAt }`, whose settings and timestamp are ignored)
 * and older profiles. Run Cash and other economic fields are never read.
 */
export function normalizeProgress(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    v: PROGRESS_VERSION,
    unlocked: [FIRST_LEVEL, ...idSet(src.unlocked, MAX_LEVEL_IDS, FIRST_LEVEL)],
    modifiers: idSet(src.modifiers, MAX_MODIFIER_IDS),
    bestWave: wave(src.bestWave),
  };
}

/** Both copies' unlocks and the better best wave. Same result in any order. */
export function mergeProgress(a, b) {
  const x = normalizeProgress(a), y = normalizeProgress(b);
  return normalizeProgress({
    unlocked: [...x.unlocked, ...y.unlocked],
    modifiers: [...x.modifiers, ...y.modifiers],
    bestWave: Math.max(x.bestWave, y.bestWave),
  });
}

/** The cloud body: progress only. No settings, no Run Cash, nothing economic. */
export function progressCloudBody(value) {
  const p = normalizeProgress(value);
  return nonEconomicSave({ v: p.v, unlocked: p.unlocked, modifiers: p.modifiers, bestWave: p.bestWave });
}

export const PROGRESS_MODEL = Object.freeze({
  empty: emptyProgress,
  normalize: normalizeProgress,
  merge: mergeProgress,
  toCloud: progressCloudBody,
});

function parse(storage, key) {
  try { return JSON.parse(storage.getItem(key) || 'null'); } catch { return null; }
}

/** Progress kept before it had owners. The store merges it into this browser's device copy only. */
export function readLegacyProgress(storage) {
  const profile = parse(storage, LEGACY_PROFILE_KEY);
  const loadout = parse(storage, LEGACY_LOADOUT_KEY);
  const src = profile && typeof profile === 'object' ? profile : {};
  return {
    unlocked: src.unlocked,
    modifiers: src.modifiers,
    bestWave: loadout && typeof loadout === 'object' ? loadout.bestWave : 0,
  };
}

function browserStorage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

/**
 * The campaign's progress for one page. `storage` defaults to localStorage; null keeps it in memory.
 * `pushDelayMs` and `retryDelayMs` are for tests.
 */
export function createCampaignProgress({ storage = browserStorage(), pushDelayMs, retryDelayMs } = {}) {
  let onSyncError = null;
  const store = createProgressStore({
    key: PROGRESS_KEY,
    model: PROGRESS_MODEL,
    storage: storage
      ? { getItem: (k) => storage.getItem(k), setItem: (k, v) => storage.setItem(k, v), removeItem: (k) => storage.removeItem(k) }
      : null,
    readLegacy: readLegacyProgress,
    pushDelayMs,
    retryDelayMs,
    onError: (err) => {
      console.warn('[progress] cloud save failed:', err && err.code ? err.code : err);
      try { onSyncError?.(err); } catch { /* the store retries on its own */ }
    },
  });

  /**
   * The old build queued an account's unsynced profile under one browser-wide key. It belongs to that
   * account: merged in when the same player attaches, dropped for anyone else.
   */
  function adoptLegacyOutbox(playerId) {
    if (!storage) return;
    const queued = parse(storage, LEGACY_OUTBOX_KEY);
    if (!queued) return;
    try { storage.removeItem(LEGACY_OUTBOX_KEY); } catch { /* read once either way */ }
    if (queued.playerId === playerId && queued.data && typeof queued.data === 'object') store.update(() => normalizeProgress(queued.data));
  }

  return {
    store,
    get: () => store.get(),
    owner: () => store.owner(),
    sync: () => store.sync(),
    persistent: () => store.persistent(),
    subscribe: (listener) => store.subscribe(listener),
    watches: (key) => store.watches(key),
    refresh: () => store.refresh(),
    flush: () => store.flush(),
    isUnlocked: (id) => store.get().unlocked.includes(id),
    bestWave: () => store.get().bestWave,

    /** A campaign level won: open the next one and remember the modifiers found in it. */
    levelWon({ next = null, modifiers = [] } = {}) {
      return store.update((p) => ({
        ...p,
        unlocked: next ? [...p.unlocked, next] : p.unlocked,
        modifiers: [...p.modifiers, ...modifiers],
      }));
    },

    /** A Wave Mode wave cleared (1-based). Only ever raises the best. */
    waveCleared(n) {
      return store.update((p) => ({ ...p, bestWave: Math.max(p.bestWave, wave(n)) }));
    },

    /** A hub visit is starting: keep any progress in memory until the account is known. */
    hold: () => store.hold(),

    /**
     * Follow the hub visit `connectHub` settled: a live session's account gets its own progress, synced
     * with its cloud save; standalone play, a failed init or an expired session use the device copy.
     */
    async followHub(hub) {
      if (hub && hub.bankable && hub.playerId && hub.api) {
        onSyncError = (err) => hub.noteSessionError?.(err);
        try {
          await store.attach(hub.api, hub.playerId);
        } catch (err) {
          console.warn('[progress] could not attach the hub account:', err);
        }
        if (store.owner().kind === 'account') adoptLegacyOutbox(hub.playerId);
        return;
      }
      onSyncError = null;
      store.release();
    },
  };
}

export const campaignProgress = createCampaignProgress();

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  // A portal ticket or a live hub session: progress waits for the account (main.js settles it).
  if (hubVisitStarting(HUB_GAME_ID)) campaignProgress.hold();
  window.addEventListener('storage', (event) => { if (campaignProgress.watches(event.key)) campaignProgress.refresh(); });
  window.addEventListener('pagehide', () => { void campaignProgress.flush(); });
}
