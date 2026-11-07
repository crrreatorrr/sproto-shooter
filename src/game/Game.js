// Wires state + fixed-timestep loop + input + renderer + audio + UI + debug panel. PLAN §1.3
import { createGameState } from '../sim/state.js';
import { simulate, DT } from '../sim/simulate.js';
import { createEventBus } from '../core/eventBus.js';
import { createInput } from '../input/input.js';
import { createRenderer } from '../render/renderer.js';
import { createAudio } from '../audio/sfx.js';
import { createUI } from '../ui/ui.js';
import { ENEMIES, BOSSES } from '../data/enemies.js';
import { GUN_TYPES, QUALITIES, ELEMENTS, WACKY } from '../data/guns.js';
import { SKILL_IDS } from '../data/skills.js';
import { MAX_TIER } from '../data/waves.js';
import { createPerfCounters } from '../render/debug/perfCounters.js';
import { createStatsOverlay } from '../render/debug/StatsOverlay.js';

const MAX_FRAME = 0.25, MAX_TICKS = 5;

export class Game {
  constructor({ seed, mode = 'title', tier = 1, debug = false, stats = false }) {
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
    this.screen = /** @type {HTMLElement} */ (app.querySelector('#screen'));

    this.input.setLook(this.state.players[this.state.localPlayerId].yaw, 0);
    this.wireFeel();
    this.wireInput();
    this.buildDebug(debug);

    // initial sandbox content so the title screen has something going on behind it
    this.queue({ type: 'startMode', mode: 'sandbox', tier: 1 });
    this.queue({ type: 'debug', op: 'spawnDummies' });
    if (mode === 'waves') this.start('waves', tier);
    else if (mode === 'sandbox') this.start('sandbox', tier);
    else this.showScreen('title');

    this.last = performance.now();
    this.acc = 0;
    requestAnimationFrame((t) => this.frame(t));
    /** @type {any} */ (window).__game = this; // for debugging in devtools
    this.perfCounters = createPerfCounters();
    this.statsOverlay = createStatsOverlay(app);
    this.statsOn = !!stats;
    this.statsOverlay.setVisible(this.statsOn);
    const api = {
      game: this,
      perf: (/** @type {number} */ seconds = 5) => this.samplePerf(seconds),
    };
    /** @type {any} */ (window).__sproto = api;
  }

  samplePerf(seconds = 5) {
    const now = performance.now();
    const timing = this.perfCounters.report(seconds, now);
    const counts = this.renderer.counts();
    const mem = /** @type {any} */ (performance).memory;
    return {
      ...timing,
      drawCalls: counts.drawCalls,
      triangles: counts.triangles,
      programs: counts.programs,
      textures: counts.textures,
      geometries: counts.geometries,
      heapMB: mem ? mem.usedJSHeapSize / 1048576 : null,
    };
  }

