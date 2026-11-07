// @ts-check
// Presentation settings. Persisted locally. Never read by the sim.

const KEY = 'sproto-settings';

export function defaultSettings() {
  return {
    hitstop: true,
    shake: 1,
    sensitivity: 1,
    fxQuality: 'high',
    screenFx: 1,
    volumes: { master: 1, music: 1, sfx: 1 },
  };
}

export function loadSettings() {
  const base = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw);
    return {
      ...base,
      ...saved,
      volumes: { ...base.volumes, ...(saved.volumes || {}) },
    };
  } catch {
    return base;
  }
}

/** @param {ReturnType<typeof defaultSettings>} settings */
export function saveSettings(settings) {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* private mode */ }
}
