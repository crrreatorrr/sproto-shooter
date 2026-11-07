// DOM UI: HUD, crosshair, damage numbers, banners, loot card, skills, crafting, shop, boss bar, screens.
// UI never writes game state; it queues actions via input.queueAction().
import { SKILLS, SKILL_IDS, PERKS, PERKS_BY_ID, SPELLS, SPELL_IDS, xpToNext } from '../data/skills.js';
import { QUALITIES_BY_ID, ELEMENTS_BY_ID, GUN_TYPES_BY_ID, MANUFACTURERS_BY_ID, PARTS_BY_ID, PARTS_BY_SLOT, SLOTS, WACKY_BY_ID, ELEMENTS } from '../data/guns.js';
import { RESOURCES } from '../data/drops.js';
import { GUN_RECIPES, ITEM_RECIPES, ARCANE_COST, REROLL_COST, SALVAGE_LEVEL, REROLL_LEVEL } from '../data/recipes.js';
import { SHOP } from '../data/shop.js';
import { WAVES } from '../data/waves.js';
import { BOSSES } from '../data/enemies.js';
import { compareGuns, sellValue, salvageYield, dpsOf, REROLLABLE } from '../sim/guns.js';
import { canAfford, mergeCost, recipeUnlocked, nearBox } from '../sim/economy.js';

const $ = (sel, root = document) => root.querySelector(sel);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fmt = (n, d = 0) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString();
const RES_BY_ID = Object.fromEntries(RESOURCES.map((r) => [r.id, r]));
const SPELL_ICON = { gooBolt: '●', chainZap: 'ϟ', swarm: '✲', manaShield: '◈', meteor: '☄' };
const TYPE_ICON = { mg: '▬', shotgun: '▮', sniper: '━', bazooka: '◉' };

