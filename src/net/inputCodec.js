// Finite 16-byte arena input. One seat, one frame, one sequence.
import { INPUT_LIMITS } from '../sim/pvp/rules.js';

export const FRAME_BYTES = INPUT_LIMITS.frameBytes;

const BUTTONS = Object.freeze(['fire', 'zoom', 'sprint', 'jump', 'dash', 'reload', 'slide']);

export class PvpInputError extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

function fail(reason) {
  throw new PvpInputError(reason);
}

function unwrapPi(yaw) {
  if (typeof yaw !== 'number' || !Number.isFinite(yaw)) fail('nan');
  if (Math.abs(yaw) > 1e6) fail('malformed');
  return Math.atan2(Math.sin(yaw), Math.cos(yaw));
}

function quantYaw(yaw) {
  const wrapped = unwrapPi(yaw);
  let q = Math.round((wrapped / Math.PI) * 32767);
  if (q > 32767) q = 32767;
  if (q < -32767) q = -32767;
  return q;
}

function quantPitch(pitch) {
  if (typeof pitch !== 'number' || !Number.isFinite(pitch)) fail('nan');
  if (pitch < -Math.PI / 2 - 1e-4 || pitch > Math.PI / 2 + 1e-4) fail('malformed');
  const clamped = Math.max(-1.5, Math.min(1.5, pitch));
  return Math.round((clamped / 1.5) * 32767);
}

function quantMove(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail('nan');
  if (v < -1 - 1e-6 || v > 1 + 1e-6) fail('malformed');
  const c = Math.max(-1, Math.min(1, v));
  return Math.max(-127, Math.min(127, Math.round(c * 127)));
}

function buttonMask(wish) {
  let mask = 0;
  for (let i = 0; i < BUTTONS.length; i++) if (wish[BUTTONS[i]]) mask |= 1 << i;
  return mask;
}

function readSeq(seq) {
  if (typeof seq !== 'number' || !Number.isFinite(seq)) fail('nan');
  if (!Number.isInteger(seq) || seq < 1 || seq > 0xffffffff) fail('sequence');
  return seq;
}

function readFrame(frame) {
  if (typeof frame !== 'number' || !Number.isFinite(frame)) fail('nan');
  if (!Number.isInteger(frame) || frame < 0 || frame > INPUT_LIMITS.maxFrame) fail('frame');
  return frame;
}

function readSlot(slot) {
  if (slot == null) return -1;
  if (typeof slot !== 'number' || !Number.isFinite(slot)) fail('nan');
  if (!Number.isInteger(slot) || slot < -1 || slot > 2) fail('malformed');
  return slot;
}

export function encodeInput(wish) {
  if (!wish || typeof wish !== 'object') fail('malformed');
  const seq = readSeq(wish.seq);
  const frame = readFrame(wish.frame);
  const yaw = quantYaw(wish.yaw ?? 0);
  const pitch = quantPitch(wish.pitch ?? 0);
  const moveX = quantMove(wish.moveX ?? 0);
  const moveZ = quantMove(wish.moveZ ?? 0);
  const slot = readSlot(wish.slot);
  const buttons = buttonMask(wish);
  const buf = new Uint8Array(FRAME_BYTES);
  const view = new DataView(buf.buffer);
  view.setUint32(0, seq, true);
  view.setInt32(4, frame, true);
  view.setInt16(8, yaw, true);
  view.setInt16(10, pitch, true);
  view.setInt8(12, moveX);
  view.setInt8(13, moveZ);
  view.setUint8(14, buttons);
  view.setInt8(15, slot);
  return buf;
}

export function decodeInput(buf) {
  if (!(buf instanceof Uint8Array) || buf.length !== FRAME_BYTES) fail('malformed');
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const buttons = view.getUint8(14);
  if (buttons & 0x80) fail('malformed');
  const slot = view.getInt8(15);
  if (slot < -1 || slot > 2) fail('malformed');
  const yawQ = view.getInt16(8, true);
  const pitchQ = view.getInt16(10, true);
  if (yawQ < -32767 || yawQ > 32767 || pitchQ < -32767 || pitchQ > 32767) fail('malformed');
  const moveX = view.getInt8(12);
  const moveZ = view.getInt8(13);
  const out = {
    seq: view.getUint32(0, true),
    frame: view.getInt32(4, true),
    yaw: (yawQ / 32767) * Math.PI,
    pitch: (pitchQ / 32767) * 1.5,
    moveX: moveX / 127,
    moveZ: moveZ / 127,
    slot,
  };
  if (out.seq < 1) fail('sequence');
  if (out.frame < 0) fail('frame');
  for (let i = 0; i < BUTTONS.length; i++) out[BUTTONS[i]] = (buttons & (1 << i)) !== 0;
  return out;
}

/** Campaign command -> arena wish. Slot 3+ and spells are dropped. */
export function wishFromCommand(cmd, seq, frame, slotNow = 0) {
  let slot = -1;
  if (cmd && Number.isInteger(cmd.slot) && cmd.slot >= 0 && cmd.slot <= 2) slot = cmd.slot;
  else if (cmd && cmd.wheel) {
    const dir = cmd.wheel > 0 ? 1 : -1;
    slot = (slotNow + dir + 3) % 3;
  }
  const held = (cmd && cmd.held) || {};
  const pressed = (cmd && cmd.pressed) || {};
  return {
    seq,
    frame,
    yaw: cmd && Number.isFinite(cmd.yaw) ? cmd.yaw : 0,
    pitch: cmd && Number.isFinite(cmd.pitch) ? cmd.pitch : 0,
    moveX: cmd && Number.isFinite(cmd.moveX) ? cmd.moveX : 0,
    moveZ: cmd && Number.isFinite(cmd.moveZ) ? cmd.moveZ : 0,
    fire: !!held.fire,
    zoom: !!held.zoom,
    sprint: !!held.sprint,
    jump: !!pressed.jump,
    dash: !!pressed.dash,
    reload: !!pressed.reload,
    slide: !!pressed.slide,
    slot,
  };
}
