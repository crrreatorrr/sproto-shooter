// Free online: the title queue, then a real two-browser room on local Nakama.
// The shipped Find-free-match screen does not join the matched socket. This suite
// records that, then joins with the same createPvpClient the wager screen uses.
import {
  assert, createNakama, hubStub, launchBrowser, openGame, pageBalance, pageRpc,
  shot, skipIfDark, viteGame, waitForNakama,
} from '../fixtures/e2e-nakama.mjs';

if (skipIfDark()) process.exit(0);

const nakama = createNakama();
const report = { suite: 'shooter-online', shots: [] };

async function queueNote(page) {
  await page.locator('[data-go="pvp"]').click();
  await page.locator('[data-pvp-go="queue"]').click();
  await page.waitForFunction(() => {
    const note = document.querySelector('[data-pvp-note]');
    return note && note.textContent && note.textContent.length > 0;
  }, { timeout: 20000 });
  return page.locator('[data-pvp-note]').innerText();
}

async function armFree(page, role, code) {
  return page.evaluate(async ({ role, code }) => {
    const hook = await import('/tests/fixtures/e2e-browser-hook.js');
    const sdk = window.__sproto.game.hub.api;
    const rt = hook.realtimeFromSdk(sdk);
    if (!rt) return { error: 'no_realtime' };
    await rt.connect();
    const room = role === 'host'
      ? await rt.rpc('shooter.room_create', { mode: 'free' })
      : await rt.rpc('shooter.room_join', { code });
    const match = await rt.joinMatch({ matchId: room.matchId });
    const client = hook.createPvpClient({ accountId: sdk.getSession().playerId, match });
    const started = performance.now();
    let hud = document.getElementById('e2e-free-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'e2e-free-hud';
      hud.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:20;background:#120a22;color:#ffd166;padding:12px 14px;font:700 16px sans-serif;border:3px solid #ffd166';
      document.body.appendChild(hud);
    }
    window.__e2eFree = { client, room, rt, stop: false, started };
    const loop = (now) => {
      const box = window.__e2eFree;
      if (!box || box.stop) return;
      box.client.updateCommand(now, { yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: 0, wheel: 0 });
      const state = box.client.viewState(now);
      hud.textContent = `Free room stake ${room.stake} · ${state.phase} · tick ${state.sample ? state.sample.tick : '—'}`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return { matchId: room.matchId, code: room.code || code, stake: room.stake, ticketsMinted: room.ticketsMinted, mode: room.mode };
  }, { role, code });
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
    const leftNote = await queueNote(left.page);
    const rightNote = await queueNote(right.page);
    assert(!/unavailable/i.test(leftNote), `ada queue failed: ${leftNote}`);
    assert(!/unavailable/i.test(rightNote), `bea queue failed: ${rightNote}`);
    assert(/waiting for one opponent/i.test(leftNote), `ada note: ${leftNote}`);
    report.queueNote = leftNote;
    report.queueJoinsMatch = false;
    await left.page.waitForTimeout(1500);
    const stillLobby = await left.page.locator('[data-pvp-go="queue"]').count();
    assert(stillLobby === 1, 'free queue left the lobby on its own');
    report.shots.push(await shot(left.page, 's7-free-queue-ada.png'));
    report.shots.push(await shot(right.page, 's7-free-queue-bea.png'));
    const cancelAda = await pageRpc(left.page, 'shooter.queue_cancel', {});
    const cancelBea = await pageRpc(right.page, 'shooter.queue_cancel', {});
    assert(cancelAda.ok === true && cancelAda.ticketsMinted === 0, 'queue cancel minted or failed');
    assert(cancelBea.ok === true, 'bea queue cancel failed');
    await left.close();
    await right.close();

    const ada2 = await openGame(browser, game.origin, (await nakama.portal(ada.token)).ticket);
    const bea2 = await openGame(browser, game.origin, (await nakama.portal(bea.token)).ticket);
    const host = await armFree(ada2.page, 'host');
    assert(host.mode === 'free' && host.stake === 0 && host.ticketsMinted === 0, `room was not free: ${JSON.stringify(host)}`);
    const guest = await armFree(bea2.page, 'guest', host.code);
    assert(guest.matchId === host.matchId, 'guest joined a different match');
    assert(guest.stake === 0, 'guest room carried a stake');

    async function phase(page) {
      return page.evaluate(() => {
        const client = window.__e2eFree && window.__e2eFree.client;
        if (!client) return null;
        const state = client.viewState(performance.now());
        return { phase: state.phase, tick: state.sample ? state.sample.tick : null, link: state.link };
      });
    }
    await ada2.page.waitForFunction(() => {
      const client = window.__e2eFree && window.__e2eFree.client;
      return client && client.viewState(performance.now()).phase === 'lobby';
    }, { timeout: 20000 });
    await bea2.page.waitForFunction(() => {
      const client = window.__e2eFree && window.__e2eFree.client;
      return client && client.viewState(performance.now()).phase === 'lobby';
    }, { timeout: 20000 });
    await ada2.page.evaluate(() => window.__e2eFree.client.ready());
    await bea2.page.evaluate(() => window.__e2eFree.client.ready());
    await ada2.page.waitForFunction(() => {
      const client = window.__e2eFree && window.__e2eFree.client;
      const state = client && client.viewState(performance.now());
      return state && state.phase === 'live' && state.sample && state.sample.tick > 15;
    }, { timeout: 20000 });
    const live = await phase(bea2.page);
    assert(live && live.phase === 'live', `bea phase ${JSON.stringify(live)}`);
    report.shots.push(await shot(ada2.page, 's7-free-match-ada.png'));
    report.shots.push(await shot(bea2.page, 's7-free-match-bea.png'));
    const adaBalance = await pageBalance(ada2.page);
    const beaBalance = await pageBalance(bea2.page);
    assert(adaBalance === 0 && beaBalance === 0, `free match moved tickets ${adaBalance} ${beaBalance}`);
    report.liveTick = (await phase(ada2.page)).tick;
    await ada2.page.evaluate(() => { window.__e2eFree.stop = true; return window.__e2eFree.rt.disconnect(); });
    await bea2.page.evaluate(() => { window.__e2eFree.stop = true; return window.__e2eFree.rt.disconnect(); });
    await ada2.close();
    await bea2.close();
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
