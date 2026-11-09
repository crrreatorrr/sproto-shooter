// Dark wagers against local Nakama. shooter_pvp and shooter_pvp_wager are turned
// on for this process only, then put back to off. Nothing in the repo defaults changes.
import {
  assert, createNakama, fundWithClear, hubStub, launchBrowser, openGame, pageBalance, pageRpc,
  shot, skipIfDark, viteGame, waitForNakama,
} from '../fixtures/e2e-nakama.mjs';

if (skipIfDark()) process.exit(0);

const nakama = createNakama();
const report = { suite: 'shooter-wagers', shots: [] };

async function refreshOffer(page) {
  await page.evaluate(async () => {
    await window.__sproto.game.refreshWagerOffer();
    window.__sproto.game.paintWagerSlot();
  });
}

async function stakeQueue(page) {
  await refreshOffer(page);
  await page.locator('[data-wager-play-stake]').click();
  await page.waitForSelector('[data-wager-action="queue"]', { timeout: 15000 });
  await page.evaluate(() => {
    const button = document.querySelector('[data-wager-action="queue"]');
    button.click();
    button.click();
  });
  await page.waitForSelector('[data-wager-phase="queued"], [data-wager-waiting]', { timeout: 20000 });
}

try {
  await waitForNakama(nakama);
  const before = nakama.flags('on');
  assert(before.includes('shooter_pvp=on') && before.includes('shooter_pvp_wager=on'), `flags ${before}`);
  await new Promise((resolve) => setTimeout(resolve, 6000));
  const stub = await hubStub();
  const game = await viteGame({ hubUrl: stub.url });
  const browser = await launchBrowser();
  try {
    const guestAccount = await nakama.account({ guest: true });
    const guestPortal = await nakama.portal(guestAccount.token);
    const guest = await openGame(browser, game.origin, guestPortal.ticket);
    await refreshOffer(guest.page);
    const guestButton = guest.page.locator('[data-wager-play-stake]');
    assert(await guestButton.count() === 1, 'guest stake button was hidden while the flag was on');
    assert(await guestButton.isDisabled(), 'guest could stake');
    report.guestButton = await guestButton.innerText();
    const guestQueue = await guest.page.evaluate(async () => {
      const hook = await import('/tests/fixtures/e2e-browser-hook.js');
      const wagers = await import('/src/hub/wagers.js');
      const rt = hook.realtimeFromSdk(window.__sproto.game.hub.api);
      await rt.connect();
      try {
        await rt.addMatchmaker(wagers.wagerMatchmakerRequest());
        return { ok: true };
      } catch (err) {
        return { ok: false, message: String(err && (err.message || err.code) || err) };
      }
    });
    assert(guestQueue.ok === false && /wager_guest|guest/i.test(guestQueue.message), `guest queue: ${guestQueue.message}`);
    assert(await pageBalance(guest.page) === 0, 'guest queue moved tickets');
    report.shots.push(await shot(guest.page, 's7-wager-guest.png'));
    await guest.close();

    const broke = await nakama.account();
    const brokeVisit = await openGame(browser, game.origin, (await nakama.portal(broke.token)).ticket);
    await refreshOffer(brokeVisit.page);
    const brokeButton = brokeVisit.page.locator('[data-wager-play-stake]');
    assert(await brokeButton.isDisabled(), 'empty wallet could stake');
    const brokeReason = await brokeVisit.page.locator('[data-wager-play-stake]').innerText();
    assert(/you have 0/i.test(brokeReason), `short reason: ${brokeReason}`);
    report.shots.push(await shot(brokeVisit.page, 's7-wager-insufficient.png'));
    await brokeVisit.close();

    const ada = await nakama.account();
    const bea = await nakama.account();
    const adaPage = await openGame(browser, game.origin, (await nakama.portal(ada.token)).ticket);
    const adaClear = await fundWithClear(adaPage.page);
    assert(adaClear.balance === 20, `ada fund ${adaClear.balance}`);
    await refreshOffer(adaPage.page);
    await adaPage.page.waitForSelector('[data-wager-play-stake]:not([disabled])');
    report.shots.push(await shot(adaPage.page, 's7-wager-funded.png'));

    await stakeQueue(adaPage.page);
    const queuedBalance = await pageBalance(adaPage.page);
    assert(queuedBalance === 20, `queue held tickets early: ${queuedBalance}`);
    const adaAgain = await nakama.portal(ada.token);
    const secondTab = await adaPage.context.newPage();
    await secondTab.goto(`${game.origin}/#t=${encodeURIComponent(adaAgain.ticket)}`, { waitUntil: 'domcontentloaded' });
    try {
      await secondTab.waitForSelector('[data-hub="connected"]', { timeout: 90000 });
    } catch (err) {
      const text = await secondTab.locator('body').innerText().catch(() => '');
      console.error(`wager second tab ${secondTab.url()} ${text.slice(0, 400)}`);
      throw err;
    }
    await refreshOffer(secondTab);
    await secondTab.locator('[data-wager-play-stake]').click();
    await secondTab.locator('[data-wager-action="queue"]').click();
    await secondTab.waitForFunction(() => /already queued|refused|no tickets were taken/i.test(document.body.innerText), { timeout: 15000 });
    const afterSecond = await pageBalance(adaPage.page);
    assert(afterSecond === 20, 'second tab moved tickets');
    report.twoTab = await secondTab.locator('[data-wager-notice]').innerText();
    report.shots.push(await shot(secondTab, 's7-wager-two-tab.png'));
    await secondTab.close();
    await adaPage.page.locator('[data-wager-action="cancel"]').click();
    await adaPage.page.waitForFunction(() => /no tickets were taken/i.test(document.body.innerText), { timeout: 15000 });
    assert(await pageBalance(adaPage.page) === 20, 'cancel changed the wallet');

    const beaPage = await openGame(browser, game.origin, (await nakama.portal(bea.token)).ticket);
    const beaClear = await fundWithClear(beaPage.page);
    assert(beaClear.balance === 20, `bea fund ${beaClear.balance}`);
    await refreshOffer(beaPage.page);
    await stakeQueue(adaPage.page);
    await stakeQueue(beaPage.page);
    await adaPage.page.waitForSelector('[data-wager-ready]', { timeout: 30000 });
    await beaPage.page.waitForSelector('[data-wager-ready]', { timeout: 30000 });
    report.shots.push(await shot(adaPage.page, 's7-wager-match.png'));
    report.shots.push(await shot(beaPage.page, 's7-wager-match-bea.png'));
    await adaPage.page.locator('[data-wager-ready]').click();
    await beaPage.page.locator('[data-wager-ready]').click();
    await adaPage.page.waitForFunction(() => /match is live/i.test(document.body.innerText), { timeout: 20000 });
    const heldAda = await pageBalance(adaPage.page);
    const heldBea = await pageBalance(beaPage.page);
    assert(heldAda === 10 && heldBea === 10, `hold balances ${heldAda} ${heldBea}`);

    const tickBefore = await beaPage.page.evaluate(() => {
      const state = window.__sproto.game._wagerClient.viewState(performance.now());
      return state.sample ? state.sample.tick : 0;
    });
    await beaPage.page.context().setOffline(true);
    await beaPage.page.waitForTimeout(1200);
    report.shots.push(await shot(beaPage.page, 's7-wager-reconnect.png'));
    report.offlineOverlay = await beaPage.page.locator('[data-wager-overlay]').innerText().catch(() => '');
    await beaPage.page.context().setOffline(false);
    await beaPage.page.waitForFunction((before) => {
      const client = window.__sproto.game._wagerClient;
      const state = client && client.viewState(performance.now());
      return state && state.sample && state.sample.tick > before + 10 && state.link !== 'reconnecting';
    }, tickBefore, { timeout: 20000 });

    await beaPage.page.evaluate(() => {
      const game = window.__sproto.game;
      if (game.pvp) game.pvp.frame = () => {};
    });
    await adaPage.page.waitForSelector('[data-wager-phase="receipt"]', { timeout: 60000 });
    await beaPage.page.waitForSelector('[data-wager-phase="receipt"]', { timeout: 60000 });
    const adaNet = await adaPage.page.locator('[data-wager-net]').getAttribute('data-wager-net');
    const beaNet = await beaPage.page.locator('[data-wager-net]').getAttribute('data-wager-net');
    const adaShown = await adaPage.page.locator('[data-wager-balance]').getAttribute('data-wager-balance');
    const beaShown = await beaPage.page.locator('[data-wager-balance]').getAttribute('data-wager-balance');
    const adaWallet = await pageBalance(adaPage.page);
    const beaWallet = await pageBalance(beaPage.page);
    assert(adaWallet + beaWallet === 40, `wallets did not conserve: ${adaWallet}+${beaWallet}`);
    assert((adaWallet === 30 && beaWallet === 10) || (adaWallet === 10 && beaWallet === 30), `unexpected settle ${adaWallet} ${beaWallet}`);
    assert(String(adaWallet) === adaShown && String(beaWallet) === beaShown, `screen ${adaShown}/${beaShown} backend ${adaWallet}/${beaWallet}`);
    assert(adaNet === String(adaWallet - 20) || beaNet === String(beaWallet - 20), `nets ${adaNet} ${beaNet}`);
    report.wallets = { ada: adaWallet, bea: beaWallet, adaNet, beaNet };
    report.shots.push(await shot(adaPage.page, 's7-wager-receipt-ada.png'));
    report.shots.push(await shot(beaPage.page, 's7-wager-receipt-bea.png'));

    const winner = adaWallet === 30 ? adaPage.page : beaPage.page;
    const beforeRematch = await pageBalance(winner);
    await winner.locator('[data-wager-action="rematch"]').click();
    await winner.waitForSelector('[data-wager-action="queue"]', { timeout: 15000 });
    const rematchNotice = await winner.locator('[data-wager-notice]').innerText();
    assert(/both players have to stake/i.test(rematchNotice), rematchNotice);
    assert(await pageBalance(adaPage.page) === adaWallet, 'one-sided rematch changed ada');
    assert(await pageBalance(beaPage.page) === beaWallet, 'one-sided rematch changed bea');
    assert(await pageBalance(winner) === beforeRematch, 'rematch confirm spent tickets');
    report.shots.push(await shot(winner, 's7-wager-rematch-one-sided.png'));

    const refused = await pageRpc(adaPage.page, 'shooter.settle', {});
    assert(refused.error === 'no_session' || refused.error || refused.status, 'settle rpc returned a session error shape');
    const clientRefuse = await adaPage.page.evaluate(async () => {
      const link = await import('/src/hub/link.js');
      try {
        link.assertWagerRpc('shooter.settle');
        return 'allowed';
      } catch (err) {
        return err.code || err.message;
      }
    });
    assert(clientRefuse === 'rpc_refused', `client allowed settle: ${clientRefuse}`);
    assert(await pageBalance(adaPage.page) === adaWallet, 'forged settle changed the wallet');
  } finally {
    await browser.close();
    await game.close();
    await stub.close();
    const restored = nakama.flags('off');
    report.flagsRestored = restored;
    assert(restored.includes('shooter_pvp=off') && restored.includes('shooter_pvp_wager=off'), `flags left on: ${restored}`);
  }
  console.log(JSON.stringify(report, null, 2));
} catch (err) {
  try { nakama.flags('off'); } catch { /* the stack may already be down */ }
  console.error(err);
  process.exit(1);
}
