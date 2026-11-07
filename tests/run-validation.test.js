import { describe, expect, it } from 'vitest';
import { recordBoss, splitLog } from './bossLog.js';
import { rejectionCases } from './rejectCases.js';
import { verifyRun } from '../src/server/verify.js';
import { LIMITS } from '../src/server/protocol.js';
import goldens from './fixtures/boss-goldens.json';

function core(receipt) {
  return {
    ok: receipt.ok,
    reason: receipt.reason,
    outcome: receipt.outcome,
    eligible: receipt.eligible,
    ranked: receipt.ranked,
    ticketsMinted: receipt.ticketsMinted,
    canonicalBoss: receipt.canonicalBoss,
    canonicalCount: receipt.canonicalCount,
    stateHash: receipt.stateHash,
    tick: receipt.tick,
    frames: receipt.frames,
  };
}

describe('run validation', () => {
  const recorded = recordBoss('sahil', 7, 'success', 5000);
  const cases = rejectionCases(recorded);

  it('fails closed before trusting a hostile log', () => {
    for (const row of cases) {
      const receipt = verifyRun(row.log, row.ctx);
      expect(receipt.reason, row.name).toBe(row.reason);
      expect(receipt.ok, row.name).toBe(false);
      expect(receipt.eligible, row.name).toBe(false);
      expect(receipt.ticketsMinted, row.name).toBe(0);
    }
  });

  it('stops on the CPU ceiling without paying', () => {
    let ticks = 0;
    const receipt = verifyRun(recorded.log, {
      issuance: recorded.issuance,
      clock: () => (ticks++ > 3 ? LIMITS.maxCpuMs + 50 : 0),
    });
    expect(receipt.ok).toBe(false);
    expect(receipt.reason).toBe('cpu_budget');
    expect(receipt.ticketsMinted).toBe(0);
  });

  it('replays a clear, then rejects a second submit and a rebound copy', () => {
    const first = verifyRun(recorded.log, { issuance: recorded.issuance });
    expect(first.ok).toBe(true);
    expect(first.outcome).toBe('clear');
    expect(first.eligible).toBe(true);
    expect(first.ticketsMinted).toBe(0);
    expect(first.canonicalCount).toBe(1);
    const again = verifyRun(recorded.log, {
      issuance: recorded.issuance,
      seenDigests: [first.logDigest],
      seenRunIds: [recorded.issuance.runId],
    });
    expect(again.reason).toBe('reused_log');
    const moved = {
      ...recorded.log,
      binding: { ...recorded.log.binding, day: '2026-11-08' },
    };
    const rebound = verifyRun(moved, { issuance: recorded.issuance, day: '2026-11-08' });
    expect(rebound.reason).toBe('rebind');
  });

  it('chains server checkpoints and resumes without a client state blob', () => {
    const split = splitLog(recorded, 400);
    const whole = verifyRun(recorded.log, { issuance: recorded.issuance });
    const chained = verifyRun(split, { issuance: recorded.issuance });
    expect(core(chained)).toEqual(core(whole));
    const head = verifyRun(
      { v: 1, binding: split.binding, segments: [split.segments[0]] },
      { issuance: recorded.issuance },
    );
    expect(head.ok).toBe(true);
    expect(head.outcome).toBe('incomplete');
    const tail = verifyRun(
      { v: 1, binding: split.binding, segments: [{ ...split.segments[1], i: 0 }] },
      { issuance: recorded.issuance, resume: JSON.parse(JSON.stringify(head.checkpoint)) },
    );
    const { frames: tailFrames, ...tailCore } = core(tail);
    const { frames: wholeFrames, ...wholeCore } = core(whole);
    expect(tailCore).toEqual(wholeCore);
    expect(tailFrames).toBe(wholeFrames - 400);
    expect(tail.checkpoint.state).toBeTruthy();
    const clientState = { ...split, checkpoint: head.checkpoint.state };
    expect(verifyRun(clientState, { issuance: recorded.issuance }).reason).toBe('bad_checkpoint');
  });

  it('matches the locked boss fixture outcomes', () => {
    for (const spec of Object.values(goldens.runs)) {
      const rec = recordBoss(spec.boss, spec.seed, spec.mode, 8000);
      const receipt = verifyRun(rec.log, { issuance: rec.issuance });
      expect(receipt.stateHash).toBe(spec.stateHash);
      expect(receipt.outcome).toBe(spec.outcome);
      expect(receipt.eligible).toBe(spec.eligible);
      expect(receipt.tick).toBe(spec.tick);
      expect(receipt.frames).toBe(spec.frames);
      expect(rec.log.segments[0].frames.length).toBe(spec.bytes);
      expect(receipt.cpuMs).toBeLessThan(LIMITS.maxCpuMs);
      expect(rec.log.segments[0].frames.length).toBeLessThan(LIMITS.maxSegmentText);
    }
  });
});
