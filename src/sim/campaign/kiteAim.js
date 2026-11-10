// Shared aim for a verified boss kite. The assisted recorder keeps the gun
// through every bar that will refill, and only switches to a spell on the last bar.
// On the Exchange the Duo starts invulnerable, so the recorder clears the part
// carriers first and stays on the floor.

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

function worldMove(yaw, wx, wz) {
  const sy = Math.sin(yaw);
  const cy = Math.cos(yaw);
  const len = Math.hypot(wx, wz) || 1;
  return {
    moveZ: Math.max(-1, Math.min(1, (wx * -sy + wz * -cy) / len)),
    moveX: Math.max(-1, Math.min(1, (wx * cy - wz * sy) / len)),
  };
}

export function kiteCommand(state, mode) {
  const p = state.players[state.localPlayerId];
  const exchange = state.level && state.level.section === 'SB';
  if (exchange && (p.pos.x < 1136 || p.pos.y < -0.5)) {
    const home = { x: 1160, z: 60 };
    const yaw = aimYaw(p.pos, home);
    const mv = worldMove(yaw, home.x - p.pos.x, home.z - p.pos.z);
    return {
      yaw, pitch: 0, moveX: mv.moveX, moveZ: mv.moveZ,
      held: { sprint: true }, pressed: {}, slot: -1, wheel: 0, actions: [],
    };
  }
  const live = livingBosses(state);
  if (!live.length) {
    return { yaw: -Math.PI / 2, pitch: 0, moveX: 0, moveZ: 1, held: { sprint: true }, pressed: {}, slot: -1, wheel: 0, actions: [] };
  }
  const shielded = exchange && live.every((e) => e.boss && e.boss.invuln);
  const pool = [];
  if (shielded) {
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      if (!e.dead && !e.fled && !e.boss && e.partId) pool.push(e);
    }
  }
  const choices = pool.length ? pool : live;
  let target = choices[0];
  let best = Infinity;
  const focusWeak = exchange && !pool.length && live.length >= 2;
  for (let i = 0; i < choices.length; i++) {
    const e = choices[i];
    const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
    const score = focusWeak && e.maxHp ? d + (e.hp / e.maxHp) * 30 : d;
    if (score < best) { best = score; target = e; }
  }
  best = Math.hypot(target.pos.x - p.pos.x, target.pos.z - p.pos.z);
  if (mode === 'fail') {
    if (best > 4.5) {
      return { yaw: aimYaw(p.pos, target.pos), pitch: 0, moveX: 0, moveZ: 1, held: { sprint: true }, pressed: {}, slot: -1, wheel: 0, actions: [] };
    }
    return { yaw: aimYaw(p.pos, target.pos), pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [] };
  }
  const eye = p.pos.y + 1.6;
  const aimY = target.pos.y + (target.height || 1.6) * 0.55;
  let pitch = Math.atan2(aimY - eye, Math.max(0.2, best)) - p.recoil.pitch;
  if (pitch > 1.45) pitch = 1.45;
  if (pitch < -1.45) pitch = -1.45;
  const refills = !!(target.boss && target.boss.scriptHold);
  const assist = mode === 'assisted' && !refills && target.hp < 80;
  let moveZ = 0;
  let moveX = 0;
  let yaw = aimYaw(p.pos, target.pos);
  const off = exchange && (p.pos.y < -0.2 || p.pos.z < 52 || p.pos.z > 70 || p.pos.x > 1170 || p.pos.x < 1146);
  if (off) {
    yaw = aimYaw(p.pos, { x: 1158, z: 62 });
    const mv = worldMove(yaw, 1158 - p.pos.x, 62 - p.pos.z);
    moveX = mv.moveX;
    moveZ = mv.moveZ;
  } else if (exchange) {
    const dx = target.pos.x - p.pos.x;
    const dz = target.pos.z - p.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const lv = state.level;
    if (p.pos.x > 1164) lv._sweep = -1;
    else if (p.pos.x < 1152) lv._sweep = 1;
    else if (!lv._sweep) lv._sweep = 1;
    let wx = (-dz / d) * lv._sweep;
    let wz = (dx / d) * lv._sweep;
    if (best > 20) { wx += dx / d; wz += dz / d; }
    else if (best < 12) { wx -= dx / d; wz -= dz / d; }
    const mv = worldMove(yaw, wx, wz);
    moveX = mv.moveX;
    moveZ = mv.moveZ;
  } else if (best > 18) moveZ = 1;
  else if (best < 9) moveZ = -1;
  const pressed = {};
  const finishing = exchange && live.some((e) => e.boss && !e.boss.scriptHold && e.hp < 90);
  const nearEdge = target.pos && (target.pos.y < 0.2 || target.pos.z < 50 || target.pos.z > 70 || target.pos.x < 1142 || target.pos.x > 1172);
  if (assist || (exchange && !finishing && !nearEdge && p.mana >= 15)) pressed.gooBolt = true;
  if (!assist && p.hp < (exchange ? 70 : 45) && p.medkits > 0 && !p.downed) pressed.medkit = true;
  return {
    yaw,
    pitch,
    moveX,
    moveZ,
    held: { fire: !assist, sprint: best > 18 && !exchange },
    pressed,
    slot: -1,
    wheel: 0,
    actions: [],
  };
}
