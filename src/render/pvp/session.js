// Free 1v1 lobby, offline practice, and the local two-client mock.
import { createArenaView } from './view.js';
import { createDirector } from '../../sim/pvp/director.js';
import { practiceWish } from '../../sim/pvp/practice.js';
import { CONTENT_FINGERPRINT, LOADOUT, PVP_PROTOCOL_VERSION } from '../../sim/pvp/rules.js';
import {
  createLoopbackTable, createMockArena, createPvpClient, freeMatchmakerRequest,
} from '../../net/client.js';
import { realtimeFromSdk } from '@metaverse/hub-sdk';

const PANEL = 'position:relative;min-height:0;height:100%;background:#1a1030;overflow:hidden';
const HUD = 'position:absolute;inset:0;pointer-events:none;display:flex;flex-direction:column;justify-content:space-between;padding:12px;font-family:"Baloo 2",sans-serif';
const BANNER = 'pointer-events:auto;margin:12px;padding:14px 16px;background:rgba(18,8,32,.92);border:3px solid #ffd166;color:#fff7ec;border-radius:12px;font-weight:800';

function hpLabel(milli) {
  return `${Math.max(0, Math.ceil((milli || 0) / 1000))}`;
}

function outcomeText(result) {
  if (!result) return '';
  if (result.outcome === 'cancel') return 'Match cancelled. No Tickets move.';
  if (result.outcome === 'draw') return `Draw (${result.reason}). No Tickets move.`;
  if (result.outcome === 'forfeit') return `Seat ${result.winner} wins by disconnect. No Tickets move.`;
  if (result.outcome === 'ko' || result.outcome === 'time') return `Seat ${result.winner} wins (${result.reason}). No Tickets move.`;
  return 'Match over. No Tickets move.';
}

function paint(panel, state, title) {
  const sample = state.sample;
  const me = sample && state.seat >= 0 ? sample.players[state.seat] : null;
  const them = sample && state.seat >= 0 ? sample.players[1 - state.seat] : null;
  panel.querySelector('[data-pvp-name]').textContent = title;
  panel.querySelector('[data-pvp-score]').textContent = me
    ? `You ${hpLabel(me.hp)}+${hpLabel(me.shield)}  ·  Them ${them ? hpLabel(them.hp) : '—'}  ·  ${LOADOUT.map((g) => g.name).join(' / ')}`
    : 'Equal guns. Fixed ammo. No perks.';
  const phase = panel.querySelector('[data-pvp-phase]');
  phase.textContent = state.result ? outcomeText(state.result) : state.phase;
  phase.dataset.pvpPhase = state.result ? 'done' : state.phase;
  const reconnect = panel.querySelector('[data-pvp-reconnect]');
  const showReconnect = state.link === 'reconnecting' && !state.result;
  reconnect.hidden = !showReconnect;
  if (showReconnect) {
    reconnect.textContent = `Reconnecting — 10s input grace, ${Math.ceil(state.graceLeftMs / 1000)}s left. Send input or the other seat takes the round. No Tickets move.`;
  }
  const ready = panel.querySelector('[data-pvp-ready]');
  if (ready) ready.hidden = state.phase !== 'lobby';
}

function panelHtml(name) {
  return `<section data-seat-panel style="${PANEL}">
    <canvas style="width:100%;height:100%;display:block"></canvas>
    <div style="${HUD}">
      <div>
        <div data-pvp-name style="font-family:Bungee,sans-serif;color:#ffd166;font-size:22px">${name}</div>
        <div data-pvp-score style="color:#fff7ec"></div>
        <div data-pvp-phase style="color:#4fd1c5;font-weight:800"></div>
      </div>
      <div data-pvp-reconnect hidden style="${BANNER}">Reconnecting</div>
    </div>
    <button class="btn" data-pvp-ready style="position:absolute;left:12px;bottom:12px">Ready</button>
  </section>`;
}

function mountScreen(screen) {
  screen.hidden = false;
  screen.style.display = 'block';
  screen.style.padding = '0';
  screen.style.background = '#120a22';
  screen.onclick = null;
}

