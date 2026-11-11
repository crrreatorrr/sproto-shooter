import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { chromium } from 'playwright';
import { beginIncrementalReplay, acceptReplayBatch, stepReplaySlice, publicReplayJSON,
  decodeReplayBatch, replayBatchDigest, INCREMENTAL_LIMITS, utf8Bytes } from '../../src/server/incremental.js';
import { createPrivateCheckpoint, restorePrivateCheckpoint } from '../../src/server/checkpoint.js';
import * as checkpointModule from '../../src/server/checkpoint.js';
import { stableStringify, fnv1a } from '../../src/sim/hash.js';
import { bytesToB64, b64ToBytes, encodeFrames, LIMITS } from '../../src/server/protocol.js';
import { CASES } from './replay-corpus.js';
import { classify } from '../../src/server/replayChecks.js';
import { bossById } from '../../src/data/serverManifest.js';

const root = path.resolve('.');
const fixtures = CASES.map((spec) => JSON.parse(fs.readFileSync(path.join('tests/fixtures/replay-corpus', `${spec.id}.json`), 'utf8')));
const roundtrip = (value) => JSON.parse(JSON.stringify(value));
let manifest, bundle;
const bindingOf = (f) => f.log.binding;
const context = (f) => ({ issuance: f.issuance, manifest });
function admitted(f, batch, before = true) {
  return { ...context(f), accepted: { runId: batch.runId, sequence: batch.sequence, tick0: batch.tick0, n: batch.n,
    sha256: replayBatchDigest(batch), binding: bindingOf(f), acceptedBeforeTerminal: before } };
}
function batches(f, cuts = []) {
  const original = f.log.segments[0], bytes = b64ToBytes(original.frames);
  const edges = [0, ...cuts.filter((n) => n > 0 && n < original.n), original.n].sort((a, b) => a - b);
  return [...new Set(edges)].slice(1).map((end, sequence) => {
    const start = [...new Set(edges)][sequence];
    return { protocol: 2, runId: f.issuance.runId, sequence, tick0: start, n: end - start,
      frames: bytesToB64(bytes.slice(start * 12, end * 12)),
      actions: (original.actions || []).filter(([at]) => at >= start && at < end).map(([at, action]) => [at - start, action]) };
  });
}
function checked(result) {
  expect(result.publicResult.status, result.publicResult.reason).not.toBe('invalid');
  expect(result.privateCheckpoint).toBeTruthy();
  return result;
}
function run(f, cuts = [], work = 4096) {
  let result = checked(beginIncrementalReplay(context(f)));
  for (const batch of batches(f, cuts)) {
    result = checked(acceptReplayBatch(JSON.stringify(batch), roundtrip(result.privateCheckpoint), admitted(f, batch)));
    while (result.privateCheckpoint.pending) result = checked(stepReplaySlice(roundtrip(result.privateCheckpoint), { ...context(f), maxWorkFrames: work }));
  }
  return result;
}
function semantic(result) {
  const p = result.publicResult;
  return { terminal: p.terminal, simulationTick: p.simulationTick, acceptedInputTick: p.acceptedInputTick,
    verifiedInputTick: p.verifiedInputTick, framesTextBytes: p.framesTextBytes, actions: p.actions,
    hash: result.privateCheckpoint.snapshot.state && result.privateCheckpoint.snapshot.privateHash,
    stateHash: result.privateCheckpoint.firstTerminal?.stateHash || null };
}
function semanticState(result) {
  // v1 snapshot counters legitimately include public batch counts. Compare the
  // actual simulation plus rewind snapshots/parts independently of those counts.
  const s = result.privateCheckpoint.snapshot;
  return stableStringify({ state: s.state, rewind: s.campaignCheckpoints, parts: s.parts });
}
function resign(envelope) {
  const { privateHash: ignored, ...body } = envelope; void ignored;
  return { ...body, privateHash: fnv1a(stableStringify(body)) };
}
function forgedAccounting(checkpoint, changes) {
  const e = roundtrip(checkpoint);
  Object.assign(e.accounting, changes);
  const snapshot = restorePrivateCheckpoint(e.snapshot, { manifest, binding: e.snapshot.binding });
  e.snapshot = createPrivateCheckpoint(snapshot.state, { manifest, binding: e.snapshot.binding, parts: snapshot.parts,
    counters: { frames: e.accounting.verifiedFrames, segments: e.accounting.verifiedBatches } });
  return resign(e);
}

