// Wire contract for the free arena. The client never supplies a winner.
import {
  CONTENT_FINGERPRINT, INPUT_LIMITS, MATCH_NAME, PVP_PROTOCOL_VERSION, PVP_SIM_VERSION,
} from '../sim/pvp/rules.js';

export const OP = Object.freeze({
  HELLO: 1,
  WELCOME: 2,
  REJECT: 3,
  READY: 4,
  PHASE: 5,
  INPUT: 6,
  SNAPSHOT: 7,
  RESULT: 8,
  RESYNC: 9,
});

export const PROTOCOL = PVP_PROTOCOL_VERSION;
export const SIM_VERSION = PVP_SIM_VERSION;
export const CONTENT = CONTENT_FINGERPRINT;
export const FREE_MATCH_NAME = MATCH_NAME;

const ID_RE = /^[A-Za-z0-9_.:@|-]{1,80}$/;
const HOSTILE = new Set([
  'winner', 'result', 'settle', 'earn', 'earnTickets', 'stake', 'wager', 'tickets',
  'god', 'godMode', 'debug', 'refund',
]);

export function validId(value) {
  return typeof value === 'string' && value.length <= INPUT_LIMITS.maxIdLength && ID_RE.test(value);
}

export function hostileReason(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'malformed';
  const keys = Object.keys(body);
  for (let i = 0; i < keys.length; i++) {
    if (HOSTILE.has(keys[i])) return 'client_result';
  }
  return null;
}

export function versionsMatch(body) {
  return !!body
    && body.protocol === PVP_PROTOCOL_VERSION
    && body.sim === PVP_SIM_VERSION
    && body.content === CONTENT_FINGERPRINT;
}

export function bytesToAscii(data) {
  if (typeof data === 'string') return data;
  if (!data || typeof data.length !== 'number') return '';
  let out = '';
  for (let i = 0; i < data.length; i++) out += String.fromCharCode(data[i]);
  return out;
}

export function parseJsonBody(data) {
  try {
    const value = JSON.parse(bytesToAscii(data) || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, reason: 'malformed' };
    return { ok: true, body: value };
  } catch {
    return { ok: false, reason: 'malformed' };
  }
}

export function matchmakerProps(fingerprint = CONTENT_FINGERPRINT) {
  return {
    query: '+properties.game:sproto-shooter +properties.mode:free +properties.protocol:1',
    minCount: 2,
    maxCount: 2,
    stringProperties: {
      game: 'sproto-shooter',
      mode: 'free',
      protocol: String(PVP_PROTOCOL_VERSION),
      sim: String(PVP_SIM_VERSION),
      content: fingerprint,
    },
  };
}
