// Wires state + fixed-timestep loop + input + renderer + audio + UI + debug panel. PLAN §1.3
import GUI from 'lil-gui';
import { createGameState } from '../sim/state.js';
import { simulate, DT } from '../sim/simulate.js';
import { createEventBus } from '../core/eventBus.js';
import { createInput } from '../input/input.js';
import { createRenderer } from '../render/renderer.js';
import { createAudio } from '../audio/sfx.js';
import { createUI } from '../ui/ui.js';
import { ENEMIES, BOSSES } from '../data/enemies.js';
import { CAMPAIGN, getLevelData } from '../data/levels/index.js';
import { unlockLevel, loadProfile, rememberModifier } from '../save/profile.js';
import { restoreCheckpoint } from '../sim/campaign/campaign.js';
import { GUN_TYPES, QUALITIES, ELEMENTS, WACKY, zoomLevelsOf, zoomFovFor } from '../data/guns.js';
import { SKILL_IDS } from '../data/skills.js';
import { MAX_TIER } from '../data/waves.js';

const MAX_FRAME = 0.25, MAX_TICKS = 5;

export class Game {
  constructor({ seed, mode = 'title', tier = 1, debug = false, boss = null, level = null, hub = null }) {
    this.hub = hub ?? { connected: false, balance: null, refreshBalance: () => Promise.resolve(null), exitHub() {} };
    this.bus = createEventBus();
    this.state = createGameState({ seed });
    this.paused = true;
    this.timeScale = 1;
    this.hitstopMs = 0;
    this.settings = { hitstop: true, shake: 1, sensitivity: 1 };

    const app = document.getElementById('app');
    this.renderer = createRenderer(app.querySelector('#view'), this.bus);
    this.input = createInput(this.renderer.canvas);
    this.audio = createAudio(this.bus);
    this.ui = createUI(app.querySelector('#ui'), { input: this.input, bus: this.bus, project: (p) => this.renderer.project(p), game: this });
    this.screen = app.querySelector('#screen');

    this.input.setLook(this.state.players[this.state.localPlayerId].yaw, 0);
    this.wireFeel();
    this.wireInput();
    this.buildDebug(debug);

    // initial sandbox content so the title screen has something going on behind it
    this.queue({ type: 'startMode', mode: 'sandbox', tier: 1 });
    this.queue({ type: 'debug', op: 'spawnDummies' });
    if (mode === 'waves') this.start('waves', tier);
    else if (mode === 'sandbox') this.start('sandbox', tier);
    else if (mode === 'test') this.start('test', tier);
    else if (mode === 'boss') this.start('boss', tier, { boss: BOSSES[boss] && !BOSSES[boss].campaign ? boss : 'monster' });
    else if (mode === 'campaign') this.start('campaign', tier, { level: level || 'L01' });
    else this.showScreen('title');

    this.last = performance.now();
    this.acc = 0;
    requestAnimationFrame((t) => this.frame(t));
    window.__game = this; // for debugging in devtools
  }

  queue(a) { this.input.queueAction(a); }
  findGun(id) {
    const p = this.state.players[this.state.localPlayerId];
    return p.guns.find((g) => g && g.id === id) || this.state.pickups.find((k) => k.gun && k.gun.id === id)?.gun;
  }
  shopOpen() { const s = this.state; return s.mode === 'sandbox' || (s.wave && (s.wave.phase === 'intermission' || s.wave.phase === 'victory')); }
  skipIntermission() { this._skip = true; }

  wireFeel() {
    const stop = (ms) => { if (this.settings.hitstop) this.hitstopMs = Math.max(this.hitstopMs, Math.min(ms, 200)); };
    this.bus.on('damage', (ev) => { if (ev.isWeak && ev.sourceKind === 'gun' && ev.amount > 40) stop(45); if (ev.killed && ev.isWeak) stop(60); });
    this.bus.on('bossDefeated', () => stop(200));
    this.bus.on('bossPhase', () => stop(120));
    this.bus.on('bossMeleeHit', () => stop(110)); // brief freeze when a boss melee connects (weight)
    this.bus.on('meteorImpact', () => stop(90));
  }

