// Separately versioned free-arena export. Campaign verifyRun stays on the other bundle.
import { replay, hashState } from './sim.js';
import { createDirector } from './director.js';
import { encodeInput, decodeInput } from '../../net/inputCodec.js';
import { OP } from '../../net/protocol.js';
import {
  CONTENT_FINGERPRINT, ECONOMY, INPUT_LIMITS, LOADOUT_HASH,
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

export function replayJSON(text) {
  const raw = typeof text === 'string' ? text : JSON.stringify(text);
  if (/[:\s]NaN\b|Infinity/.test(raw)) {
    return JSON.stringify({ ok: false, reason: 'nan', ticketsMinted: 0, outcome: null, winner: null });
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return JSON.stringify({ ok: false, reason: 'malformed', ticketsMinted: 0, outcome: null, winner: null });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return JSON.stringify({ ok: false, reason: 'malformed', ticketsMinted: 0, outcome: null, winner: null });
  }
  return JSON.stringify(receipt(replay(body)));
}

export {
  createDirector,
  encodeInput,
  decodeInput,
  OP,
  ECONOMY,
  INPUT_LIMITS,
  PVP_PROTOCOL_VERSION,
  PVP_SIM_VERSION,
  CONTENT_FINGERPRINT,
  LOADOUT_HASH,
};
