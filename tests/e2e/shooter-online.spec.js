// Free online: Find free match on the title queues and joins the hub's free 1v1.
import {
  assert, createNakama, hubStub, launchBrowser, openGame, pageBalance,
  shot, skipIfDark, viteGame, waitForNakama,
} from '../fixtures/e2e-nakama.mjs';

if (skipIfDark()) process.exit(0);

const nakama = createNakama();
const report = { suite: 'shooter-online', shots: [] };

async function findFree(page) {
  await page.locator('[data-go="pvp"]').click();
  await page.locator('[data-pvp-go="queue"]').click();
}

async function phaseOf(page) {
  return page.evaluate(() => {
    const phase = document.querySelector('[data-pvp-phase]');
    const panel = document.querySelector('[data-seat-panel]');
    return {
      phase: phase ? phase.dataset.pvpPhase : '',
      text: phase ? phase.textContent : '',
      tick: panel ? Number(panel.dataset.pvpTick || 0) : 0,
      name: document.querySelector('[data-pvp-name]')?.textContent || '',
    };
  });
}

try {
  await waitForNakama(nakama);
  const stub = await hubStub();
  const game = await viteGame({ hubUrl: stub.url });
  const browser = await launchBrowser();
  try {
    const ada = await nakama.account();
    const bea = await nakama.account();
    const adaPortal = await nakama.portal(ada.token);
    const beaPortal = await nakama.portal(bea.token);
    const left = await openGame(browser, game.origin, adaPortal.ticket);
    const right = await openGame(browser, game.origin, beaPortal.ticket);
    await findFree(left.page);
    await findFree(right.page);
    await left.page.waitForFunction(() => document.querySelector('[data-pvp-phase]')?.dataset.pvpPhase === 'lobby', { timeout: 30000 });
    await right.page.waitForFunction(() => document.querySelector('[data-pvp-phase]')?.dataset.pvpPhase === 'lobby', { timeout: 30000 });
    assert(await left.page.locator('[data-pvp-go="queue"]').count() === 0, 'ada stayed on the free-match lobby');
    assert(await right.page.locator('[data-pvp-go="queue"]').count() === 0, 'bea stayed on the free-match lobby');
    report.queueJoinsMatch = true;
    await left.page.locator('[data-pvp-ready]').click();
    await right.page.locator('[data-pvp-ready]').click();
    await left.page.waitForFunction(() => {
      const phase = document.querySelector('[data-pvp-phase]');
      const tick = Number(document.querySelector('[data-seat-panel]')?.dataset.pvpTick || 0);
      return phase && phase.dataset.pvpPhase === 'live' && tick > 15;
    }, { timeout: 30000 });
    const live = await phaseOf(right.page);
    assert(live.phase === 'live' && live.tick > 0, `bea phase ${JSON.stringify(live)}`);
    assert(/no stake/i.test(live.name), `free match label ${live.name}`);
    report.shots.push(await shot(left.page, 's7-free-match-ada.png'));
    report.shots.push(await shot(right.page, 's7-free-match-bea.png'));
    const adaBalance = await pageBalance(left.page);
    const beaBalance = await pageBalance(right.page);
    assert(adaBalance === 0 && beaBalance === 0, `free match moved tickets ${adaBalance} ${beaBalance}`);
    report.liveTick = (await phaseOf(left.page)).tick;
    await left.close();
    await right.close();
  } finally {
    await browser.close();
    await game.close();
    await stub.close();
  }
  console.log(JSON.stringify(report, null, 2));
} catch (err) {
  console.error(err);
  process.exit(1);
}
