import { describe, expect, it } from 'vitest';
import { describePickup, pickupLine } from '../src/ui/pickupText.js';

const line = (ev) => pickupLine(describePickup(ev));

describe('pickup messages', () => {
  it('names what was picked up and how much', () => {
    expect(line({ kind: 'ammo', ammoType: 'bullets', amount: 60 })).toBe('+60 Bullets');
    expect(line({ kind: 'ammo', ammoType: 'shells', amount: 12 })).toBe('+12 Shells');
    expect(line({ kind: 'health', amount: 25 })).toBe('+25 Health');
    expect(line({ kind: 'mana', amount: 30.4 })).toBe('+30 Mana');
    expect(line({ kind: 'tickets', amount: 7 })).toBe('+7 Run Cash');
    expect(line({ kind: 'resource', resId: 'goo', amount: 2 })).toBe('+2 Goo');
    expect(line({ kind: 'resource', resId: 'bossCore' })).toBe('+1 Boss Core');
    expect(line({ kind: 'medkit', amount: 0 })).toBe('Medkit');
  });

  it('groups the same thing under one key and keeps different things apart', () => {
    expect(describePickup({ kind: 'ammo', ammoType: 'bullets', amount: 1 }).key)
      .toBe(describePickup({ kind: 'ammo', ammoType: 'bullets', amount: 9 }).key);
    expect(describePickup({ kind: 'ammo', ammoType: 'bullets' }).key).not.toBe(describePickup({ kind: 'ammo', ammoType: 'shells' }).key);
    expect(describePickup({ kind: 'resource', resId: 'goo' }).key).not.toBe(describePickup({ kind: 'resource', resId: 'scrap' }).key);
  });

  it('still says something for an ammo or resource id it has never seen, and nothing for an unknown kind', () => {
    expect(line({ kind: 'ammo', ammoType: 'plasma', amount: 5 })).toBe('+5 Ammo');
    expect(line({ kind: 'resource', resId: 'mystery' })).toBe('+1 Parts');
    expect(describePickup({ kind: 'gun' })).toBeNull();
  });
});
