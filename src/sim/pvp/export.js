// Separately versioned free-arena export. Campaign verifyRun stays on the other bundle.
import { createMatch, replay, hashState, step } from './sim.js';
import { createDirector, restoreDirector } from './director.js';
import { decodeUsedLog, wishOfUsed } from './used.js';
import { encodeInput, decodeInput } from '../../net/inputCodec.js';
import { OP } from '../../net/protocol.js';
import {
  CONTENT_FINGERPRINT, ECONOMY, INPUT_LIMITS, LEAD_IN_TICKS, LOADOUT_HASH,
  PVP_PROTOCOL_VERSION, PVP_SIM_VERSION,
} from './rules.js';

export const SOURCE_COMMIT = '0000000000000000000000000000000000000000';

function receipt(state) {
  const pinned = /^0{40}$/.test(SOURCE_COMMIT) ? null : SOURCE_COMMIT;
  return {
    ok: true,
    outcome: state.outcome,
    winner: state.winner,
    reason: state.reason,
    tick: state.tick,
    stateHash: hashState(state),
    protocol: PVP_PROTOCOL_VERSION,
    sim: PVP_SIM_VERSION,
    content: CONTENT_FINGERPRINT,
    loadoutHash: LOADOUT_HASH,
    ticketsMinted: 0,
    sourceCommit: pinned,
    players: state.players.map((p) => ({
      hp: p.hp,
      shield: p.shield,
      x: p.x,
      z: p.z,
      alive: p.alive,
    })),
  };
}

function refused(reason) {
  return JSON.stringify({ ok: false, reason, ticketsMinted: 0, outcome: null, winner: null, verified: false });
}

const EXPECT_KEYS = ['tick', 'stateHash', 'outcome', 'winner', 'reason'];

/**
 * Replay v2: re-run the director's used-input log (every wish it applied, substitutes included)
 * and compare the end state with `expect`. `verified` is true only when every expected field
 * matches. A wager settles only on a verified replay.
 */
function replayUsed(body) {
  const ticks = decodeUsedLog(body.used);
  if (!ticks) return refused('malformed');
  if (!Number.isInteger(body.seed) || body.seed < 0 || body.seed > 0xffffffff) return refused('malformed');
  const state = createMatch(body.seed >>> 0);
  let extra = 0;
  for (let i = 0; i < ticks.length; i++) {
    if (state.phase === 'done') {
      extra += 1;
      continue;
    }
    step(state, [wishOfUsed(ticks[i][0]), wishOfUsed(ticks[i][1])]);
  }
  const out = receipt(state);
  out.v = 2;
  out.ticksLogged = ticks.length;
  const mismatch = [];
  if (extra > 0) mismatch.push('extraTicks');
  const expect = body.expect && typeof body.expect === 'object' ? body.expect : null;
  if (!expect) mismatch.push('expect');
  else {
    for (const key of EXPECT_KEYS) {
      if (!(key in expect)) mismatch.push(key);
      else if (expect[key] !== out[key]) mismatch.push(key);
    }
  }
  out.verified = mismatch.length === 0;
  out.mismatch = mismatch;
  return JSON.stringify(out);
}

export function replayJSON(text) {
  const raw = typeof text === 'string' ? text : JSON.stringify(text);
  if (/[:\s]NaN\b|Infinity/.test(raw)) return refused('nan');
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return refused('malformed');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return refused('malformed');
  if (body.v === 2) return replayUsed(body);
  return JSON.stringify(receipt(replay(body)));
}

export {
  createDirector,
  restoreDirector,
  encodeInput,
  decodeInput,
  OP,
  ECONOMY,
  INPUT_LIMITS,
  LEAD_IN_TICKS,
  PVP_PROTOCOL_VERSION,
  PVP_SIM_VERSION,
  CONTENT_FINGERPRINT,
  LOADOUT_HASH,
};
