// Free 1v1 lobby, offline practice, and the local two-client mock.
// SHOOTER-S3: the local player is predicted; its muzzle flash, tracer, recoil, sound and ammo
// answer at once. Hitmarkers and damage numbers come only from the server's `hits`. The
// crosshair ray converges the sent aim (aim.js). ?netgraph=1 (or a dev build) shows the net graph.
import { createArenaView } from './view.js';
import { convergeAim } from './aim.js';
import { createNetGraph, netGraphEnabled } from './netgraph.js';
import { createAudio } from '../../audio/sfx.js';
import { createDirector } from '../../sim/pvp/director.js';
import { practiceWish } from '../../sim/pvp/practice.js';
import { CONTENT_FINGERPRINT, LOADOUT, PVP_PROTOCOL_VERSION } from '../../sim/pvp/rules.js';
import {
  createLoopbackTable, createMockArena, createPvpClient, freeMatchmakerRequest,
} from '../../net/client.js';
import { freeJoinTarget, labelIsFreePlay } from '../../hub/freePlay.js';
import { mountFreeArena } from './freeArena.js';
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

function graphOn() {
  const dev = !!(import.meta.env && import.meta.env.DEV);
  return netGraphEnabled(dev, typeof location !== 'undefined' ? location.search : '');
}

/** A tiny bus for the shared synthesized SFX: predicted shots and confirmed hits only. */
function createPvpSfx() {
  const fns = [];
  const audio = createAudio({ on(_type, fn) { fns.push(fn); } });
  return {
    ensure() { audio.ensure(); },
    emit(ev) { for (const fn of fns) fn(ev); },
  };
}

/** Play this client's new predicted shots and server-confirmed hits. */
function playSounds(sfx, client, seen) {
  for (const shot of client.drainShots()) {
    const gun = LOADOUT[shot.slot] || LOADOUT[0];
    sfx.emit({ type: 'shot', gunType: gun.type, manufacturer: gun.manufacturer });
  }
  const confirmed = client.net.hitsConfirmed;
  if (confirmed > seen.hits) sfx.emit({ type: 'damage', zone: 'body' });
  seen.hits = confirmed;
}

function ammoLabel(me) {
  if (!me || !Array.isArray(me.mag)) return '';
  const gun = LOADOUT[me.slot] || LOADOUT[0];
  const reserve = gun.infiniteReserve ? '∞' : gun.ammoType === 'shells' ? me.shells : gun.ammoType === 'sniper' ? me.sniper : '';
  return `${gun.name} ${me.mag[me.slot]} / ${reserve}${me.reloadT > 0 ? '  reloading' : ''}`;
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
  // Hitmarkers and damage numbers come only from server-confirmed hit events, never from local
  // spread. Ammo is the prediction's (it answers on the click).
  const marker = panel.querySelector('[data-pvp-hit]');
  const recent = (state.hits || []).filter((hit) => hit.shooter === state.seat);
  if (marker) {
    const last = recent[recent.length - 1];
    marker.textContent = last ? `Hit ${hpLabel(last.dmg)}` : '';
  }
  const numbers = panel.querySelector('[data-pvp-dmg]');
  if (numbers) numbers.textContent = recent.slice(-4).map((hit) => `-${hpLabel(hit.dmg)}`).join('  ');
  const ammo = panel.querySelector('[data-pvp-ammo]');
  if (ammo) ammo.textContent = ammoLabel(me);
}

