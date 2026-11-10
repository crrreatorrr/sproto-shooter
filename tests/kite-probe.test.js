import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { kiteCommand } from '../src/sim/campaign/kiteAim.js';
import { runSahilKiteProbe } from '../src/sim/campaign/kiteProbe.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const root = path.resolve('.');
const bundlePath = path.join(root, 'build', 'shooter-sim.js');

function runGoja(payload) {
  const res = spawnSync('go', ['run', '.', bundlePath, 'runKiteProbeJSON'], {
    cwd: path.join(root, 'tests', 'fixtures', 'goja'),
    input: JSON.stringify(payload),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    timeout: 180000,
  });
  if (res.status !== 0) throw new Error(res.stderr || res.stdout || 'goja failed');
  return JSON.parse(res.stdout);
}

describe('multi-bar Sahil kite', () => {
  beforeAll(() => {
    execFileSync(process.execPath, ['scripts/build-server-sim.mjs'], { cwd: root, stdio: 'inherit' });
  }, 60000);

  it('matches in node and goja after tick 2400, and the assisted run finishes alive', () => {
    const cases = [
      { seed: 7, mode: 'success', maxFrames: 2800 },
      { seed: 9, mode: 'assisted', maxFrames: 2800 },
      { seed: 9, mode: 'assisted', maxFrames: 8000 },
    ];
    for (const job of cases) {
      const node = runSahilKiteProbe(job.seed, job.mode, job.maxFrames);
      const goja = runGoja(job);
      expect(goja, job.mode + job.maxFrames).toEqual(node);
      expect(node.playerDead).toBe(false);
      expect(node.tick).toBe(job.maxFrames);
    }
    const done = runSahilKiteProbe(9, 'assisted', 8000);
    expect(done.bossDead).toBe(true);
    expect(done.part).toBe(2);
  }, 180000);

  it('keeps firing through a bar that will refill', () => {
    const state = {
      localPlayerId: 1,
      players: { 1: { pos: { x: 0, y: 0, z: 0 }, hp: 100, medkits: 1, downed: false, recoil: { pitch: 0 } } },
      enemies: [{
        boss: { scriptHold: true }, dead: false, fled: false,
        pos: { x: 10, y: 0, z: 0 }, height: 2, hp: 40,
      }],
    };
    expect(kiteCommand(state, 'assisted').held.fire).toBe(true);
    state.enemies[0].boss.scriptHold = false;
    const last = kiteCommand(state, 'assisted');
    expect(last.held.fire).toBe(false);
    expect(last.pressed.gooBolt).toBe(true);
  });

  it('does not move the campaign or PvP pins', () => {
    expect(contentFingerprint(1)).toBe('cea1f88b');
    expect(CONTENT_FINGERPRINT).toBe('b33eada6');
  });
});