  toggleStats() {
    this.statsOn = !this.statsOn;
    this.statsOverlay.setVisible(this.statsOn);
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
      if (e.code === 'F3') { e.preventDefault(); this.toggleStats(); }
      if (e.code === 'KeyM') this.audio.toggleMute();
      if (e.code === 'Enter' && this.state.wave && this.state.wave.phase === 'intermission' && !this.ui.menuOpen) this._skip = true;
    });
  }

  start(mode, tier = 1) {
    this.audio.ensure();
    this.queue({ type: 'startMode', mode, tier });
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
        <p class="tag">A wacky loot shooter. Blast blobs, grab guns, craft better ones, beat the bosses.</p>
        <div class="menu">
          <button class="btn big" data-go="waves">▶ Wave Mode <small>3 waves + bosses</small></button>
          <button class="btn big alt" data-go="sandbox">🧪 Sandbox <small>debug spawn everything</small></button>
          <div class="tier">Tier <select id="tier-sel">${Array.from({ length: MAX_TIER }, (_, i) => `<option ${i + 1 === s.tier ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>
        </div>
        ${controlsHtml()}</div>`;
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
    this.screen.onclick = (e) => {
      const b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-go]'));
      if (!b) return;
      const go = b.dataset.go;
      if (go === 'continue') { this.hideScreen(); this.paused = false; this.input.lock(); return; }
      const tierSel = /** @type {HTMLSelectElement | null} */ (this.screen.querySelector('#tier-sel'));
      const tier = b.dataset.tier ? +b.dataset.tier : +(tierSel?.value || s.tier);
      this.start(go, tier);
    };
  }
  hideScreen() { this.screen.hidden = true; this.screen.innerHTML = ''; }
  showPause() {
    if (!this.screen.hidden) return;
    this.paused = true;
    this.screen.innerHTML = `<div class="pause"><h1>PAUSED</h1><button class="btn big" data-p="resume">Resume</button>
      <button class="btn" data-p="title">Main menu</button>
      <label>Mouse sensitivity <input id="sens" type="range" min="0.3" max="3" step="0.05" value="${this.settings.sensitivity}"></label>
      <label><input id="hs" type="checkbox" ${this.settings.hitstop ? 'checked' : ''}> Hitstop on big hits</label>
      <label>Screen shake <input id="shk" type="range" min="0" max="1.5" step="0.1" value="${this.settings.shake}"></label>
      ${controlsHtml()}</div>`;
    this.screen.hidden = false;
    this.screen.onclick = (e) => {
      const b = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-p]'));
      if (!b) return;
      if (b.dataset.p === 'resume') { this.hideScreen(); this.input.lock(); }
      else this.showScreen('title');
    };
    this.screen.oninput = (e) => {
      const t = /** @type {HTMLInputElement} */ (e.target);
      if (t.id === 'sens') { this.settings.sensitivity = +t.value; this.input.sensitivity = 0.0022 * this.settings.sensitivity; }
      if (t.id === 'hs') this.settings.hitstop = t.checked;
      if (t.id === 'shk') this.settings.shake = +t.value;
    };
  }
  hidePause() { if (this.screen.querySelector('.pause')) this.hideScreen(); }

  // ---------- debug panel ----------
  // lil-gui is a separate async chunk so the entry bundle stays inside the gzip budget.
  buildDebug(open) {
    this.debugOpen = !!open;
    import('lil-gui').then(({ default: GUI }) => this.mountDebug(GUI));
  }
  mountDebug(GUI) {
    if (this.gui) return;
    const open = this.debugOpen;
    const gui = new GUI({ title: 'Sproto Debug [`]', width: 300 });
    this.gui = gui;
    const d = { enemy: 'grunt', count: 1, elite: false, tier: 1, boss: 'megaSproto', gunType: 'random', quality: 'random', element: 'random', wacky: 'random',
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
    pl.add(d, 'god').name('God mode').onChange((v) => q('setTuning', { key: 'godMode', value: v }));
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
    gui.domElement.style.zIndex = 50;
  }
  toggleDebug() {
    this.debugOpen = !this.debugOpen;
    if (!this.gui) return;
    if (this.debugOpen) {
      const g = this.state.players[this.state.localPlayerId].guns[this.state.players[this.state.localPlayerId].activeSlot];
      if (g) { for (const k of Object.keys(this.gunStatProxy)) this.gunStatProxy[k] = g.stats[k]; this.gunStatCtrls.forEach((c) => c.updateDisplay()); }
      this.gui.show(); this.input.unlock();
    } else { this.gui.hide(); if (this.screen.hidden && !this.ui.menuOpen) this.input.lock(); }
  }

  // ---------- loop ----------
  frame(now) {
    const frameMs = now - this.last;
    let ft = Math.min(frameMs / 1000, MAX_FRAME);
    this.last = now;
    if (this.hitstopMs > 0) { this.hitstopMs -= ft * 1000; ft = 0; }
    // Shop/crafting menus and the debug panel do NOT pause. The pause and end screens do. The title runs a demo behind it.
    const scr = this.screen.hidden ? null : this.screen.querySelector('.title') ? 'title' : 'other';
    const titleUp = scr === 'title';
    if (scr === null || titleUp) this.acc += ft * this.timeScale;
    const sim0 = performance.now();
    let n = 0;
    while (this.acc >= DT && n < MAX_TICKS) {
      const cmd = this.input.buildCommand(this.state.tick);
      if (this._skip) { cmd.pressed.skip = true; this._skip = false; }
      if (titleUp) { cmd.held = { fire: false, zoom: false, sprint: false }; cmd.moveX = cmd.moveZ = 0; cmd.pressed = {}; cmd.yaw = this.state.time * 0.15; cmd.pitch = -0.05; this.input.setLook(cmd.yaw, cmd.pitch); }
      simulate(this.state, { [this.state.localPlayerId]: cmd }, DT);
      this.bus.emitAll(this.state.events);
      this.acc -= DT; n++;
    }
    if (n === MAX_TICKS) this.acc = 0;
    const simMs = performance.now() - sim0;
    const alpha = this.acc / DT;
    const p = this.state.players[this.state.localPlayerId];
    const g = p.guns[p.activeSlot];
    this.input.zoomSensitivity = p.zooming && g ? g.stats.zoomFov / 90 : 1;
    const ren0 = performance.now();
    this.renderer.render(this.state, alpha, this.input.liveLook(), { shake: this.settings.shake });
    const renderCpuMs = performance.now() - ren0;
    const hud0 = performance.now();
    this.ui.update(this.state);
    const hudMs = performance.now() - hud0;
    this.perfCounters.push({
      frameMs, simMs, renderCpuMs, hudMs, ticks: n, gpuMs: this.renderer.takeGpuMs(),
    }, now);
    if (this.statsOn) this.drawStats(now);
    requestAnimationFrame((t) => this.frame(t));
  }

  drawStats(now) {
    const windowed = this.perfCounters.report(2, now);
    const counts = this.renderer.counts();
    const mem = /** @type {any} */ (performance).memory;
    const gpu = this.renderer.takeGpuMs();
    const alive = this.state.enemies.reduce((n, e) => n + (e.dead ? 0 : 1), 0);
    this.statsOverlay.draw({
      fps: windowed.avgFps,
      p95: windowed.p95Ms,
      frameMs: windowed.avgMs,
      simMs: windowed.simAvgMs,
      renderMs: windowed.renderAvgMs,
      hudMs: windowed.frames ? this.perfCounters.tail(1)[0].hudMs : 0,
      gpu: gpu == null ? 'n/a' : gpu.toFixed(2),
      calls: counts.drawCalls,
      tris: counts.triangles,
      programs: counts.programs,
      geometries: counts.geometries,
      textures: counts.textures,
      renderScale: this.renderer.renderScale(),
      enemies: alive,
      projectiles: this.state.projectiles.length,
      particles: this.renderer.liveFx(),
      pending: this.renderer.pendingDownloads(),
      heap: mem ? (mem.usedJSHeapSize / 1048576).toFixed(1) : 'n/a',
      // Manifest-based estimate arrives with the asset pipeline (plan B M6).
      gpuMB: 'n/a',
      graph: this.perfCounters.tail(120),
    });
  }
}

function controlsHtml() {
  const k = (a, b) => `<div><kbd>${a}</kbd><span>${b}</span></div>`;
  return `<div class="controls">
    ${k('WASD', 'Move')}${k('Mouse', 'Aim · LMB fire · RMB zoom')}${k('Shift', 'Sprint')}${k('Space', 'Jump / double jump')}
    ${k('C', 'Slide (Ctrl works, but Ctrl+W closes the tab!)')}${k('Alt / V', 'Dash')}${k('R', 'Reload')}${k('1-4 / Wheel', 'Switch gun')}
    ${k('G', 'Pick up gun · open Weapon Box')}${k('H', 'Use medkit')}${k('Q E Z X F', 'Spells (unlock with Magic XP)')}
    ${k('Tab (hold)', 'Skills')}${k('B', 'Shop (between waves)')}${k('I', 'Your guns')}${k('Enter', 'Ready / skip break')}${k('`', 'Debug panel')}${k('F3', 'Stats')}${k('M', 'Mute')}
  </div>`;
}
