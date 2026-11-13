// Settings (look speed, aim assist, feel, graphics, volumes) are this device's: they suit the screen,
// the mouse and the speakers in front of you, not the account, and they can go back. They are never
// part of campaign progress (src/save/progress.js) and never go to the hub.
import { normalizeGraphicsPreset } from '../render/graphicsPresets.js';

export const SETTINGS_KEY = 'sproto-shooter-settings';
/** Settings used to ride in the one unscoped campaign profile. Read once, when SETTINGS_KEY is missing. */
const LEGACY_PROFILE_KEY = 'sproto-campaign-profile';

function clamp(value, lo, hi, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}

export function defaultSettings() {
  return normalizeSettings(null);
}

/** Any stored value to valid settings. */
export function normalizeSettings(value) {
  const src = value && typeof value === 'object' ? value : {};
  const volumes = src.volumes && typeof src.volumes === 'object' ? src.volumes : {};
  const fx = src.fxQuality;
  return {
    sensitivity: clamp(src.sensitivity, 0.3, 3, 1),
    padSensitivity: clamp(src.padSensitivity, 0.3, 3, 1), // controller look speed
    aimAssist: clamp(src.aimAssist, 0, 1.5, 1), // controller only; 0 turns it off
    hitstop: typeof src.hitstop === 'boolean' ? src.hitstop : true,
    shake: clamp(src.shake, 0, 1.5, 1),
    graphicsPreset: normalizeGraphicsPreset(src.graphicsPreset),
    fxQuality: fx === 'low' || fx === 'medium' || fx === 'high' ? fx : 'high',
    screenFx: clamp(src.screenFx, 0, 1, 1),
    volumes: {
      master: clamp(volumes.master, 0, 1, 1),
      music: clamp(volumes.music, 0, 1, 1),
      sfx: clamp(volumes.sfx, 0, 1, 1),
    },
  };
}

function store() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

function parse(ls, key) {
  try { return JSON.parse(ls.getItem(key) || 'null'); } catch { return null; }
}

export function loadSettings() {
  const ls = store();
  if (!ls) return defaultSettings();
  const saved = parse(ls, SETTINGS_KEY);
  if (saved) return normalizeSettings(saved);
  const legacy = parse(ls, LEGACY_PROFILE_KEY);
  return normalizeSettings(legacy && typeof legacy === 'object' ? legacy.settings : null);
}

export function saveSettings(settings) {
  const next = normalizeSettings(settings);
  const ls = store();
  if (ls) { try { ls.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* storage full or blocked: this visit only */ } }
  return next;
}
