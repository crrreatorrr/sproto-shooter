// A multi-part boss script folds positions onto a 0.1 mm grid. A long kite
// otherwise drifts by one ulp between node and goja and a hit flips. A one-part
// script is left alone so the current Sahil golden stays put.

function q(n) {
  return Math.round(n * 10000) / 10000;
}

function snapBody(o) {
  if (!o || !o.pos) return;
  o.pos.x = q(o.pos.x);
  o.pos.y = q(o.pos.y);
  o.pos.z = q(o.pos.z);
  if (o.prevPos) {
    o.prevPos.x = q(o.prevPos.x);
    o.prevPos.y = q(o.prevPos.y);
    o.prevPos.z = q(o.prevPos.z);
  }
  if (o.vel) {
    o.vel.x = q(o.vel.x);
    o.vel.y = q(o.vel.y);
    o.vel.z = q(o.vel.z);
  }
}

export function snapScripted(state) {
  if (!state || state.mode !== 'campaign' || !state.level || !state.level.scripts) return;
  const sec = state._v2section;
  if (!sec) return;
  let multi = false;
  for (const enc of sec.encounters || []) {
    if (enc.script && enc.script.parts && enc.script.parts.length > 1) multi = true;
  }
  if (!multi) return;
  const players = state.players ? Object.keys(state.players) : [];
  for (let i = 0; i < players.length; i++) snapBody(state.players[players[i]]);
  const enemies = state.enemies || [];
  for (let i = 0; i < enemies.length; i++) snapBody(enemies[i]);
  const shots = state.projectiles || [];
  for (let i = 0; i < shots.length; i++) snapBody(shots[i]);
}
