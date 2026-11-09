// Replay a server-issued campaign boss with the same aim loop as tests/bossLog.js.
// The issuance object is the one shooter.run.issue stored. The log binding is that
// issuance, so the hub verifier is checking this build against its own seed.
import { simulate } from '../../src/sim/simulate.js';
import { verifyRun } from '../../src/server/verify.js';
import { buildIssuedState } from '../../src/server/runContract.js';
import { dequantizeCommand, encodeQuantized, quantizeCommand } from '../../src/server/protocol.js';

function livingBosses(state) {
  return state.enemies.filter((enemy) => enemy.boss && !enemy.dead && !enemy.fled);
}

function aimYaw(from, to) {
  return Math.atan2(-(to.x - from.x), -(to.z - from.z));
}

function decide(state) {
  const player = state.players[state.localPlayerId];
  const live = livingBosses(state);
  if (!live.length) {
    return { yaw: -Math.PI / 2, pitch: 0, moveX: 0, moveZ: 1, held: { sprint: true }, pressed: {}, slot: -1, wheel: 0, actions: [] };
  }
  let target = live[0];
  let best = Infinity;
  for (const enemy of live) {
    const distance = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.z - player.pos.z);
    if (distance < best) { best = distance; target = enemy; }
  }
  const eye = player.pos.y + 1.6;
  const aimY = target.pos.y + target.height * 0.55;
  let pitch = Math.atan2(aimY - eye, Math.max(0.2, best)) - player.recoil.pitch;
  if (pitch > 1.45) pitch = 1.45;
  if (pitch < -1.45) pitch = -1.45;
  let moveZ = 0;
  if (best > 18) moveZ = 1;
  else if (best < 9) moveZ = -1;
  const pressed = {};
  if (player.hp < 45 && player.medkits > 0 && !player.downed) pressed.medkit = true;
  return {
    yaw: aimYaw(player.pos, target.pos),
    pitch,
    moveX: 0,
    moveZ,
    held: { fire: true, sprint: best > 18 },
    pressed,
    slot: -1,
    wheel: 0,
    actions: [],
  };
}

function noteBoss(memory, state, parts) {
  for (const enemy of state.enemies) {
    if (!enemy.boss || parts.indexOf(enemy.type) < 0) continue;
    const prev = memory[enemy.type] || { dead: false, fled: false };
    if (enemy.fled) prev.fled = true;
    if (enemy.dead && enemy.hp <= 0) prev.dead = true;
    memory[enemy.type] = prev;
  }
}

/**
 * @param {object} issuance shooter.run.issue issuance
 * @returns {{ log: object, receipt: object }}
 */
export function clearIssuedBoss(issuance, maxFrames = 8000) {
  if (!issuance || !issuance.runId || !issuance.accountId) throw new Error('issuance missing binding');
  const state = buildIssuedState(issuance);
  const id = state.localPlayerId;
  const frames = [];
  const memory = {};
  let guard = maxFrames;
  while (guard > 0) {
    guard -= 1;
    const quantized = quantizeCommand(decide(state));
    frames.push(quantized);
    simulate(state, { [id]: dequantizeCommand(quantized) });
    noteBoss(memory, state, issuance.parts);
    const cleared = issuance.parts.every((type) => memory[type] && memory[type].dead && !memory[type].fled);
    if (cleared) break;
    if (state.players[id].dead) break;
  }
  const encoded = encodeQuantized(frames);
  const log = {
    v: 1,
    binding: {
      accountId: issuance.accountId,
      sessionId: issuance.sessionId,
      day: issuance.day,
      runId: issuance.runId,
    },
    segments: [{ i: 0, from: null, tick0: 0, n: encoded.n, frames: encoded.frames, actions: encoded.actions }],
  };
  const receipt = verifyRun(log, {
    issuance,
    accountId: issuance.accountId,
    sessionId: issuance.sessionId,
    day: issuance.day,
    seenDigests: [],
    seenRunIds: [],
  });
  return { log, receipt, frames: encoded.n };
}
