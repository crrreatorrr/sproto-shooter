// DOM UI: HUD, crosshair, damage numbers, banners, loot card, skills, shop, boss bar, screens.
// UI never writes game state; it queues actions via input.queueAction().
import { SKILLS, SKILL_IDS, PERKS, PERKS_BY_ID, SPELLS, SPELL_IDS, xpToNext } from '../data/skills.js';
import { gunRange, hasInfiniteReserve, QUALITIES_BY_ID, ELEMENTS_BY_ID, GUN_TYPES_BY_ID, MANUFACTURERS_BY_ID, PARTS_BY_ID, SLOTS, WACKY_BY_ID, LEGENDARY_SLOT, slotUsable } from '../data/guns.js';
import { SHOP } from '../data/shop.js';
import { WAVES, tierWave } from '../data/waves.js';
import { BOSSES } from '../data/enemies.js';
import { compareGuns, sellValue, dpsOf } from '../sim/guns.js';
import { PAD_BINDINGS } from '../input/padConfig.js';
import { padGlyph } from '../input/gamepad.js';
import { BIND, keyLabel } from '../input/input.js';
import { TUNING } from '../data/tuning.js';
import { bossLabel } from './bossLabel.js';
import { describePickup, pickupLine } from './pickupText.js';
import { CAMPAIGN_NOTICE_EVENTS, campaignNotice, damageArcAngle, firstRunTip } from './hudText.js';

/** Can a locked spell still be unlocked in the mode being played? Campaign: shrines. Wave Mode: wave clears. */
export const spellObtainable = (s) => s.mode === 'campaign' || s.mode === 'waves';
/** What to say when a locked spell is cast. */
export function spellLockText(s) {
  if (s.mode === 'campaign') return 'Locked: find its shrine in the campaign';
  if (s.mode === 'waves') return 'Locked: clear waves to unlock more spells';
  return 'Locked: not available in this mode';
}

// First-run tips already shown on this device. Presentation only; never read by the sim.
const TIPS_KEY = 'sproto-shooter-tips';
function loadTips() {
  try { return JSON.parse(localStorage.getItem(TIPS_KEY) || '{}') || {}; } catch { return {}; }
}
function saveTips(seen) {
  try { localStorage.setItem(TIPS_KEY, JSON.stringify(seen)); } catch { /* private mode: tips repeat next visit */ }
}

const $ = (sel, root = document) => root.querySelector(sel);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fmt = (n, d = 0) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString();
const SPELL_ICON = { gooBolt: '●', chainZap: 'ϟ', swarm: '✲', manaShield: '◈', meteor: '☄' };
const TYPE_ICON = { mg: '▬', shotgun: '▮', sniper: '━', bazooka: '◉', raygun: '⚡', bigbullets: '●', duckgun: '🦆' };
const PANEL_NAMES = { shop: 'Shop', inventory: 'Your guns', skills: 'Skills', stats: 'Stats & powers' };
// The shop key is O by default. B is the grapple, and N (twice) is the feedback window, so the shop
// has its own. Panel keys live in BIND (src/input/input.js) so Controller settings can move them.
const isKey = (action, code) => (BIND[action] || []).includes(code);

