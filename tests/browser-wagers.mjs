// Screenshots of the wager screens. The hub flags are off and staging is not used.
// The title shot is the real boot (no stake button). The other shots mount the real
// renderer with mocked server views.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const outDir = '/opt/cursor/artifacts';
fs.mkdirSync(outDir, { recursive: true });

const server = await createServer({ server: { port: 4191, strictPort: true }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls?.local?.[0] || 'http://127.0.0.1:4191/';

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch {
  execFileSync('npx', ['playwright', 'install', 'chromium'], { stdio: 'inherit' });
  browser = await chromium.launch({ headless: true });
}

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const shots = [];

async function shot(name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file });
  const size = fs.statSync(file).size;
  if (size < 1000) throw new Error(`${name} is too small (${size})`);
  shots.push(file);
  return file;
}

try {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-go="pvp"]', { timeout: 45000 });
  const stake = await page.locator('[data-wager-play-stake]').count();
  if (stake !== 0) throw new Error('stake button was visible before the server flag');
  await shot('wager-title-flag-off.png');

  await page.evaluate(async () => {
    const w = await import('/src/hub/wagers.js');
    const screen = document.getElementById('screen');
    screen.hidden = false;
    screen.style.display = 'grid';
    const signed = { playerId: 'player-a', bankable: true, guest: false, status: 'connected' };
    const on = { wagerEnabled: true, wagerStake: 10, wagerPot: 20 };
    window.__wagerShots = {
      ready: w.renderWagerScreen({
        phase: 'offer',
        offer: w.offerFromServer({ version: on, session: signed, balance: 40 }),
        receipt: null, notice: '',
      }),
      guest: w.renderWagerScreen({
        phase: 'offer',
        offer: w.offerFromServer({ version: on, session: { ...signed, guest: true, status: 'guest' }, balance: 40 }),
        receipt: null, notice: '',
      }),
      short: w.renderWagerScreen({
        phase: 'offer',
        offer: w.offerFromServer({ version: on, session: signed, balance: 4 }),
        receipt: null, notice: '',
      }),
      confirm: w.renderWagerScreen({
        phase: 'confirm',
        offer: w.offerFromServer({ version: on, session: signed, balance: 40 }),
        receipt: null,
        notice: 'Staking is separate from free play. The server holds 10 Tickets from each seat only after both click Ready.',
      }),
      queued: w.renderWagerScreen({
        phase: 'queued',
        offer: w.offerFromServer({ version: on, session: signed, balance: 40 }),
        receipt: null,
        notice: 'Waiting for one opponent to stake 10. Nothing is held until both are Ready.',
      }),
      pending: w.renderWagerScreen({
        phase: 'pending',
        offer: w.offerFromServer({ version: on, session: signed, balance: 30 }),
        receipt: { status: 'pending', net: null, balance: null, source: 'server' },
        notice: 'Match result is in. Ticket settlement is still pending on the server.',
      }),
      win: w.renderWagerScreen({
        phase: 'receipt',
        offer: w.offerFromServer({ version: on, session: signed, balance: 50 }),
        receipt: { status: 'settled', net: 10, balance: 50, source: 'server' },
        notice: 'The server closed the wager. The balance is the wallet read after that close.',
      }),
      loss: w.renderWagerScreen({
        phase: 'receipt',
        offer: w.offerFromServer({ version: on, session: signed, balance: 20 }),
        receipt: { status: 'settled', net: -10, balance: 20, source: 'server' },
        notice: 'The server closed the wager. The balance is the wallet read after that close.',
      }),
      refund: w.renderWagerScreen({
        phase: 'receipt',
        offer: w.offerFromServer({ version: on, session: signed, balance: 40 }),
        receipt: { status: 'refunded', net: 0, balance: 40, source: 'server' },
        notice: 'The server did not pay a winner. Net 0.',
      }),
      rematch: w.renderWagerScreen({
        phase: 'confirm',
        offer: w.offerFromServer({ version: on, session: signed, balance: 50 }),
        receipt: { status: 'settled', net: 10, balance: 50, source: 'server' },
        notice: 'Both players have to stake 10 again. This confirmation only brings you back to the stake screen.',
      }),
      left: w.renderWagerScreen({
        phase: 'left',
        offer: w.offerFromServer({ version: on, session: signed, balance: 30 }),
        receipt: null,
        notice: 'You left a live wager. If both players were Ready, the server may forfeit a seat that stays silent for 10 seconds. This client did not refund.',
      }),
    };
  });

  const names = {
    ready: 'wager-offer-ready.png',
    guest: 'wager-offer-guest.png',
    short: 'wager-offer-insufficient.png',
    confirm: 'wager-confirm.png',
    queued: 'wager-queued.png',
    pending: 'wager-pending.png',
    win: 'wager-receipt-win.png',
    loss: 'wager-receipt-loss.png',
    refund: 'wager-receipt-refund.png',
    rematch: 'wager-rematch.png',
    left: 'wager-leave-warning.png',
  };
  for (const [key, file] of Object.entries(names)) {
    await page.evaluate((which) => {
      document.getElementById('screen').innerHTML = window.__wagerShots[which];
    }, key);
    await shot(file);
  }

  const clicked = await page.evaluate(async () => {
    const w = await import('/src/hub/wagers.js');
    const calls = [];
    let wallet = 40;
    const flow = w.createWagerFlow({
      session: () => ({ playerId: 'player-a', bankable: true, guest: false, status: 'connected' }),
      balance: async () => wallet,
      rpc: async (id) => {
        calls.push(id);
        if (id === 'shooter.version') return { wagerEnabled: true, wagerStake: 10, wagerPot: 20 };
        if (id === 'shooter.queue_cancel') return { ok: true, stakes: false, ticketsMinted: 0 };
        throw new Error(`unexpected ${id}`);
      },
      addMatchmaker: async (req) => {
        calls.push(`mm:${req.stringProperties.mode}:${req.stringProperties.stake}`);
        return { ticket: 't-1' };
      },
      removeMatchmaker: async () => { calls.push('mm-remove'); },
    });
    const screen = document.getElementById('screen');
    const paint = () => { screen.innerHTML = w.renderWagerScreen(flow.view); };
    w.bindWagerScreen(screen, flow, { repaint: paint });
    await flow.refresh();
    paint();
    screen.querySelector('[data-wager-action="confirm"]').click();
    await new Promise((r) => setTimeout(r, 30));
    const confirmed = flow.view.phase === 'confirm' && !calls.some((id) => String(id).startsWith('mm:'));
    screen.querySelector('[data-wager-action="queue"]').click();
    screen.querySelector('[data-wager-action="queue"]')?.click();
    await new Promise((r) => setTimeout(r, 30));
    flow.noteLocalResult({ outcome: 'ko', winner: 0, ticketsMinted: 20 });
    return {
      confirmed,
      phase: flow.view.phase,
      calls,
      forgedNet: flow.view.receipt ? flow.view.receipt.net : null,
      wallet,
    };
  });
  if (!clicked.confirmed) throw new Error('confirm queued before the second click');
  if (clicked.phase !== 'queued') throw new Error(`expected queued, got ${clicked.phase}`);
  if (clicked.calls.filter((id) => id === 'mm:wager:10').length !== 1) throw new Error(`matchmaker calls ${clicked.calls.join(',')}`);
  if (clicked.calls.some((id) => /earn|settle|refund/.test(id))) throw new Error(`money rpc ${clicked.calls.join(',')}`);
  await shot('wager-after-queue-click.png');

  console.log(JSON.stringify({ ok: true, url, shots, clicked }, null, 2));
} finally {
  await browser.close();
  await server.close();
}
