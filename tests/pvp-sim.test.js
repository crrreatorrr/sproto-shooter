import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { GUN_TYPES_BY_ID, MANUFACTURERS_BY_ID } from '../src/data/guns.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { TUNING } from '../src/data/tuning.js';
import { buildPvpBundle } from '../scripts/build-server-sim.mjs';
import { createMatch, hashState, replay, scriptedMatch, step } from '../src/sim/pvp/sim.js';
import {
  CONTENT_FINGERPRINT, LOADOUT, LOADOUT_HASH, MATCH_TICKS, RESERVE, SPAWN_RADIUS,
} from '../src/sim/pvp/rules.js';

const GOLDEN_HASH = 'ce272de1';

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function expectedGun(typeId) {
  const def = GUN_TYPES_BY_ID[typeId];
  const man = MANUFACTURERS_BY_ID.reliable;
  const stats = { ...def.base };
  for (const [key, mult] of Object.entries(man.mods || {})) if (key in stats) stats[key] *= mult;
  for (const [key, add] of Object.entries(man.add || {})) if (key in stats) stats[key] += add;
  stats.magSize = Math.max(1, Math.round(stats.magSize));
  stats.reloadTime = Math.max(0.3, stats.reloadTime);
  stats.elementChance = 0;
  stats.splashRadius = 0;
  stats.splashDamage = 0;
  for (const key of Object.keys(stats)) {
    if (key === 'magSize' || key === 'pellets' || key === 'pierce') stats[key] = Math.round(stats[key]);
    else stats[key] = round3(stats[key]);
  }
  return stats;
}

describe('fixed loadout and spawns', () => {
  it('gives both seats the same common guns, ammo, and no perks', () => {
    expect(contentFingerprint(1)).toBe('3c657fb5');
    expect(CONTENT_FINGERPRINT).toBe('f5949631');
    expect(LOADOUT.map((gun) => gun.type)).toEqual(['mg', 'shotgun', 'sniper']);
    for (const gun of LOADOUT) {
      expect(gun.quality).toBe('common');
      expect(gun.manufacturer).toBe('reliable');
      expect(gun.element).toBe('none');
      expect(gun.wacky).toBeNull();
      expect(gun.perks).toEqual([]);
      expect(gun.level).toBe(1);
      expect(gun.parts).toEqual({ barrel: 'stock', grip: 'stock', mag: 'stock', scope: 'stock' });
      expect(gun.stats).toMatchObject({
        damage: expectedGun(gun.type).damage,
        magSize: expectedGun(gun.type).magSize,
        spread: expectedGun(gun.type).spread,
        critMult: expectedGun(gun.type).critMult,
      });
    }
    expect(LOADOUT[0].infiniteReserve).toBe(true);
    expect(LOADOUT[1].infiniteReserve).toBe(false);
    expect(RESERVE).toEqual({ shells: TUNING.startAmmo.shells, sniper: TUNING.startAmmo.sniper });
    for (const seed of [1, 7, 99, 360, 0xffffffff]) {
      const match = createMatch(seed);
      const [a, b] = match.players;
      expect(a.hp).toBe(b.hp);
      expect(a.shield).toBe(b.shield);
      expect(a.hp).toBe(TUNING.maxHp * 1000);
      expect(a.shield).toBe(TUNING.maxShield * 1000);
      expect(a.mag).toEqual(b.mag);
      expect(a.shells).toBe(b.shells);
      expect(a.sniper).toBe(b.sniper);
      expect(a.slot).toBe(0);
      expect(b.slot).toBe(0);
      const da = Math.hypot(a.x, a.z);
      const db = Math.hypot(b.x, b.z);
      expect(Math.abs(da - db)).toBeLessThan(0.001);
      expect(Math.abs(da - SPAWN_RADIUS)).toBeLessThan(0.001);
      expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(20);
      expect(da).toBeLessThan(TUNING.arenaRadius - TUNING.playerRadius);
    }
    expect(createMatch(1).players[0].x).not.toBe(createMatch(2).players[0].x);
    expect(LOADOUT_HASH).toMatch(/^[0-9a-f]{8}$/);
  });

  it('ends a mirrored duel as a draw and an idle match on time', () => {
    const state = replay(scriptedMatch(7, 180));
    expect(state.outcome).toBe('draw');
    expect(state.reason).toBe('double_ko');
    expect(state.winner).toBeNull();
    expect(state.tick).toBe(61);
    expect(state.players[0].hp).toBe(state.players[1].hp);
    expect(state.players[0].shield).toBe(state.players[1].shield);
    expect(state.players[0].alive).toBe(false);
    expect(state.players[1].alive).toBe(false);
    expect(hashState(state)).toBe(GOLDEN_HASH);
    expect(state.players[0].x).toBeCloseTo(-state.players[1].x, 4);
    expect(state.players[0].z).toBeCloseTo(-state.players[1].z, 4);

    const idle = createMatch(3);
    const hold = (player) => ({ yaw: player.yaw, pitch: 0, moveX: 0, moveZ: 0, fire: false, slot: -1 });
    while (idle.phase !== 'done') step(idle, [hold(idle.players[0]), hold(idle.players[1])]);
    expect(idle.outcome).toBe('draw');
    expect(idle.reason).toBe('time');
    expect(idle.winner).toBeNull();
    expect(idle.tick).toBe(MATCH_TICKS);
    expect(idle.players[0].hp).toBe(idle.players[1].hp);
    expect(idle.players[0].hp).toBe(TUNING.maxHp * 1000);
  });
});