export function createUI(root, { input, bus, project, game }) {
  const st = { menu: null, tabHeld: false, statsOpen: false, lastKey: {} };

  root.innerHTML = `
  <div id="hud">
    <div id="topbar">
      <div id="wave-info"></div>
      <div id="currency"><span id="tickets"></span></div>
    </div>
    <div id="bossbars"></div>
    <div id="crosshair"><i></i><i></i><i></i><i></i></div>
    <div id="hitmarker"></div>
    <div id="vitals">
      <div class="bar stamina"><b></b><span></span></div>
      <div class="bar grapple"><b></b><span></span></div>
      <div class="bar shield"><b></b><span></span></div>
      <div class="bar health"><b></b><span></span></div>
      <div class="bar mana"><b></b><span></span></div>
      <div id="skills-mini"></div>
    </div>
    <div id="spells"></div>
    <div id="weapon">
      <div id="gun-name"></div>
      <div id="ammo"><b id="mag"></b><span id="reserve"></span></div>
      <div id="slots"></div>
      <div id="medkits"></div>
    </div>
    <div id="prompt"></div>
    <div id="lootcard"></div>
    <div id="banners"></div>
    <div id="toasts"></div>
    <div id="feed"></div>
    <div id="downed"><div class="big">DOWNED!</div><div>Get a kill for a <b>Second Wind</b></div><div id="downed-t"></div></div>
    <div id="vignette"></div>
    <div id="dmgdir"></div>
  </div>
  <div id="dmgnums"></div>
  <div id="panel" hidden></div>`;

  const loadEl = h('div');
  loadEl.id = 'load-state';
  loadEl.hidden = true;
  loadEl.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:30;background:rgba(8,6,16,.88);color:#ffe9a8;padding:8px 12px;border-radius:8px;font:700 14px/1.35 "Baloo 2",sans-serif;pointer-events:auto;max-width:340px';
  root.appendChild(loadEl);
  loadEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-retry]');
    if (!b || !game.renderer || !game.renderer.retryFailed) return;
    b.disabled = true;
    game.renderer.retryFailed();
  });

  const els = {
    wave: $('#wave-info', root), tickets: $('#tickets', root), bossbars: $('#bossbars', root),
    cross: $('#crosshair', root), hit: $('#hitmarker', root),
    shield: $('.bar.shield', root), health: $('.bar.health', root), mana: $('.bar.mana', root),
    stamina: $('.bar.stamina', root), grapple: $('.bar.grapple', root),
    skills: $('#skills-mini', root),
    spells: $('#spells', root), gunName: $('#gun-name', root), mag: $('#mag', root), reserve: $('#reserve', root), slots: $('#slots', root), medkits: $('#medkits', root),
    prompt: $('#prompt', root), loot: $('#lootcard', root), banners: $('#banners', root), toasts: $('#toasts', root), feed: $('#feed', root),
    downed: $('#downed', root), downedT: $('#downed-t', root), vignette: $('#vignette', root), dmgdir: $('#dmgdir', root),
    dmg: $('#dmgnums', root), panel: $('#panel', root), screen: document.getElementById('screen'),
  };

  // ---------- skill mini bars & spells (built once) ----------
  els.skills.innerHTML = SKILL_IDS.map((id) => `<div class="sk" data-sk="${id}" style="--c:${SKILLS[id].color}"><span class="ic">${SKILLS[id].icon}</span><span class="lv"></span><div class="xp"><b></b></div></div>`).join('');
  els.spells.innerHTML = SPELL_IDS.map((id) => `<div class="sp" data-sp="${id}"><div class="ico">${SPELL_ICON[id]}</div><div class="key">${keyLabel(id)}</div><div class="cd"></div><div class="lock">🔒</div></div>`).join('');

  // ---------- cache-based writes ----------
  const cache = new Map();
  const set = (el, key, val, fn) => { if (cache.get(key) !== val) { cache.set(key, val); fn(el, val); } };
  const text = (el, key, val) => set(el, key, val, (e, v) => { e.textContent = v; });
  const html = (el, key, val) => set(el, key, val, (e, v) => { e.innerHTML = v; });
  const bar = (el, key, frac, label) => {
    set(el, key + 'w', Math.round(frac * 1000), (e, v) => { e.querySelector('b').style.width = v / 10 + '%'; });
    text(el.querySelector('span'), key + 't', label);
  };

  // ---------- damage numbers (pooled) ----------
  const DN = 48;
  const nums = Array.from({ length: DN }, () => { const d = h('div', 'dn'); els.dmg.appendChild(d); return { el: d, life: 0, pos: null, vy: 0, vx: 0, y: 0 }; });
  let numIdx = 0;
  const merged = new Map(); // targetId -> num (merge pellets within a tick)
  bus.on('damage', (ev) => {
    if (ev.sourceKind === 'enemy' || ev.sourceKind === 'boss') return;
    const key = ev.targetId + ':' + ev.tick;
    if (ev.pellet && merged.has(key)) {
      const n = merged.get(key); n.amount += ev.amount; n.count++;
      n.el.textContent = n.amount + ' ×' + n.count;
      if (ev.isWeak) n.el.classList.add('weak');
      return;
    }
    const n = nums[numIdx++ % DN];
    n.life = 0.9; n.pos = { ...ev.pos }; n.vy = 1.6 + Math.random() * 0.6; n.vx = (Math.random() - 0.5) * 0.8; n.y = 0; n.amount = ev.amount; n.count = 1;
    n.el.className = 'dn' + (ev.isWeak ? ' weak' : '') + (ev.isCrit ? ' crit' : '') + (ev.zone === 'shield' ? ' tink' : '') + (ev.sourceKind === 'dot' ? ' dot' : '') + (ev.sourceKind === 'spell' ? ' spell' : '');
    n.el.style.color = ev.element !== 'none' ? ELEMENTS_BY_ID[ev.element].color : '';
    n.el.textContent = ev.zone === 'shield' ? 'TINK ' + ev.amount : ev.isWeak ? 'BONK! ' + ev.amount : ev.amount;
    merged.set(key, n);
    if (merged.size > 64) merged.clear();
    // hitmarker
    els.hit.className = ''; void els.hit.offsetWidth;
    els.hit.className = ev.killed ? 'kill' : ev.isWeak ? 'weak' : 'on';
  });
  function updateNums(dt) {
    for (const n of nums) {
      if (n.life <= 0) { if (n.el.style.opacity !== '0') n.el.style.opacity = '0'; continue; }
      n.life -= dt; n.y += n.vy * dt; n.vy -= 3 * dt;
      const s = project({ x: n.pos.x + n.vx * (0.9 - n.life), y: n.pos.y + n.y, z: n.pos.z });
      if (s.behind) { n.el.style.opacity = '0'; continue; }
      const pop = n.life > 0.75 ? 1 + (n.life - 0.75) * 3 : 1;
      n.el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%,-50%) scale(${pop})`;
      n.el.style.opacity = String(Math.min(1, n.life * 3));
    }
  }

  // ---------- banners / toasts / feed ----------
  function banner(textHtml, cls = '', dur = 2200) {
    const b = h('div', 'banner ' + cls, textHtml);
    els.banners.appendChild(b);
    setTimeout(() => b.classList.add('out'), dur);
    setTimeout(() => b.remove(), dur + 400);
  }
  function toast(msg, cls = '', dur = 1800) {
    const t = h('div', 'toast ' + cls, msg);
    els.toasts.appendChild(t);
    setTimeout(() => t.remove(), dur);
    while (els.toasts.children.length > 4) els.toasts.firstChild.remove();
  }
  function feed(msg, color) {
    const f = h('div', 'fi', msg);
    if (color) f.style.color = color;
    els.feed.prepend(f);
    setTimeout(() => f.remove(), 3000);
    while (els.feed.children.length > 6) els.feed.lastChild.remove();
  }

  bus.on('levelUp', (ev) => banner(`<small>LEVEL UP</small>${SKILLS[ev.skill].icon} ${SKILLS[ev.skill].name.toUpperCase()} LV ${ev.level}`, 'lvl'));
  bus.on('perkUnlocked', (ev) => { const pk = PERKS_BY_ID[ev.perkId]; setTimeout(() => banner(`<small>UNLOCKED</small>${pk.name}<em>${pk.desc}</em>`, 'perk', 2800), 600); });
  bus.on('wavePre', (ev) => banner(`<small>GET READY</small>WAVE ${ev.waveIndex + 1}<em>${WAVES[ev.waveIndex].name.split(': ')[1]}</em>`, 'wave', 2600));
  bus.on('waveStart', () => banner('FIGHT!', 'fight', 900));
  bus.on('waveCleared', (ev) => banner(`<small>WAVE ${ev.waveIndex + 1}</small>CLEARED! <em>+${ev.tickets} Run Cash</em>`, 'cleared'));
  bus.on('intermissionStart', () => {
    const msg = pad() ? `SHOP [${glyph(PAD_BINDINGS.panel)}]<em>READY is in the shop</em>` : `SHOP [${keyLabel('shop')}]<em>${keyLabel('skip').toUpperCase()} when ready</em>`;
    banner(`<small>INTERMISSION</small>${msg}`, 'inter', 3200);
  });
  bus.on('bossIntro', (ev) => banner(`<small>⚠ BOSS INCOMING ⚠</small>${ev.types.map((t) => BOSSES[t].name).join(' + ')}`, 'boss', 3000));
  bus.on('bossPhase', (ev) => banner(`${BOSSES[ev.bossType].name}<em>${ev.phaseIdx === 2 ? 'FINAL AUDIT!' : 'IS ANGRY NOW'}</em>`, 'boss', 1800));
  bus.on('bossDefeated', (ev) => banner(`<small>BOSS DEFEATED</small>${BOSSES[ev.bossType].name}`, 'cleared', 2600));
  bus.on('playerRevived', () => banner('SECOND WIND!', 'fight', 1200));
  bus.on('playerFell', () => banner('YOU FELL', 'fight', 1600));
  bus.on('unkillableTriggered', () => banner('UNKILLABLE SPROTO!', 'perk', 1500));
  bus.on('actionFailed', (ev) => toast(String(ev.reason || '').replace(/tickets/gi, 'Run Cash'), 'bad'));
  bus.on('noMana', () => toast('Not enough mana', 'bad'));
  bus.on('spellLocked', () => toast(spellLockText(game.state), 'bad'));
  bus.on('gunPickedUp', (ev) => { const g = game.findGun(ev.gunId); if (g) feed(`Picked up ${g.name}`, QUALITIES_BY_ID[g.quality].color); });
  bus.on('purchase', (ev) => toast(`Bought (−${ev.price} Run Cash)`, 'good'));
  bus.on('sold', (ev) => toast(`Sold for ${ev.value} Run Cash`, 'good'));
  bus.on('vend', (ev) => toast({ gun: '🎰 A gun drops out!', resources: `🎰 ${String(ev.detail || '').replace(/tickets/gi, 'Run Cash')}`, jackpot: '🎰 JACKPOT! +60 Run Cash', chicken: '🎰 ...a rubber chicken. Squeak.' }[ev.outcome], 'good'));
  // Pickups: one feed line each, naming what it was. The same thing picked up again within the line's
  // life adds to its total instead of stacking lines, so a pile of drops stays readable.
  const pickupLines = new Map();
  function notePickup(d) {
    let row = pickupLines.get(d.key);
    if (row && !row.el.isConnected) { clearTimeout(row.timer); row = null; }
    if (!row) {
      row = { el: h('div', 'fi', ''), amount: 0, timer: 0 };
      row.el.style.color = d.color;
      els.feed.prepend(row.el);
      pickupLines.set(d.key, row);
      while (els.feed.children.length > 6) els.feed.lastChild.remove();
    }
    row.amount += d.amount;
    row.el.textContent = pickupLine({ ...d, amount: row.amount });
    clearTimeout(row.timer);
    row.timer = setTimeout(() => { row.el.remove(); pickupLines.delete(d.key); }, 3000);
  }
  bus.on('pickup', (ev) => {
    if (ev.playerId != null && ev.playerId !== game.state.localPlayerId) return;
    const d = describePickup(ev);
    if (d) notePickup(d);
  });
  bus.on('secret', (ev) => { if (!ev.modifier) feed('Secret found!', '#ffd166'); }); // a modifier gets its own banner below
  // Campaign events: section cards, checkpoints, lockdowns, alarms, rewinds, secrets (src/ui/hudText.js).
  for (const type of CAMPAIGN_NOTICE_EVENTS) {
    bus.on(type, (ev) => {
      let src = ev;
      if (type === 'worldGun') { const s = game.state, g = s.players[s.localPlayerId].guns[ev.slot]; src = { ...ev, gunType: g && g.type }; }
      const n = campaignNotice(src);
      if (!n) return;
      if (n.via === 'banner') banner(n.html, n.cls, n.dur);
      else if (n.via === 'toast') toast(n.html, n.cls);
      else feed(n.html, '#ffd166');
    });
  }
  // First Wave Mode run on this device: one-line tips when they apply. Never in a rewarded run.
  const tips = loadTips();
  const tipFor = (ev) => {
    if (game.state.mode !== 'waves' || game.rewardedCampaign?.active) return;
    const t = firstRunTip(ev, tips, { pad: pad() });
    if (t) { toast(t, 'tip', 5200); saveTips(tips); }
  };
  for (const type of ['wavePre', 'waveStart', 'damage', 'intermissionStart', 'playerDowned']) bus.on(type, tipFor);
  bus.on('spellUnlocked', (ev) => { const sp = SPELLS[ev.spellId]; if (sp) setTimeout(() => banner(`<small>SPELL UNLOCKED</small>${SPELL_ICON[ev.spellId]} ${sp.name}<em>${spellKey(ev.spellId) ? `Quick cast: ${spellKey(ev.spellId)} · ` : ''}${pad() ? glyph(PAD_BINDINGS.spellSelect) : keyLabel('spellSelect')} picks the next spell</em>`, 'perk', 2800), 900); });
  bus.on('shrine', (ev) => { const sp = SPELLS[ev.spell]; feed(`Spell unlocked: ${sp && sp.name ? sp.name : 'new spell'}`, '#7cff4a'); });
  bus.on('kill', (ev) => { if (ev.elite) feed('Elite down!', '#ffd700'); });
  // Damage direction: a red arc on the side the hit came from. It follows the view while it fades.
  const arcs = Array.from({ length: 4 }, () => { const el = h('div', 'dmgarc'); els.dmgdir.appendChild(el); return { el, dir: 0, until: 0 }; });
  let arcIdx = 0;
  bus.on('playerDamaged', (ev) => {
    els.vignette.className = ''; void els.vignette.offsetWidth;
    els.vignette.className = ev.toHealth > 0 ? 'hurt' : 'shield';
    if (ev.dir == null || ev.sourceKind === 'self' || ev.sourceKind === 'world') return;
    if (ev.playerId != null && ev.playerId !== game.state.localPlayerId) return;
    const a = arcs[arcIdx++ % arcs.length];
    a.dir = ev.dir; a.until = performance.now() + 900;
    a.el.classList.remove('on'); void a.el.offsetWidth; a.el.classList.add('on');
  });
  function updateArcs(now, yaw) {
    for (const a of arcs) {
      if (a.until <= now) { if (a.until) { a.until = 0; a.el.classList.remove('on'); } continue; }
      a.el.style.transform = `rotate(${damageArcAngle(a.dir, yaw).toFixed(3)}rad)`;
    }
  }
  bus.on('victory', () => game.showScreen('victory'));
  bus.on('bossFightOver', (ev) => setTimeout(() => game.showScreen(ev.won ? 'bossWon' : 'bossLost'), ev.won ? 1800 : 1200));
  bus.on('defeat', () => game.showScreen('defeat'));

  // ---------- menus ----------
  function openMenu(name) {
    if (!['skills', 'stats'].includes(name) && game.rewardedCampaign?.unsupportedControl()) return;
    st.menu = name;
    input.setEnabled(false);
    input.unlock();
    renderPanel();
    els.panel.hidden = false;
  }
  /** Gamepad: the menus LB / RB step through. The shop only between waves (or in the sandbox). */
  function padMenus() { return [...(game.shopOpen() ? ['shop'] : []), 'inventory', 'skills', 'stats']; }
  /** Gamepad View button: the shop when it is open, otherwise your guns. */
  function openGearPanel() { openMenu(game.shopOpen() ? 'shop' : 'inventory'); }
  /** Gamepad LB / RB inside a menu: the next menu. */
  function cycleMenu(dir) {
    if (!st.menu) return;
    const list = padMenus();
    const i = list.indexOf(st.menu);
    st.menu = list[(Math.max(0, i) + dir + list.length) % list.length];
    renderPanel();
  }
  const pad = () => input.device === 'pad';
  const glyph = (b) => padGlyph(b, game.padStyle || 'xbox');
  /** Prompt label for an action on the device in use: '[E]' on keyboard, '[Hold X]' on a pad. */
  function keyTag(kbm, padButton, hold = false) {
    return `[${hold ? 'Hold ' : ''}${pad() ? glyph(padButton) : kbm}]`;
  }
  /** Key shown on a spell: the cast button on the selected one (LT / RMB), else its quick-cast key. */
  function spellKey(id) {
    if (id === input.spell) return pad() ? glyph(PAD_BINDINGS.castSpell) : 'RMB';
    return pad() ? (PAD_BINDINGS[id] ? glyph(PAD_BINDINGS[id]) : '') : keyLabel(id);
  }
  /** `relock` false: a screen is about to cover the game (Main menu), so the mouse stays free. */
  function closeMenu(relock = true) {
    st.menu = null;
    els.panel.hidden = true;
    els.panel.innerHTML = '';
    input.setEnabled(true);
    if (relock && els.screen.hidden) input.lock();
  }
  function act(a) {
    if (game.rewardedCampaign?.unsupportedControl()) return;
    input.queueAction(a); setTimeout(renderPanel, 60);
  }

  input.on('key', (e) => {
    if (e.repeat) return;
    if (game.ctl?.isOpen) return; // Controller settings is on top: its own keys
    if (isKey('skills', e.code)) { st.tabHeld = true; return; }
    if (!els.screen.hidden) return;
    if (isKey('stats', e.code) && !st.menu) { st.statsOpen = !st.statsOpen; return; }
    // B is the grapple and nothing else: it neither opens the shop nor raises a toast.
    if (isKey('shop', e.code) && !st.menu) {
      if (game.shopOpen()) openMenu('shop'); else if (game.state.mode === 'waves') toast('Shop opens between waves', 'bad');
    } else if (isKey('inventory', e.code) && !st.menu) openMenu('inventory');
    else if ((e.code === 'Escape' || isKey('shop', e.code) || isKey('inventory', e.code)) && st.menu) closeMenu();
  });
  input.on('keyup', (e) => { if (isKey('skills', e.code)) st.tabHeld = false; });

  els.panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    switch (a) {
      case 'close': closeMenu(); break;
      case 'buy': act({ type: 'buy', offerId: +b.dataset.v }); break;
      case 'sell': act({ type: 'sell', slot: +b.dataset.v }); break;
      case 'drop': act({ type: 'dropGun', slot: +b.dataset.v }); break;
      case 'vend': act({ type: 'vend' }); break;
      case 'rerollShop': act({ type: 'rerollShop' }); break;
      case 'upgrade': act({ type: 'buyUpgrade', id: b.dataset.v }); break;
      case 'supply': act({ type: 'buySupply', id: b.dataset.v }); break;
      case 'ready':
        if (!game.rewardedCampaign?.unsupportedControl()) { input.queueAction({ type: 'noop' }); game.skipIntermission(); closeMenu(); }
        break;
    }
  });

  function gunCardHtml(g, other, opts = {}) {
    if (!g) return '<div class="gcard empty">Empty slot</div>';
    const q = QUALITIES_BY_ID[g.quality];
    const el = ELEMENTS_BY_ID[g.element];
    const rows = compareGuns(g, other).map((r) => {
      const arrow = r.verdict === 'better' ? '<i class="up">▲</i>' : r.verdict === 'worse' ? '<i class="down">▼</i>' : '';
      let v = r.value;
      if (r.key === 'damage' && g.stats.pellets > 1) v = `${fmt(v, 1)}×${g.stats.pellets}`;
      else if (r.key === 'elementChance') v = fmt(v * 100) + '%';
      else if (r.key === 'reloadTime') v = fmt(v, 2) + 's';
      else if (r.key === 'spread') v = fmt(v, 2) + '°';
      else v = fmt(v, r.key === 'fireRate' || r.key === 'critMult' ? 2 : 1);
      return `<div class="row"><span>${r.label}</span><b>${v}${arrow}</b></div>`;
    }).join('');
    const parts = SLOTS.filter((s) => g.parts[s] !== 'stock').map((s) => PARTS_BY_ID[g.parts[s]].name).join(' · ');
    const wacky = g.wacky ? `<div class="wacky">★ ${WACKY_BY_ID[g.wacky].name}: ${WACKY_BY_ID[g.wacky].desc}</div>` : '';
    return `<div class="gcard" style="--q:${q.color}">
      <div class="gq">${q.name} ${GUN_TYPES_BY_ID[g.type].name} · Lv ${g.level}${g.arcane ? ' · ✦Arcane' : ''}</div>
      <div class="gn">${g.name}</div>
      <div class="gm">${MANUFACTURERS_BY_ID[g.manufacturer].name} — ${MANUFACTURERS_BY_ID[g.manufacturer].quirk}${g.element !== 'none' ? ` · <span style="color:${el.color}">${el.name}</span>` : ''}</div>
      <div class="dps">DPS ≈ <b>${fmt(dpsOf(g))}</b>${other ? ` <small>(yours ${fmt(dpsOf(other))})</small>` : ''}</div>
      ${rows}
      ${parts ? `<div class="parts">${parts}</div>` : ''}
      ${wacky}
      ${opts.footer || ''}
    </div>`;
  }

  function renderPanel() {
    if (!st.menu) return;
    const s = game.state, p = s.players[s.localPlayerId];
    let body = '';
    if (st.menu === 'shop') body = shopHtml(s, p);
    else if (st.menu === 'inventory') body = inventoryHtml(s, p);
    else if (st.menu === 'skills') body = skillsHtml(p);
    else if (st.menu === 'stats') body = statsHtml(s, p);
    let padTabs = '';
    if (pad()) {
      const names = padMenus().map((m) => PANEL_NAMES[m]);
      const on = PANEL_NAMES[st.menu];
      padTabs = `<div class="padtabs"><kbd>${glyph('lb')}</kbd>${names.map((n) => `<span class="${n === on ? 'on' : ''}">${n}</span>`).join('')}<kbd>${glyph('rb')}</kbd></div>`;
    }
    // Every panel ends with the standard options: Main menu, Hub, Controller settings, Full screen.
    const std = game.stdMenuHtml ? game.stdMenuHtml({ main: true }) : '';
    els.panel.innerHTML = `<div class="pwrap">${padTabs}${body}${std}<button class="x" data-act="close" data-nav-back>✕ Close ${pad() ? `[${glyph('b')}]` : '[Esc]'}</button></div>`;
  }

  function resBar(p) {
    return `<div class="resbar"><span class="tk" title="Run Cash, not hub Tickets">Run Cash ${p.tickets}</span></div>`;
  }

  function shopHtml(s, p) {
    const offers = s.shop.offers.map((o) => `<div class="offer ${o.sold ? 'sold' : ''}">${gunCardHtml(o.gun, p.guns[p.activeSlot], { footer: o.sold ? '<div class="soldtag">SOLD</div>' : `<button class="btn" data-act="buy" data-v="${o.id}" ${p.tickets >= o.price ? '' : 'disabled'}>Buy ${o.price} Run Cash</button>` })}</div>`).join('');
    const up = s.shop.upgrades;
    const ups = SHOP.upgrades.map((u) => {
      const rank = u.id === 'slot4' ? (up.slot4 || p.unlockedSlots >= 4 ? 1 : 0) : up[u.id];
      const max = rank >= u.prices.length;
      return `<div class="mini"><b>${u.name}</b><span>${max ? 'MAX' : `Rank ${rank}/${u.prices.length}`}</span><button class="btn sm" data-act="upgrade" data-v="${u.id}" ${max || p.tickets < u.prices[rank] ? 'disabled' : ''}>${max ? '—' : u.prices[rank] + ' Run Cash'}</button></div>`;
    }).join('');
    const sups = SHOP.supplies.map((u) => `<div class="mini"><b>${u.name}</b><span></span><button class="btn sm" data-act="supply" data-v="${u.id}" ${p.tickets < u.price ? 'disabled' : ''}>${u.price} Run Cash</button></div>`).join('');
    const sells = p.guns.map((g, i) => g ? `<div class="mini" style="--q:${QUALITIES_BY_ID[g.quality].color}"><b>${i + 1}</b> ${g.name}<span></span><button class="btn sm" data-act="sell" data-v="${i}">Sell ${sellValue(g)} Run Cash</button></div>` : '').join('');
    const rerollPrice = SHOP.rerollBase + SHOP.rerollStep * s.shop.rerolls;
    const inter = s.wave && s.wave.phase === 'intermission';
    return `<h2>Run Cash Shop ${inter ? `<small>Next wave in ${Math.ceil(s.wave.intermissionT)}s</small>` : ''}</h2><p class="hint">Run Cash is this run's shop money. It is not hub Tickets and cannot be exchanged.</p>${resBar(p)}
      <div class="offers">${offers}</div>
      <div class="cols">
        <div><h3>Vending Machine</h3><div class="mini vend"><b>🎰 Mystery pull</b><span>gun, ammo, jackpot… or a chicken</span><button class="btn sm" data-act="vend" ${p.tickets < SHOP.vendPrice ? 'disabled' : ''}>${SHOP.vendPrice} Run Cash</button></div>
          <div class="mini"><b>Reroll offers</b><span></span><button class="btn sm" data-act="rerollShop" ${p.tickets < rerollPrice ? 'disabled' : ''}>${rerollPrice} Run Cash</button></div>
          <h3>Supplies</h3>${sups}</div>
        <div><h3>Upgrades</h3>${ups}</div>
        <div><h3>Sell guns</h3>${sells}</div>
      </div>
      ${inter ? `<button class="btn big" data-act="ready" data-nav-enter>READY! Start next wave ${pad() ? '' : `[${keyLabel('skip')}]`}</button>` : ''}`;
  }

  function inventoryHtml(s, p) {
    return `<h2>🎒 Your Guns</h2>${resBar(p)}<div class="offers">${p.guns.map((g, i) => slotUsable(p, i) ? `<div class="offer"><div class="slotno">${i === LEGENDARY_SLOT ? `★ Legendary slot [${keyLabel('slotLegendary')}]` : `Slot ${i + 1}`}${i === p.activeSlot ? ' · equipped' : ''}</div>${gunCardHtml(g, null, { footer: g ? `<button class="btn sm" data-act="drop" data-v="${i}">Drop</button>` : '' })}</div>` : `<div class="offer"><div class="gcard empty">🔒 Slot ${i + 1}<br><small>Buy in the shop</small></div></div>`).join('')}</div>`;
  }

  // ---------- skills overlay (Tab) ----------
  function skillsHtml(p) {
    return `<div class="skills-screen">${SKILL_IDS.map((id) => {
      const sk = p.skills[id], def = SKILLS[id];
      const need = sk.level >= 10 ? 1 : xpToNext(id, sk.level, game.state.mode);
      const perks = PERKS.filter((k) => k.skill === id).map((k) => `<div class="perk ${p.perks[k.id] ? 'on' : ''}"><b>Lv${k.level}</b> ${k.name}<small>${k.desc}</small></div>`).join('');
      const src = { health: 'Kill monsters, take damage, pick up healing, defeat Physical bosses', gunslinger: 'Gun kills, crits and weak spots, defeat Physical bosses' }[id];
      return `<div class="skc" style="--c:${def.color}"><div class="skh">${def.icon} ${def.name} <span>Lv ${sk.level}</span></div>
        <div class="xpb"><b style="width:${sk.level >= 10 ? 100 : (sk.xp / need) * 100}%"></b><span>${sk.level >= 10 ? 'MAX' : `${Math.floor(sk.xp)} / ${need} XP`}</span></div>
        <div class="src">XP from: ${src}</div>${perks}</div>`;
    }).join('')}</div><div class="hint">${st.menu === 'skills' ? (pad() ? `${glyph('lb')} / ${glyph('rb')} switch · ${glyph('b')} close` : 'Esc to close') : `Hold ${keyLabel('skills').toUpperCase()}`} · Skills level up just by doing things. No points to spend.</div>`;
  }

  // ---------- stats & powers overlay (5) ----------
  const ICON = Object.fromEntries(SKILL_IDS.map((id) => [id, SKILLS[id].icon]));
  function statsHtml(s, p) {
    const g = p.guns[p.activeSlot];
    const row = (k, v) => `<div class="srow"><span>${k}</span><b>${v}</b></div>`;
    const dr = Math.round(3 * (p.skills.health.level - 1));
    const ammo = Object.keys(p.ammoCap).map((t) => {
      const inf = s.tuning.infiniteAmmo || s.tuning.godMode || p.guns.some((x) => x && x.ammoType === t && hasInfiniteReserve(x));
      return row(`Ammo · ${t}`, inf ? '∞' : `${p.ammo[t]} / ${p.ammoCap[t]}`);
    }).join('');
    const gunRows = g ? row('Gun', `<span style="color:${QUALITIES_BY_ID[g.quality].color}">${g.name}</span>`) + row('Damage', g.stats.pellets > 1 ? `${Math.round(g.stats.damage)} × ${g.stats.pellets}` : Math.round(g.stats.damage))
      + row('Fire rate', `${g.stats.fireRate.toFixed(1)} /s`) + row('Magazine', `${g.ammoInMag} / ${g.stats.magSize}`) + row('Reload', `${g.stats.reloadTime.toFixed(1)} s`)
      + row('Range', g.type === 'bazooka' ? 'rocket' : g.type === 'bigbullets' ? 'heavy round' : g.type === 'duckgun' ? 'lobbed, explodes' : (() => { const r = gunRange(g); return r.max >= 150 ? 'whole arena' : `full to ${Math.round(r.full)} m · max ${Math.round(r.max)} m`; })())
      + row('Crit', `${Math.round(g.stats.critChance * 100)}% · ×${g.stats.critMult.toFixed(1)}`) : '';
    const stats = `<div class="skc" style="--c:#ffd166"><div class="skh">📊 Stats${s.tuning.godMode ? ' <span class="god">GOD MODE</span>' : ''}</div>
      ${row('Health', `${Math.ceil(p.hp)} / ${p.maxHp}`)}${row('Shield', `${Math.ceil(p.shield)} / ${p.maxShield}`)}${row('Mana', `${Math.floor(p.mana)} / ${p.maxMana}`)}
      ${row('Damage taken', dr ? `−${dr}%` : 'normal')}${row('Medkits', p.medkits)}${row('Run Cash', p.tickets)}
      ${SKILL_IDS.map((id) => row(`${ICON[id]} ${SKILLS[id].name}`, `Lv ${p.skills[id].level}`)).join('')}${gunRows}${ammo}</div>`;
    const spells = SPELL_IDS.map((id) => {
      const sp = SPELLS[id];
      const cost = id === 'meteor' ? p.maxMana : sp.mana;
      const cd = p.spells.cd[id];
      const earned = !!(p.spellUnlocks && p.spellUnlocks[id]) || (id === 'gooBolt' && s.mode !== 'campaign');
      const status = !p.perks[id] ? `<em class="lock">🔒 LOCKED · ${s.mode === 'waves' ? 'clear waves to unlock' : 'find it in the campaign'}</em>`
        : id === 'manaShield' && p.spells.manaShieldOn ? '<em class="ok">ON</em>'
        : cd > 0 ? `<em class="wait">Cooldown ${cd.toFixed(1)} s</em>`
        : p.mana < cost - 0.5 ? '<em class="wait">Not enough mana</em>' : '<em class="ok">READY</em>';
      const viaGod = p.perks[id] && !earned ? ' <em class="god">via god mode</em>' : '';
      return `<div class="power ${p.perks[id] ? '' : 'locked'}"><kbd>${spellKey(id) || '·'}</kbd><div><b>${SPELL_ICON[id]} ${sp.name}</b> ${status}${viaGod}
        <small>${id === 'meteor' ? 'all mana' : sp.mana + ' mana'}${id === 'manaShield' ? ' + drain' : ''} · ${sp.cd}s cooldown</small></div></div>`;
    }).join('');
    const perks = PERKS.filter((k) => !SPELLS[k.id]).map((k) => `<div class="power ${p.perks[k.id] ? '' : 'locked'}"><kbd>${ICON[k.skill]}</kbd><div><b>${k.name}</b> ${p.perks[k.id] ? '<em class="ok">ACTIVE</em>' : `<em class="lock">🔒 LOCKED · needs ${SKILLS[k.skill].name} Lv ${k.level} (you're Lv ${p.skills[k.skill].level})</em>`}<small>${k.desc}</small></div></div>`).join('');
    return `<div class="stats-screen">${stats}
      <div class="skc" style="--c:#9b6bff"><div class="skh">🔮 Spells</div>${spells}<div class="src">Goo Bolt is free outside the campaign. Wave Mode unlocks one more spell per cleared wave. Campaign spells come from shrines.</div></div>
      <div class="skc" style="--c:#4fd1c5"><div class="skh">✨ Perks</div>${perks}</div>
    </div><div class="hint">${st.menu === 'stats' ? (pad() ? `${glyph('b')} to close` : 'Esc to close') : `Press ${keyLabel('stats')} to close`} · the game keeps running</div>`;
  }

  // ---------- per-frame update ----------
  let lastT = performance.now();
  let tabEl = null, statsEl = null;
  function update(s) {
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    const p = s.players[s.localPlayerId];
    updateNums(dt);
    updateArcs(now, p.yaw);

    // vitals
    if (p.stamina != null) {
      const gLeft = p.grapple ? 1 : (p.grappleCd > 0 ? 1 - p.grappleCd / TUNING.grappleCd : 1);
      bar(els.stamina, 'sta', p.stamina, p.staminaLock ? 'STAMINA' : 'Sprint');
      bar(els.grapple, 'grp', Math.max(0, Math.min(1, gLeft)), p.grapple ? 'HOOK' : (p.grappleCd > 0 ? 'Grapple' : pad() ? 'Grapple ready' : `Grapple [${keyLabel('grapple')}]`));
      els.stamina.hidden = false;
      els.grapple.hidden = false;
    } else {
      els.stamina.hidden = true;
      els.grapple.hidden = true;
    }
    bar(els.shield, 'sh', p.maxShield ? p.shield / p.maxShield : 0, `${Math.ceil(p.shield)} / ${p.maxShield}`);
    bar(els.health, 'hp', p.hp / p.maxHp, `${Math.ceil(p.hp)} / ${p.maxHp}`);
    bar(els.mana, 'mp', p.mana / p.maxMana, `${Math.floor(p.mana)} / ${p.maxMana}${p.spells.manaShieldOn ? ' ◈' : ''}`);
    set(els.health, 'lowhp', p.hp / p.maxHp < 0.3, (e, v) => e.classList.toggle('low', v));
    for (const id of SKILL_IDS) {
      const sk = p.skills[id];
      const el = els.skills.querySelector(`[data-sk="${id}"]`);
      text(el.querySelector('.lv'), 'sklv' + id, 'Lv ' + sk.level);
      const fr = sk.level >= 10 ? 1 : Math.min(1, sk.xp / xpToNext(id, sk.level, s.mode));
      set(el, 'skxp' + id, Math.round(fr * 100), (e, v) => { e.querySelector('.xp b').style.width = v + '%'; });
    }
    // spells
    for (const id of SPELL_IDS) {
      const el = els.spells.querySelector(`[data-sp="${id}"]`);
      const unlocked = !!p.perks[id];
      const cd = p.spells.cd[id], max = SPELLS[id].cd;
      const cost = id === 'meteor' ? p.maxMana : SPELLS[id].mana;
      const state = !unlocked ? 'locked' : (id === 'manaShield' && p.spells.manaShieldOn) ? 'active' : cd > 0 ? 'cd' : p.mana < cost - 0.5 ? 'nomana' : 'ready';
      set(el, 'sps' + id, state + (id === input.spell ? ' sel' : ''), (e, v) => { e.className = 'sp ' + v; });
      // A slot this mode can never open is not shown at all (Boss Fight and the sandbox only ever have Goo Bolt).
      set(el, 'sph' + id, !unlocked && !spellObtainable(s), (e, v) => { e.hidden = v; });
      text(el.querySelector('.key'), 'spk' + id, spellKey(id));
      set(el, 'spc' + id, Math.round((cd / max) * 100), (e, v) => { e.querySelector('.cd').style.height = v + '%'; });
    }
    // weapon
    const g = p.guns[p.activeSlot];
    if (g) {
      const q = QUALITIES_BY_ID[g.quality];
      html(els.gunName, 'gn', `<span style="color:${q.color}">${g.name}</span>${g.element !== 'none' ? ` <i style="color:${ELEMENTS_BY_ID[g.element].color}">●</i>` : ''}`);
      text(els.mag, 'mag', p.reloadT > 0 ? `RELOAD ${p.reloadT.toFixed(1)}s` : String(g.ammoInMag));
      text(els.reserve, 'res', s.tuning.infiniteAmmo || s.tuning.godMode || hasInfiniteReserve(g) ? '/ ∞' : `/ ${p.ammo[g.ammoType]}`);
      set(els.mag, 'magLow', g.ammoInMag <= Math.max(1, g.stats.magSize * 0.2), (e, v) => e.classList.toggle('low', v));
    }
    const slotsKey = p.guns.map((x) => (x ? x.id + x.quality : '-')).join(',') + p.activeSlot + p.unlockedSlots;
    html(els.slots, 'slots', p.guns.map((x, i) => {
      const leg = i === LEGENDARY_SLOT, locked = !slotUsable(p, i);
      return `<div class="slot ${i === p.activeSlot ? 'on' : ''} ${locked ? 'lockd' : ''} ${leg ? 'legslot' : ''}" style="--q:${x ? QUALITIES_BY_ID[x.quality].color : leg ? '#ff9f1a' : '#555'}"><b>${leg ? 'L' : i + 1}</b>${x ? TYPE_ICON[x.type] + ' ' + GUN_TYPES_BY_ID[x.type].short : locked ? '🔒' : leg ? '★' : '—'}</div>`;
    }).join(''));
    void slotsKey;
    text(els.medkits, 'mk', p.medkits ? `✚ ×${p.medkits} ${keyTag(keyLabel('medkit'), PAD_BINDINGS.medkit)}` : '');

    // top bar
    text(els.tickets, 'tk', `Run Cash ${p.tickets}`);
    let wave = '';
    if (s.mode === 'campaign' && s.level) {
      const lv = s.level;
      const fuel = lv.fuel > 0 || (s.players[s.localPlayerId].jetpack) ? ` · fuel ${Math.ceil(lv.fuel)}` : '';
      wave = `<b>${lv.name}</b> · ${lv.objective || ''}${fuel}`;
    } else if (s.mode === 'boss' && s.bossFight) wave = `<b>BOSS FIGHT</b> · ${BOSSES[s.bossFight.type].name} · Tier ${s.tier}`;
    else if (s.mode === 'sandbox') wave = `<b>${s.testMode ? 'TEST RANGE' : 'SANDBOX'}</b> · Tier ${s.tier} <small>${pad() ? `[${glyph(PAD_BINDINGS.panel)}] shop` : `[\`] debug · [${keyLabel('shop')}] shop`}</small>`;
    else if (s.wave) {
      const w = s.wave;
      const left = s.enemies.filter((e) => !e.dead && e.type !== 'dummy').length + w.spawnQueue.length;
      const remainingGroups = tierWave(w.index, s.tier).groups.slice(w.groupIdx).reduce((n, gg) => n + gg.spawns.reduce((m, x) => m + x.count, 0), 0);
      const phaseTxt = { pre: 'Get ready…', combat: `Enemies left: ${left + remainingGroups}`, bossIntro: 'BOSS INCOMING', boss: 'BOSS FIGHT', cleared: 'Cleared!', intermission: `Intermission ${Math.ceil(w.intermissionT)}s · ${pad() ? `[${glyph(PAD_BINDINGS.panel)}] Shop · Ready in the shop` : `[${keyLabel('shop')}] Shop · [${keyLabel('skip')}] Ready`}`, victory: 'VICTORY', defeat: 'DEFEAT' }[w.phase];
      wave = `<b>WAVE ${w.index + 1}/3</b> · Tier ${s.tier} · ${phaseTxt}`;
    }
    if (s.tuning.godMode) wave += ' · <b class="god">GOD MODE</b>';
    const report = game.renderer && game.renderer.loadReport ? game.renderer.loadReport() : null;
    const pend = report ? report.pending : (game.renderer && game.renderer.pendingDownloads ? game.renderer.pendingDownloads() : 0);
    const failed = report ? report.failed.length : 0;
    if (failed > 0) wave += ` <small class="loading">could not load ${failed}</small>`;
    else if (pend > 0) wave += ` <small class="loading">⏳ loading ${pend}</small>`;
    html(els.wave, 'wave', wave);
    if (report && (failed > 0 || pend > 0)) {
      const mb = (report.bytesDone / 1048576).toFixed(1);
      const text = failed > 0
        ? `${failed} file${failed === 1 ? '' : 's'} failed (${mb} MB in). Placeholders are on screen. <button type="button" data-retry="1">Retry</button>`
        : `Loading ${pend} · ${mb} MB`;
      if (loadEl.dataset.k !== text) { loadEl.dataset.k = text; loadEl.innerHTML = text; }
      loadEl.hidden = false;
    } else if (!loadEl.hidden) {
      loadEl.hidden = true;
      loadEl.dataset.k = '';
    }

    // boss bars
    const bossList = s.enemies.filter((e) => e.boss && !e.dead);
    const bk = bossList.map((b) => `${b.id}:${Math.round((b.hp / b.maxHp) * 200)}:${b.boss.phaseIdx}:${b.boss.invuln}`).join('|');
    html(els.bossbars, 'boss', bossList.map((b) => {
      const def = BOSSES[b.type];
      const pips = def.phases.map((ph, i) => `<i class="${i <= b.boss.phaseIdx ? 'on' : ''}" style="left:${ph.hpBelow * 100}%"></i>`).slice(1).join('');
      return `<div class="bossbar ${def.tag}"><div class="bn">${bossLabel(b, def)} <span class="tag">${def.tag === 'magic' ? '🔮 MAGIC' : '💪 PHYSICAL'}</span></div><div class="bb"><b style="width:${(b.hp / b.maxHp) * 100}%"></b>${pips}${b.boss.invuln ? '<em>INVULNERABLE</em>' : ''}</div></div>`;
    }).join(''));

    // crosshair spread
    if (g) {
      const sp = (p.zooming ? g.stats.adsSpread : g.stats.spread) * (p.onGround ? (Math.hypot(p.vel.x, p.vel.z) > 1 ? 1.4 : 1) : 2) * Math.max(0.4, 1 - 0.04 * (p.skills.gunslinger.level - 1));
      const px = Math.round(6 + sp * 7 + p.recoil.heat * 6);
      set(els.cross, 'xh', px, (e, v) => e.style.setProperty('--gap', v + 'px'));
    }
    // no scope overlay: the zoomed view fills the screen with the gun and the white crosshair still showing
    set(els.cross, 'xhv', p.dead, (e, v) => e.classList.toggle('hidden', v));

    // downed
    set(els.downed, 'down', p.downed, (e, v) => e.classList.toggle('on', v));
    if (p.downed) text(els.downedT, 'downt', p.downedT.toFixed(1) + 's');

    // prompt + loot card
    let prompt = '';
    const nearGun = p.nearGunPickupId ? s.pickups.find((k) => k.id === p.nearGunPickupId) : null;
    if (p.dead) prompt = s.mode === 'sandbox' ? `Respawning in ${Math.max(0, p.respawnT).toFixed(1)}s…` : '';
    else if (nearGun) {
      const leg = nearGun.gun && nearGun.gun.quality === 'legendary';
      const full = p.guns.slice(0, p.unlockedSlots).every(Boolean);
      prompt = `<b>${keyTag(keyLabel('reload'), PAD_BINDINGS.interact, true)}</b> Pick up${leg ? (p.guns[LEGENDARY_SLOT] && full ? ' (swaps your legendary)' : ` → legendary slot${pad() ? '' : ` [${keyLabel('slotLegendary')}]`}`) : full ? ' (swaps with equipped)' : ''}`;
    }
    else if (s.wave && s.wave.phase === 'intermission') prompt = pad() ? `<b>${keyTag(keyLabel('shop'), PAD_BINDINGS.panel)}</b> Shop · Ready` : `<b>[${keyLabel('shop')}]</b> Shop · <b>[${keyLabel('skip')}]</b> Ready`;
    html(els.prompt, 'prompt', prompt);
    const hold = nearGun && !p.dead ? input.holdProgress : 0;
    set(els.prompt, 'hold', Math.round(hold * 100), (e, v) => e.style.setProperty('--hold', v + '%'));
    html(els.loot, 'loot', nearGun ? gunCardHtml(nearGun.gun, g) : '');
    set(els.loot, 'lootv', !!nearGun, (e, v) => e.classList.toggle('on', v));

    // tab overlay
    if (st.tabHeld && !st.menu && els.screen.hidden) {
      if (!tabEl) { tabEl = h('div', 'tab-overlay'); root.appendChild(tabEl); }
      const key = SKILL_IDS.map((id) => p.skills[id].level + ':' + Math.floor(p.skills[id].xp)).join(',');
      if (tabEl.dataset.k !== key) { tabEl.dataset.k = key; tabEl.innerHTML = skillsHtml(p); }
    } else if (tabEl) { tabEl.remove(); tabEl = null; }

    // stats & powers overlay (toggle with 5); redrawn a few times a second for cooldowns
    if (st.statsOpen && !st.tabHeld && !st.menu && els.screen.hidden) {
      if (!statsEl) { statsEl = h('div', 'tab-overlay stats-overlay'); root.appendChild(statsEl); statsEl.dataset.t = 0; }
      if (now - statsEl.dataset.t > 200) { statsEl.dataset.t = now; statsEl.innerHTML = statsHtml(s, p); }
    } else if (statsEl) { statsEl.remove(); statsEl = null; }

    // live refresh of open panel (cooldowns, intermission timer)
    if (st.menu && (now - (st.lastPanel || 0) > 400)) { st.lastPanel = now; const y = els.panel.querySelector('.pwrap')?.scrollTop; renderPanel(); const w = els.panel.querySelector('.pwrap'); if (w && y) w.scrollTop = y; }
  }

  function setPvp(on) {
    const hud = $('#hud', root);
    if (hud) hud.style.visibility = on ? 'hidden' : '';
  }

  /** The 10s forfeit rule, over the arena. The campaign HUD stays hidden while it is up. */
  function setWagerLive(on, text) {
    let el = root.querySelector('[data-wager-live]');
    if (!on) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = h('div', 'wager-live');
      el.dataset.wagerLive = '1';
      root.appendChild(el);
    }
    el.textContent = text || '';
  }

  return {
    update, closeMenu, openMenu, openGearPanel, cycleMenu, banner, toast, setPvp, setWagerLive,
    get menuOpen() { return !!st.menu; }, get menu() { return st.menu; }, els,
  };
}
