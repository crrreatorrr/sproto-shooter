import { describe, expect, it } from 'vitest';
import { swappedWeapon } from '../src/input/aimRules.js';

describe('aim toggle', () => {
  it('lets go when the active weapon slot changes, and only then', () => {
    const memo = {};
    expect(swappedWeapon(memo, { activeSlot: 0 })).toBe(false); // first frame: nothing to compare
    expect(swappedWeapon(memo, { activeSlot: 0 })).toBe(false);
    expect(swappedWeapon(memo, { activeSlot: 2 })).toBe(true);
    expect(swappedWeapon(memo, { activeSlot: 2 })).toBe(false);
    expect(swappedWeapon(memo, null)).toBe(false); // no player (menus)
    expect(swappedWeapon(memo, { activeSlot: 1 })).toBe(false); // a fresh run starts clean
  });
});
