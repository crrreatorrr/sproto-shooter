// Test-only corpus tooling. Public reward endpoints never accept these fixtures.
import { createHash } from 'node:crypto';
import { recordBoss } from '../bossLog.js';
import { verifyRun } from '../../src/server/verify.js';

export const CASES = [
  ...['sahil', 'obama', 'broccoli', 'glowie', 'tinubu'].flatMap((boss) => [7, 11].map((seed) => ({
    id: `${boss}-success-${seed}`, boss, seed, mode: 'success', maxFrames: 24000,
  }))),
  { id: 'sahil-fail-7', boss: 'sahil', seed: 7, mode: 'fail', maxFrames: 24000 },
  { id: 'sahil-assisted-9', boss: 'sahil', seed: 9, mode: 'assisted', maxFrames: 24000 },
];

export function receiptCore(r) {
  return Object.fromEntries([
    'ok', 'reason', 'outcome', 'eligible', 'ranked', 'ticketsMinted', 'canonicalBoss',
    'canonicalCount', 'stateHash', 'tick', 'frames', 'parts', 'protocol', 'contentFingerprint',
  ].filter((key) => r[key] !== undefined).map((key) => [key, r[key]]));
}

export function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function generateCase(spec, sourceCommit) {
  const events = {};
  const milestones = { projectileTicks: 0, pickupTicks: 0, bossParts: {} };
  const recorded = recordBoss(spec.boss, spec.seed, spec.mode, spec.maxFrames, (state) => {
    for (const e of state.events || []) events[e.type] = (events[e.type] || 0) + 1;
    if (state.projectiles.length) milestones.projectileTicks++;
    if (state.pickups.length) milestones.pickupTicks++;
    for (const e of state.enemies) {
      if (!e.boss) continue;
      const part = milestones.bossParts[e.type] ||= { firstTick: state.tick, deadTick: null, fledTick: null };
      if (e.dead && part.deadTick === null) part.deadTick = state.tick;
      if (e.fled && part.fledTick === null) part.fledTick = state.tick;
    }
  });
  // Preserve real verifier resource limits; an execution timeout is NOT a golden outcome.
  const receipt = verifyRun(recorded.log, { issuance: recorded.issuance });
  if (!receipt.ok) throw new Error(`${spec.id}: verifier rejected generated trace: ${receipt.reason}`);
  const terminalTicks = Object.values(milestones.bossParts).map((part) => part.deadTick);
  const terminalTick = receipt.outcome === 'incomplete' ? null
    : receipt.outcome === 'fail' ? recorded.tick
      : terminalTicks.every((tick) => tick !== null) ? Math.max(...terminalTicks) : null;
  return {
    schema: 1,
    provenance: { kind: 'deterministic-bot', sourceCommit, selection: 'fixed seeds 7 and 11; no seed search or replacement', spec },
    issuance: recorded.issuance,
    log: recorded.log,
    inputSha256: digest(recorded.log),
    expected: receiptCore(receipt),
    recorderStateHash: recorded.verifyStateHash,
    recorderMatchesVerifier: receipt.stateHash === recorded.verifyStateHash,
    terminalTick,
    coverage: { events, ...milestones },
  };
}