  wireInput() {
    const inp = this.input;
    inp.on('clickUnlocked', () => {
      if (!this.screen.hidden || this.ui.menuOpen) return;
      this.audio.ensure();
      inp.lock();
    });
    inp.on('lockchange', (locked) => {
      if (locked) { this.paused = false; this.hidePause(); }
      else if (!this.ui.menuOpen && this.screen.hidden && !this.debugOpen) this.showPause();
    });
    inp.on('key', (e) => {
      if (e.code === 'Backquote') this.toggleDebug();
      if (e.code === 'KeyM') this.audio.toggleMute();
      if (e.code === 'KeyP' && !e.repeat && !this.ui.menuOpen) this.queue({ type: 'debug', op: 'toggleGod' });
      if (e.code === 'Enter' && this.state.wave && this.state.wave.phase === 'intermission' && !this.ui.menuOpen) this._skip = true;
    });
  }

  start(mode, tier = 1, extra = {}) {
    this.audio.ensure();
    if (mode === 'boss') this.lastBoss = extra.boss;
    this._campaignShown = false;
    this.queue({ type: 'startMode', mode, tier, ...extra });
    this.hideScreen();
    this.paused = false;
    this.input.lock();
  }

  // ---------- screens ----------
  showScreen(kind) {
    const s = this.state, p = s.players[s.localPlayerId];
    this.input.unlock();
    this.ui.closeMenu && this.ui.menuOpen && this.ui.closeMenu();
    let body = '';
    if (kind === 'title') {
      body = `<div class="title"><h1>SPROTO<br><span>SHOOTER</span></h1>
        ${this.hubChip()}
        <p class="tag">A wacky loot shooter. Blast blobs, grab guns, craft better ones, beat the bosses.</p>
        <div class="menu">
          <button class="btn big" data-go="waves">▶ Wave Mode <small>3 waves + bosses</small></button>
          <button class="btn big alt" data-go="sandbox">🧪 Sandbox <small>debug spawn everything</small></button>
          <button class="btn big alt" data-go="test">🎯 Test Range <small>every gun, infinite ammo</small></button>
          <button class="btn big alt" data-go="bossSelect">👑 Boss Fight <small>pick a boss to fight</small></button>
          <button class="btn big" data-go="campaignSelect">🗺 Campaign <small>The Great Sproto Audit</small></button>
          <button class="btn alt" data-go="hub">⌂ Return to Hub</button>
          <div class="tier">Tier <select id="tier-sel">${Array.from({ length: MAX_TIER }, (_, i) => `<option ${i + 1 === s.tier ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>
        </div>
        ${controlsHtml()}</div>`;
    } else if (kind === 'bossSelect') {
      const cards = Object.entries(BOSSES).filter(([, b]) => !b.campaign).map(([id, b]) => `<button class="btn boss-card" data-go="boss" data-boss="${id}" style="--c:#${b.color.toString(16).padStart(6, '0')}">
          <b>${b.name}</b><small>${b.tag === 'magic' ? '🔮 Magic' : '💪 Physical'} · ${b.hp.toLocaleString()} HP</small><span>${BOSS_BLURB[id] || ''}</span></button>`).join('');
      body = `<div class="title boss-select"><h1>BOSS <span>FIGHT</span></h1>
        <p class="tag">Pick a boss. You get one of every gun with full ammo. Real damage: no god mode unless you press P.</p>
        <div class="boss-grid">${cards}</div>
        <div class="menu"><div class="tier">Tier <select id="tier-sel">${Array.from({ length: MAX_TIER }, (_, i) => `<option ${i + 1 === s.tier ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>
          <button class="btn alt" data-go="title">← Back</button></div></div>`;
    } else if (kind === 'bossWon' || kind === 'bossLost') {
      const win = kind === 'bossWon', b = BOSSES[this.lastBoss] || {}, r = s.run;
      body = `<div class="end ${win ? 'victory' : 'defeat'}"><h1>${win ? `${b.name} DOWN!` : 'DEFEATED'}</h1>
        <p>${win ? `You beat ${b.name} in ${Math.round(s.bossFight ? s.bossFight.time : 0)} s.` : `${b.name} got you. Try again?`}</p>
        <div class="stats"><div><b>${Math.round(r.damageDealt).toLocaleString()}</b>damage</div><div><b>${r.bestHit}</b>best hit</div><div><b>${r.weakHits}</b>BONKs</div></div>
        <div class="menu">
          <button class="btn big" data-go="boss" data-boss="${this.lastBoss}">${win ? '↻ Fight again' : '↻ Retry'}</button>
          <button class="btn" data-go="bossSelect">👑 Pick another boss</button>
          <button class="btn alt" data-go="title">Main menu</button>
        </div></div>`;
    } else if (kind === 'campaignSelect') {
      const prof = loadProfile();
      const cards = CAMPAIGN.map((id, i) => {
        const lv = getLevelData(id);
        const open = prof.unlocked.includes(id);
        return `<button class="btn boss-card" data-go="campaign" data-level="${id}" ${open ? '' : 'disabled'}><b>${i + 1}. ${lv.name}</b><small>${open ? lv.stage : 'locked'} · tier ${lv.tier}</small></button>`;
      }).join('');
      body = `<div class="title boss-select"><h1>THE GREAT <span>SPROTO AUDIT</span></h1>
        <p class="tag">Ten levels. Your guns stay the same. The world does not.</p>
        <div class="boss-grid">${cards}</div>
        <div class="menu"><button class="btn alt" data-go="title">← Back</button></div></div>`;
    } else if (kind === 'levelClear' || kind === 'levelLost') {
      const win = kind === 'levelClear';
      const lv = s.level || {};
      const idx = Math.max(0, CAMPAIGN.indexOf(lv.id));
      const next = CAMPAIGN[idx + 1];
      body = `<div class="end ${win ? 'victory' : 'defeat'}"><h1>${win ? 'AUDIT PASSED' : 'AUDIT FAILED'}</h1>
        <p>${win ? `${lv.name} cleared in ${Math.round(lv.time)}s. Par ${Math.round((lv.parTime || 0) / 60)} min.` : `${lv.name} got the better of you.`}</p>
        <div class="menu">
          ${win && next ? `<button class="btn big" data-go="campaign" data-level="${next}">▶ Next level</button>` : ''}
          <button class="btn" data-go="retryLevel" data-level="${lv.id}">↻ Retry</button>
          ${kind === 'levelLost' ? `<button class="btn" data-go="checkpoint">Checkpoint</button>` : ''}
          <button class="btn alt" data-go="campaignSelect">Level select</button>
        </div></div>`;
    } else if (kind === 'victory' || kind === 'defeat') {
      const r = s.run, win = kind === 'victory';
      const next = Math.min(MAX_TIER, s.tier + 1);
      body = `<div class="end ${kind}"><h1>${win ? (s.tier >= MAX_TIER ? 'SPROTO SUPREME!' : 'VICTORY!') : 'DEFEATED'}</h1>
        <p>${win ? `Tier ${s.tier} cleared. A Legendary gun dropped in the middle of the arena. Grab it before you go!` : `You lost half the tickets you earned this run.`}</p>
        <div class="stats">
          <div><b>${r.kills}</b>kills</div><div><b>${r.eliteKills}</b>elites</div><div><b>${r.bossKills}</b>bosses</div>
          <div><b>${Math.round(r.damageDealt).toLocaleString()}</b>damage</div><div><b>${r.bestHit}</b>best hit</div><div><b>${r.weakHits}</b>BONKs</div>
          <div><b>${r.ticketsEarned}</b>tickets</div><div><b>${r.gunsFound}</b>guns found</div><div><b>${r.crafts}</b>crafts</div>
        </div>
        <div class="xpgain">${SKILL_IDS.map((k) => `<span>${k}: +${Math.round(r.xpGained[k])} XP (Lv ${p.skills[k].level})</span>`).join('')}</div>
        <div class="menu">
          ${win ? `<button class="btn big" data-go="waves" data-tier="${next}">▶ Next: Tier ${next}</button><button class="btn" data-go="continue">Keep looting (shop open)</button>` : `<button class="btn big" data-go="waves" data-tier="${s.tier}">↻ Retry Tier ${s.tier}</button>`}
          <button class="btn alt" data-go="sandbox">🧪 Sandbox</button>
        </div></div>`;
    }
    this.screen.innerHTML = body;
    this.screen.hidden = false;
    if (kind === 'title') this.paintHubChip();
    this.screen.onclick = (e) => {
      const b = e.target.closest('[data-go]');
      if (!b) return;
      const go = b.dataset.go;
      if (go === 'hub') { this.hub.exitHub(); return; }
      if (go === 'continue') { this.hideScreen(); this.paused = false; this.input.lock(); return; }
      if (go === 'title' || go === 'bossSelect' || go === 'campaignSelect') { this.showScreen(go); return; }
      if (go === 'checkpoint') { restoreCheckpoint(this.state); this._campaignShown = false; this.hideScreen(); this.paused = false; this.input.lock(); return; }
      const tier = b.dataset.tier ? +b.dataset.tier : +(this.screen.querySelector('#tier-sel')?.value || s.tier);
      const extra = {};
      if (go === 'boss') extra.boss = b.dataset.boss;
      if (go === 'campaign' || go === 'retryLevel') extra.level = b.dataset.level;
      this.start(go === 'retryLevel' ? 'campaign' : go, tier, extra);
    };
  }
  hideScreen() { this.screen.hidden = true; this.screen.innerHTML = ''; }
  hubChip() {
    const n = this.hub.connected ? (this.hub.balance === null ? '…' : String(this.hub.balance)) : '--';
    return `<div class="hub-chip">Hub tickets <b>${n}</b></div>`;
  }
  paintHubChip() {
    const el = this.screen.querySelector('.hub-chip b');
    if (!el || !this.hub.connected) return;
    this.hub.refreshBalance().then((n) => {
      const live = this.screen.querySelector('.hub-chip b');
      if (live && n !== null) live.textContent = String(n);
    });
  }
  showPause() {
    if (!this.screen.hidden) return;
    this.paused = true;
    this.screen.innerHTML = `<div class="pause"><h1>PAUSED</h1><button class="btn big" data-p="resume">Resume</button>
      <button class="btn" data-p="title">Main menu</button>
      <button class="btn alt" data-p="hub">Return to Hub</button>
      <label>Mouse sensitivity <input id="sens" type="range" min="0.3" max="3" step="0.05" value="${this.settings.sensitivity}"></label>
      <label><input id="hs" type="checkbox" ${this.settings.hitstop ? 'checked' : ''}> Hitstop on big hits</label>
      <label>Screen shake <input id="shk" type="range" min="0" max="1.5" step="0.1" value="${this.settings.shake}"></label>
      ${controlsHtml()}</div>`;
    this.screen.hidden = false;
    this.screen.onclick = (e) => {
      const b = e.target.closest('[data-p]');
      if (!b) return;
      if (b.dataset.p === 'resume') { this.hideScreen(); this.input.lock(); }
      else if (b.dataset.p === 'hub') {
        if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Leave this run?'; return; }
        this.hub.exitHub();
      } else this.showScreen('title');
    };
    this.screen.oninput = (e) => {
      if (e.target.id === 'sens') { this.settings.sensitivity = +e.target.value; this.input.sensitivity = 0.0022 * this.settings.sensitivity; }
      if (e.target.id === 'hs') this.settings.hitstop = e.target.checked;
      if (e.target.id === 'shk') this.settings.shake = +e.target.value;
    };
  }
  hidePause() { if (this.screen.querySelector('.pause')) this.hideScreen(); }

  // ---------- debug panel ----------
  buildDebug(open) {
    const gui = new GUI({ title: 'Sproto Debug [`]', width: 300 });
    this.gui = gui;
    const d = { enemy: 'grunt', count: 1, elite: false, tier: 1, boss: 'monster', gunType: 'random', quality: 'random', element: 'random', wacky: 'random',
      tickets: 200, skill: 'magic', god: false, infAmmo: false, freeze: false, unlock: false, hitboxes: false, dummyInf: false, hpMult: 1, dmgMult: 1, timeScale: 1 };
    const q = (op, args) => this.queue({ type: 'debug', op, args });
    const sp = gui.addFolder('Spawn');
    sp.add(d, 'enemy', Object.keys(ENEMIES)); sp.add(d, 'count', 1, 10, 1); sp.add(d, 'elite'); sp.add(d, 'tier', 1, 10, 1);
    sp.add({ go: () => q('spawnEnemy', { type: d.enemy, count: d.count, elite: d.elite, tier: d.tier }) }, 'go').name('Spawn enemy');
    sp.add(d, 'boss', Object.keys(BOSSES));
    sp.add({ go: () => q('spawnBoss', { type: d.boss, tier: d.tier }) }, 'go').name('Spawn boss');
    sp.add({ go: () => q('spawnDummies') }, 'go').name('Spawn 5 dummies');
    sp.add({ go: () => q('killAll') }, 'go').name('Kill all');
    sp.add({ go: () => q('clearEnemies') }, 'go').name('Clear (no drops)');
    const gn = gui.addFolder('Guns');
    gn.add(d, 'gunType', ['random', ...GUN_TYPES.map((g) => g.id)]); gn.add(d, 'quality', ['random', ...QUALITIES.map((x) => x.id)]);
    gn.add(d, 'element', ['random', ...ELEMENTS.map((x) => x.id)]); gn.add(d, 'wacky', ['random', ...WACKY.map((x) => x.id)]);
    gn.add({ go: () => q('spawnGun', { type: d.gunType, quality: d.quality, element: d.element, wacky: d.wacky, level: d.tier }) }, 'go').name('Spawn gun');
    gn.add({ go: () => { for (let i = 0; i < 6; i++) q('spawnGun', {}); } }, 'go').name('Loot explosion (6)');
    gn.add({ go: () => q('refillAmmo') }, 'go').name('Refill ammo');
    const pl = gui.addFolder('Player');
    pl.add(d, 'tickets', 10, 2000, 10); pl.add({ go: () => q('giveTickets', { amount: d.tickets }) }, 'go').name('Give tickets');
    pl.add({ go: () => q('giveResources', { amount: 100 }) }, 'go').name('Give resources');
    pl.add(d, 'skill', SKILL_IDS); pl.add({ go: () => q('levelSkill', { skill: d.skill }) }, 'go').name('Level up skill');
    pl.add({ go: () => q('maxSkills') }, 'go').name('Max all skills');
    pl.add({ go: () => q('heal') }, 'go').name('Heal / revive');
    // reads the live setting so the P key and the Test Range stay in sync with the checkbox
    const god = {};
    Object.defineProperty(god, 'on', { get: () => this.state.tuning.godMode, set: (v) => q('setTuning', { key: 'godMode', value: v }) });
    pl.add(god, 'on').name('God mode [P]').listen();
    pl.add(d, 'infAmmo').name('Infinite ammo').onChange((v) => q('setTuning', { key: 'infiniteAmmo', value: v }));
    pl.add(d, 'unlock').name('Unlock all recipes').onChange((v) => q('setTuning', { key: 'unlockAllRecipes', value: v }));
    const w = gui.addFolder('World & tuning');
    w.add(d, 'tier', 1, 10, 1).name('Set tier').onFinishChange((v) => q('setTier', { tier: v }));
    w.add(d, 'freeze').name('Freeze enemies').onChange((v) => q('setTuning', { key: 'freezeEnemies', value: v }));
    w.add(d, 'dummyInf').name('Dummies infinite HP').onChange((v) => q('setTuning', { key: 'dummyInfinite', value: v }));
    w.add(d, 'hpMult', 0.1, 5, 0.1).name('Enemy HP × (new)').onChange((v) => q('setTuning', { key: 'enemyHpMult', value: v }));
    w.add(d, 'dmgMult', 0, 5, 0.1).name('Enemy dmg ×').onChange((v) => q('setTuning', { key: 'enemyDmgMult', value: v }));
    w.add(d, 'timeScale', 0.1, 2, 0.05).name('Time scale').onChange((v) => { this.timeScale = v; });
    w.add(d, 'hitboxes').name('Show hitboxes').onChange((v) => this.renderer.setShowHitboxes(v));
    w.add({ go: () => q('skipWave') }, 'go').name('Skip wave (waves mode)');
    const gs = gui.addFolder('Live gun stats (equipped)');
    this.gunStatProxy = { damage: 0, fireRate: 0, spread: 0, magSize: 0, reloadTime: 0, critMult: 0, elementChance: 0 };
    const ranges = { damage: [1, 500], fireRate: [0.2, 30], spread: [0, 15], magSize: [1, 200], reloadTime: [0.2, 5], critMult: [1, 6], elementChance: [0, 1] };
    this.gunStatCtrls = Object.entries(ranges).map(([k, [lo, hi]]) => gs.add(this.gunStatProxy, k, lo, hi).onChange((v) => q('setGunStat', { key: k, value: k === 'magSize' ? Math.round(v) : v })));
    gs.close();
    if (!open) gui.hide();
    this.debugOpen = open;
    gui.domElement.style.zIndex = 50;
  }
  toggleDebug() {
    this.debugOpen = !this.debugOpen;
    if (this.debugOpen) {
      const g = this.state.players[this.state.localPlayerId].guns[this.state.players[this.state.localPlayerId].activeSlot];
      if (g) { for (const k of Object.keys(this.gunStatProxy)) this.gunStatProxy[k] = g.stats[k]; this.gunStatCtrls.forEach((c) => c.updateDisplay()); }
      this.gui.show(); this.input.unlock();
    } else { this.gui.hide(); if (this.screen.hidden && !this.ui.menuOpen) this.input.lock(); }
  }

  // ---------- loop ----------
  frame(now) {
    let ft = Math.min((now - this.last) / 1000, MAX_FRAME);
    this.last = now;
    if (this.hitstopMs > 0) { this.hitstopMs -= ft * 1000; ft = 0; }
    // Shop/crafting menus and the debug panel do NOT pause. The pause and end screens do. The title runs a demo behind it.
    const scr = this.screen.hidden ? null : this.screen.querySelector('.title') ? 'title' : 'other';
    const titleUp = scr === 'title';
    if (scr === null || titleUp) this.acc += ft * this.timeScale;
    let n = 0;
    while (this.acc >= DT && n < MAX_TICKS) {
      const cmd = this.input.buildCommand(this.state.tick);
      if (this._skip) { cmd.pressed.skip = true; this._skip = false; }
      if (titleUp) { cmd.held = {}; cmd.moveX = cmd.moveZ = 0; cmd.pressed = {}; cmd.yaw = this.state.time * 0.15; cmd.pitch = -0.05; this.input.setLook(cmd.yaw, cmd.pitch); }
      simulate(this.state, { [this.state.localPlayerId]: cmd }, DT);
      this.bus.emitAll(this.state.events);
      this.acc -= DT; n++;
    }
    if (n === MAX_TICKS) this.acc = 0;
    const lv = this.state.level;
    if (this.state.mode === 'campaign' && lv && !this._campaignShown && this.screen.hidden) {
      if (lv.won) { this._campaignShown = true; const i = CAMPAIGN.indexOf(lv.id); if (CAMPAIGN[i + 1]) unlockLevel(CAMPAIGN[i + 1]); for (const id of Object.keys(lv.modifiers)) rememberModifier(id); this.showScreen('levelClear'); }
      else if (lv.lost) { this._campaignShown = true; this.showScreen('levelLost'); }
    }
    const alpha = this.acc / DT;
    const p = this.state.players[this.state.localPlayerId];
    const g = p.guns[p.activeSlot];
    this.input.zoomLevels = zoomLevelsOf(g);
    const zoomLevel = Math.max(1, this.input.zoomLevel);
    this.input.zoomSensitivity = p.zooming && g ? zoomFovFor(g, zoomLevel) / 90 : 1;
    this.renderer.render(this.state, alpha, this.input.liveLook(), { shake: this.settings.shake, zoomLevel });
    this.ui.update(this.state);
    requestAnimationFrame((t) => this.frame(t));
  }
}

/** One-line descriptions for the Boss Fight picker. */
const BOSS_BLURB = {
  dragon: 'Takes flight to bomb you with fireballs, fire breath, tail swipes.',
  monster: 'Overhead arm smashes, homing missiles, bullet fans.',
  sprotoBeast: 'Punch and kick combos, missile salvos, charges.',
  megaSproto: 'Charges, ground slams, missiles, swings up close.',
  hexAuditor: 'Floating caster: bullet hell, homing bolts, teleports.',
};

function controlsHtml() {
  const k = (a, b) => `<div><kbd>${a}</kbd><span>${b}</span></div>`;
  return `<div class="controls">
    ${k('WASD', 'Move')}${k('Mouse', 'Look · LMB fire · RMB hold to aim')}${k('F', 'Aim on / off (sniper: zoom 1 → zoom 2 → off)')}${k('Wheel while zoomed', 'Sniper zoom 1 / 2')}${k('Shift', 'Sprint')}${k('Space', 'Jump / double jump')}
    ${k('C', 'Slide (Ctrl works, but Ctrl+W closes the tab!)')}${k('Alt / V', 'Dash')}${k('R', 'Reload')}${k('1-4 / Wheel', 'Switch gun')}
    ${k('G', 'Pick up gun · open Weapon Box')}${k('H', 'Use medkit')}${k('Q E Z X T', 'Spells (unlock with Magic XP)')}
    ${k('Tab (hold)', 'Skills')}${k('B', 'Shop (between waves)')}${k('I', 'Your guns')}${k('5', 'Stats & powers')}${k('Enter', 'Ready / skip break')}${k('`', 'Debug panel')}${k('M', 'Mute')}${k('P', 'God mode (health stays at 99)')}
  </div>`;
}
