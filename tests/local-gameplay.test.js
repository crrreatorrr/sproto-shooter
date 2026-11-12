import { execFileSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { createServer } from 'vite';

describe('local Wave Mode in Chromium', () => {
  let server, browser, url;
  beforeAll(async () => {
    server = await createServer({ server: { host: '127.0.0.1', port: 0, hmr: false }, logLevel: 'error' });
    await server.listen();
    url = server.resolvedUrls.local[0];
    const options = { headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };
    try {
      browser = await chromium.launch(options);
    } catch (error) {
      if (!error.message.includes("Executable doesn't exist")) throw error;
      execFileSync('npx', ['playwright', 'install', 'chromium'], { stdio: 'inherit' });
      browser = await chromium.launch(options);
    }
  }, 120000);
  afterAll(async () => {
    await browser?.close();
    await server?.close();
  }, 60000);

  async function visit(run) {
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.stack || error.message));
    try {
      await page.goto(`${url}?seed=11`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__game, null, { timeout: 45000 });
      await run(page);
      expect(errors).toEqual([]);
      expect(await page.evaluate(() => ({ total: window.__game.crash.total, halted: window.__game.crash.halted })))
        .toEqual({ total: 0, halted: false });
      expect(await page.locator('#crash-panel').count()).toBe(0);
      expect(await page.evaluate(() => window.__game.renderer.loadReport().failed)).toEqual([]);
    } finally {
      await page.close();
    }
  }

  it('pauses, changes settings, resumes, and repeatedly restarts Wave Mode', async () => {
    await visit(async (page) => {
      for (let run = 0; run < 3; run++) {
        if (run === 0) await page.setViewportSize({ width: 1920, height: 1080 });
        await page.locator('[data-go="waves"]').click();
        await page.waitForFunction(() => window.__game.state.mode === 'waves' && window.__game.state.tick > 5);
        await page.evaluate(() => window.__game.pauseGame());
        await page.waitForSelector('.pause');
        const tick = await page.evaluate(() => window.__game.state.tick);
        await page.locator('#sens').fill('1.5');
        await page.locator('#fxq').selectOption('low');
        await page.locator('#graphics-preset').selectOption('low');
        if (run === 0) {
          await page.waitForFunction(() => window.__game.renderer.canvas.width === 1280 && window.__game.renderer.canvas.height === 720);
          await page.setViewportSize({ width: 640, height: 360 });
          await page.waitForFunction(() => window.__game.renderer.canvas.width === 640 && window.__game.renderer.canvas.height === 360);
        }
        expect(await page.evaluate(() => ({ sensitivity: window.__game.settings.sensitivity, fxQuality: window.__game.settings.fxQuality })))
          .toEqual({ sensitivity: 1.5, fxQuality: 'low' });
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sproto-campaign-profile')).settings))
          .toMatchObject({ sensitivity: 1.5, fxQuality: 'low', graphicsPreset: 'low' });
        await page.waitForTimeout(100);
        expect(await page.evaluate(() => window.__game.state.tick)).toBe(tick);
        await page.locator('[data-p="resume"]').click();
        await page.waitForFunction((oldTick) => window.__game.state.tick > oldTick, tick);
        await page.evaluate(() => window.__game.pauseGame());
        await page.locator('[data-p="title"]').click();
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__game?.settings.graphicsPreset === 'low');
      expect(await page.evaluate(() => ({ width: window.__game.renderer.canvas.width, height: window.__game.renderer.canvas.height })))
        .toEqual({ width: 640, height: 360 });
    });
  }, 120000);

  it('keeps drawing with Duck Gun ammo and unrecognized pickup color ids', async () => {
    await visit(async (page) => {
      await page.locator('[data-go="waves"]').click();
      await page.waitForFunction(() => window.__game.state.mode === 'waves');
      const tick = await page.evaluate("import('/tests/fixtures/local-gameplay.js').then(({ ammoPickups }) => ammoPickups(window.__game))");
      await page.waitForFunction((tick) => window.__game.state.tick > tick + 5, tick);
      expect(await page.evaluate(() => window.__game.state.pickups.filter((pickup) => pickup.kind === 'ammo').map((pickup) => pickup.ammoType)))
        .toEqual(expect.arrayContaining(['rubber', 'unknown-ammo']));
    });
  }, 60000);

  it('shows defeat after being downed and starts a playable retry', async () => {
    await visit(async (page) => {
      await page.locator('[data-go="waves"]').click();
      await page.waitForFunction(() => window.__game.state.mode === 'waves');
      const result = await page.evaluate("import('/tests/fixtures/local-gameplay.js').then(({ defeatRun }) => defeatRun(window.__game))");
      expect(result).toEqual({ downed: true, phase: 'defeat', dead: true });
      await page.waitForSelector('.end.defeat');
      await page.locator('[data-go="waves"]').click();
      await page.waitForFunction(() => window.__game.state.wave.phase === 'pre' && !window.__game.state.players[window.__game.state.localPlayerId].dead);
      const tick = await page.evaluate(() => window.__game.state.tick);
      await page.waitForFunction((tick) => window.__game.state.tick > tick + 5, tick);
    });
  }, 60000);

  it('draws a full run through all three waves, four bosses, and intermission panels', async () => {
    await visit(async (page) => {
      const report = await page.evaluate("import('/tests/fixtures/local-gameplay.js').then(({ waveRun }) => waveRun(window.__game, 1))");
      expect(report.phase).toBe('victory');
      expect(report.bosses).toBe(4);
      expect(report.kills).toBeGreaterThan(100);
      expect(report.frames).toBeGreaterThan(30);
      expect(report.events.waveCleared).toBe(3);
      expect(report.events.bossPhase).toBeGreaterThan(0);
      expect(report.events.damage).toBeGreaterThan(0);
    });
  }, 180000);

  it('launches, grips the anchor and redocks the grappler on every playable skin', async () => {
    await visit(async (page) => {
      await page.waitForFunction(() => window.__game.renderer.scene.getObjectByName('Grapple effects')?.getObjectByName('Claw'));
      const report = await page.evaluate("import('/tests/fixtures/local-gameplay.js').then(({ grapplerRun }) => grapplerRun(window.__game))");
      const complete = {
        docked: true, flight: true, latch: true, returned: true, aimed: true, handoff: true, canceled: true,
        extended: true, quickTap: true, gunLowered: true, gunRaised: true, arenaFit: true, straightFlight: true,
        staysAnchored: true, staysLow: true, firesLow: true, reached: true,
      };
      expect(report).toEqual({ sproto: complete, pepe: complete, 'pepe-general': complete, 'pepe-tux': complete });
    });
  }, 90000);

  it('fires and reloads every gun and presents every spell during waves', async () => {
    await visit(async (page) => {
      const report = await page.evaluate("import('/tests/fixtures/local-gameplay.js').then(({ weaponsAndSpells }) => weaponsAndSpells(window.__game))");
      expect(Object.keys(report.guns)).toEqual(['mg', 'shotgun', 'sniper', 'bazooka', 'raygun', 'bigbullets', 'duckgun']);
      for (const [type, gun] of Object.entries(report.guns)) {
        expect(gun.shots, type).toBeGreaterThan(0);
        expect(gun.reloads, type).toBeGreaterThan(0);
      }
      expect(report.spells).toEqual(expect.arrayContaining(['gooBolt', 'chainZap', 'swarm', 'manaShield', 'meteor']));
      expect(report.events.meteorImpact).toBeGreaterThan(0);
    });
  }, 180000);
});
