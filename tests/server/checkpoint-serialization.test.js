import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { createPrivateCheckpoint, restorePrivateCheckpoint, CHECKPOINT_LIMITS } from '../../src/server/checkpoint.js';
import { exportCampaignCheckpoints } from '../../src/sim/campaign/campaign.js';
import { verifyStateHash, fnv1a, stableStringify } from '../../src/sim/hash.js';
import { buildIssuedState } from '../../src/server/runContract.js';
import { decodeFrames } from '../../src/server/protocol.js';
import { simulate } from '../../src/sim/simulate.js';
import { contentFingerprint } from '../../src/data/serverManifest.js';
import { lockdownScenario, voidScenario, pickupsScenario, transitionScenario, step } from './campaign-corpus-scenarios.js';
import { CASES } from './replay-corpus.js';

const manifest = { artifact: 'shooter-sim', sourceCommit: 'a'.repeat(40), sha256: 'c'.repeat(64), protocol: 1, contentFingerprint: contentFingerprint(1) };
const binding = { accountId: 'test-account', sessionId: 'test-session', day: '2026-11-11', runId: 'test-run' };
const context = { manifest, binding };
const json = (value) => JSON.parse(JSON.stringify(value));
const capture = (state, extra = {}) => createPrivateCheckpoint(state, { ...context, ...extra });
const restore = (snapshot) => restorePrivateCheckpoint(snapshot, context);
function resealAndDie(state) {
  const player = state.players[state.localPlayerId];
  player.pos = { x: 12, y: 0, z: 6 }; player.prevPos = { ...player.pos }; player.vel = { x: 0, y: 0, z: 0 };
  step(state);
  const sealed = state.level.v2.enc.lock.sealed;
  state.players[state.localPlayerId].dead = true;
  const events = step(state);
  return { sealed, reset: events.some((event) => event.type === 'lockdownReset'),
    dead: state.players[state.localPlayerId].dead, lost: state.level.lost,
    hash: verifyStateHash(state), tick: state.tick };
}
// Re-signing is used only to exercise schema checks independently of digest
// rejection. The FNV digest deliberately provides no authenticity guarantee.
function resign(envelope) {
  const { privateHash: ignored, ...body } = envelope;
  void ignored;
  return { ...body, privateHash: fnv1a(stableStringify(body)) };
}

