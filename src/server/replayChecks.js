// Shared legacy replay checks. Keep semantics identical for protocol 1.
export function runtimeCheat(state) {
  const t = state.tuning || {};
  if (t.godMode) return 'god_mode';
  if (t.infiniteAmmo || t.freezeEnemies || t.unlockAllRecipes) return 'debug';
  if (t.enemyHpMult !== 1 || t.enemyDmgMult !== 1) return 'debug';
  if (state.mode !== 'campaign' || state.testMode || state.bossFight) return 'debug';
  return null;
}

const SIM_GUN_SOURCES = { start: 1, world: 1, boss: 1, drop: 1 };

export function inventoryCheat(state) {
  const p = state.players[state.localPlayerId];
  if (!p) return 'malformed';
  for (let i = 0; i < p.guns.length; i++) {
    const g = p.guns[i];
    if (g && !SIM_GUN_SOURCES[g.source]) return 'injected_inventory';
  }
  for (let i = 0; i < state.pickups.length; i++) {
    const gun = state.pickups[i].gun;
    if (gun && !SIM_GUN_SOURCES[gun.source]) return 'injected_inventory';
  }
  return null;
}

function emptyPart(type) {
  return { type, spawned: false, dead: false, fled: false, sourceKind: null, sourceId: null };
}

export function noteParts(seen, state, boss) {
  for (let i = 0; i < boss.parts.length; i++) {
    const type = boss.parts[i];
    const prev = seen[type] || emptyPart(type);
    const matches = [];
    for (let e = 0; e < state.enemies.length; e++) {
      const enemy = state.enemies[e];
      if (enemy.type === type && enemy.boss) matches.push(enemy);
    }
    const enemy = matches.length ? matches[matches.length - 1] : null;
    if (!enemy) { seen[type] = prev; continue; }
    prev.spawned = true;
    if (enemy.fled) prev.fled = true;
    if (enemy.dead && enemy.hp <= 0) {
      prev.dead = true;
      if (enemy.lastHit) {
        prev.sourceKind = enemy.lastHit.sourceKind;
        prev.sourceId = enemy.lastHit.sourceId;
      }
    }
    seen[type] = prev;
  }
}

export function classify(seen, boss, playerDead, playerId) {
  const parts = [];
  for (let i = 0; i < boss.parts.length; i++) parts.push(seen[boss.parts[i]] || emptyPart(boss.parts[i]));
  if (playerDead) return { outcome: 'fail', reason: 'player_down', parts, eligible: false };
  if (parts.some((part) => part.fled)) return { outcome: 'fail', reason: 'boss_fled', parts, eligible: false };
  if (!parts.every((part) => part.dead)) return { outcome: 'incomplete', reason: 'boss_alive', parts, eligible: false };
  const clean = parts.every((part) => (part.sourceKind === 'gun' || part.sourceKind === 'splash') && part.sourceId === playerId);
  if (!clean) return { outcome: 'assisted', reason: 'assisted', parts, eligible: false };
  return { outcome: 'clear', reason: 'boss_clear', parts, eligible: true };
}

/** A lockdown rewind or a void rescue snaps the player. That jump is the sim, not a forged teleport. */
export function checkpointRestored(state) {
  const events = state && state.events;
  if (!events) return false;
  for (let i = 0; i < events.length; i++) {
    const type = events[i].type;
    if (type === 'lockdownReset' || type === 'voidRescue') return true;
  }
  return false;
}

