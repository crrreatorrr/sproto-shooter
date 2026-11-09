// Keyboard layout (shared Sproto convention) and the saved controller settings.
import { describe, expect, it } from 'vitest';
import { BIND, LATCHED, NAV_KEYS, keyLabel } from '../src/input/input.js';
import { migrateProfile } from '../src/save/profile.js';

describe('keyboard layout', () => {
  it('moves with WASD and the arrows, uses E (or G) and keeps R reload / Space jump / Shift run', () => {
    expect(BIND.forward).toEqual(['KeyW', 'ArrowUp']);
    expect(BIND.left).toContain('ArrowLeft');
    expect(BIND.interact[0]).toBe('KeyE');
    expect(BIND.interact).toContain('KeyG');
    expect(BIND.reload).toEqual(['KeyR']);
    expect(BIND.jump).toEqual(['Space']);
    expect(BIND.sprint).toContain('ShiftLeft');
  });
  it('never binds one key to two actions', () => {
    const seen = new Map();
    for (const [action, codes] of Object.entries(BIND)) {
      for (const c of codes) {
        expect(seen.get(c), `${c} is bound to ${seen.get(c)} and ${action}`).toBeUndefined();
        seen.set(c, action);
      }
    }
    for (const a of LATCHED) expect(BIND[a], a).toBeTruthy();
  });
  it('mirrors the pad: R taps reload / holds pick up, Q picks the next spell, F toggles aim', () => {
    expect(BIND.spellSelect).toEqual(['KeyQ']);
    expect(BIND.aimToggle).toEqual(['KeyF']);
    expect(keyLabel('reload')).toBe('R');
    expect(keyLabel('spellSelect')).toBe('Q');
  });
  it('labels keys for prompts and the HUD', () => {
    expect(keyLabel('interact')).toBe('E');
    expect(keyLabel('chainZap')).toBe('Y');
    expect(keyLabel('sprint')).toBe('Shift');
    expect(keyLabel('forward')).toBe('W');
  });
  it('moves menu focus with the arrows and W / A / S / D', () => {
    expect(NAV_KEYS.ArrowDown).toBe('down');
    expect(NAV_KEYS.KeyW).toBe('up');
    expect(NAV_KEYS.KeyD).toBe('right');
  });
});

describe('controller settings', () => {
  it('saves look speed and aim assist strength, clamped', () => {
    const p = migrateProfile({ settings: { padSensitivity: 9, aimAssist: -1 } });
    expect(p.settings.padSensitivity).toBe(3);
    expect(p.settings.aimAssist).toBe(0);
    const d = migrateProfile({});
    expect(d.settings.padSensitivity).toBe(1);
    expect(d.settings.aimAssist).toBe(1);
  });
});
