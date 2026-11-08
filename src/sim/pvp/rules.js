// Free 1v1 arena rules. No loot, no perks, no Tickets. Both seats share one loadout.
import { TUNING } from '../../data/tuning.js';
import { GUN_TYPES_BY_ID, MANUFACTURERS_BY_ID, QUALITIES_BY_ID } from '../../data/guns.js';
import { fnv1a, stableStringify } from '../hash.js';

export const PVP_PROTOCOL_VERSION = 2;
export const PVP_SIM_VERSION = 1;
export const MATCH_NAME = 'sproto_shooter_free';
export const GAME_ID = 'sproto-shooter';

export const TICK_HZ = 30;
export const DT = 1 / TICK_HZ;
export const STEP_MS = 1000 / TICK_HZ;
export const MATCH_SECONDS = 90;
export const MATCH_TICKS = MATCH_SECONDS * TICK_HZ;
/** Hard ceiling for a later server watchdog. The sim itself ends at MATCH_TICKS. */
export const MAX_MATCH_MS = 10 * 60 * 1000;
export const READY_MS = 30 * 1000;
export const STALL_MS = 10 * 1000;
export const SEATS = 2;
export const SPAWN_RADIUS = 16;
export const STAGE_ID = 'arena';
export const GUN_IDS = Object.freeze(['mg', 'shotgun', 'sniper']);

/**
 * Director v2 (protocol 2) input rules.
 * - Frames `cursor .. cursor + futureFrames` are queued. A frame below the cursor is late: it is
 *   accepted and discarded (it consumes its seq, refreshes the stall timer and the held aim).
 * - Sequence numbers only have to increase; gaps are allowed.
 * - Rate caps count frames, not packets: a token bucket of `maxFramesPerSecond` (refilled at that
 *   rate, so a burst after a TCP stall passes), and at most `maxFramesPerCursor` queued (not late)
 *   frames per server clock tick.
 * - A tick with no queued frame repeats the held wish for `holdTicks` ticks, then goes neutral.
 * - One advance() steps at most `catchUpTicks` ticks.
 */
export const INPUT_LIMITS = Object.freeze({
  maxFramesPerSecond: 45,
  maxFramesPerCursor: 6,
  futureFrames: 8,
  holdTicks: 3,
  catchUpTicks: 4,
  maxPingsPerSecond: 10,
  frameBytes: 16,
  maxFrame: 1000000,
  maxIdLength: 80,
  maxNameLength: 32,
  maxLeadInTicks: 90,
});

/** Ticks between the last READY and tick 0, so the first round trip of ticks can carry input. */
export const LEAD_IN_TICKS = 9;
/** Snapshots carry the state hash once per second (and on the final snapshot). */
export const HASH_EVERY_TICKS = TICK_HZ;

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

/** Common Ol' Reliable, stock parts, level 1, no element, no wacky, no stat jitter. */
export function arenaGun(typeId) {
  const def = GUN_TYPES_BY_ID[typeId];
  const man = MANUFACTURERS_BY_ID.reliable;
  const quality = QUALITIES_BY_ID.common;
  const stats = { ...def.base };
  for (const [key, mult] of Object.entries(man.mods || {})) if (key in stats) stats[key] *= mult;
  for (const [key, add] of Object.entries(man.add || {})) if (key in stats) stats[key] += add;
  stats.damage *= quality.damageMult;
  if (stats.splashDamage) stats.splashDamage *= quality.damageMult;
  stats.magSize = Math.max(1, Math.round(stats.magSize * quality.magMult));
  stats.reloadTime = Math.max(0.3, stats.reloadTime * quality.reloadMult);
  stats.spread *= quality.spreadMult;
  stats.adsSpread *= quality.spreadMult;
  stats.elementChance = 0;
  stats.splashRadius = 0;
  stats.splashDamage = 0;
  for (const key of Object.keys(stats)) {
    if (key === 'magSize' || key === 'pellets' || key === 'pierce') stats[key] = Math.round(stats[key]);
    else stats[key] = round3(stats[key]);
  }
  return {
    type: typeId,
    name: def.name,
    quality: 'common',
    manufacturer: 'reliable',
    element: 'none',
    parts: { barrel: 'stock', grip: 'stock', mag: 'stock', scope: 'stock' },
    wacky: null,
    perks: [],
    level: 1,
    ammoType: def.ammoType,
    infiniteReserve: !!def.infiniteReserve,
    range: { full: def.range.full, max: def.range.max, min: def.range.min },
    stats,
  };
}

export const LOADOUT = Object.freeze(GUN_IDS.map((id) => Object.freeze(arenaGun(id))));
export const LOADOUT_HASH = fnv1a(stableStringify(LOADOUT));

export const RESERVE = Object.freeze({
  shells: TUNING.startAmmo.shells,
  sniper: TUNING.startAmmo.sniper,
});

export function contentBody() {
  return {
    protocol: PVP_PROTOCOL_VERSION,
    sim: PVP_SIM_VERSION,
    stage: STAGE_ID,
    radius: TUNING.arenaRadius,
    spawnRadius: SPAWN_RADIUS,
    hp: TUNING.maxHp,
    shield: TUNING.maxShield,
    guns: LOADOUT,
    reserve: RESERVE,
    matchTicks: MATCH_TICKS,
    readyMs: READY_MS,
    stallMs: STALL_MS,
    perks: [],
    stakes: false,
  };
}

export function contentFingerprint() {
  return fnv1a(stableStringify(contentBody()));
}

export const CONTENT_FINGERPRINT = contentFingerprint();

/** Nakama matchmaker query: mismatched protocols or content never pair. */
export function matchmakerQuery(fingerprint = CONTENT_FINGERPRINT) {
  return `+properties.game:${GAME_ID} +properties.mode:free +properties.protocol:${PVP_PROTOCOL_VERSION} +properties.content:${fingerprint}`;
}

export const MATCHMAKER_QUERY = matchmakerQuery();

export const ECONOMY = Object.freeze({
  mintsTickets: false,
  ticketsMintedByArtifact: 0,
  payoutAuthority: 'server',
  stakes: false,
  wagerMayCreateTickets: false,
});
