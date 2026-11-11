import { describe, expect, it } from 'vitest';
import { lockdownScenario, voidScenario, pickupsScenario, transitionScenario } from './campaign-corpus-scenarios.js';

describe('synthetic server-owned campaign corpus (not issued reward traces)', () => {
  it('rewinds a sealed lockdown but documents missing JSON checkpoint side-state', () => {
    const result = lockdownScenario();
    expect(result.checkpoint).toBe('cp2');
    expect(result.sealed).toBe(true);
    expect(result.spawned).toBe(true);
    expect(result.jsonHash).toBe(result.originalHash);
    expect(result.jsonRestoreSupported).toBe(false);
    expect(result.events.some((event) => event.type === 'lockdownReset')).toBe(true);
    expect(result.state.players[result.state.localPlayerId].dead).toBe(false);
    expect(result.state.level.lost).not.toBe(true);
    expect(result.state.enemies.filter((enemy) => enemy.campaignEnc === 'lock')).toHaveLength(0);
  });

  it('rescues a void fall with damage and temporary invulnerability', () => {
    const result = voidScenario();
    const player = result.state.players[result.state.localPlayerId];
    expect(result.events.some((event) => event.type === 'voidRescue')).toBe(true);
    expect(player.pos.x).toBeCloseTo(4, 0);
    expect(player.pos.y).toBeGreaterThan(-1);
    expect(result.state.run.damageTaken).toBeGreaterThan(result.damageBefore);
    expect(player.invulnT).toBeGreaterThan(0);
  });

  it('collects ammo and a gun, then fires a projectile that damages a target', () => {
    const result = pickupsScenario();
    expect(result.collectedAmmo).toBe(10);
    expect(result.ammo.dead).toBe(true);
    expect(result.ammoEvents.some((event) => event.type === 'pickup' && event.kind === 'ammo')).toBe(true);
    expect(result.gunEvents.some((event) => event.type === 'gunPickedUp' && event.gunId === result.gunId)).toBe(true);
    expect(result.projectileCreated).toBe(true);
    expect(result.hpAfter).toBeLessThan(result.hpBefore);
  });

  it('uses transitionDone to enter the next section and dismiss its card', () => {
    const result = transitionScenario();
    expect(result.exitEvents).toContainEqual(expect.objectContaining({ type: 'sectionExit', from: 'S1', to: 'S2' }));
    expect(result.pending.to).toBe('S2');
    expect(result.arrivedSection).toBe('S2');
    expect(result.introTitle).toBe('Second section');
    expect(result.state.level.transition).toBeNull();
    expect(result.state.level.intro).toBeNull();
  });
});