export function startPvpSession({ screen, input, hub, demo = false, onExit }) {
  mountScreen(screen);
  const root = document.createElement('div');
  root.dataset.pvpRoot = '1';
  root.style.cssText = 'position:relative;width:100%;height:100vh;min-height:100%;display:flex;flex-direction:column';
  screen.innerHTML = '';
  screen.appendChild(root);
  let closed = false;
  let mode = null;
  const views = [];
  const cleaners = [];

  function leave() {
    if (closed) return;
    closed = true;
    for (const view of views) view.dispose();
    if (input && input.setLockElement) input.setLockElement(null);
    if (input && input.setRelay) input.setRelay(null);
    screen.style.display = '';
    screen.style.padding = '';
    onExit();
  }

  function showMenu() {
    root.innerHTML = `<div data-pvp-lobby class="title" style="margin:24px auto;max-width:720px">
      <h1 style="font-size:64px">FREE <span>1v1</span></h1>
      <p class="tag">Same arena, same three guns, same ammo, no perks. Protocol ${PVP_PROTOCOL_VERSION}. Fingerprint ${CONTENT_FINGERPRINT}. Nothing here moves Tickets.</p>
      <div class="menu">
        <button class="btn big" data-pvp-go="practice">Practice offline <small>local opponent, not recorded</small></button>
        <button class="btn big alt" data-pvp-go="mock">Two-client mock <small>authoritative stub until the hub match exists</small></button>
        <button class="btn big alt" data-pvp-go="queue">Find free match <small>hub realtime, no stake</small></button>
        <button class="btn alt" data-pvp-go="back" data-nav-back>← Back</button>
      </div>
      <p data-pvp-note class="tag"></p>
    </div>`;
    root.onclick = (event) => {
      const button = event.target.closest('[data-pvp-go]');
      if (!button) return;
      const go = button.dataset.pvpGo;
      if (go === 'back') leave();
      else if (go === 'practice') openPractice();
      else if (go === 'mock') openMock();
      else if (go === 'queue') queueMatch();
    };
  }

  function openPractice() {
    root.onclick = null;
    root.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column">${panelHtml('Practice')}<button class="btn alt" data-pvp-go="back" data-nav-back style="position:absolute;top:12px;right:12px">Leave practice</button></div>`;
    const canvas = root.querySelector('canvas');
    const view = createArenaView(canvas);
    views.push(view);
    const director = createDirector({ seed: 11, matchId: 'practice' });
    let now = 0;
    const table = createLoopbackTable(director, () => now);
    const human = createPvpClient({ accountId: 'practice', match: table.open('practice', 'local') });
    const bot = createPvpClient({ accountId: 'practice-bot', match: table.open('practice-bot', 'bot') });
    human.ready();
    bot.ready();
    const panel = root.querySelector('[data-seat-panel]');
    panel.querySelector('[data-pvp-ready]').onclick = () => human.ready();
    root.querySelector('[data-pvp-go="back"]').onclick = leave;
    if (input && input.setLockElement) input.setLockElement(canvas);
    canvas.addEventListener('mousedown', () => { if (input) input.lock(); });
    mode = {
      wantsLock: true,
      frame(_dt, cmd) {
        now += 1000 / 30;
        table.advance(now);
        const sample = human.sample();
        if (human.phase === 'live' && sample && sample.players) {
          human.submitCommand(cmd || { yaw: sample.players[0].yaw, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {} });
          const players = sample.players;
          if (players[0] && players[1]) bot.submit(practiceWish(sample.tick, players[1], players[0]));
        }
        view.render(human.sample(), Math.max(0, human.seat));
        paint(panel, human.viewState(now), 'Practice — not recorded');
      },
    };
  }

  async function openMock() {
    root.onclick = null;
    root.innerHTML = `<div data-pvp-mock style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;height:100%">${panelHtml('Ada')}${panelHtml('Bea')}</div><button class="btn alt" data-pvp-go="back" data-nav-back style="position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:2">Leave mock</button>`;
    const panels = [...root.querySelectorAll('[data-seat-panel]')];
    panels.forEach((panel, index) => panel.dataset.seat = String(index));
    const clock = { now: 0 };
    const { server, matchId } = createMockArena({ seed: 7, clock: () => clock.now });
    const accounts = ['ada', 'bea'];
    const realtime = accounts.map((id) => server.connect({ userId: id }));
    await Promise.all(realtime.map((rt) => rt.connect()));
    const joined = [];
    for (const rt of realtime) joined.push(await rt.joinMatch({ matchId }));
    const clients = joined.map((match, i) => createPvpClient({ accountId: accounts[i], match }));
    const localViews = panels.map((panel) => {
      const view = createArenaView(panel.querySelector('canvas'));
      views.push(view);
      return view;
    });
    panels.forEach((panel, index) => {
      panel.querySelector('[data-pvp-ready]').onclick = () => clients[index].ready();
    });
    let rafBusy = false;
    mode = {
      frame(dt) {
        clock.now += Math.max(16, Math.min(50, ((dt || 0.016) * 1000)));
        if (!rafBusy) {
          rafBusy = true;
          server.tick();
          server.flush().finally(() => { rafBusy = false; });
        }
        clients.forEach((client, index) => {
          const state = client.viewState(clock.now);
          const sample = state.sample;
          if (client.phase === 'live' && sample && sample.players && sample.players[0] && sample.players[1]) {
            client.submit(practiceWish(Math.max(0, sample.tick), sample.players[index], sample.players[1 - index]));
          }
          localViews[index].render(sample, index);
          paint(panels[index], state, accounts[index]);
          panels[index].dataset.pvpTick = String(sample ? sample.tick : 0);
        });
      },
    };
    root.querySelector('[data-pvp-go="back"]').onclick = leave;
    window.__pvp = {
      drop(userId) {
        const client = clients[accounts.indexOf(userId)];
        if (client) client.setHoldReconnect(true);
        server.drop(userId);
      },
      clients,
      server,
    };
    cleaners.push(() => { delete window.__pvp; });
  }

  async function queueMatch() {
    const note = root.querySelector('[data-pvp-note]');
    const request = freeMatchmakerRequest();
    const sdk = hub && hub.api;
    const realtime = sdk && typeof sdk.getSession === 'function' ? realtimeFromSdk(sdk) : null;
    if (!realtime) {
      if (note) note.textContent = 'Offline. Practice is on this machine and records nothing. A free match needs a hub session. No Tickets are staked or paid.';
      return;
    }
    try {
      await realtime.connect();
      await realtime.addMatchmaker(request);
      if (note) note.textContent = 'Waiting for one opponent. Free match, no stake. The hub authoritative match is not live until H3-S; this queue uses the SDK and will sit until that server accepts it.';
    } catch (err) {
      if (note) note.textContent = `Free match unavailable (${err && err.message ? err.message : 'offline'}). Practice still works. No Tickets move.`;
    }
  }

  if (demo) openMock().catch((err) => { root.textContent = err && err.message ? err.message : 'Mock failed'; });
  else showMenu();

  return {
    frame(dt, cmd) { if (mode && mode.frame) mode.frame(dt, cmd); },
    close() {
      for (const fn of cleaners) fn();
      leave();
    },
    get wantsLock() { return !!(mode && mode.wantsLock); },
  };
}
