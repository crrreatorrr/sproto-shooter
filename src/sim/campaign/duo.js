// The Pump & Dump Duo. An encounter with a `parts` list and both duel bodies
// runs this clock. It feeds the same part book the squad trigger reads.
const BARS = {
  obamaDuo: [578, 669, 760],
  midgetDuo: [684, 783, 852],
};
const PYLONS = ['sb.py1', 'sb.py2', 'sb.py3'];
const BREAKERS = ['sb.cb1', 'sb.cb2'];

function book(lv, encId) {
  if (!lv.scripts) lv.scripts = {};
  if (!lv.scripts[encId]) lv.scripts[encId] = { part: 0, partT: 0, home: {} };
  return lv.scripts[encId];
}

function destroyed(lv, id) {
  return !!(lv.v2 && lv.v2.parts && lv.v2.parts[id]);
}

export function tickDuo(state, enc, dt) {
  const parts = enc.parts;
  if (!parts || !parts.length) return;
  const bosses = [];
  for (const e of state.enemies) {
    if (!e.boss || e.campaignEnc !== enc.id || !BARS[e.type]) continue;
    if (e.dead && e.type !== 'obamaDuo') continue;
    bosses.push(e);
  }
  const living = bosses.filter((e) => !e.dead);
  if (!living.length) return;
  const lv = state.level;
  const prog = book(lv, enc.id);
  const part = parts[prog.part];
  if (!part) return;
  prog.partT += dt;
  const obama = bosses.find((e) => e.type === 'obamaDuo');
  for (const b of living) {
    b.boss.scripted = true;
    if (!b.boss.bars) {
      b.boss.bars = BARS[b.type].slice();
      b.boss.bar = 0;
      b.maxHp = b.boss.bars[0];
      b.hp = b.maxHp;
      prog.home[b.id] = { x: b.pos.x, y: b.pos.y, z: b.pos.z };
    }
    const lastBar = b.boss.bar >= b.boss.bars.length - 1;
    if (b.boss.barEmpty && !lastBar) {
      b.boss.bar += 1;
      b.boss.barEmpty = false;
      b.maxHp = b.boss.bars[b.boss.bar];
      b.hp = b.maxHp;
      if (b.boss.bar >= 2) prog.held = true;
    }
    b.boss.phaseIdx = Math.min(2, b.boss.bar);
  }
  const midget = living.find((e) => e.type === 'midgetDuo');
  let advance = false;
  if (part.kind === 'entry') advance = PYLONS.every((id) => destroyed(lv, id));
  else if (part.kind === 'intermission') advance = BREAKERS.every((id) => destroyed(lv, id));
  else if (part.kind === 'double' && prog.part === 1) advance = living.some((b) => b.boss.bar >= 2);
  else if (part.kind === 'double') advance = (!obama || obama.dead) && !!(midget && midget.boss.bar >= 2);
  else if (part.kind === 'chase') advance = !midget;
  if (advance && prog.part < parts.length - 1) {
    prog.part += 1;
    prog.partT = 0;
  }
  const now = parts[prog.part];
  const shield = now && (now.kind === 'entry' || now.kind === 'intermission');
  for (const b of living) {
    const lastBar = b.boss.bar >= b.boss.bars.length - 1;
    const locked = b.type === 'midgetDuo' && b.boss.bar >= 2 && obama && !obama.dead;
    if (shield && prog.home[b.id]) {
      const h = prog.home[b.id];
      b.pos.x = h.x;
      b.pos.y = h.y;
      b.pos.z = h.z;
      b.vel.x = 0;
      b.vel.y = 0;
      b.vel.z = 0;
      b.boss.invuln = true;
      b.boss.attackList = null;
      b.boss.scriptHold = false;
    } else if (locked) {
      b.boss.invuln = true;
      b.boss.scriptHold = false;
      b.boss.attackList = ['pigRain'];
    } else {
      b.boss.invuln = false;
      b.boss.scriptHold = !lastBar;
      b.boss.attackList = b.type === 'midgetDuo' ? ['bolt', 'fly', 'blast'] : ['bolt', 'blast'];
    }
  }
}
