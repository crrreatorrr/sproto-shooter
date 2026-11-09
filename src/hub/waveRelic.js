import { WAVE_CLEAR_EVENT } from './link.js';

const RELIC_NAMES = { dragon_scale: 'Dragon Scale' };

/** Display name for a Relic id the hub granted. */
export function relicName(id) {
  return RELIC_NAMES[id] || String(id);
}

function newRunId() {
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  } catch { /* fall through */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Dragon Scale Relic: clearing wave 1 ("Midget Rush", the Jade Dragon) of Wave Mode. God Mode counts,
 * and the report says whether it was on. Campaign, Boss Fight and sandbox clears never report.
 *
 * One report per Wave Mode run. A run starts at each `modeStart` with mode `waves` (a new tier too),
 * and gets its own idempotency key, so the body under a key never changes. The hub has no server
 * evidence for Wave Mode; it grants the Relic once per account and answers `{}` after that.
 */
export function createWaveRelicReporter({ hub, onGranted = () => {}, newId = newRunId }) {
  let run = null;
  let tail = Promise.resolve();
  return {
    modeStart(ev) {
      run = ev && ev.mode === 'waves' ? { id: newId(), reported: false } : null;
    },
    /** Returns the report promise when it sent one, otherwise null. */
    waveCleared(ev, state) {
      if (!ev || ev.waveIndex !== 0 || !state || state.mode !== 'waves') return null;
      if (!run) run = { id: newId(), reported: false };
      if (run.reported) return null;
      run.reported = true;
      if (!hub || !hub.bankable || typeof hub.reportEvent !== 'function') return null;
      const data = { wave: 1, godMode: !!(state.tuning && state.tuning.godMode) };
      const key = `${WAVE_CLEAR_EVENT}:1:${run.id}`;
      const job = tail.then(() => hub.reportEvent(WAVE_CLEAR_EVENT, data, key))
        .then((result) => {
          if (result && result.granted) onGranted(result.granted);
          return result || {};
        })
        .catch((err) => {
          console.warn(`[hub] ${WAVE_CLEAR_EVENT} report failed: ${err && err.message ? err.message : err}`);
          return {};
        });
      tail = job.then(() => {}, () => {});
      return job;
    },
  };
}
