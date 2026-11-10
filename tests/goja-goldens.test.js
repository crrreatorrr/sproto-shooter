import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { recordBoss } from './bossLog.js';
import { rejectionCases } from './rejectCases.js';
import { verifyRun } from '../src/server/verify.js';
import { LIMITS } from '../src/server/protocol.js';
import goldens from './fixtures/boss-goldens.json';

const root = path.resolve('.');
const bundlePath = path.join(root, 'build', 'shooter-sim.js');
const pinPath = path.join(root, 'build', 'shooter-sim.pin.json');

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
    parts: receipt.parts,
    contentFingerprint: receipt.contentFingerprint,
  };
}

function asJSON(payload) {
  return typeof payload === 'string' ? payload : JSON.stringify(payload);
}

function runNodeBundle(payload) {
  const script = `
    import fs from 'node:fs';
    import vm from 'node:vm';
    const src = fs.readFileSync(process.argv[1], 'utf8');
    const input = fs.readFileSync(0, 'utf8');
    vm.runInThisContext(src);
    process.stdout.write(globalThis.SprotoShooterSim.verifyRunJSON(input));
  `;
  const res = spawnSync(process.execPath, ['--input-type=module', '-e', script, bundlePath], {
    input: asJSON(payload),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.status !== 0) throw new Error(res.stderr || 'node bundle failed');
  return JSON.parse(res.stdout);
}

function runGoja(payload) {
  const res = spawnSync('go', ['run', '.', bundlePath], {
    cwd: path.join(root, 'tests', 'fixtures', 'goja'),
    input: asJSON(payload),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 180000,
  });
  if (res.status !== 0) throw new Error(res.stderr || res.stdout || 'goja failed');
  return JSON.parse(res.stdout);
}

async function runBrowser(payload) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch {
    execFileSync('npx', ['playwright', 'install', 'chromium'], { stdio: 'inherit', cwd: root });
    browser = await chromium.launch({ headless: true });
  }
  const page = await browser.newPage();
  try {
    await page.addScriptTag({ path: bundlePath });
    return await page.evaluate((json) => globalThis.SprotoShooterSim.verifyRunJSON(json), asJSON(payload));
  } finally {
    await browser.close();
  }
}

describe('browser, node, and goja', () => {
  const jobs = [];
  const expected = [];

  beforeAll(() => {
    execFileSync(process.execPath, ['scripts/build-server-sim.mjs'], { cwd: root, stdio: 'inherit' });
    const pin = JSON.parse(fs.readFileSync(pinPath, 'utf8'));
    const bytes = fs.readFileSync(bundlePath);
    expect(pin.bundleSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(pin.bundleBytes).toBe(bytes.length);
    expect(pin.mintsTickets).toBe(false);
    expect(pin.contentFingerprint).toBe(goldens.contentFingerprint);
    expect(fs.readFileSync(bundlePath, 'utf8').includes('earnTickets')).toBe(false);
    for (const spec of Object.values(goldens.runs)) {
      const rec = recordBoss(spec.boss, spec.seed, spec.mode, 16000);
      const receipt = verifyRun(rec.log, { issuance: rec.issuance });
      expect(receipt.stateHash).toBe(spec.stateHash);
      expect(receipt.cpuMs).toBeLessThan(LIMITS.maxCpuMs);
      jobs.push({ log: rec.log, ctx: { issuance: rec.issuance } });
      expected.push(core(receipt));
    }
    const rejects = rejectionCases(recordBoss('sahil', 7, 'success', 5000)).filter((row) => row.name !== 'nan');
    for (const row of rejects) {
      const receipt = verifyRun(row.log, row.ctx);
      expect(receipt.reason, row.name).toBe(row.reason);
      jobs.push({ log: row.log, ctx: row.ctx });
      expected.push(core(receipt));
    }
  }, 120000);

  it('replays the same receipts in node, goja, and chromium', async () => {
    const nodeReceipts = runNodeBundle(jobs);
    const gojaReceipts = runGoja(jobs);
    const browserJson = await runBrowser(jobs);
    const browserReceipts = JSON.parse(browserJson);
    expect(nodeReceipts.map(core)).toEqual(expected);
    expect(gojaReceipts.map(core)).toEqual(expected);
    expect(browserReceipts.map(core)).toEqual(expected);
    const nanBody = '{"log":{"v":1,"segments":[{"n":NaN}]},"ctx":{}}';
    for (const run of [runNodeBundle, runGoja]) {
      expect(run(nanBody).reason).toBe('nan');
    }
    expect(JSON.parse(await runBrowser(nanBody)).reason).toBe('nan');
    const clears = expected.filter((row) => row.outcome === 'clear');
    expect(clears.length).toBeGreaterThan(0);
    for (const row of nodeReceipts) expect(row.ticketsMinted).toBe(0);
  }, 180000);
});