function panelHtml(name) {
  return `<section data-seat-panel style="${PANEL}">
    <canvas style="width:100%;height:100%;display:block"></canvas>
    <div style="${HUD}">
      <div>
        <div data-pvp-name style="font-family:Bungee,sans-serif;color:#ffd166;font-size:22px">${name}</div>
        <div data-pvp-score style="color:#fff7ec"></div>
        <div data-pvp-phase style="color:#4fd1c5;font-weight:800"></div>
        <div data-pvp-hit style="color:#ff6b6b;font-weight:800"></div>
      </div>
      <div data-pvp-ammo style="color:#fff7ec;font-weight:800;text-align:right"></div>
      <div data-pvp-reconnect hidden style="${BANNER}">Reconnecting</div>
    </div>
    <div data-pvp-cross style="position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;pointer-events:none;background:linear-gradient(#fff7ec,#fff7ec) center/2px 14px no-repeat,linear-gradient(#fff7ec,#fff7ec) center/14px 2px no-repeat;opacity:.85"></div>
    <div data-pvp-dmg style="position:absolute;left:50%;top:calc(50% - 34px);transform:translateX(-50%);pointer-events:none;color:#ff6b6b;font-weight:800;font-family:'Baloo 2',sans-serif"></div>
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
  let queueTicket = null;
  let queueRealtime = null;
  let queueOff = null;
  let liveMatch = null;
  let queueing = false;

  function leave() {
    if (closed) return;
    closed = true;
    const ticket = queueTicket;
    const rt = queueRealtime;
    const match = liveMatch;
    queueTicket = null;
    liveMatch = null;
    if (queueOff) { queueOff(); queueOff = null; }
    if (ticket && rt && !match) rt.removeMatchmaker(ticket).catch(() => {});
    if (match) match.leave().catch(() => {});
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
    const clock = () => now;
    const table = createLoopbackTable(director, clock);
    const human = createPvpClient({ accountId: 'practice', match: table.open('practice', 'local'), clock });
    const bot = createPvpClient({ accountId: 'practice-bot', match: table.open('practice-bot', 'bot'), clock });
    human.ready();
    bot.ready();
    const panel = root.querySelector('[data-seat-panel]');
    panel.querySelector('[data-pvp-ready]').onclick = () => human.ready();
    root.querySelector('[data-pvp-go="back"]').onclick = leave;
    if (input && input.setLockElement) input.setLockElement(canvas);
    const sfx = createPvpSfx();
    const heard = { hits: 0 };
    canvas.addEventListener('mousedown', () => {
      if (input) input.lock();
      sfx.ensure();
    });
    const graph = graphOn() ? createNetGraph(panel) : null;
    if (graph) cleaners.push(() => graph.dispose());
    let faced = false;
    mode = {
      wantsLock: true,
      frame(_dt, cmd) {
        now += 1000 / 30;
        table.advance(now);
        const sample = human.sample(now);
        // The camera follows the raw local look; the wish carries the converged aim.
        let look = cmd ? { yaw: cmd.yaw, pitch: cmd.pitch } : human.look;
        if (human.phase === 'live' && sample && sample.players) {
          const seat = Math.max(0, human.seat);
          // Start the local look facing the opponent, where the server spawned this seat.
          if (!faced && input && input.setLook && sample.players[seat]) {
            faced = true;
            input.setLook(sample.players[seat].yaw, 0);
            if (cmd) { cmd.yaw = sample.players[seat].yaw; cmd.pitch = 0; }
            look = { yaw: sample.players[seat].yaw, pitch: 0 };
          }
          const raw = cmd || { yaw: look.yaw, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {} };
          const me = sample.players[seat];
          const aim = me ? convergeAim(me, { yaw: raw.yaw, pitch: raw.pitch }, sample.players[1 - seat]) : raw;
          human.updateCommand(now, { ...raw, yaw: aim.yaw, pitch: aim.pitch });
          const players = sample.players;
          if (players[0] && players[1]) bot.update(now, () => practiceWish(Math.floor(sample.tick), players[1], players[0]));
        }
        playSounds(sfx, human, heard);
        view.render(human.sample(now), Math.max(0, human.seat), human.phase === 'live' ? look : null, { shots: human.shots, now });
        paint(panel, human.viewState(now), 'Practice — not recorded');
        if (graph) graph.update(human.netGraph(now));
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
    const clients = joined.map((match, i) => createPvpClient({ accountId: accounts[i], match, clock: () => clock.now }));
    const localViews = panels.map((panel) => {
      const view = createArenaView(panel.querySelector('canvas'));
      views.push(view);
      return view;
    });
    panels.forEach((panel, index) => {
      panel.querySelector('[data-pvp-ready]').onclick = () => clients[index].ready();
    });
    const graphs = graphOn() ? panels.map((panel) => createNetGraph(panel)) : [];
    cleaners.push(() => { for (const graph of graphs) graph.dispose(); });
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
            client.update(clock.now, () => practiceWish(Math.max(0, Math.floor(sample.tick)), sample.players[index], sample.players[1 - index]));
          }
          localViews[index].render(sample, index, client.phase === 'live' ? client.look : null, { shots: client.shots, now: clock.now });
          paint(panels[index], state, accounts[index]);
          if (graphs[index]) graphs[index].update(client.netGraph(clock.now));
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

  function mountFreeMatch(match) {
    mode = mountFreeArena({
      root, match, accountId: (hub && hub.playerId) || '', input, onLeave: leave, views,
      panelHtml, paint, playSounds, createPvpSfx,
    });
  }

  async function openQueuedMatch(realtime, info) {
    const note = root.querySelector('[data-pvp-note]');
    const target = freeJoinTarget(info);
    if (!target) {
      queueing = false;
      if (note) note.textContent = 'The server did not return a free match. No Tickets move.';
      return;
    }
    const match = await realtime.joinMatch(target);
    if (closed) {
      try { await match.leave(); } catch { /* the screen is already gone */ }
      return;
    }
    if (!labelIsFreePlay(match.label)) {
      try { await match.leave(); } catch { /* a wager label is not this lobby */ }
      queueing = false;
      if (note) note.textContent = 'The server did not start a free match. No Tickets move.';
      return;
    }
    liveMatch = match;
    queueTicket = null;
    mountFreeMatch(match);
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
    if (queueing || liveMatch) return;
    queueing = true;
    try {
      queueRealtime = realtime;
      await realtime.connect();
      const matched = new Promise((resolve) => {
        queueOff = realtime.onMatchmakerMatched((info) => {
          if (queueOff) queueOff();
          queueOff = null;
          resolve(info);
        });
      });
      const added = await realtime.addMatchmaker(request);
      queueTicket = added && added.ticket ? added.ticket : null;
      if (note) note.textContent = 'Waiting for one opponent. Free match, no stake.';
      const info = await matched;
      if (closed) return;
      await openQueuedMatch(realtime, info);
    } catch (err) {
      if (queueOff) { queueOff(); queueOff = null; }
      queueTicket = null;
      queueing = false;
      if (note && !closed) note.textContent = `Free match unavailable (${err && err.message ? err.message : 'offline'}). Practice still works. No Tickets move.`;
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
