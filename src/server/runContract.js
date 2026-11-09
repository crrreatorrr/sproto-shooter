// Server-issued campaign run. This module never credits Tickets.
import { createGameState } from '../sim/state.js';
import { startCampaign } from '../sim/campaign/campaign.js';
import { verifyStateHash } from '../sim/hash.js';
import { sectionById } from '../sim/level/runtime.js';
import {
  bossById, rejectedBossReason, contentFingerprint, findEncounter,
} from '../data/serverManifest.js';
import { PROTOCOL_VERSION, LIMITS, validDay, validId, inspectValue } from './protocol.js';
import { grantSpell } from '../sim/spellbook.js';

export const SOURCE_COMMIT = '0000000000000000000000000000000000000000';

/**
 * Wagers are not settled here. A later escrow may move Tickets between
 * players with no pair, IP, or transfer cap. It still cannot create Tickets:
 * wallets plus escrow stay constant. This artifact has no earn, mint, or settle.
 */
export const ECONOMY = Object.freeze({
  mintsTickets: false,
  ticketsMintedByArtifact: 0,
  payoutAuthority: 'server',
  wagerTransfersUncapped: true,
  wagerMayCreateTickets: false,
});

const LOADOUT = 'canonical-start';

function reject(reason) {
  return {
    ok: false,
    reason,
    eligible: false,
    ticketsMinted: 0,
    ranked: false,
  };
}

export function canonicalLoadoutOk(state) {
  const p = state.players[state.localPlayerId];
  if (!p || p.tickets !== 0 || p.unlockedSlots !== 4) return false;
  if (p.resources) {
    const names = Object.keys(p.resources);
    for (let i = 0; i < names.length; i++) if (p.resources[names[i]] !== 0) return false;
  }
  if (!p.skills.health || p.skills.health.level !== 1 || !p.skills.gunslinger || p.skills.gunslinger.level !== 1) return false;
  if (p.skills.magic || p.skills.crafting) return false;
  if (!p.perks.gooBolt || p.perks.craftT1 || p.perks.swarm || p.perks.meteor) return false;
  const guns = p.guns.filter(Boolean);
  if (guns.length !== 1) return false;
  const g = guns[0];
  return g.type === 'mg' && g.quality === 'common' && g.manufacturer === 'reliable'
    && g.element === 'none' && g.source === 'start' && !g.wacky;
}

/** Rebuild the only bankable start: campaign seed, authored section start, starter MG. */
export function buildIssuedState(issuance) {
  const boss = bossById(issuance.canonicalBoss);
  const state = createGameState({ seed: issuance.seed, mode: 'sandbox' });
  const p = state.players[state.localPlayerId];
  startCampaign(state, p, boss.levelId);
  const section = sectionById(boss.levelId, issuance.sectionId);
  state.level.section = section.id;
  state.level.intro = null;
  state.level.transition = null;
  state.level.won = false;
  state.level.lost = false;
  p.pos = { x: section.start[0], y: section.start[1], z: section.start[2] };
  p.prevPos = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
  p.vel = { x: 0, y: 0, z: 0 };
  p.yaw = section.yaw || 0;
  p.pitch = 0;
  state.mode = 'campaign';
  grantSpell(state, p, 'gooBolt');
  state.tuning = {
    godMode: false, enemyHpMult: 1, enemyDmgMult: 1, unlockAllRecipes: false, infiniteAmmo: false, freezeEnemies: false,
  };
  return state;
}

export function buildIssuance(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return reject('malformed');
  const hostile = inspectValue(input);
  if (hostile) return reject(hostile);
  if (input.v != null && input.v !== PROTOCOL_VERSION) return reject('unsupported_version');
  if (input.protocol != null && input.protocol !== PROTOCOL_VERSION) return reject('unsupported_version');
  if (input.loadout != null && input.loadout !== LOADOUT) return reject('injected_inventory');
  if ('profile' in input || 'guns' in input || 'loot' in input || 'inventory' in input) return reject('injected_inventory');
  if ('checkpoint' in input || 'state' in input) return reject('bad_checkpoint');
  const alias = rejectedBossReason(input.canonicalBoss);
  if (alias) return reject(alias);
  const boss = bossById(input.canonicalBoss);
  if (!boss) return reject('unknown_boss');
  if (!validId(input.accountId) || !validId(input.sessionId) || !validId(input.runId)) return reject('malformed');
  if (!validDay(input.day)) return reject('malformed');
  if (typeof input.seed !== 'number' || !Number.isInteger(input.seed) || input.seed < 1 || input.seed > 0xffffffff) {
    return reject(input.seed < 0 ? 'negative' : 'malformed');
  }
  const found = findEncounter(boss.levelId, boss.encounterId);
  if (!found) return reject('malformed');
  const issuance = {
    v: PROTOCOL_VERSION,
    protocol: PROTOCOL_VERSION,
    runId: input.runId,
    accountId: input.accountId,
    sessionId: input.sessionId,
    day: input.day,
    seed: input.seed,
    levelId: boss.levelId,
    sectionId: found.section.id,
    encounterId: boss.encounterId,
    canonicalBoss: boss.id,
    parts: boss.parts.slice(),
    countAs: 1,
    loadout: LOADOUT,
    contentFingerprint: contentFingerprint(PROTOCOL_VERSION),
    maxFrames: LIMITS.maxTotalFrames,
    duelId: boss.duelId,
    distinctFrom: boss.distinctFrom || [],
  };
  const state = buildIssuedState(issuance);
  if (!canonicalLoadoutOk(state)) return reject('injected_inventory');
  issuance.initialStateHash = verifyStateHash(state);
  return { ok: true, issuance, ticketsMinted: 0 };
}
