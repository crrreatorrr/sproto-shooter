import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CANONICAL_BOSSES, bossById, contentFingerprint, listBossObjectives, rejectedBossReason, resolveCanonicalEncounter,
} from '../src/data/serverManifest.js';
import { ECONOMY, buildIssuance, canonicalLoadoutOk, buildIssuedState } from '../src/server/runContract.js';
import { PROTOCOL_VERSION } from '../src/server/protocol.js';
import { contentFingerprintOf } from '../src/server/verify.js';

const caller = {
  accountId: 'acct-shooter-1',
  sessionId: 'sess-shooter-1',
  day: '2026-11-07',
  runId: 'run-manifest-1',
  seed: 7,
};

describe('canonical bosses', () => {
  it('counts obamaDuo and midgetDuo as one obama and keeps glowie off Duel agent', () => {
    const obama = bossById('obama');
    expect(obama.encounterId).toBe('SB-BOSS');
    expect(obama.legacyEncounterId).toBe('S3-E3');
    expect(obama.parts).toEqual(['obamaDuo', 'midgetDuo']);
    expect(obama.countAs || 1).toBe(1);
    expect(obama.duelId).toBe('obama');
    expect(rejectedBossReason('obamaDuo')).toBe('obama_is_one');
    expect(rejectedBossReason('midgetDuo')).toBe('obama_is_one');
    const glowie = bossById('glowie');
    expect(glowie.duelId).toBeNull();
    expect(glowie.distinctFrom).toEqual(['agent', 'glowieAgent']);
    expect(rejectedBossReason('agent')).toBe('glowie_not_agent');
    expect(rejectedBossReason('glowieAgent')).toBe('glowie_not_agent');
    expect(CANONICAL_BOSSES.map((b) => b.id)).toEqual(['sahil', 'obama', 'broccoli', 'glowie', 'tinubu']);
  });

  it('does not treat a fleeing encounter as the payable boss', () => {
    const bosses = listBossObjectives();
    const flee = bosses.filter((b) => b.fleeAt > 0).map((b) => `${b.levelId}:${b.encounterId}`);
    const l03 = flee.filter((id) => id.startsWith('L03:'));
    expect(l03.some((id) => id === 'L03:S4-E4' || id === 'L03:S6-F2')).toBe(true);
    expect(flee).toContain('L09:S3-E4');
    for (const boss of CANONICAL_BOSSES) {
      const found = resolveCanonicalEncounter(boss);
      const hit = bosses.find((b) => b.levelId === boss.levelId && b.encounterId === found.encounter.id);
      expect(hit.fleeAt).toBe(0);
      for (const part of boss.parts) {
        expect(hit.units.filter((u) => u.type === part && u.count === 1)).toHaveLength(1);
      }
    }
    const obama = bossById('obama');
    expect(obama.encounterId).toBe('SB-BOSS');
    expect(resolveCanonicalEncounter(obama).encounter.id).toBe('S3-E3');
  });
});

describe('issued start', () => {
  it('uses the starter MG and a stable content fingerprint', () => {
    const built = buildIssuance({ ...caller, canonicalBoss: 'sahil' });
    expect(built.ok).toBe(true);
    expect(built.ticketsMinted).toBe(0);
    expect(built.issuance.loadout).toBe('canonical-start');
    expect(built.issuance.initialStateHash).toMatch(/^[0-9a-f]{8}$/);
    expect(built.issuance.contentFingerprint).toBe(contentFingerprint(PROTOCOL_VERSION));
    expect(contentFingerprintOf()).toBe(built.issuance.contentFingerprint);
    expect(contentFingerprint(PROTOCOL_VERSION)).toBe(contentFingerprint(PROTOCOL_VERSION));
    const state = buildIssuedState(built.issuance);
    expect(canonicalLoadoutOk(state)).toBe(true);
    expect(state.tuning.godMode).toBe(false);
    expect(state.mode).toBe('campaign');
    expect(state.level.id).toBe('L02');
    expect(state.level.section).toBe('S4');
  });

  it('rejects aliased bosses, imported loadouts, and bad seeds', () => {
    expect(buildIssuance({ ...caller, canonicalBoss: 'agent' }).reason).toBe('glowie_not_agent');
    expect(buildIssuance({ ...caller, canonicalBoss: 'glowieAgent' }).reason).toBe('glowie_not_agent');
    expect(buildIssuance({ ...caller, canonicalBoss: 'obamaDuo' }).reason).toBe('obama_is_one');
    expect(buildIssuance({ ...caller, canonicalBoss: 'not-a-boss' }).reason).toBe('unknown_boss');
    expect(buildIssuance({ ...caller, canonicalBoss: 'sahil', loadout: 'profile' }).reason).toBe('injected_inventory');
    expect(buildIssuance({ ...caller, canonicalBoss: 'sahil', guns: [] }).reason).toBe('injected_inventory');
    expect(buildIssuance({ ...caller, canonicalBoss: 'sahil', seed: -3 }).reason).toBe('negative');
    expect(buildIssuance({ ...caller, canonicalBoss: 'sahil', seed: 1.5 }).reason).toBe('malformed');
    expect(buildIssuance({ ...caller, canonicalBoss: 'sahil', v: 2 }).reason).toBe('unsupported_version');
    expect(buildIssuance({ ...caller, canonicalBoss: 'glowie' }).ok).toBe(true);
  });
});

describe('economy boundary', () => {
  it('cannot mint Tickets and does not add anti-collusion wager caps', () => {
    expect(ECONOMY.mintsTickets).toBe(false);
    expect(ECONOMY.ticketsMintedByArtifact).toBe(0);
    expect(ECONOMY.wagerMayCreateTickets).toBe(false);
    expect(ECONOMY.wagerTransfersUncapped).toBe(true);
    const files = [
      'src/server/verify.js',
      'src/server/protocol.js',
      'src/server/runContract.js',
      'src/data/serverManifest.js',
    ];
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src.includes('earnTickets'), file).toBe(false);
      expect(src.includes('tickets.earn'), file).toBe(false);
    }
    expect(fs.readFileSync('src/game/Game.js', 'utf8')).toContain('this.onSimCommand');
  });
});
