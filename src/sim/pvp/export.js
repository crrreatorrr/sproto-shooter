// Separately versioned free-arena export. Campaign verifyRun stays on the other bundle.
import {
  createMatch, replay, hashState, stateSha256, step,
} from './sim.js';
import {
  combatCommitOf, createDirector, createHostedDirector, rewindCapFor, restoreDirector,
} from './director.js';
import {
  SOURCE, TICK_HEX, decodeUsedLog, wishOfUsed,
} from './used.js';
import { sha256Hex } from '../../core/sha256.js';
import { encodeInput, decodeInput } from '../../net/inputCodec.js';
import { OP } from '../../net/protocol.js';
import {
  CONTENT_FINGERPRINT, ECONOMY, INPUT_LIMITS, LEAD_IN_TICKS, LOADOUT_HASH,
  PVP_PROTOCOL_VERSION, PVP_SIM_VERSION, REPLAY_LIMITS, REWIND, STALL_MS, STEP_MS,
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
    stateSha256: stateSha256(state),
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

const SEED_RE = /^[0-9a-f]{32,128}$/;

/**
 * Outcomes the director decides on its own (timing it saw, not combat the log replays), and the
 * settlement each one gets when the record verifies. Sim outcomes (ko, time, draw by double_ko
 * or time) are reproduced by the replay and settle as the result says.
 */
const DIRECTOR_OUTCOMES = Object.freeze({
  'forfeit:stall': 'settle_director',
  'draw:both_stall': 'refund',
  'cancel:ready_timeout': 'refund',
  'cancel:no_combat_seed': 'refund',
});

/**
 * A stall forfeit at tick R means the director saw no input from the loser for STALL_MS. An
 * input applied on tick F arrived no earlier than F - futureFrames ticks, so the loser's last
 * real input tick is at least about this many ticks before R (less the catch-up a slow loop
 * can add). The log can only be consistent with the director's word, not prove it.
 */
const STALL_TICKS = Math.ceil(STALL_MS / STEP_MS) - INPUT_LIMITS.futureFrames - INPUT_LIMITS.catchUpTicks;

function trailingNonInput(ticks, seat) {
  let n = 0;
  for (let i = ticks.length - 1; i >= 0 && ticks[i][seat].src !== SOURCE.input; i--) n += 1;
  return n;
}

/**
 * Check the director's `result` against the replayed end state, and say what can be settled.
 * Returns { checks (mismatch keys), verdict }.
 */
function judge(body, ticks, state, out, replayOk) {
  const result = body.result && typeof body.result === 'object' ? body.result : null;
  const accounts = Array.isArray(body.accounts) ? body.accounts.slice(0, 2) : null;
  const verdict = {
    replay: replayOk,
    result: null,
    outcome: result ? result.outcome : null,
    winner: result ? result.winner : null,
    reason: result ? result.reason : null,
    provable: false,
    accounts,
    bundleSha256: typeof body.bundleSha256 === 'string' ? body.bundleSha256 : null,
    evidence: null,
    policy: 'refuse',
  };
  const checks = [];
  if (!result) return { checks, verdict };
  const noSim = result.outcome === 'cancel' && ticks.length === 0;
  const want = {
    tick: out.tick,
    stateHash: out.stateHash,
    stateSha256: out.stateSha256,
    spawnSeed: body.spawnSeed,
    combatSeed: body.combatSeed,
    combatCommit: out.combatCommit,
  };
  if (noSim) {
    // Cancelled before go-live: there is no match state to check.
    want.tick = 0;
    want.stateHash = null;
    want.stateSha256 = null;
  }
  for (const key of Object.keys(want)) {
    if (key === 'stateSha256' && result[key] === undefined) continue;
    if (result[key] !== want[key]) checks.push(`result.${key}`);
  }
  if (state.outcome != null) {
    // The sim ended the match: the result must be exactly the sim's, and the log proves it.
    for (const key of ['outcome', 'winner', 'reason']) if (result[key] !== state[key]) checks.push(`result.${key}`);
    verdict.provable = true;
    if (checks.length === 0) verdict.policy = 'settle';
  } else {
    const policy = DIRECTOR_OUTCOMES[`${result.outcome}:${result.reason}`];
    const winnerOk = result.outcome === 'forfeit' ? result.winner === 0 || result.winner === 1 : result.winner === null;
    const knownOutcome = Object.keys(DIRECTOR_OUTCOMES).some((key) => key.startsWith(`${result.outcome}:`));
    if (!policy) checks.push(knownOutcome ? 'result.reason' : 'result.outcome');
    else if (!winnerOk) checks.push('result.winner');
    if (!noSim) {
      const trailing = [trailingNonInput(ticks, 0), trailingNonInput(ticks, 1)];
      let consistent = true;
      if (result.outcome === 'forfeit') consistent = trailing[1 - result.winner] >= STALL_TICKS;
      else if (result.reason === 'both_stall') consistent = trailing[0] >= STALL_TICKS && trailing[1] >= STALL_TICKS;
      verdict.evidence = { trailingNonInput: trailing, stallTicks: STALL_TICKS, consistent };
      if (checks.length === 0) verdict.policy = policy === 'settle_director' && !consistent ? 'review' : policy;
    } else if (checks.length === 0) {
      verdict.policy = policy;
    }
  }
  verdict.result = checks.length === 0;
  if (!replayOk) verdict.policy = 'refuse';
  return { checks, verdict };
}

/**
 * Replay v2: re-run the director's used-input log (every wish it applied, substitutes included,
 * with the clamped rewind of each) from the spawn seed and the revealed combat seed, and compare
 * the end state with `expect` and with the director's `result`. `verified` is true only when
 * every expected field and every result field matches and sha256(combatSeed) equals the commit
 * sent at start. `verdict` says whether the outcome is provable from the log and which
 * settlement policy applies (docs/shooter-pvp-protocol.md, "Settling a wager").
 */
function replayUsed(body) {
  if (body.sim !== undefined && body.sim !== PVP_SIM_VERSION) return refused('version');
  if (!Array.isArray(body.used)) return refused('malformed');
  let hex = 0;
  for (const chunk of body.used) hex += typeof chunk === 'string' ? chunk.length : 0;
  if (body.used.length > REPLAY_LIMITS.maxTicks || hex > REPLAY_LIMITS.maxTicks * TICK_HEX) return refused('too_long');
  const ticks = decodeUsedLog(body.used);
  if (!ticks) return refused('malformed');
  const spawn = body.spawnSeed;
  if (!Number.isInteger(spawn) || spawn < 0 || spawn > 0xffffffff) return refused('malformed');
  if (typeof body.combatSeed !== 'string' || !SEED_RE.test(body.combatSeed)) return refused('malformed');
  if (body.sourceCommit != null && !/^0{40}$/.test(SOURCE_COMMIT) && body.sourceCommit !== SOURCE_COMMIT) {
    return refused('build');
  }
  const state = createMatch(spawn >>> 0, body.combatSeed);
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
  out.combatCommit = combatCommitOf(body.combatSeed);
  if (body.combatCommit !== out.combatCommit) mismatch.push('combatCommit');
  const expect = body.expect && typeof body.expect === 'object' ? body.expect : null;
  const cancelledInLobby = !expect && ticks.length === 0 && body.result && body.result.outcome === 'cancel';
  if (!expect) {
    if (!cancelledInLobby) mismatch.push('expect');
  } else {
    for (const key of EXPECT_KEYS) {
      if (!(key in expect)) mismatch.push(key);
      else if (expect[key] !== out[key]) mismatch.push(key);
    }
    if ('stateSha256' in expect && expect.stateSha256 !== out.stateSha256) mismatch.push('stateSha256');
  }
  const { checks, verdict } = judge(body, ticks, state, out, mismatch.length === 0);
  mismatch.push(...checks);
  out.verified = mismatch.length === 0;
  out.mismatch = mismatch;
  out.verdict = verdict;
  return JSON.stringify(out);
}

/** True when every number anywhere in `value` is finite (JSON.parse turns 1e999 into Infinity). */
function allFinite(value, depth = 0) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (value === null || typeof value !== 'object') return true;
  if (depth > 32) return false;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) if (!allFinite(value[i], depth + 1)) return false;
    return true;
  }
  for (const key of Object.keys(value)) if (!allFinite(value[key], depth + 1)) return false;
  return true;
}

/**
 * Replay a record: a JSON string (from outside, so its size is capped) or the object itself
 * (in-process). Non-finite numbers are refused by value as `nan`; a log or input list longer
 * than a match, or text over REPLAY_LIMITS.maxBytes, is `too_long`.
 */
export function replayJSON(text) {
  let body;
  if (typeof text === 'string') {
    if (text.length > REPLAY_LIMITS.maxBytes) return refused('too_long');
    try {
      body = JSON.parse(text);
    } catch {
      return refused('malformed');
    }
  } else {
    body = text;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return refused('malformed');
  if (!allFinite(body)) return refused('nan');
  if (body.v === 2) return replayUsed(body);
  if (Array.isArray(body.inputs) && body.inputs.length > REPLAY_LIMITS.maxTicks) return refused('too_long');
  return JSON.stringify(receipt(replay(body)));
}

export {
  createDirector,
  createHostedDirector,
  restoreDirector,
  combatCommitOf,
  rewindCapFor,
  sha256Hex,
  REWIND,
  REPLAY_LIMITS,
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
