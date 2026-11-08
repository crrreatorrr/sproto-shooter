// Canonical campaign encounters for server-issued runs.
// Balance tables are read, not rewritten. A flee is not a terminal boss kill.
import { CAMPAIGN_LEVELS } from './levels/campaign.js';
import { DUEL_BOSSES } from './duelBosses.js';
import { GUN_TYPES, QUALITIES, MANUFACTURERS, PARTS, ELEMENTS } from './guns.js';
import { TUNING } from './tuning.js';
import { SPELLS } from './skills.js';
import { fnv1a, stableStringify } from '../sim/hash.js';

/** One payable boss. obamaDuo and midgetDuo are parts of obama, not two bosses. */
export const CANONICAL_BOSSES = [
  {
    id: 'sahil',
    duelId: 'sahil',
    levelId: 'L02',
    encounterId: 'S4-E4',
    parts: ['sahil'],
  },
  {
    id: 'obama',
    duelId: 'obama',
    levelId: 'L04',
    encounterId: 'S3-E3',
    parts: ['obamaDuo', 'midgetDuo'],
    countAs: 1,
  },
  {
    id: 'broccoli',
    duelId: 'broccoli',
    levelId: 'L06',
    encounterId: 'S4-E4',
    parts: ['broccoli'],
  },
  {
    // Shooter's glowie is not Duel's agent, and glowieAgent is a regular enemy.
    id: 'glowie',
    duelId: null,
    distinctFrom: ['agent', 'glowieAgent'],
    levelId: 'L08',
    encounterId: 'S4-E4',
    parts: ['glowie'],
  },
  {
    id: 'tinubu',
    duelId: 'tinubu',
    levelId: 'L10',
    encounterId: 'S3-E3',
    parts: ['tinubu'],
  },
];

const BY_ID = Object.fromEntries(CANONICAL_BOSSES.map((b) => [b.id, b]));

export function bossById(id) {
  return BY_ID[id] || null;
}

/** Why a Duel-shaped or part id cannot be issued as its own boss. */
export function rejectedBossReason(id) {
  if (id === 'agent' || id === 'glowieAgent') return 'glowie_not_agent';
  if (id === 'obamaDuo' || id === 'midgetDuo') return 'obama_is_one';
  return null;
}

export function findEncounter(levelId, encounterId) {
  const level = CAMPAIGN_LEVELS.find((l) => l.id === levelId);
  if (!level) return null;
  for (const section of level.sections) {
    const encounter = (section.encounters || []).find((e) => e.id === encounterId);
    if (encounter) return { level, section, encounter };
  }
  return null;
}

export function listBossObjectives() {
  const out = [];
  for (const level of CAMPAIGN_LEVELS) {
    for (const section of level.sections) {
      for (const enc of section.encounters || []) {
        if (!enc.objective || enc.objective.kind !== 'boss') continue;
        const units = [];
        for (const squad of enc.squads || []) {
          for (const u of squad.units || []) units.push({ type: u.type, count: u.count });
        }
        out.push({
          levelId: level.id,
          sectionId: section.id,
          encounterId: enc.id,
          fleeAt: enc.fleeAt || 0,
          units,
        });
      }
    }
  }
  return out;
}

function sameParts(units, parts) {
  const got = units.map((u) => u.type).slice().sort();
  const want = parts.slice().sort();
  if (got.length !== want.length) return false;
  for (let i = 0; i < got.length; i++) if (got[i] !== want[i]) return false;
  return units.every((u) => u.count === 1);
}

/** Throws if the allowlist no longer matches the campaign data. */
export function assertCanonicalManifest() {
  for (const boss of CANONICAL_BOSSES) {
    const found = findEncounter(boss.levelId, boss.encounterId);
    if (!found) throw new Error(`missing canonical encounter ${boss.id}`);
    if (found.encounter.fleeAt) throw new Error(`${boss.id} encounter flees and cannot pay`);
    const units = [];
    for (const squad of found.encounter.squads || []) {
      for (const u of squad.units || []) units.push(u);
    }
    if (!sameParts(units, boss.parts)) throw new Error(`${boss.id} parts drifted`);
    for (let i = 0; i < boss.parts.length; i++) {
      const part = boss.parts[i];
      if (!DUEL_BOSSES[part] || DUEL_BOSSES[part].id !== part) throw new Error(`${boss.id} part ${part} drifted`);
    }
    if (boss.id === 'glowie' && (DUEL_BOSSES.agent || DUEL_BOSSES.glowieAgent)) {
      throw new Error('glowie collided with a Duel agent id');
    }
    if ((boss.countAs || 1) !== 1) throw new Error(`${boss.id} must count as one boss`);
  }
}

function gunBalance(g) {
  return {
    id: g.id,
    ammoType: g.ammoType,
    bossOnly: !!g.bossOnly,
    legendaryOnly: !!g.legendaryOnly,
    infiniteReserve: !!g.infiniteReserve,
    beam: !!g.beam,
    projectile: g.projectile || null,
    range: g.range || null,
    base: g.base,
  };
}

function encounterFacts(boss) {
  const found = findEncounter(boss.levelId, boss.encounterId);
  const units = [];
  for (const squad of found.encounter.squads) {
    for (const u of squad.units) units.push({ type: u.type, count: u.count });
  }
  return {
    id: boss.id,
    duelId: boss.duelId,
    distinctFrom: boss.distinctFrom || [],
    levelId: boss.levelId,
    encounterId: boss.encounterId,
    sectionStart: found.section.start,
    fleeAt: found.encounter.fleeAt || 0,
    units,
    hp: boss.parts.map((part) => ({ part, hp: DUEL_BOSSES[part] ? DUEL_BOSSES[part].hp : null })),
  };
}

/** Deterministic content id. Gameplay numbers live here so a balance edit changes the pin. */
export function contentBody(protocolVersion) {
  return {
    protocol: protocolVersion,
    bosses: CANONICAL_BOSSES,
    encounters: CANONICAL_BOSSES.map(encounterFacts),
    guns: GUN_TYPES.map(gunBalance),
    qualities: QUALITIES.map((q) => ({
      id: q.id, damageMult: q.damageMult, magMult: q.magMult, reloadMult: q.reloadMult, spreadMult: q.spreadMult,
    })),
    manufacturers: MANUFACTURERS.map((m) => ({ id: m.id, mods: m.mods, add: m.add, alwaysElement: !!m.alwaysElement })),
    parts: PARTS.map((p) => ({ id: p.id, mods: p.mods, add: p.add })),
    elements: ELEMENTS.map((e) => ({ id: e.id, proc: e.proc || null })),
    spells: SPELLS,
    tuning: TUNING,
  };
}

export function contentFingerprint(protocolVersion) {
  return fnv1a(stableStringify(contentBody(protocolVersion)));
}

assertCanonicalManifest();