describe('browser, node, and goja', () => {
  let bundlePath = '';
  const payload = JSON.stringify(scriptedMatch(7, 180));

  beforeAll(async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shooter-pvp-'));
    const pin = await buildPvpBundle(dir);
    bundlePath = path.join(dir, 'shooter-pvp-sim.js');
    const bytes = fs.readFileSync(bundlePath);
    expect(pin.protocol).toBe(1);
    expect(pin.sim).toBe(1);
    expect(pin.contentFingerprint).toBe('f5949631');
    expect(pin.campaignProtocol).toBe(1);
    expect(pin.campaignContentFingerprint).toBe('3c657fb5');
    expect(pin.mintsTickets).toBe(false);
    expect(pin.stakes).toBe(false);
    expect(pin.bundleSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(pin.bundleBytes).toBe(bytes.length);
    const text = bytes.toString('utf8');
    expect(text.includes('verifyRunJSON')).toBe(false);
    expect(text.includes('tickets.earn')).toBe(false);
    expect(text.includes('earnTickets(')).toBe(false);
  }, 60000);

  function runNode(json) {
    const script = `
      import fs from 'node:fs';
      import vm from 'node:vm';
      const src = fs.readFileSync(process.argv[1], 'utf8');
      const input = fs.readFileSync(0, 'utf8');
      vm.runInThisContext(src);
      process.stdout.write(globalThis.SprotoShooterPvp.replayJSON(input));
    `;
    const res = spawnSync(process.execPath, ['--input-type=module', '-e', script, bundlePath], {
      input: json,
      encoding: 'utf8',
    });
    if (res.status !== 0) throw new Error(res.stderr || 'node bundle failed');
    return JSON.parse(res.stdout);
  }

  function runGoja(json) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pvp-goja-'));
    fs.writeFileSync(path.join(dir, 'go.mod'), `module pvpgoja

go 1.22.2

require github.com/dop251/goja v0.0.0-20261107161106-d6eaa50db8bc
`);
    fs.copyFileSync(path.join('tests', 'fixtures', 'goja', 'go.sum'), path.join(dir, 'go.sum'));
    fs.writeFileSync(path.join(dir, 'main.go'), `package main

import (
  "fmt"
  "io"
  "os"

  "github.com/dop251/goja"
)

func main() {
  src, err := os.ReadFile(os.Args[1])
  if err != nil { fmt.Fprintln(os.Stderr, err); os.Exit(1) }
  input, err := io.ReadAll(os.Stdin)
  if err != nil { fmt.Fprintln(os.Stderr, err); os.Exit(1) }
  vm := goja.New()
  if _, err = vm.RunString(string(src)); err != nil { fmt.Fprintln(os.Stderr, err); os.Exit(1) }
  fn, ok := goja.AssertFunction(vm.Get("SprotoShooterPvp").ToObject(vm).Get("replayJSON"))
  if !ok { fmt.Fprintln(os.Stderr, "replayJSON missing"); os.Exit(1) }
  out, err := fn(goja.Undefined(), vm.ToValue(string(input)))
  if err != nil { fmt.Fprintln(os.Stderr, err); os.Exit(1) }
  fmt.Print(out.String())
}
`);
    const tidy = spawnSync('go', ['mod', 'tidy'], { cwd: dir, encoding: 'utf8', timeout: 180000 });
    if (tidy.status !== 0) throw new Error(tidy.stderr || tidy.stdout || 'go mod tidy failed');
    const res = spawnSync('go', ['run', '.', bundlePath], {
      cwd: dir,
      input: json,
      encoding: 'utf8',
      timeout: 180000,
    });
    if (res.status !== 0) throw new Error(res.stderr || res.stdout || 'goja failed');
    return JSON.parse(res.stdout);
  }

  async function runBrowser(json) {
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
    } catch {
      execFileSync('npx', ['playwright', 'install', 'chromium'], { stdio: 'inherit' });
      browser = await chromium.launch({ headless: true });
    }
    const page = await browser.newPage();
    try {
      await page.addScriptTag({ path: bundlePath });
      const out = await page.evaluate((body) => globalThis.SprotoShooterPvp.replayJSON(body), json);
      return JSON.parse(out);
    } finally {
      await browser.close();
    }
  }

  it('replays the mirrored duel in node, goja, and chromium', async () => {
    const source = JSON.parse((await import('../src/sim/pvp/export.js')).replayJSON(payload));
    const nodeReceipt = runNode(payload);
    const gojaReceipt = runGoja(payload);
    const browserReceipt = await runBrowser(payload);
    for (const receipt of [source, nodeReceipt, gojaReceipt, browserReceipt]) {
      expect(receipt.ok).toBe(true);
      expect(receipt.ticketsMinted).toBe(0);
      expect(receipt.outcome).toBe('draw');
      expect(receipt.reason).toBe('double_ko');
      expect(receipt.winner).toBeNull();
      expect(receipt.stateHash).toBe(GOLDEN_HASH);
      expect(receipt.tick).toBe(61);
      expect(receipt.content).toBe('f5949631');
      expect(receipt.protocol).toBe(1);
      expect(receipt.players[0].hp).toBe(receipt.players[1].hp);
    }
  }, 180000);
});
