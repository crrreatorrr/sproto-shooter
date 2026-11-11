import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { verifyRun } from '../../src/server/verify.js';
import { contentFingerprint } from '../../src/data/serverManifest.js';
import { recordBoss, splitLog } from '../bossLog.js';
import { CASES, digest, receiptCore } from './replay-corpus.js';
import goldens from '../fixtures/boss-goldens.json';

const root = path.resolve('.');
const dir = path.join(root, 'tests/fixtures/replay-corpus');
const bundle = path.join(root, 'build/shooter-sim.js');
const fixtures = CASES.map((spec) => JSON.parse(fs.readFileSync(path.join(dir, `${spec.id}.json`), 'utf8')));

describe('persisted campaign input corpus', () => {
  beforeAll(() => {
    execFileSync(process.execPath, ['scripts/build-server-sim.mjs'], { cwd: root, stdio: 'inherit' });
  });

  it('covers every preselected seed and preserves original golden outcomes without rerolls', () => {
    expect(fixtures.map((f) => f.provenance.spec)).toEqual(CASES);
    for (const spec of Object.values(goldens.runs)) {
      const f = fixtures.find((row) => row.provenance.spec.boss === spec.boss
        && row.provenance.spec.mode === spec.mode && row.provenance.spec.seed === spec.seed);
      expect(f).toBeTruthy();
      for (const key of ['stateHash', 'outcome', 'reason', 'eligible', 'tick', 'frames', 'canonicalCount']) {
        expect(f.expected[key], `${f.provenance.spec.id}:${key}`).toEqual(spec[key]);
      }
    }
    expect(fixtures.find((f) => f.provenance.spec.id === 'sahil-success-7').expected.frames).toBe(9634);
    const obama = fixtures.find((f) => f.provenance.spec.id === 'obama-success-11');
    expect(Object.keys(obama.coverage.bossParts).sort()).toEqual(['midgetDuo', 'obamaDuo']);
    expect(obama.expected.canonicalCount).toBe(1);
    for (const part of Object.values(obama.coverage.bossParts)) expect(part.deadTick).toBeGreaterThan(0);
  });

  for (const f of fixtures) {
    it(`replays frozen inputs: ${f.provenance.spec.id}`, () => {
      expect(f.schema).toBe(1);
      expect(f.provenance.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
      expect(digest(f.log)).toBe(f.inputSha256);
      expect(f.expected.contentFingerprint).toBe(contentFingerprint(1));
      expect(f.expected.ticketsMinted).toBe(0);
      if (f.expected.outcome === 'incomplete') {
        expect(f.expected.frames).toBe(f.provenance.spec.maxFrames);
        expect(f.log.segments[0].n).toBe(f.provenance.spec.maxFrames);
      }
      expect(f.recorderMatchesVerifier).toBe(f.recorderStateHash === f.expected.stateHash);
      expect(f.coverage.projectileTicks).toBeGreaterThan(0);
      expect(receiptCore(verifyRun(f.log, { issuance: f.issuance }))).toEqual(f.expected);
    });
  }

  it('reproduces the known Obama recorder/verifier state divergence without replacing either seed', () => {
    expect(fixtures.filter((f) => !f.recorderMatchesVerifier).map((f) => f.provenance.spec.id))
      .toEqual(['obama-success-7', 'obama-success-11']);
    for (const f of fixtures.filter((row) => !row.recorderMatchesVerifier)) {
      const spec = f.provenance.spec;
      const recorded = recordBoss(spec.boss, spec.seed, spec.mode, spec.maxFrames);
      expect(digest(recorded.log)).toBe(f.inputSha256);
      expect(recorded.verifyStateHash).toBe(f.recorderStateHash);
      expect(recorded.verifyStateHash).not.toBe(f.expected.stateHash);
    }
  }, 60000);

  it('reproduces the same frozen receipts in fresh Node, Goja and Chromium runtimes', async () => {
    const jobs = fixtures.map((f) => ({ log: f.log, ctx: { issuance: f.issuance } }));
    const input = JSON.stringify(jobs);
    const expected = fixtures.map((f) => f.expected);
    const script = `import fs from 'node:fs'; import vm from 'node:vm';
      vm.runInThisContext(fs.readFileSync(process.argv[1], 'utf8'));
      process.stdout.write(globalThis.SprotoShooterSim.verifyRunJSON(fs.readFileSync(0, 'utf8')));`;
    for (const [cmd, args, cwd] of [
      [process.execPath, ['--input-type=module', '-e', script, bundle], root],
      ['go', ['run', '.', bundle], path.join(root, 'tests/fixtures/goja')],
    ]) {
      const result = spawnSync(cmd, args, { cwd, input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180000 });
      expect(result.status, result.stderr || result.error?.message).toBe(0);
      expect(JSON.parse(result.stdout).map(receiptCore)).toEqual(expected);
    }
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.addScriptTag({ path: bundle });
      const json = await page.evaluate((payload) => globalThis.SprotoShooterSim.verifyRunJSON(payload), input);
      expect(JSON.parse(json).map(receiptCore)).toEqual(expected);
    } finally {
      await browser.close();
    }
  }, 180000);

  for (const id of ['sahil-success-7', 'obama-success-11']) {
    it(`preserves whole-run results across terminal/part boundaries: ${id}`, () => {
      const f = fixtures.find((row) => row.provenance.spec.id === id);
      const boundary = id.startsWith('obama')
        ? Math.min(...Object.values(f.coverage.bossParts).map((part) => part.deadTick))
        : f.terminalTick - 1;
      expect(boundary).toBeGreaterThan(0);
      expect(boundary).toBeLessThan(f.expected.frames);
      const chained = splitLog(f, boundary);
      const full = verifyRun(chained, { issuance: f.issuance });
      expect(receiptCore(full)).toEqual(f.expected);
      const head = verifyRun({ ...chained, segments: [chained.segments[0]] }, { issuance: f.issuance });
      expect(head.ok).toBe(true);
      expect(head.outcome).toBe('incomplete');
      const tail = verifyRun({ ...chained, segments: [{ ...chained.segments[1], i: 0 }] }, {
        issuance: f.issuance, resume: JSON.parse(JSON.stringify(head.checkpoint)),
      });
      // Document legacy per-call frame accounting; PR04 must replace it with cumulative counters.
      expect(tail.frames).toBe(f.expected.frames - boundary);
      expect({ ...receiptCore(tail), frames: f.expected.frames }).toEqual(f.expected);
      expect(tail.tick).toBe(f.terminalTick);
    }, 60000);
  }
});