export function createUI(root, { input, bus, project, game }) {
  const st = { menu: null, tabHeld: false, craftTab: 'guns', craftType: 'mg', choice: { element: null, part: null, arcane: false }, lastKey: {}, rerollSlot: 0 };

  root.innerHTML = `
  <div id="hud">
    <div id="topbar">
      <div id="wave-info"></div>
      <div id="currency"><span id="tickets"></span><span id="resources"></span></div>
    </div>
    <div id="bossbars"></div>
    <div id="crosshair"><i></i><i></i><i></i><i></i></div>
    <div id="hitmarker"></div>
    <div id="vitals">
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
    <div id="scope"></div>
  </div>
  <div id="dmgnums"></div>
  <div id="panel" hidden></div>`;

  const els = {
    wave: $('#wave-info', root), tickets: $('#tickets', root), resources: $('#resources', root), bossbars: $('#bossbars', root),
    cross: $('#crosshair', root), hit: $('#hitmarker', root),
    shield: $('.bar.shield', root), health: $('.bar.health', root), mana: $('.bar.mana', root), skills: $('#skills-mini', root),
    spells: $('#spells', root), gunName: $('#gun-name', root), mag: $('#mag', root), reserve: $('#reserve', root), slots: $('#slots', root), medkits: $('#medkits', root),
    prompt: $('#prompt', root), loot: $('#lootcard', root), banners: $('#banners', root), toasts: $('#toasts', root), feed: $('#feed', root),
    downed: $('#downed', root), downedT: $('#downed-t', root), vignette: $('#vignette', root), scope: $('#scope', root),
    dmg: $('#dmgnums', root), panel: $('#panel', root), screen: document.getElementById('screen'),
  };

  // ---------- skill mini bars & spells (built once) ----------
  els.skills.innerHTML = SKILL_IDS.map((id) => `<div class="sk" data-sk="${id}" style="--c:${SKILLS[id].color}"><span class="ic">${SKILLS[id].icon}</span><span class="lv"></span><div class="xp"><b></b></div></div>`).join('');
  els.spells.innerHTML = SPELL_IDS.map((id) => `<div class="sp" data-sp="${id}"><div class="ico">${SPELL_ICON[id]}</div><div class="key">${SPELLS[id].key}</div><div class="cd"></div><div class="lock">🔒</div></div>`).join('');

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
  function toast(msg, cls = '') {
    const t = h('div', 'toast ' + cls, msg);
    els.toasts.appendChild(t);
    setTimeout(() => t.remove(), 1800);
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
  bus.on('waveCleared', (ev) => banner(`<small>WAVE ${ev.waveIndex + 1}</small>CLEARED! <em>+${ev.tickets} 🎟</em>`, 'cleared'));
  bus.on('intermissionStart', () => { banner('<small>INTERMISSION</small>SHOP [B] · CRAFT AT WEAPON BOXES<em>ENTER when ready</em>', 'inter', 3200); });
  bus.on('bossIntro', (ev) => banner(`<small>⚠ BOSS INCOMING ⚠</small>${ev.types.map((t) => BOSSES[t].name).join(' + ')}`, 'boss', 3000));
  bus.on('bossPhase', (ev) => banner(`${BOSSES[ev.bossType].name}<em>${ev.phaseIdx === 2 ? 'FINAL AUDIT!' : 'IS ANGRY NOW'}</em>`, 'boss', 1800));
  bus.on('bossDefeated', (ev) => banner(`<small>BOSS DEFEATED</small>${BOSSES[ev.bossType].name}`, 'cleared', 2600));
  bus.on('playerRevived', () => banner('SECOND WIND!', 'fight', 1200));
  bus.on('unkillableTriggered', () => banner('UNKILLABLE SPROTO!', 'perk', 1500));
  bus.on('actionFailed', (ev) => toast(ev.reason, 'bad'));
  bus.on('noMana', () => toast('Not enough mana', 'bad'));
  bus.on('spellLocked', (ev) => { const pk = PERKS.find((x) => x.id === ev.spellId); toast(`Locked: Magic Lv ${pk ? pk.level : '?'}`, 'bad'); });
  bus.on('gunPickedUp', (ev) => { const g = game.findGun(ev.gunId); if (g) feed(`Picked up ${g.name}`, QUALITIES_BY_ID[g.quality].color); });
  bus.on('craftComplete', (ev) => toast(ev.category === 'gun' ? 'Gun crafted! Pick it up at the box' : 'Crafted!', 'good'));
  bus.on('purchase', (ev) => toast(`Bought (−${ev.price} 🎟)`, 'good'));
  bus.on('sold', (ev) => toast(`Sold for ${ev.value} 🎟`, 'good'));
  bus.on('vend', (ev) => toast({ gun: '🎰 A gun drops out!', resources: `🎰 ${ev.detail}`, jackpot: '🎰 JACKPOT! +60 🎟', chicken: '🎰 ...a rubber chicken. Squeak.' }[ev.outcome], 'good'));
  bus.on('salvage', (ev) => toast('Salvaged: ' + Object.entries(ev.yield).map(([k, v]) => `+${v} ${RES_BY_ID[k].name}`).join(', '), 'good'));
  bus.on('reroll', () => toast('Stat rerolled!', 'good'));
  bus.on('pickup', (ev) => {
    if (ev.kind === 'resource' && (ev.resId === 'bossCore' || ev.resId === 'manaCrystal')) feed(`+${ev.amount} ${RES_BY_ID[ev.resId].name}!`, RES_BY_ID[ev.resId].color);
  });
  bus.on('kill', (ev) => { if (ev.elite) feed('Elite down!', '#ffd700'); });
  bus.on('playerDamaged', (ev) => {
    els.vignette.className = ''; void els.vignette.offsetWidth;
    els.vignette.className = ev.toHealth > 0 ? 'hurt' : 'shield';
  });
  bus.on('victory', () => game.showScreen('victory'));
  bus.on('defeat', () => game.showScreen('defeat'));

  // ---------- menus ----------
  function openMenu(name) {
    st.menu = name;
    input.setEnabled(false);
    input.unlock();
    renderPanel();
    els.panel.hidden = false;
  }
  function closeMenu() {
    st.menu = null;
    els.panel.hidden = true;
    els.panel.innerHTML = '';
    input.setEnabled(true);
    if (els.screen.hidden) input.lock();
  }
  function act(a) { input.queueAction(a); setTimeout(renderPanel, 60); }

  input.on('key', (e) => {
    if (e.repeat) return;
    if (e.code === 'Tab') { st.tabHeld = true; return; }
    if (!els.screen.hidden) return;
    if (e.code === 'KeyG' && !st.menu) {
      const s = game.state, p = s.players[s.localPlayerId];
      if (!p.nearGunPickupId && nearBox(s, p)) openMenu('craft');
    } else if (e.code === 'KeyB' && !st.menu) {
      const s = game.state;
      if (game.shopOpen()) openMenu('shop'); else toast('Shop opens between waves', 'bad');
    } else if (e.code === 'KeyI' && !st.menu) openMenu('inventory');
    else if ((e.code === 'Escape' || e.code === 'KeyB' || e.code === 'KeyG' || e.code === 'KeyI') && st.menu) closeMenu();
  });
  input.on('keyup', (e) => { if (e.code === 'Tab') st.tabHeld = false; });

  els.panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act;
    const s = game.state, p = s.players[s.localPlayerId];
    const box = nearBox(s, p);
    switch (a) {
      case 'close': closeMenu(); break;
      case 'craftTab': st.craftTab = b.dataset.v; renderPanel(); break;
      case 'craftType': st.craftType = b.dataset.v; renderPanel(); break;
      case 'element': st.choice.element = b.dataset.v === 'random' ? null : b.dataset.v; renderPanel(); break;
      case 'part': st.choice.part = b.dataset.v === 'random' ? null : { slot: b.dataset.slot, id: b.dataset.v }; renderPanel(); break;
      case 'arcane': st.choice.arcane = !st.choice.arcane; renderPanel(); break;
      case 'craft': if (box) act({ type: 'craft', boxId: box.id, recipeId: b.dataset.v, choice: { ...st.choice } }); break;
      case 'salvage': act({ type: 'salvage', slot: +b.dataset.v }); break;
      case 'rerollSlot': st.rerollSlot = +b.dataset.v; renderPanel(); break;
      case 'reroll': act({ type: 'reroll', slot: st.rerollSlot, stat: b.dataset.v }); break;
      case 'buy': act({ type: 'buy', offerId: +b.dataset.v }); break;
      case 'sell': act({ type: 'sell', slot: +b.dataset.v }); break;
      case 'drop': act({ type: 'dropGun', slot: +b.dataset.v }); break;
      case 'vend': act({ type: 'vend' }); break;
      case 'rerollShop': act({ type: 'rerollShop' }); break;
      case 'upgrade': act({ type: 'buyUpgrade', id: b.dataset.v }); break;
      case 'supply': act({ type: 'buySupply', id: b.dataset.v }); break;
      case 'ready': input.queueAction({ type: 'noop' }); game.skipIntermission(); closeMenu(); break;
    }
  });

  const costHtml = (cost, res) => Object.entries(cost).map(([k, v]) => `<span class="cost ${(res[k] || 0) >= v ? '' : 'short'}" style="--c:${RES_BY_ID[k].color}">${RES_BY_ID[k].icon}${v}</span>`).join(' ');

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
    if (st.menu === 'craft') body = craftHtml(s, p);
    else if (st.menu === 'shop') body = shopHtml(s, p);
    else if (st.menu === 'inventory') body = inventoryHtml(s, p);
    els.panel.innerHTML = `<div class="pwrap">${body}<button class="x" data-act="close">✕ Close [Esc]</button></div>`;
  }

  function resBar(p) {
    return `<div class="resbar"><span class="tk">🎟 ${p.tickets}</span>${RESOURCES.map((r) => `<span style="--c:${r.color}" title="${r.name}">${r.icon} ${p.resources[r.id]}</span>`).join('')}</div>`;
  }

  function craftHtml(s, p) {
    const lvl = p.skills.crafting.level;
    const box = nearBox(s, p);
    const busy = box && box.craft ? `<div class="busy">Crafting… ${Math.round((box.craft.t / box.craft.duration) * 100)}%</div>` : '';
    const tabs = ['guns', 'items', 'workshop'].map((t) => `<button class="tab ${st.craftTab === t ? 'on' : ''}" data-act="craftTab" data-v="${t}">${{ guns: 'Guns', items: 'Ammo & Items', workshop: 'Salvage & Reroll' }[t]}</button>`).join('');
    let content = '';
    if (st.craftTab === 'guns') {
      const types = ['mg', 'shotgun', 'sniper', 'bazooka'].map((t) => `<button class="tab sm ${st.craftType === t ? 'on' : ''}" data-act="craftType" data-v="${t}">${TYPE_ICON[t]} ${GUN_TYPES_BY_ID[t].name}</button>`).join('');
      const recs = GUN_RECIPES.filter((r) => r.gunType === st.craftType);
      const anyEl = recs.some((r) => r.options.chooseElement && recipeUnlocked(s, p, r));
      const anyPart = recs.some((r) => r.options.choosePart && recipeUnlocked(s, p, r));
      const opts = `<div class="opts">
        ${anyEl ? `<div><b>Element (T3+)</b> ${['random', ...ELEMENTS.map((e) => e.id)].map((id) => `<button class="chip ${(st.choice.element || 'random') === id ? 'on' : ''}" data-act="element" data-v="${id}" ${id !== 'random' ? `style="--c:${ELEMENTS_BY_ID[id].color}"` : ''}>${id === 'random' ? 'Random' : ELEMENTS_BY_ID[id].name}</button>`).join('')}</div>` : ''}
        ${anyPart ? `<div><b>Part (T4+)</b> <button class="chip ${!st.choice.part ? 'on' : ''}" data-act="part" data-v="random">Random</button>${SLOTS.map((sl) => PARTS_BY_SLOT[sl].map((pt) => `<button class="chip ${st.choice.part && st.choice.part.id === pt.id ? 'on' : ''}" data-act="part" data-slot="${sl}" data-v="${pt.id}">${pt.name}</button>`).join('')).join('')}</div>` : ''}
        ${anyEl ? `<div><button class="chip ${st.choice.arcane ? 'on' : ''}" data-act="arcane" style="--c:#b07cff">✦ Arcane Infusion (+1 Mana Crystal, T3+): +20% element chance, stronger procs</button></div>` : ''}
      </div>`;
      content = `<div class="tabs">${types}</div>${opts}<div class="recipes">${recs.map((r) => {
        const unlocked = recipeUnlocked(s, p, r);
        const cost = st.choice.arcane && r.options.arcane ? mergeCost(r.cost, ARCANE_COST) : r.cost;
        const ok = unlocked && canAfford(p.resources, cost) && box && !box.craft;
        const q = QUALITIES_BY_ID[r.quality];
        return `<div class="recipe ${unlocked ? '' : 'locked'}" style="--q:${q.color}">
          <div class="rt">T${r.tier} · ${q.name}</div>
          <div class="rc">${costHtml(cost, p.resources)}</div>
          <div class="rx">+${r.xp} Crafting XP${r.options.chooseElement ? ' · element' : ''}${r.options.choosePart ? ' · part' : ''}${r.options.wacky ? ' · ★wacky' : ''}</div>
          ${unlocked ? `<button class="btn" data-act="craft" data-v="${r.id}" ${ok ? '' : 'disabled'}>Craft</button>` : `<div class="lk">🔒 Crafting Lv ${r.craftingLevel}</div>`}
        </div>`;
      }).join('')}</div>`;
    } else if (st.craftTab === 'items') {
      content = `<div class="recipes">${ITEM_RECIPES.map((r) => {
        const ok = canAfford(p.resources, r.cost) && box && !box.craft;
        const have = r.ammoType ? `${p.ammo[r.ammoType]}/${p.ammoCap[r.ammoType]}` : `${p.medkits}/3`;
        return `<div class="recipe"><div class="rt">${r.name}</div><div class="rc">${costHtml(r.cost, p.resources)}</div><div class="rx">Have ${have} · +${r.xp} XP</div><button class="btn" data-act="craft" data-v="${r.id}" ${ok ? '' : 'disabled'}>Craft</button></div>`;
      }).join('')}</div><p class="hint">Ammo is cheap and gives a little Crafting XP — a steady way to level up.</p>`;
    } else {
      const canSalvage = s.tuning.unlockAllRecipes || lvl >= SALVAGE_LEVEL;
      const canReroll = s.tuning.unlockAllRecipes || lvl >= REROLL_LEVEL;
      const g = p.guns[st.rerollSlot];
      content = `<h3>Salvage ${canSalvage ? '' : `<small>🔒 Crafting Lv ${SALVAGE_LEVEL}</small>`}</h3>
        <div class="slotlist">${p.guns.map((gg, i) => gg ? `<div class="mini" style="--q:${QUALITIES_BY_ID[gg.quality].color}"><b>${i + 1}</b> ${gg.name}<span>${Object.entries(salvageYield(gg)).map(([k, v]) => `${RES_BY_ID[k].icon}${v}`).join(' ')}</span><button class="btn sm" data-act="salvage" data-v="${i}" ${canSalvage ? '' : 'disabled'}>Salvage</button></div>` : '').join('')}</div>
        <h3>Reroll a stat ${canReroll ? '' : `<small>🔒 Crafting Lv ${REROLL_LEVEL}</small>`} <small>${costHtml(REROLL_COST, p.resources)} (+1 ✦ for Legendary)</small></h3>
        <div class="tabs">${p.guns.map((gg, i) => gg ? `<button class="tab sm ${st.rerollSlot === i ? 'on' : ''}" data-act="rerollSlot" data-v="${i}">${i + 1}: ${GUN_TYPES_BY_ID[gg.type].short}</button>` : '').join('')}</div>
        ${g ? `<div class="chips">${REROLLABLE.map((k) => `<button class="chip" data-act="reroll" data-v="${k}" ${canReroll ? '' : 'disabled'}>${k} (${fmt(g.stats[k], 2)})</button>`).join('')}</div>` : ''}`;
    }
    return `<h2>🔨 Weapon Box <small>Crafting Lv ${lvl}</small></h2>${resBar(p)}${busy}<div class="tabs">${tabs}</div>${content}
      <p class="hint">Time doesn't stop while you craft. Between waves the boxes glow, so it's safe then. Crafted guns pop out next to the box.</p>`;
  }

  function shopHtml(s, p) {
    const offers = s.shop.offers.map((o) => `<div class="offer ${o.sold ? 'sold' : ''}">${gunCardHtml(o.gun, p.guns[p.activeSlot], { footer: o.sold ? '<div class="soldtag">SOLD</div>' : `<button class="btn" data-act="buy" data-v="${o.id}" ${p.tickets >= o.price ? '' : 'disabled'}>Buy 🎟 ${o.price}</button>` })}</div>`).join('');
    const up = s.shop.upgrades;
    const ups = SHOP.upgrades.map((u) => {
      const rank = u.id === 'slot4' ? (up.slot4 || p.unlockedSlots >= 4 ? 1 : 0) : up[u.id];
      const max = rank >= u.prices.length;
      return `<div class="mini"><b>${u.name}</b><span>${max ? 'MAX' : `Rank ${rank}/${u.prices.length}`}</span><button class="btn sm" data-act="upgrade" data-v="${u.id}" ${max || p.tickets < u.prices[rank] ? 'disabled' : ''}>${max ? '—' : '🎟 ' + u.prices[rank]}</button></div>`;
    }).join('');
    const sups = SHOP.supplies.map((u) => `<div class="mini"><b>${u.name}</b><span></span><button class="btn sm" data-act="supply" data-v="${u.id}" ${p.tickets < u.price ? 'disabled' : ''}>🎟 ${u.price}</button></div>`).join('');
    const sells = p.guns.map((g, i) => g ? `<div class="mini" style="--q:${QUALITIES_BY_ID[g.quality].color}"><b>${i + 1}</b> ${g.name}<span></span><button class="btn sm" data-act="sell" data-v="${i}">Sell 🎟 ${sellValue(g)}</button></div>` : '').join('');
    const rerollPrice = SHOP.rerollBase + SHOP.rerollStep * s.shop.rerolls;
    const inter = s.wave && s.wave.phase === 'intermission';
    return `<h2>🎟 Ticket Shop ${inter ? `<small>Next wave in ${Math.ceil(s.wave.intermissionT)}s</small>` : ''}</h2>${resBar(p)}
      <div class="offers">${offers}</div>
      <div class="cols">
        <div><h3>Vending Machine</h3><div class="mini vend"><b>🎰 Mystery pull</b><span>gun, resources, jackpot… or a chicken</span><button class="btn sm" data-act="vend" ${p.tickets < SHOP.vendPrice ? 'disabled' : ''}>🎟 ${SHOP.vendPrice}</button></div>
          <div class="mini"><b>Reroll offers</b><span></span><button class="btn sm" data-act="rerollShop" ${p.tickets < rerollPrice ? 'disabled' : ''}>🎟 ${rerollPrice}</button></div>
          <h3>Supplies</h3>${sups}</div>
        <div><h3>Upgrades</h3>${ups}</div>
        <div><h3>Sell guns</h3>${sells}</div>
      </div>
      ${inter ? '<button class="btn big" data-act="ready">READY! Start next wave [Enter]</button>' : ''}`;
  }

  function inventoryHtml(s, p) {
    return `<h2>🎒 Your Guns</h2>${resBar(p)}<div class="offers">${p.guns.map((g, i) => i < p.unlockedSlots ? `<div class="offer"><div class="slotno">Slot ${i + 1}${i === p.activeSlot ? ' · equipped' : ''}</div>${gunCardHtml(g, null, { footer: g ? `<button class="btn sm" data-act="drop" data-v="${i}">Drop</button>` : '' })}</div>` : `<div class="offer"><div class="gcard empty">🔒 Slot ${i + 1}<br><small>Buy in the shop</small></div></div>`).join('')}</div>`;
  }

  // ---------- skills overlay (Tab) ----------
  function skillsHtml(p) {
    return `<div class="skills-screen">${SKILL_IDS.map((id) => {
      const sk = p.skills[id], def = SKILLS[id];
      const need = sk.level >= 10 ? 1 : xpToNext(id, sk.level);
      const perks = PERKS.filter((k) => k.skill === id).map((k) => `<div class="perk ${p.perks[k.id] ? 'on' : ''}"><b>Lv${k.level}</b> ${k.name}<small>${k.desc}</small></div>`).join('');
      const src = { health: 'Kill monsters, take damage, pick up healing, defeat Physical bosses', gunslinger: 'Gun kills, crits & weak spots, defeat Physical bosses', magic: 'Cast spells, spell kills, defeat Magic bosses', crafting: 'Craft guns (any tier) and ammo, salvage, reroll' }[id];
      return `<div class="skc" style="--c:${def.color}"><div class="skh">${def.icon} ${def.name} <span>Lv ${sk.level}</span></div>
        <div class="xpb"><b style="width:${sk.level >= 10 ? 100 : (sk.xp / need) * 100}%"></b><span>${sk.level >= 10 ? 'MAX' : `${Math.floor(sk.xp)} / ${need} XP`}</span></div>
        <div class="src">XP from: ${src}</div>${perks}</div>`;
    }).join('')}</div><div class="hint">Hold TAB · Skills level up just by doing things. No points to spend.</div>`;
  }

  // ---------- per-frame update ----------
  let lastT = performance.now();
  let tabEl = null;
  function update(s) {
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    const p = s.players[s.localPlayerId];
    updateNums(dt);

    // vitals
    bar(els.shield, 'sh', p.maxShield ? p.shield / p.maxShield : 0, `${Math.ceil(p.shield)} / ${p.maxShield}`);
    bar(els.health, 'hp', p.hp / p.maxHp, `${Math.ceil(p.hp)} / ${p.maxHp}`);
    bar(els.mana, 'mp', p.mana / p.maxMana, `${Math.floor(p.mana)} / ${p.maxMana}${p.spells.manaShieldOn ? ' ◈' : ''}`);
    set(els.health, 'lowhp', p.hp / p.maxHp < 0.3, (e, v) => e.classList.toggle('low', v));
    for (const id of SKILL_IDS) {
      const sk = p.skills[id];
      const el = els.skills.querySelector(`[data-sk="${id}"]`);
      text(el.querySelector('.lv'), 'sklv' + id, 'Lv ' + sk.level);
      const fr = sk.level >= 10 ? 1 : sk.xp / xpToNext(id, sk.level);
      set(el, 'skxp' + id, Math.round(fr * 100), (e, v) => { e.querySelector('.xp b').style.width = v + '%'; });
    }
    // spells
    for (const id of SPELL_IDS) {
      const el = els.spells.querySelector(`[data-sp="${id}"]`);
      const unlocked = !!p.perks[id];
      const cd = p.spells.cd[id], max = SPELLS[id].cd;
      const cost = id === 'meteor' ? p.maxMana : SPELLS[id].mana;
      const state = !unlocked ? 'locked' : (id === 'manaShield' && p.spells.manaShieldOn) ? 'active' : cd > 0 ? 'cd' : p.mana < cost - 0.5 ? 'nomana' : 'ready';
      set(el, 'sps' + id, state, (e, v) => { e.className = 'sp ' + v; });
      set(el, 'spc' + id, Math.round((cd / max) * 100), (e, v) => { e.querySelector('.cd').style.height = v + '%'; });
    }
    // weapon
    const g = p.guns[p.activeSlot];
    if (g) {
      const q = QUALITIES_BY_ID[g.quality];
      html(els.gunName, 'gn', `<span style="color:${q.color}">${g.name}</span>${g.element !== 'none' ? ` <i style="color:${ELEMENTS_BY_ID[g.element].color}">●</i>` : ''}`);
      text(els.mag, 'mag', p.reloadT > 0 ? 'RELOAD' : String(g.ammoInMag));
      text(els.reserve, 'res', s.tuning.infiniteAmmo ? '/ ∞' : `/ ${p.ammo[g.ammoType]}`);
      set(els.mag, 'magLow', g.ammoInMag <= Math.max(1, g.stats.magSize * 0.2), (e, v) => e.classList.toggle('low', v));
    }
    const slotsKey = p.guns.map((x) => (x ? x.id + x.quality : '-')).join(',') + p.activeSlot + p.unlockedSlots;
    html(els.slots, 'slots', p.guns.map((x, i) => `<div class="slot ${i === p.activeSlot ? 'on' : ''} ${i >= p.unlockedSlots ? 'lockd' : ''}" style="--q:${x ? QUALITIES_BY_ID[x.quality].color : '#555'}"><b>${i + 1}</b>${x ? TYPE_ICON[x.type] + ' ' + GUN_TYPES_BY_ID[x.type].short : i >= p.unlockedSlots ? '🔒' : '—'}</div>`).join(''));
    void slotsKey;
    text(els.medkits, 'mk', p.medkits ? `✚ ×${p.medkits} [H]` : '');

    // top bar
    text(els.tickets, 'tk', `🎟 ${p.tickets}`);
    html(els.resources, 'rs', RESOURCES.map((r) => `<span style="--c:${r.color}" title="${r.name}">${r.icon}${p.resources[r.id]}</span>`).join(''));
    let wave = '';
    if (s.mode === 'sandbox') wave = `<b>${s.testMode ? 'TEST RANGE' : 'SANDBOX'}</b> · Tier ${s.tier} <small>[\`] debug · [B] shop</small>`;
    else if (s.wave) {
      const w = s.wave;
      const left = s.enemies.filter((e) => !e.dead && e.type !== 'dummy').length + w.spawnQueue.length;
      const remainingGroups = WAVES[w.index].groups.slice(w.groupIdx).reduce((n, gg) => n + gg.spawns.reduce((m, x) => m + x.count, 0), 0);
      const phaseTxt = { pre: 'Get ready…', combat: `Enemies left: ${left + remainingGroups}`, bossIntro: 'BOSS INCOMING', boss: 'BOSS FIGHT', cleared: 'Cleared!', intermission: `Intermission ${Math.ceil(w.intermissionT)}s · [B] Shop · [Enter] Ready`, victory: 'VICTORY', defeat: 'DEFEAT' }[w.phase];
      wave = `<b>WAVE ${w.index + 1}/3</b> · Tier ${s.tier} · ${phaseTxt}`;
    }
    const pend = game.renderer && game.renderer.pendingDownloads ? game.renderer.pendingDownloads() : 0;
    if (pend > 0) wave += ` <small class="loading">⏳ loading ${pend}</small>`;
    html(els.wave, 'wave', wave);

    // boss bars
    const bossList = s.enemies.filter((e) => e.boss && !e.dead);
    const bk = bossList.map((b) => `${b.id}:${Math.round((b.hp / b.maxHp) * 200)}:${b.boss.phaseIdx}:${b.boss.invuln}`).join('|');
    html(els.bossbars, 'boss', bossList.map((b) => {
      const def = BOSSES[b.type];
      const pips = def.phases.map((ph, i) => `<i class="${i <= b.boss.phaseIdx ? 'on' : ''}" style="left:${ph.hpBelow * 100}%"></i>`).slice(1).join('');
      return `<div class="bossbar ${def.tag}"><div class="bn">${def.name} <span class="tag">${def.tag === 'magic' ? '🔮 MAGIC' : '💪 PHYSICAL'}</span></div><div class="bb"><b style="width:${(b.hp / b.maxHp) * 100}%"></b>${pips}${b.boss.invuln ? '<em>INVULNERABLE</em>' : ''}</div></div>`;
    }).join(''));

    // crosshair spread
    if (g) {
      const sp = (p.zooming ? g.stats.adsSpread : g.stats.spread) * (p.onGround ? (Math.hypot(p.vel.x, p.vel.z) > 1 ? 1.4 : 1) : 2) * Math.max(0.4, 1 - 0.04 * (p.skills.gunslinger.level - 1));
      const px = Math.round(6 + sp * 7 + p.recoil.heat * 6);
      set(els.cross, 'xh', px, (e, v) => e.style.setProperty('--gap', v + 'px'));
    }
    const scoped = p.zooming && g && g.type === 'sniper';
    set(els.scope, 'scope', scoped, (e, v) => e.classList.toggle('on', v));
    set(els.cross, 'xhv', scoped || p.dead, (e, v) => e.classList.toggle('hidden', v));

    // downed
    set(els.downed, 'down', p.downed, (e, v) => e.classList.toggle('on', v));
    if (p.downed) text(els.downedT, 'downt', p.downedT.toFixed(1) + 's');

    // prompt + loot card
    let prompt = '';
    const nearGun = p.nearGunPickupId ? s.pickups.find((k) => k.id === p.nearGunPickupId) : null;
    const box = nearBox(s, p);
    if (p.dead) prompt = s.mode === 'sandbox' ? `Respawning in ${Math.max(0, p.respawnT).toFixed(1)}s…` : '';
    else if (nearGun) prompt = `<b>[G]</b> Pick up${p.guns.filter(Boolean).length >= p.unlockedSlots ? ' (swaps with equipped)' : ''}`;
    else if (box) prompt = `<b>[G]</b> Open Weapon Box${box.craft ? ' (crafting…)' : ''}`;
    else if (s.wave && s.wave.phase === 'intermission') prompt = '<b>[B]</b> Shop · <b>[Enter]</b> Ready';
    html(els.prompt, 'prompt', prompt);
    html(els.loot, 'loot', nearGun ? gunCardHtml(nearGun.gun, g) : '');
    set(els.loot, 'lootv', !!nearGun, (e, v) => e.classList.toggle('on', v));

    // tab overlay
    if (st.tabHeld && !st.menu && els.screen.hidden) {
      if (!tabEl) { tabEl = h('div', 'tab-overlay'); root.appendChild(tabEl); }
      const key = SKILL_IDS.map((id) => p.skills[id].level + ':' + Math.floor(p.skills[id].xp)).join(',');
      if (tabEl.dataset.k !== key) { tabEl.dataset.k = key; tabEl.innerHTML = skillsHtml(p); }
    } else if (tabEl) { tabEl.remove(); tabEl = null; }

    // live refresh of open panel (cooldowns, intermission timer, crafting progress)
    if (st.menu && (now - (st.lastPanel || 0) > 400)) { st.lastPanel = now; const y = els.panel.querySelector('.pwrap')?.scrollTop; renderPanel(); const w = els.panel.querySelector('.pwrap'); if (w && y) w.scrollTop = y; }
    if (st.menu === 'craft' && !nearBox(s, p)) closeMenu();
  }

  return { update, closeMenu, openMenu, banner, toast, get menuOpen() { return !!st.menu; }, els };
}
