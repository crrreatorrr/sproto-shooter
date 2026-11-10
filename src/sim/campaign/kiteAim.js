// Shared aim for a verified Sahil kite. The assisted recorder keeps the gun
// through every bar that will refill, and only switches to a spell on the last bar.

function livingBosses(state) {
  const out = [];
  for (let i = 0; i < state.enemies.length; i++) {
    const e = state.enemies[i];
    if (e.boss && !e.dead && !e.fled) out.push(e);
  }
  return out;
}

function aimYaw(from, to) {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

export function kiteCommand(state, mode) {
  const p = state.players[state.localPlayerId];
  const live = livingBosses(state);
  if (!live.length) {
    return { yaw: -Math.PI / 2, pitch: 0, moveX: 0, moveZ: 1, held: { sprint: true }, pressed: {}, slot: -1, wheel: 0, actions: [] };
  }
  let target = live[0];
  let best = Infinity;
  for (let i = 0; i < live.length; i++) {
    const e = live[i];
    const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    if (d < best) { best = d; target = e; }
  }
  if (mode === 'fail') {
    if (best > 4.5) {
      return { yaw: aimYaw(p.pos, target.pos), pitch: 0, moveX: 0, moveZ: 1, held: { sprint: true }, pressed: {}, slot: -1, wheel: 0, actions: [] };
    }
    return { yaw: aimYaw(p.pos, target.pos), pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [] };
  }
  const eye = p.pos.y + 1.6;
  const aimY = target.pos.y + target.height * 0.55;
  let pitch = Math.atan2(aimY - eye, Math.max(0.2, best)) - p.recoil.pitch;
  if (pitch > 1.45) pitch = 1.45;
  if (pitch < -1.45) pitch = -1.45;
  const refills = !!(target.boss && target.boss.scriptHold);
  const assist = mode === 'assisted' && !refills && target.hp < 80;
  let moveZ = 0;
  if (best > 18) moveZ = 1;
  else if (best < 9) moveZ = -1;
  const pressed = {};
  if (assist) pressed.gooBolt = true;
  else if (p.hp < 45 && p.medkits > 0 && !p.downed) pressed.medkit = true;
  return {
    yaw: aimYaw(p.pos, target.pos),
    pitch,
    moveX: 0,
    moveZ,
    held: { fire: !assist, sprint: best > 18 },
    pressed,
    slot: -1,
    wheel: 0,
    actions: [],
  };
}
