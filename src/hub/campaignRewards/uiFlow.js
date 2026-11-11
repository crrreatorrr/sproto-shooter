import { createCampaignIssuer, createCampaignTransport } from './transport.js';
import { createCampaignController } from './controller.js';
import { campaignSessionBinding } from './session.js';
import { rewardPresentation, ELIGIBILITY_TEXT } from './presentation.js';
import { buildIssuedState } from '../../server/runContract.js';
import { noteParts, classify } from '../../server/replayChecks.js';
import { nakamaUrl } from '../link.js';

const BOSSES = Object.freeze([['sahil', 'Sahil'], ['obama', 'Obama'], ['broccoli', 'Broccoli'], ['glowie', 'Glowie'], ['tinubu', 'Tinubu']]);
// Shared across coordinators/accounts in this page. Unacknowledged input is
// never evicted to make room for another start. Resolved reminders hold no state.
const slots = [], reminders = [];
const MAX_SLOTS = 2, MAX_REMINDERS = 8;
function code(error) { return typeof error?.code === 'string' ? error.code : 'network_unavailable'; }

export class RewardedCampaignUI {
  constructor(game) {
    this.game = game; this.enabled = true; this.current = null; this.panelOpen = false;
    this.epoch = 0; this.paintQueued = false; this.startBusy = false; this.readJob = null; this.unavailable = null; this.identityCache = null;
    this.chip = document.createElement('button');
    this.chip.className = 'btn reward-live'; this.chip.dataset.rewardStatus = '1';
    this.chip.setAttribute('aria-label', 'Open rewarded campaign status');
    this.chip.style.cssText = 'position:fixed;top:82px;right:12px;z-index:35;max-width:340px;font-size:14px;pointer-events:auto';
    this.chip.addEventListener('click', () => this.open());
    game.ui.els.panel.parentElement.appendChild(this.chip);
    this.keyHandler = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.back(); return; }
      if (event.key === 'Tab') {
        const items = [...game.screen.querySelectorAll('button,select')].filter((el) => !el.disabled && !el.hidden);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { last?.focus(); event.preventDefault(); }
        else if (!event.shiftKey && document.activeElement === last) { first?.focus(); event.preventDefault(); }
        event.stopPropagation(); return;
      }
      if (event.target.matches('select,button')) { event.sprotoMenuKey = true; event.stopPropagation(); }
    };
    this.onVisibility = () => {
      if (!this.active) return;
      game.acc = 0; game.last = performance.now(); this.schedulePaint();
    };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.unwatch = game.hub.watchRewardIdentity?.(() => this.identityChanged());
    this.paint();
  }
  identity() {
    try {
      if (!this.game.hub.connected || !this.game.hub.bankable) return null;
      const session = this.game.hub.api?.getSession?.();
      const cached = this.identityCache;
      if (cached && cached.token === session?.token && cached.playerId === session?.playerId && cached.game === session?.game) return cached.identity;
      const identity = campaignSessionBinding(session);
      this.identityCache = { token: session.token, playerId: session.playerId, game: session.game, identity };
      return identity;
    } catch { return null; }
  }
  sameOwner(slot) {
    const who = this.identity();
    return !!who && who.accountId === slot.accountId;
  }
  sameSession(slot) {
    const who = this.identity();
    return !!who && who.accountId === slot.accountId && who.sessionId === slot.sessionId;
  }
  get active() { return !!this.current?.gameActive; }
  get controlsRestricted() { return this.active || this.startBusy; }
  get blocksTicks() { return this.active && (!!this.current.halted || !!this.current.localEnded || document.visibilityState === 'hidden'); }
  snapshot() {
    const slot = this.current, visible = slot && this.sameOwner(slot);
    const state = visible ? slot.controller?.status() : null;
    return Object.freeze({ enabled: true, phase: slot?.phase || 'choose', active: this.active,
      recording: this.active && !this.blocksTicks && this.game.screen.hidden, paused: !this.game.screen.hidden, runId: visible ? slot.runId : null,
      recordedTick: state?.recorder.totalFrames || 0, acceptedTick: state?.accepted.tick || 0,
      verifiedTick: state?.progress?.verified.tick || 0, sealed: !!state?.sealAck,
      pendingSlots: slots.length, reminders: reminders.length });
  }
  schedulePaint() {
    if (this.paintQueued) return;
    this.paintQueued = true;
    queueMicrotask(() => { this.paintQueued = false; this.paint(); });
  }
  presentation(slot = this.current) {
    if (!slot) return rewardPresentation({ phase: 'choose' });
    if (!this.sameOwner(slot)) return rewardPresentation({ phase: slot.gameActive ? 'paused' : 'choose',
      errorCode: slot.gameActive ? 'identity_changed' : null, active: slot.gameActive });
    return rewardPresentation({ phase: slot.phase, controllerStatus: slot.snapshot,
      errorCode: slot.errorCode, active: slot.gameActive });
  }
  paint() {
    const own = slots.find((slot) => slot.owner === this && this.sameOwner(slot));
    const last = [...reminders].reverse().find((item) => item.accountId === this.identity()?.accountId);
    const item = this.current && this.sameOwner(this.current) ? this.current : own;
    const label = item ? this.presentation(item).title : last?.title || 'Rewarded campaign';
    this.chip.textContent = `${item?.gameActive ? 'Rewarded' : 'Reward status'} · ${label}`;
    this.chip.hidden = this.game.pvpActive && !item && !last;
    if (!this.panelOpen || !this.game.screen.querySelector('[data-reward-panel]')) return;
    const context = this.current?.gameActive ? this.current : item;
    const view = this.presentation(context);
    this.game.screen.querySelector('[data-reward-title]').textContent = view.title;
    this.game.screen.querySelector('[data-reward-detail]').textContent = view.detail;
    const live = this.game.screen.querySelector('[data-reward-progress]');
    const state = item?.snapshot;
    live.textContent = state ? `Server received ${state.accepted?.tick ?? state.progress?.received?.tick ?? 0} ticks · verified ${state.progress?.verified.tick || 0} ticks` : '';
    const resume = this.game.screen.querySelector('[data-reward-action="resume"]');
    if (resume) resume.hidden = !context?.gameActive || context.halted || context.localEnded;
    const unranked = this.game.screen.querySelector('[data-reward-action="unranked"]');
    if (unranked) unranked.hidden = !context?.gameActive || (!context.halted && !context.localEnded);
    const retry = this.game.screen.querySelector('[data-reward-action="retry"]');
    if (retry) retry.hidden = !item || !!item.controller || this.startBusy || !this.sameSession(item);
    const start = this.game.screen.querySelector('[data-reward-start]');
    if (start) start.disabled = this.startBusy || this.active || !!item || slots.length >= MAX_SLOTS || !this.identity() || this.game.pvpActive || !!this.unavailable;
    const busy = this.game.screen.querySelector('[data-reward-busy]');
    if (busy) busy.textContent = !this.identity() ? 'Connect through the Hub to use rewarded play.'
      : this.game.pvpActive ? 'Leave free 1v1 before starting rewarded play.'
        : slots.length >= MAX_SLOTS && !item ? 'This tab is retaining earlier pending runs. Casual play remains available.'
          : this.unavailable ? 'Rewarded play is unavailable for this session. Casual play remains available.' : '';
  }
  open() {
    this.panelOpen = true;
    const g = this.game;
    g.screen.hidden = false; // prevent pointer-unlock from replacing this panel
    if (g.ui.menuOpen) g.ui.closeMenu();
    g.input.setEnabled(false); g.input.unlock(); g.paused = true;
    g.screen.innerHTML = `<div class="reward-dialog" data-reward-panel role="dialog" aria-modal="true" aria-labelledby="reward-title">
      <h1 id="reward-title" data-reward-title>Rewarded campaign</h1>
      <p data-reward-detail role="status" aria-live="polite"></p>
      <ul>${ELIGIBILITY_TEXT.map((line) => `<li>${line}</li>`).join('')}</ul>
      <p>Starts a fresh boss encounter with the server's starter loadout. Legal keyboard, mouse, controller and bot inputs are supported.</p>
      <p>Crafting, shop, direct inventory changes and debug controls are unavailable here. Ordinary movement, weapons, spells and interact remain available.</p>
      <label>Boss <select data-reward-boss>${BOSSES.map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}</select></label>
      <div class="menu">
        <button class="btn big" data-reward-start data-nav-default>Start rewarded run</button>
        <button class="btn" data-reward-action="resume" hidden>Resume run</button>
        <button class="btn" data-reward-action="unranked" hidden>Continue unranked</button>
        <button class="btn" data-reward-action="retry" hidden>Check pending start</button>
        <button class="btn" data-reward-action="check">Check server status</button>
        <button class="btn alt" data-reward-action="back" data-nav-back>Back to main menu</button>
      </div>
      <p data-reward-busy></p><p data-reward-progress></p>
      <p>Reloading loses unacknowledged local inputs. Received work remains on the server; gameplay cannot be restored.</p>
    </div>`;
    g.screen.onclick = (event) => {
      if (event.target.closest('[data-reward-start]')) {
        const boss = g.screen.querySelector('[data-reward-boss]').value;
        void this.start(boss);
      }
      const action = event.target.closest('[data-reward-action]')?.dataset.rewardAction;
      if (action === 'back') this.back();
      if (action === 'resume') this.resume();
      if (action === 'unranked') this.continueUnranked();
      if (action === 'retry') void this.retryStart();
      if (action === 'check') void this.check();
    };
    g.screen.addEventListener('keydown', this.keyHandler);
    g.screen.querySelector('[data-reward-boss]')?.focus();
    this.paint();
  }
  async start(boss) {
    if (this.startBusy || this.active || (this.current && this.sameOwner(this.current)) || slots.length >= MAX_SLOTS || this.unavailable || this.game.pvpActive) return;
    // First actual new-start operation is synchronous key creation. CI may
    // replace one crypto.randomUUID call with an idempotent trusted server key;
    // there is no production seed/state/keyFactory hook.
    const key = crypto.randomUUID();
    const who = this.identity();
    if (!who) { this.schedulePaint(); return; }
    const slot = { owner: this, ...who, key, boss, phase: 'starting', wantPlay: true,
      gameActive: false, halted: false, localEnded: false, controller: null, issuer: null,
      runId: null, snapshot: null, errorCode: null, generation: ++this.epoch, issued: false };
    slots.push(slot); this.current = slot; this.startBusy = true; this.schedulePaint();
    try {
      await this.game.hub.api.refreshSession?.();
      if (!this.sameSession(slot)) throw Object.assign(new Error('identity_changed'), { code: 'identity_changed' });
      slot.issuer = createCampaignIssuer({ enabled: true, ...who, key, canonicalBoss: boss,
        serverUrl: nakamaUrl(), getSession: () => this.game.hub.api.getSession?.() });
      await this.issue(slot);
    } catch (error) { this.startError(slot, error); }
    finally { this.startBusy = false; this.schedulePaint(); }
  }
  async retryStart() {
    const slot = this.current;
    if (!slot?.issuer || slot.controller || this.startBusy || !this.sameSession(slot)) return;
    this.startBusy = true; slot.wantPlay = false; slot.phase = 'starting'; this.schedulePaint();
    try { await this.issue(slot); } catch (error) { this.startError(slot, error); }
    finally { this.startBusy = false; this.schedulePaint(); }
  }
  async issue(slot) {
    slot.issued = true; // a lost response can already have reserved a run
    const ack = await slot.issuer.issue();
    if (ack.state !== 'issued') {
      slot.wantPlay = false; slot.noPlayResponse = true; slot.phase = 'error'; slot.errorCode = ack.reason;
      if (ack.state === 'unsupported_version') this.unavailable = `${slot.accountId}:${slot.sessionId}`;
      return;
    }
    slot.runId = ack.runId;
    const binding = await slot.issuer.bindIssued(ack);
    if (!this.sameSession(slot)) throw Object.assign(new Error('identity_changed'), { code: 'identity_changed' });
    slot.controller = createCampaignController({ enabled: true, transport: binding.transport,
      uploadDeadlineMs: Date.parse(ack.uploadDeadline), onState: (state) => this.controllerChanged(slot, state) });
    slot.snapshot = slot.controller.status();
    if (!slot.wantPlay || slot.generation !== this.epoch || !this.panelOpen) {
      slot.phase = 'cancelled'; slot.controller.finish(); slot.controller.start(); return;
    }
    this.install(slot, ack);
  }
  install(slot, ack) {
    const g = this.game;
    g.input.setEnabled(false);
    if (g.ui.menuOpen) g.ui.closeMenu();
    g.input.buildCommand(g.state.tick); // old UI/debug actions, before new state
    const state = buildIssuedState(ack.issuance);
    const player = state.players[state.localPlayerId];
    slot.savedScale = { timeScale: g.timeScale, presentScale: g.feel.presentScale };
    g.state = state; g.acc = 0; g.last = performance.now(); g._skip = false; g._campaignShown = false;
    g.timeScale = 1; g.feel.presentScale = 1; g.feel.hitstopMs = 0;
    g.gui?.hide(); g.debugOpen = false;
    g.input.setLook(player.yaw, player.pitch); g.input.dropAim();
    slot.parts = {}; slot.bossContract = { parts: ack.issuance.parts };
    g.configureCanonicalRewardCommands({ enabled: true, record: (frame, tick) => slot.controller.record(frame, tick),
      onError: (failure) => this.recordFailure(slot, failure) });
    slot.gameActive = true; slot.phase = 'playing'; slot.halted = false; this.panelOpen = false;
    g.playing = true; g.paused = false; g.hubLeaveArmed = false; g.hideScreen(); g.input.setEnabled(true);
    g.audio.ensure(); g.input.lock(); slot.controller.start();
    g.ui.toast('Rewarded run started. Click the arena to aim.', 'good'); this.schedulePaint();
  }
  startError(slot, error) {
    slot.wantPlay = false; slot.phase = 'error'; slot.errorCode = code(error);
    if (!slot.issued) this.release(slot);
    this.schedulePaint();
  }
  recordFailure(slot, failure) {
    if (!slot.gameActive || slot.localEnded) return;
    slot.halted = true; slot.phase = 'paused'; slot.errorCode = code(failure.error);
    this.game.acc = 0; this.game.paused = true;
    // DOM/network work is never performed in the synchronous record callback.
    queueMicrotask(() => { if (slot.gameActive) this.open(); });
  }
  afterTick() {
    const slot = this.current;
    if (!slot?.gameActive || slot.halted || slot.localEnded) return false;
    const state = this.game.state, player = state.players[state.localPlayerId];
    noteParts(slot.parts, state, slot.bossContract);
    const local = classify(slot.parts, slot.bossContract, player.dead, state.localPlayerId);
    if (local.outcome === 'incomplete') return false;
    slot.localEnded = true; slot.phase = 'ended'; slot.controller.finish();
    this.game.acc = 0; this.game.paused = true; this.game.playing = false;
    queueMicrotask(() => { if (slot.gameActive) this.open(); });
    return true; // stop at this local candidate, never claim authoritative pay
  }
  controllerChanged(slot, state) {
    slot.snapshot = state;
    if (slot.gameActive && (state.recordingStopped && state.recordingStopped !== 'local_end') && !slot.localEnded) {
      slot.halted = true; slot.phase = 'paused'; slot.errorCode = state.recordingStopped;
      queueMicrotask(() => { if (slot.gameActive) this.open(); });
    }
    if (slot.gameActive && state.progress?.terminal && !slot.localEnded) {
      slot.localEnded = true; slot.phase = 'ended'; this.game.acc = 0;
      queueMicrotask(() => { if (slot.gameActive) this.open(); });
    }
    this.prune(slot); this.schedulePaint();
  }
  resume() {
    const slot = this.current;
    if (!slot?.gameActive || slot.halted || slot.localEnded || !this.sameSession(slot)) return;
    this.panelOpen = false; this.game.screen.removeEventListener('keydown', this.keyHandler);
    this.game.hideScreen(); this.game.paused = false;
    this.game.input.setEnabled(true); this.game.input.lock();
  }
  detach(slot) {
    if (!slot?.gameActive) return;
    slot.gameActive = false; slot.localEnded = true;
    slot.controller.finish(); this.game.configureCanonicalRewardCommands({ enabled: false });
    if (slot.savedScale) { this.game.timeScale = slot.savedScale.timeScale; this.game.feel.presentScale = slot.savedScale.presentScale; }
    this.game.acc = 0; this.game._campaignShown = true;
  }
  continueUnranked() {
    const slot = this.current;
    if (!slot?.gameActive || (!slot.halted && !slot.localEnded)) return;
    this.detach(slot); slot.phase = 'unranked'; this.panelOpen = false;
    this.game.screen.removeEventListener('keydown', this.keyHandler);
    this.game.hideScreen(); this.game.paused = false; this.game.playing = true;
    this.game.input.setEnabled(true); this.game.input.lock();
    this.game.ui.toast('Unranked play. New inputs will not earn Tickets.', 'bad');
    this.prune(slot); this.schedulePaint();
  }
  leave() {
    ++this.epoch; const slot = this.current;
    if (slot) {
      slot.wantPlay = false; this.detach(slot);
      if (slot.noPlayResponse && !slot.controller) { slot.issuer?.stop(); this.release(slot); }
      else this.prune(slot);
    }
    this.panelOpen = false; this.game.input.setEnabled(true);
    this.game.screen.removeEventListener('keydown', this.keyHandler);
  }
  back() { this.leave(); this.game.showScreen('title'); }
  identityChanged() {
    ++this.epoch; this.unavailable = null; this.identityCache = null;
    this.readJob?.suspend?.(); this.readJob?.stop?.();
    for (const slot of slots.filter((item) => item.owner === this)) {
      slot.wantPlay = false; slot.identityStopped = true; slot.errorCode = 'identity_changed';
      slot.issuer?.stop(); slot.controller?.stop('identity_changed');
      if (slot.gameActive) {
        slot.halted = true; slot.phase = 'paused'; this.game.acc = 0;
        queueMicrotask(() => { if (slot.gameActive) this.open(); });
      }
    }
    this.schedulePaint();
  }
  async check() {
    const slot = this.current && this.sameOwner(this.current) ? this.current
      : slots.find((item) => item.owner === this && this.sameOwner(item));
    if (this.readJob) return;
    if (slot?.controller && !slot.controller.status().paused && this.sameOwner(slot)) {
      await slot.controller.pump({ poll: true }); return;
    }
    const item = slot || [...reminders].reverse().find((r) => r.accountId === this.identity()?.accountId);
    if (!item || !this.sameOwner(item) || (item.reads || 0) >= 16) return;
    item.reads = (item.reads || 0) + 1;
    let reader = null, recovery = null;
    this.readJob = {};
    try {
      if (!item.runId && item.key) {
        const who = this.identity();
        recovery = createCampaignIssuer({ enabled: true, ...who, key: item.key, canonicalBoss: item.boss,
          serverUrl: nakamaUrl(), getSession: () => this.game.hub.api.getSession?.(), maxCalls: 1 });
        this.readJob = recovery;
        const ack = await recovery.issue();
        if (!this.sameOwner(item) || ack.state !== 'issued') return;
        item.runId = ack.runId; // historical identity only, never bind/play
      }
      if (!item.runId) return;
      reader = createCampaignTransport({ enabled: true, accountId: item.accountId, sessionId: item.sessionId,
        runId: item.runId, serverUrl: nakamaUrl(), getSession: () => this.game.hub.api.getSession?.() });
      this.readJob = reader;
      const value = await reader.status();
      if (!this.sameOwner(item)) return;
      if (slot && 'received' in value) { slot.snapshot = { ...slot.snapshot, progress: value }; this.prune(slot); }
      else if ('received' in value) item.title = rewardPresentation({ controllerStatus: { progress: value } }).title;
    } catch { /* retained state remains pending; no guessed gameplay recovery */ }
    finally { reader?.suspend(); recovery?.stop(); this.readJob = null; this.schedulePaint(); }
  }
  prune(slot) {
    if (slot.gameActive) return;
    const state = slot.controller?.status();
    const payment = (slot.snapshot || state)?.progress?.payment?.state;
    const resolved = ['paid', 'ineligible', 'authorization_denied'].includes(payment) || (slot.snapshot || state)?.progress?.state === 'invalid';
    if (!resolved || (state?.recorder.retainedFrames || 0) !== 0) return;
    const title = rewardPresentation({ phase: slot.phase, controllerStatus: slot.snapshot, errorCode: slot.errorCode }).title;
    reminders.push({ accountId: slot.accountId, sessionId: slot.sessionId, runId: slot.runId, title, reads: 0 });
    if (reminders.length > MAX_REMINDERS) reminders.shift();
    slot.controller?.stop('resolved'); slot.issuer?.stop(); this.release(slot);
  }
  release(slot) {
    const index = slots.indexOf(slot); if (index !== -1) slots.splice(index, 1);
    if (this.current === slot) this.current = null;
  }
  observeIdentity() {
    const slot = this.current;
    if (slot?.gameActive && !slot.identityStopped && !this.sameSession(slot)) this.identityChanged();
  }
  unsupportedControl() {
    if (!this.controlsRestricted) return false;
    this.game.ui.toast('That control is unavailable in rewarded mode. No action was applied.', 'bad');
    return true;
  }
}