beforeAll(() => {
  execFileSync(process.execPath, ['scripts/build-server-sim.mjs'], { cwd: root, stdio: 'inherit' });
  bundle = path.join(root, 'build/shooter-sim.js');
  const pin = JSON.parse(fs.readFileSync(path.join(root, 'build/shooter-sim.pin.json'), 'utf8'));
  manifest = { artifact: 'shooter-sim', sourceCommit: pin.sourceCommit, sha256: pin.bundleSha256, protocol: pin.protocol, contentFingerprint: pin.contentFingerprint };
});

describe('dormant private incremental replay v2', () => {
  for (const f of fixtures) {
    it(`preserves the entire frozen trace across public batches and work slices: ${f.provenance.spec.id}`, () => {
      const n = f.log.segments[0].n;
      const whole = run(f, [], 28800);
      const cuts = [1, 63, 64, 65, 400, Math.floor(n / 2), n - 1];
      const segmented = run(f, cuts, 1024);
      expect(semanticState(segmented)).toBe(semanticState(whole));
      const left = semantic(segmented), right = semantic(whole);
      delete left.hash; delete right.hash;
      expect(left).toEqual(right);
      expect(segmented.privateCheckpoint.accounting.acceptedFrames).toBe(n);
      expect(segmented.privateCheckpoint.accounting.verifiedFrames).toBe(n);
      expect(segmented.privateCheckpoint.accounting.framesTextBytes).toBe(n * 16);
      expect(segmented.privateCheckpoint.accounting.verifiedFramesTextBytes).toBe(n * 16);
      expect(segmented.privateCheckpoint.accounting.batches).toBe(batches(f, cuts).length);
      expect(segmented.privateCheckpoint.accounting.verifiedBatches).toBe(batches(f, cuts).length);
      expect(segmented.privateCheckpoint.accounting.actions).toBe((f.log.segments[0].actions || []).length);
      expect(segmented.publicResult.ticketsMinted).toBe(0);
      if (f.provenance.spec.id === 'obama-success-7') expect(n).toBe(24000);
      if (['sahil-success-7', 'sahil-fail-7', 'sahil-assisted-9'].includes(f.provenance.spec.id)) {
        expect(whole.publicResult.terminal.outcome).toBe(f.expected.outcome);
        expect(whole.publicResult.terminal.simTick).toBe(f.expected.tick);
      }
    }, 120000);
  }

  it('gives identical accounting for different work slices within the same public batches', () => {
    const f = fixtures.find((row) => row.provenance.spec.id === 'sahil-fail-7');
    // Small prefix only for one-tick slice mechanics. Every full trace, including
    // 24000 frames, remains covered above and in all three runtimes below.
    const seg = f.log.segments[0];
    const short = { ...f, log: { ...f.log, segments: [{ ...seg, n: 64, frames: seg.frames.slice(0, 64 * 16), actions: [] }] } };
    expect(run(short, [1, 63], 257)).toEqual(run(short, [1, 63], 1));
  }, 60000);

  it('retains accepted history once and returns timeout progress as retryable, never invalid', () => {
    const f = fixtures[0], batch = batches(f)[0];
    const accepted = checked(acceptReplayBatch(JSON.stringify(batch), beginIncrementalReplay(context(f)).privateCheckpoint, admitted(f, batch)));
    const before = roundtrip(accepted.privateCheckpoint);
    let calls = 0;
    const timeout = checked(stepReplaySlice(before, { ...context(f), maxWorkFrames: 4096,
      clock: () => (++calls < 66 ? 0 : LIMITS.maxCpuMs) }));
    expect(timeout.publicResult).toMatchObject({ status: 'pending_retryable', reason: 'execution_timeout', retryable: true });
    expect(timeout.privateCheckpoint.pending.cursor).toBeGreaterThan(0);
    expect(timeout.privateCheckpoint.pending.cursor).toBeLessThan(batch.n);
    expect(timeout.privateCheckpoint.accounting.batches).toBe(1);
    expect(timeout.privateCheckpoint.accounting.framesTextBytes).toBe(batch.frames.length);
    expect(before).toEqual(accepted.privateCheckpoint);
    let resumed = timeout;
    while (resumed.privateCheckpoint.pending) resumed = checked(stepReplaySlice(roundtrip(resumed.privateCheckpoint), { ...context(f), maxWorkFrames: 1024 }));
    expect(resumed).toEqual(run(f, [], 1024));
    const duplicate = acceptReplayBatch(JSON.stringify(batch), resumed.privateCheckpoint, admitted(f, batch));
    expect(duplicate.publicResult).toMatchObject({ status: 'invalid', reason: 'history_conflict' });
    expect(resumed.privateCheckpoint.accounting.batches).toBe(1);
  }, 60000);

  it('treats a trusted post-simulation snapshot export failure as operational pending', () => {
    const f = fixtures[0], batch = batches(f, [64])[0];
    const accepted = checked(acceptReplayBatch(JSON.stringify(batch), beginIncrementalReplay(context(f)).privateCheckpoint, admitted(f, batch)));
    const predecessor = JSON.stringify(accepted.privateCheckpoint);
    // Inject the export resource failure, not a replay/clock override. This
    // exercises phase handling without allocating a giant simulation fixture.
    const spy = vi.spyOn(checkpointModule, 'createPrivateCheckpoint').mockImplementationOnce(() => { throw new Error('bad_private_checkpoint'); });
    try {
      const failed = stepReplaySlice(accepted.privateCheckpoint, { ...context(f), maxWorkFrames: 1 });
      expect(failed.publicResult).toMatchObject({ status: 'pending_retryable', reason: 'checkpoint_export_failure', retryable: true, eligible: false });
      expect(failed.privateCheckpoint).toBeNull();
      expect(JSON.stringify(accepted.privateCheckpoint)).toBe(predecessor);
    } finally { spy.mockRestore(); }
    const retry = checked(stepReplaySlice(accepted.privateCheckpoint, { ...context(f), maxWorkFrames: 1 }));
    expect(retry.publicResult.acceptedBatches).toBe(1);
    expect(retry.publicResult.verifiedInputTick).toBe(1);
  });

  it('accounts for accepted trailing input without advancing the first terminal state', () => {
    const f = fixtures.find((row) => row.provenance.spec.id === 'sahil-fail-7');
    const terminal = run(f), c = terminal.privateCheckpoint;
    const idle = { yaw: 0, pitch: 0, moveX: 0, moveZ: 1, held: { fire: true, gooBolt: true }, pressed: {}, slot: -1, wheel: 0, actions: [] };
    const encoded = encodeFrames([idle, { ...idle, actions: [{ type: 'transitionDone' }] }, idle]);
    const tail = { protocol: 2, runId: f.issuance.runId, sequence: 1, tick0: c.accounting.acceptedFrames, ...encoded };
    const accepted = checked(acceptReplayBatch(JSON.stringify(tail), c, admitted(f, tail, true)));
    const done = checked(stepReplaySlice(roundtrip(accepted.privateCheckpoint), { ...context(f), maxWorkFrames: 2 }));
    const final = checked(stepReplaySlice(roundtrip(done.privateCheckpoint), { ...context(f), maxWorkFrames: 2 }));
    expect(semanticState(final)).toBe(semanticState(terminal));
    expect(final.privateCheckpoint.snapshot.state.rng).toEqual(terminal.privateCheckpoint.snapshot.state.rng);
    expect(final.privateCheckpoint.snapshot.state.nextId).toBe(terminal.privateCheckpoint.snapshot.state.nextId);
    expect(final.publicResult.terminal).toEqual(terminal.publicResult.terminal);
    expect(final.publicResult.simulationTick).toBe(f.expected.tick);
    expect(final.publicResult.verifiedInputTick).toBe(f.expected.frames + 3);
    expect(final.publicResult.framesTextBytes).toBe(c.accounting.framesTextBytes + 48);
    expect(final.publicResult.actions).toBe(c.accounting.actions + 1);
    expect(final.publicResult.verifiedActions).toBe(c.accounting.verifiedActions + 1);
    expect(acceptReplayBatch(JSON.stringify(tail), c, admitted(f, tail, false)).publicResult.reason).toBe('terminal_closed');
    const corrupt = { ...tail, actions: [[0, 2]] };
    expect(acceptReplayBatch(JSON.stringify(corrupt), c, admitted(f, corrupt)).publicResult.status).toBe('invalid');
  });

  it('latches terminal inside one accepted batch identically to terminal-adjacent public splits', () => {
    const f = fixtures.find((row) => row.provenance.spec.id === 'sahil-success-7');
    const seg = f.log.segments[0];
    const command = { yaw: 0, pitch: 0, moveX: 0, moveZ: 1, held: { fire: true, gooBolt: true }, pressed: {}, slot: -1, wheel: 0, actions: [] };
    const tail = encodeFrames([command, { ...command, actions: [{ type: 'transitionDone' }] }, command]);
    const extended = { ...f, log: { ...f.log, segments: [{ ...seg, n: seg.n + tail.n,
      frames: seg.frames + tail.frames, actions: [...(seg.actions || []), ...tail.actions.map(([at, action]) => [seg.n + at, action])] }] } };
    const whole = run(extended, [], 4096), cut = run(extended, [seg.n - 1, seg.n, seg.n + 1], 257);
    const original = run(f);
    expect(semanticState(whole)).toBe(semanticState(original));
    expect(semanticState(cut)).toBe(semanticState(whole));
    expect(whole.publicResult.terminal).toEqual(cut.publicResult.terminal);
    expect(whole.publicResult.terminal.simTick).toBe(f.expected.tick);
    expect(whole.privateCheckpoint.snapshot.state.rng).toEqual(original.privateCheckpoint.snapshot.state.rng);
    expect(whole.privateCheckpoint.snapshot.state.nextId).toBe(original.privateCheckpoint.snapshot.state.nextId);
    for (const key of ['acceptedFrames', 'verifiedFrames', 'simFrames', 'framesTextBytes', 'verifiedFramesTextBytes', 'actions', 'verifiedActions']) {
      expect(cut.privateCheckpoint.accounting[key], key).toBe(whole.privateCheckpoint.accounting[key]);
    }
    expect(whole.publicResult.verifiedInputTick).toBe(seg.n + 3);
    expect(whole.publicResult.verifiedActions).toBe((seg.actions || []).length + 1);
    expect(whole.publicResult.acceptedBatches).toBe(1);
    expect(cut.publicResult.acceptedBatches).toBe(4);
  }, 60000);

  it('preserves shared flee classification and rejects a missing private terminal latch', () => {
    // Synthetic server-owned state-history coverage, not a fabricated rewarded
    // client trace. Real history is populated only by the shared replay checks.
    const f = fixtures[0], initial = beginIncrementalReplay(context(f)).privateCheckpoint;
    const s = restorePrivateCheckpoint(initial.snapshot, { manifest, binding: bindingOf(f) });
    s.parts.sahil.fled = true;
    initial.snapshot = createPrivateCheckpoint(s.state, { manifest, binding: bindingOf(f), parts: s.parts, counters: s.counters });
    expect(classify(s.parts, bossById('sahil'), false, s.state.localPlayerId))
      .toMatchObject({ outcome: 'fail', reason: 'boss_fled', eligible: false });
    const checkpoint = resign(initial), batch = batches(f, [1])[0];
    expect(acceptReplayBatch(JSON.stringify(batch), checkpoint, admitted(f, batch)).publicResult)
      .toMatchObject({ status: 'invalid', reason: 'bad_private_checkpoint' });
    // A real terminal record cannot be deleted even if a corruption checksum is
    // recomputed. Canonical authored boss encounters currently have fleeAt=0;
    // this synthetic history is not claimed to be an authored reward trace.
    const ended = roundtrip(run(fixtures.find((row) => row.provenance.spec.id === 'sahil-fail-7')).privateCheckpoint);
    ended.firstTerminal = null;
    expect(stepReplaySlice(resign(ended), { ...context(f), issuance: fixtures.find((row) => row.provenance.spec.id === 'sahil-fail-7').issuance, maxWorkFrames: 1 }).publicResult)
      .toMatchObject({ status: 'invalid', reason: 'bad_private_checkpoint' });
  });

  it('resumes a pending public batch in a fresh Node process without prior module state', () => {
    const f = fixtures.find((row) => row.provenance.spec.id === 'sahil-fail-7'), batch = batches(f)[0];
    const accepted = checked(acceptReplayBatch(JSON.stringify(batch), beginIncrementalReplay(context(f)).privateCheckpoint, admitted(f, batch)));
    const prefix = checked(stepReplaySlice(accepted.privateCheckpoint, { ...context(f), maxWorkFrames: 64 }));
    const script = `import fs from 'node:fs'; import {stepReplaySlice} from './src/server/incremental.js';
      const input=JSON.parse(fs.readFileSync(0,'utf8')); let checkpoint=input.checkpoint,r;
      while(checkpoint.pending){r=stepReplaySlice(checkpoint,{...input.context,maxWorkFrames:4096});
        if(!r.privateCheckpoint)throw new Error(JSON.stringify(r)); checkpoint=JSON.parse(JSON.stringify(r.privateCheckpoint));}
      process.stdout.write(JSON.stringify(r));`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { cwd: root,
      input: JSON.stringify({ context: context(f), checkpoint: prefix.privateCheckpoint }), encoding: 'utf8', timeout: 30000, maxBuffer: 16 * 1024 * 1024 });
    expect(result.status, result.stderr || result.error?.message).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(run(f));
  });

  it('enforces cumulative caps atomically across checkpoint restores', () => {
    const f = fixtures.find((row) => row.provenance.spec.id === 'sahil-fail-7'), base = run(f).privateCheckpoint;
    const encoded = encodeFrames([{ yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [{ type: 'transitionDone' }] }]);
    for (const changes of [
      { acceptedFrames: 162000, verifiedFrames: 162000, framesTextBytes: 162000 * 16, verifiedFramesTextBytes: 162000 * 16, batches: 6, verifiedBatches: 6 },
      { batches: 4096, verifiedBatches: 4096, acceptedFrames: 4096, verifiedFrames: 4096, framesTextBytes: 4096 * 16, verifiedFramesTextBytes: 4096 * 16 },
      { actions: 131072, verifiedActions: 131072, batches: 4096, verifiedBatches: 4096,
        acceptedFrames: 131072, verifiedFrames: 131072, framesTextBytes: 131072 * 16, verifiedFramesTextBytes: 131072 * 16 },
    ]) {
      const checkpoint = forgedAccounting(base, changes), a = checkpoint.accounting;
      const batch = { protocol: 2, runId: f.issuance.runId, sequence: a.batches, tick0: a.acceptedFrames, ...encoded };
      const before = JSON.stringify(checkpoint);
      expect(acceptReplayBatch(JSON.stringify(batch), checkpoint, admitted(f, batch)).publicResult).toMatchObject({ status: 'invalid', reason: 'oversized' });
      expect(JSON.stringify(checkpoint)).toBe(before);
    }
    // With this codec the frame cap dominates the separate encoded-text cap;
    // an allegedly near-64MiB checkpoint would be an impossible history.
    expect(INCREMENTAL_LIMITS.runFrames * 16).toBeLessThan(INCREMENTAL_LIMITS.runFramesTextBytes);
    for (const changes of [
      { framesTextBytes: 67108864, verifiedFramesTextBytes: 67108864 },
      { actions: base.accounting.acceptedFrames + 1, verifiedActions: base.accounting.verifiedFrames + 1 },
      { batches: base.accounting.acceptedFrames + 1, verifiedBatches: base.accounting.verifiedFrames + 1 },
    ]) {
      const impossible = forgedAccounting(base, changes);
      expect(stepReplaySlice(impossible, { ...context(f), maxWorkFrames: 64 }).publicResult)
        .toMatchObject({ status: 'invalid', reason: 'bad_private_checkpoint' });
    }
  });

  it('enforces exact wire schemas, independent body/action bounds and immutable identity', () => {
    expect(INCREMENTAL_LIMITS).toMatchObject({ batchFramesTextBytes: 2097152, runFramesTextBytes: 67108864, bodyBytes: 2162688,
      batchFrames: 28800, runFrames: 162000, batches: 4096, batchActions: 32, runActions: 131072, depth: 12, idLength: 80 });
    const f = fixtures[0], batch = batches(f, [64])[0];
    expect(utf8Bytes('é🐱')).toBe(Buffer.byteLength('é🐱'));
    expect(replayBatchDigest(batch)).toMatch(/^[0-9a-f]{64}$/);
    for (const mutation of [
      (b) => { b.state = {}; }, (b) => { b.acceptedBeforeTerminal = true; }, (b) => { b.sequence = 0.5; },
      (b) => { b.runId = 'x'.repeat(81); }, (b) => { b.runId = 'é'; }, (b) => { b.n = 28801; },
      (b) => { b.frames += '='; }, (b) => { b.frames = 'AAAA===='.repeat(128); },
      (b) => { b.actions = [[0, 1], [0, 1]]; }, (b) => { b.actions = [[2, 1], [1, 1]]; },
      (b) => { b.actions = [[0, 99]]; }, (b) => { b.actions = Array.from({ length: 33 }, (_, i) => [i, 1]); },
      (b) => { b.protocol = 1; }, (b) => { b.n = Number.MAX_SAFE_INTEGER + 1; },
    ]) {
      const changed = roundtrip(batch); mutation(changed);
      expect(() => decodeReplayBatch(JSON.stringify(changed))).toThrow();
    }
    expect(() => decodeReplayBatch(' '.repeat(INCREMENTAL_LIMITS.bodyBytes + 1))).toThrow('oversized');
    expect(() => decodeReplayBatch('{"protocol":NaN}')).toThrow();
    let deep = {}; const nested = deep;
    for (let i = 0; i < 13; i++) { deep.child = {}; deep = deep.child; }
    expect(() => decodeReplayBatch(JSON.stringify({ ...batch, nested }))).toThrow();
    const valid = beginIncrementalReplay(context(f)).privateCheckpoint;
    const accepted = admitted(f, batch); accepted.accepted.sha256 = 'a'.repeat(64);
    expect(acceptReplayBatch(JSON.stringify(batch), valid, accepted).publicResult.reason).toBe('bad_accepted_record');
    expect(acceptReplayBatch(JSON.stringify(batch), valid, { ...admitted(f, batch), manifest: { ...manifest, sha256: 'b'.repeat(64) } }).publicResult.status).toBe('invalid');
    expect(beginIncrementalReplay({ ...context(f), issuance: { ...f.issuance, seed: 9 } }).publicResult.reason).toBe('bad_issuance');
  });

  it('redacts private snapshots, pending input, binding and parts from public JSON', () => {
    const f = fixtures[0], batch = batches(f, [64])[0];
    const r = checked(acceptReplayBatch(JSON.stringify(batch), beginIncrementalReplay(context(f)).privateCheckpoint, admitted(f, batch)));
    r.publicResult.state = r.privateCheckpoint.snapshot.state;
    r.publicResult.checkpoint = r.privateCheckpoint;
    const text = publicReplayJSON(r), p = JSON.parse(text);
    expect(p.status).toBe('received');
    for (const secret of ['snapshot', 'checkpoint', 'privateCheckpoint', 'issuance', 'manifest', 'binding', 'pending', 'frames', 'rng', 'guns', 'parts']) expect(p).not.toHaveProperty(secret);
    expect(text).not.toContain(batch.frames);
    expect(text).not.toContain(f.issuance.accountId);
    const terminal = run(fixtures.find((row) => row.provenance.spec.id === 'sahil-fail-7'));
    terminal.publicResult.terminal.parts = terminal.privateCheckpoint.snapshot.parts;
    expect(JSON.parse(publicReplayJSON(terminal)).terminal).not.toHaveProperty('parts');
  });
});