describe('private server-owned checkpoint serialization', () => {
  it('preserves native and JSON rewind behavior without changing legacy state hashes', () => {
    const native = lockdownScenario().state;
    const envelope = capture(native, { parts: { sahil: { type: 'sahil', spawned: true, dead: false, fled: false, sourceKind: null, sourceId: null } }, counters: { frames: native.tick + 5, segments: 2 } });
    const resumed = restore(json(envelope));
    expect(verifyStateHash(resumed.state)).toBe(verifyStateHash(native));
    expect(resumed.state.rng).toEqual(native.rng);
    expect(resumed.state.nextId).toBe(native.nextId);
    expect(resumed.parts).toEqual(envelope.parts);
    expect(resumed.counters).toEqual({ frames: native.tick + 5, segments: 2 });
    const expected = resealAndDie(native);
    expect(expected).toMatchObject({ sealed: true, reset: true, dead: false, lost: false });
    expect(resealAndDie(resumed.state)).toEqual(expected);
  });

  it('survives a fresh Node process, including private rewind side-state', () => {
    const native = lockdownScenario().state;
    const envelope = capture(native);
    const script = `import fs from 'node:fs';
      import { restorePrivateCheckpoint } from './src/server/checkpoint.js';
      import { lockdownScenario, step } from './tests/server/campaign-corpus-scenarios.js';
      import { verifyStateHash } from './src/sim/hash.js';
      lockdownScenario(); // register synthetic static level in this fresh process
      const input = JSON.parse(fs.readFileSync(0,'utf8'));
      const {state:s} = restorePrivateCheckpoint(input.envelope,input.context);
      const p=s.players[s.localPlayerId]; p.pos={x:12,y:0,z:6}; p.prevPos={...p.pos}; p.vel={x:0,y:0,z:0};
      step(s); const sealed=s.level.v2.enc.lock.sealed;
      s.players[s.localPlayerId].dead=true; const events=step(s);
      process.stdout.write(JSON.stringify({sealed,reset:events.some(e=>e.type==='lockdownReset'),dead:s.players[s.localPlayerId].dead,lost:s.level.lost,hash:verifyStateHash(s),tick:s.tick}));`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: path.resolve('.'), input: JSON.stringify({ envelope, context }), encoding: 'utf8', timeout: 30000,
    });
    expect(result.status, result.stderr || result.error?.message).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(resealAndDie(native));
  });

  for (const [name, scenario] of [['void', voidScenario], ['pickups/projectiles', pickupsScenario], ['transition', transitionScenario]]) {
    it(`continues synthetic ${name} state identically after JSON import`, () => {
      const native = scenario().state;
      const resumed = restore(json(capture(native))).state;
      for (let i = 0; i < 60; i++) { step(native); step(resumed); }
      expect(verifyStateHash(resumed)).toBe(verifyStateHash(native));
    });
  }

  for (const spec of CASES) {
    it(`continues frozen inputs across a snapshot: ${spec.id}`, () => {
      const fixture = JSON.parse(fs.readFileSync(path.join('tests/fixtures/replay-corpus', `${spec.id}.json`), 'utf8'));
      const segment = fixture.log.segments[0];
      const decoded = decodeFrames(segment.frames, segment.n, segment.actions || []);
      expect(decoded.error).toBeUndefined();
      const native = buildIssuedState(fixture.issuance);
      const partBoundaries = Object.values(fixture.coverage.bossParts)
        .flatMap((part) => [part.deadTick - 1, part.deadTick])
        .filter((tick) => Number.isInteger(tick) && tick > 0 && tick < segment.n);
      const points = new Set([1, Math.floor(segment.n / 2), segment.n - 1,
        1 + (parseInt(fnv1a(spec.id), 16) % (segment.n - 1)), ...partBoundaries]);
      const snapshots = [];
      for (let i = 0; i < segment.n; i++) {
        simulate(native, { [native.localPlayerId]: decoded.commands[i] });
        if (points.has(i + 1)) {
          const envelope = createPrivateCheckpoint(native, { manifest, binding: fixture.log.binding,
            counters: { frames: i + 1, segments: 1 } });
          const bytes = Buffer.byteLength(JSON.stringify(envelope));
          console.log(`private checkpoint ${spec.id}@${i + 1}: ${bytes} bytes, ${envelope.campaignCheckpoints.length} rewind entries`);
          expect(bytes).toBeLessThanOrEqual(CHECKPOINT_LIMITS.bytes);
          snapshots.push({ at: i + 1, envelope });
        }
      }
      const expectedHash = verifyStateHash(native);
      // The recorder's AI can mutate its own state; frozen-input direct replay
      // must instead match the unchanged authoritative legacy verifier receipt.
      expect(expectedHash).toBe(fixture.expected.stateHash);
      expect(snapshots).toHaveLength(points.size);
      for (const { at, envelope } of snapshots) {
        const resumed = restorePrivateCheckpoint(json(envelope), { manifest, binding: fixture.log.binding }).state;
        for (let i = at; i < segment.n; i++) simulate(resumed, { [resumed.localPlayerId]: decoded.commands[i] });
        expect(verifyStateHash(resumed), `split at ${at}`).toBe(expectedHash);
      }
    }, 60000);
  }

  it('does not nest rewind buckets or retain mutable aliases', () => {
    let envelope = capture(lockdownScenario().state);
    const count = envelope.campaignCheckpoints.length;
    const size = JSON.stringify(envelope).length;
    for (let i = 0; i < 8; i++) envelope = capture(restore(json(envelope)).state);
    expect(envelope.campaignCheckpoints).toHaveLength(count);
    expect(JSON.stringify(envelope).length).toBe(size);
    const restored = restore(envelope).state;
    const saved = exportCampaignCheckpoints(restored);
    const expected = saved[0].state.rng.a;
    envelope.campaignCheckpoints[0].state.rng.a = 123;
    saved[0].state.rng.a = 456;
    expect(exportCampaignCheckpoints(restored)[0].state.rng.a).toBe(expected);
    envelope.state.rng.a = 789;
    expect(restored.rng.a).not.toBe(789);
  });

  it('binds the full rewind payload to an exact expected artifact and run', () => {
    const envelope = capture(lockdownScenario().state);
    const modified = json(envelope);
    modified.campaignCheckpoints[0].state.rng.a ^= 1;
    expect(() => restore(modified)).toThrow('bad_private_checkpoint');
    expect(() => restorePrivateCheckpoint(envelope, { ...context, manifest: { ...manifest, sourceCommit: 'b'.repeat(40) } })).toThrow();
    expect(() => restorePrivateCheckpoint(envelope, { ...context, manifest: { ...manifest, sha256: 'd'.repeat(64) } })).toThrow();
    expect(() => restorePrivateCheckpoint(envelope, { ...context, binding: { ...binding, runId: 'other' } })).toThrow();
  });

  it('rejects hostile structure, invalid states, duplicates and nested buckets', () => {
    const valid = capture(lockdownScenario().state);
    const mutations = [
      (e) => { e.v = 2; },
      (e) => { e.campaignCheckpoints.push(e.campaignCheckpoints[0]); },
      (e) => { e.campaignCheckpoints[0].id = 'unknown'; },
      (e) => { e.campaignCheckpoints[0].state.campaignCheckpoints = []; },
      (e) => { e.campaignCheckpoints[0].state.seed++; },
      (e) => { e.state.rng.a = 1.5; },
      (e) => { e.state.rng = { 'a,b': 1, c: 2, d: 3 }; },
      (e) => { e.binding = { 'accountId,day': 'test-account', sessionId: 'test-session', runId: 'test-run' }; },
      (e) => { e.manifest.sha256 = 'not-an-artifact-hash'; },
      (e) => { e.state.seed = 4294967296; },
      (e) => { e.state.players[e.state.localPlayerId].pos.x = '1'; },
      (e) => { e.state.level.section = 'missing-section'; },
      (e) => { e.state.level.id = 'l01'; },
      (e) => { e.state.nextId = 0; },
      (e) => { e.counters.frames = -1; },
      (e) => { e.parts.unknown = {}; },
    ];
    for (const mutate of mutations) { const e = json(valid); mutate(e); expect(() => restore(resign(e))).toThrow(); }
    for (const value of [NaN, Infinity, undefined, () => 0, new Date(), new Map()]) {
      const e = json(valid); e.state.hostile = value;
      expect(() => restore(e)).toThrow('bad_private_checkpoint');
    }
    const cyclic = json(valid); cyclic.state.cycle = cyclic;
    expect(() => restore(cyclic)).toThrow('bad_private_checkpoint');
    const polluted = json(valid); Object.defineProperty(polluted.state, '__proto__', { value: {}, enumerable: true });
    expect(() => restore(polluted)).toThrow('bad_private_checkpoint');
    const getter = json(valid); Object.defineProperty(getter.state, 'getter', { get() { throw new Error('must not evaluate'); }, enumerable: true });
    expect(() => restore(getter)).toThrow('bad_private_checkpoint');
    for (const property of [{ value: 1 }, { get() { throw new Error('must not evaluate'); } }]) {
      const hidden = json(valid);
      Object.defineProperty(hidden.state.enemies, 'hidden', property);
      expect(() => restore(hidden)).toThrow('bad_private_checkpoint');
    }
    const tooLong = json(valid); tooLong.state.text = 'x'.repeat(CHECKPOINT_LIMITS.string + 1);
    expect(() => restore(tooLong)).toThrow('bad_private_checkpoint');
    const tooDeep = json(valid); let cursor = tooDeep.state;
    for (let i = 0; i <= CHECKPOINT_LIMITS.depth; i++) { cursor.child = {}; cursor = cursor.child; }
    expect(() => restore(tooDeep)).toThrow('bad_private_checkpoint');
    const tooLarge = json(valid); tooLarge.state.rows = Array.from({ length: 1100 }, () => 'x'.repeat(CHECKPOINT_LIMITS.string));
    expect(() => restore(tooLarge)).toThrow('bad_private_checkpoint');
  });
});
