// Hub round trip, verified PvE, expiry, two-tab, and the cloud outbox.
// Opt-in: SHOOTER_E2E_NAKAMA=1 and a local Nakama (see docs/shooter-release.md).
import {
  assert, createNakama, fundWithClear, hubStub, launchBrowser, openGame, pageBalance, pageRpc,
  shot, skipIfDark, viteGame, waitForNakama,
} from '../fixtures/e2e-nakama.mjs';

if (skipIfDark()) process.exit(0);

const nakama = createNakama();
const report = { suite: 'shooter-hub', shots: [] };

async function chipText(page) {
  return page.locator('.hub-chip').innerText();
}

try {
  await waitForNakama(nakama);
  const stub = await hubStub();
  const game = await viteGame({ hubUrl: stub.url });
  const browser = await launchBrowser();
  try {
    const account = await nakama.account();
    const portal = await nakama.portal(account.token);
    const visit = await openGame(browser, game.origin, portal.ticket);
    const connected = await chipText(visit.page);
    assert(connected.includes(account.username), `chip did not name the account: ${connected}`);
    assert(connected.includes('Tickets'), `chip did not show Tickets: ${connected}`);
    const openedBalance = await pageBalance(visit.page);
    assert(openedBalance === 0, `opening balance ${openedBalance}`);
    report.shots.push(await shot(visit.page, 's7-hub-connected.png'));

    await visit.page.locator('[data-go="hub"]').click();
    await visit.page.waitForSelector('[data-hub-stub]', { timeout: 15000 });
    const hash = await visit.page.locator('[data-hub-hash]').innerText();
    assert(hash === '#from=sproto-shooter', `return hash ${hash}`);
    assert(!visit.page.url().includes('t='), 'return URL still has a ticket');
    report.shots.push(await shot(visit.page, 's7-hub-return.png'));
    await visit.close();

    const again = await nakama.portal(account.token);
    const replay = await openGame(browser, game.origin, portal.ticket);
    const replayChip = await chipText(replay.page);
    assert(!replayChip.includes(account.username), `reused ticket looked connected: ${replayChip}`);
    await replay.close();

    await nakama.sql(`UPDATE game.auth_ticket SET expires_at = now() - interval '1 minute' WHERE user_id = '${account.userId}' AND used_at IS NULL`);
    const expired = await openGame(browser, game.origin, again.ticket);
    const expiredChip = await chipText(expired.page);
    assert(!/Tickets\s+[1-9]/.test(expiredChip), `expired ticket showed a balance: ${expiredChip}`);
    assert(await expired.page.locator('[data-hub="connected"]').count() === 0, `expired ticket connected: ${expiredChip}`);
    report.shots.push(await shot(expired.page, 's7-hub-expired.png'));
    await expired.close();

    const payer = await nakama.account();
    const payerPortal = await nakama.portal(payer.token);
    const paid = await openGame(browser, game.origin, payerPortal.ticket);
    const forgedIssue = await pageRpc(paid.page, 'shooter.run.issue', { key: `s7-forge-${crypto.randomUUID()}`, canonicalBoss: 'sahil' });
    assert(forgedIssue.ok === true, `issue ${forgedIssue.reason || forgedIssue.error}`);
    const forged = await pageRpc(paid.page, 'shooter.run.submit', {
      runId: forgedIssue.issuance.runId,
      log: {
        v: 1,
        binding: { accountId: 'someone-else', sessionId: forgedIssue.issuance.sessionId, day: forgedIssue.issuance.day, runId: forgedIssue.issuance.runId },
        segments: [{ i: 0, from: null, tick0: 0, n: 1, frames: 'AAAAAAAAAAAAAAAA', actions: [] }],
      },
    });
    assert(forged.paid !== true, `forged submit paid ${JSON.stringify(forged).slice(0, 180)}`);
    assert(await pageBalance(paid.page) === 0, 'forged submit changed the wallet');

    const clear = await fundWithClear(paid.page);
    assert(clear.submitted.paid === true, `clear was not paid: ${clear.submitted.reason || clear.submitted.error}`);
    assert(clear.submitted.tickets === 20, `clear tickets ${clear.submitted.tickets}`);
    assert(clear.balance === 20, `backend balance after clear ${clear.balance}`);
    const second = await fundWithClear(paid.page);
    assert(second.submitted.paid !== true, 'second sahil clear on the same day paid again');
    assert(await pageBalance(paid.page) === 20, 'second clear changed the wallet');
    await paid.page.evaluate(async () => {
      await window.__sproto.game.hub.refreshBalance(0);
      window.__sproto.game.paintHubChip();
    });
    await paid.page.waitForFunction(() => {
      const node = document.querySelector('[data-hub="connected"] b');
      return node && node.textContent.trim() === '20';
    }, { timeout: 15000 });
    report.shots.push(await shot(paid.page, 's7-pve-balance.png'));
    report.clear = { frames: clear.frames, stateHash: clear.stateHash, balance: clear.balance };

    const earn = await pageRpc(paid.page, 'tickets.earn', { game: 'sproto-shooter', amount: 20, reason: 'srv_shooter_boss_clear', key: 's7-forge-earn' });
    assert(earn.error || earn.paid === false || earn.balance === undefined || earn.balance === 20, `client earn changed money ${JSON.stringify(earn).slice(0, 180)}`);
    assert(await pageBalance(paid.page) === 20, 'tickets.earn changed the shooter wallet');

    await paid.page.context().setOffline(true);
    const queued = await paid.page.evaluate(async () => {
      const result = await window.__sproto.game.hub.saveCloud({
        v: 4, unlocked: ['L01'], modifiers: [], settings: { shake: false, marker: 's7-outbox' }, updatedAt: Date.now(), tickets: 999999, balance: 999999,
      });
      const raw = localStorage.getItem('sproto-shooter:hub-cloud-outbox');
      return { result, raw };
    });
    assert(queued.result && queued.result.queued === true, 'offline cloud save did not queue');
    assert(queued.raw && !queued.raw.includes('999999'), `outbox kept an economic field: ${queued.raw.slice(0, 180)}`);
    assert(!queued.raw.includes('"tickets"'), 'outbox stored tickets');
    await paid.page.context().setOffline(false);
    report.shots.push(await shot(paid.page, 's7-outbox-offline.png'));
    await paid.page.reload({ waitUntil: 'domcontentloaded' });
    await paid.page.waitForSelector('[data-hub="connected"]', { timeout: 45000 });
    await paid.page.waitForFunction(() => localStorage.getItem('sproto-shooter:hub-cloud-outbox') == null, { timeout: 15000 });
    assert(await pageBalance(paid.page) === 20, 'outbox flush changed the wallet');

    const bareTab = await paid.context.newPage();
    await bareTab.goto(`${game.origin}/`, { waitUntil: 'domcontentloaded' });
    await bareTab.waitForSelector('[data-hub="offline"]', { timeout: 45000 });
    await bareTab.close();
    const tabTicket = await nakama.portal(payer.token);
    const secondTab = await paid.context.newPage();
    await secondTab.goto(`${game.origin}/#t=${encodeURIComponent(tabTicket.ticket)}`, { waitUntil: 'domcontentloaded' });
    try {
      await secondTab.waitForSelector('[data-hub="connected"], [data-hub="error"], [data-hub="offline"]', { timeout: 90000 });
    } catch (err) {
      const text = await secondTab.locator('body').innerText().catch(() => '');
      console.error(`second tab url ${secondTab.url()} text ${text.slice(0, 500)}`);
      throw err;
    }
    const secondChip = await chipText(secondTab);
    const firstStill = await chipText(paid.page);
    assert(firstStill.includes(payer.username), 'first tab lost the account');
    assert(secondChip.includes(payer.username), `second tab chip: ${secondChip}`);
    assert(await pageBalance(secondTab) === 20, 'second tab read a different balance');
    report.shots.push(await shot(secondTab, 's7-two-tab.png'));
    report.twoTab = 'a tab with no ticket stays offline; a second portal ticket for the same account shows the same wallet';
    await secondTab.close();
    await paid.close();
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