// Test-only runtime harness appended to a temporary bundle. The shipped artifact
// has no JSON endpoint that accepts private context/checkpoints from a client.
const harness = `
SprotoShooterSim.testIncrementalReplayJSON = function(text) {
  const jobs=JSON.parse(text), out=[];
  for (const job of jobs) {
    let r=SprotoShooterSim.beginIncrementalReplay(job.context);
    for (let i=0;i<job.batches.length;i++) {
      if (!r.privateCheckpoint) throw new Error(JSON.stringify(r));
      r=SprotoShooterSim.acceptReplayBatch(JSON.stringify(job.batches[i]),JSON.parse(JSON.stringify(r.privateCheckpoint)),{...job.context,accepted:job.accepted[i]});
      if (!r.privateCheckpoint) throw new Error(JSON.stringify(r));
      while(r.privateCheckpoint.pending) {
        r=SprotoShooterSim.stepReplaySlice(JSON.parse(JSON.stringify(r.privateCheckpoint)),{...job.context,maxWorkFrames:4096});
        if (!r.privateCheckpoint) throw new Error(JSON.stringify(r));
      }
    }
    out.push(r.publicResult);
  }
  return JSON.stringify(out);
};`;

for (const f of fixtures) {
  it(`replays the COMPLETE frozen trace in Node, Goja, and Chromium: ${f.provenance.spec.id}`, async () => {
    const cuts = [63, 400, Math.floor(f.log.segments[0].n / 2), f.log.segments[0].n - 1];
    const parts = batches(f, cuts);
    const job = { context: context(f), batches: parts, accepted: parts.map((b) => admitted(f, b).accepted) };
    const expected = [run(f, cuts, 4096).publicResult];
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'shooter-incremental-'));
    const augmented = path.join(temporary, 'sim-test.js');
    fs.writeFileSync(augmented, fs.readFileSync(bundle, 'utf8') + '\n' + harness);
    const input = JSON.stringify([job]);
    try {
      const nodeScript = `import fs from 'node:fs'; import vm from 'node:vm'; vm.runInThisContext(fs.readFileSync(process.argv[1],'utf8')); process.stdout.write(SprotoShooterSim.testIncrementalReplayJSON(fs.readFileSync(0,'utf8')));`;
      for (const [command, args, cwd] of [
        [process.execPath, ['--input-type=module', '-e', nodeScript, augmented], root],
        ['go', ['run', '.', augmented, 'testIncrementalReplayJSON'], path.join(root, 'tests/fixtures/goja')],
      ]) {
        const started = Date.now();
        const result = spawnSync(command, args, { cwd, input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180000 });
        console.log(`incremental complete ${f.provenance.spec.id}: ${command} ${Date.now() - started}ms (${f.log.segments[0].n} frames)`);
        expect(result.status, result.error?.message || result.stderr).toBe(0);
        expect(JSON.parse(result.stdout)).toEqual(expected);
      }
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.addScriptTag({ path: augmented });
        expect(JSON.parse(await page.evaluate((text) => globalThis.SprotoShooterSim.testIncrementalReplayJSON(text), input))).toEqual(expected);
      } finally { await browser.close(); }
    } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
  }, 180000);
}
