// Player input, movement, combat (firing/reload/swap), vitals. PLAN §4.4, §7.1
import { abyssY } from './campaign/abyss.js';
import { TUNING, ARENA_R } from '../data/tuning.js';
import { applyGravity, stepLocomotion, tickDowned } from './gameplay.js';
import { GUN_TYPES_BY_ID, hasInfiniteReserve, gunRange, rangeFalloff, slotUsable, SLOT_COUNT } from '../data/guns.js';
import { float, range } from '../core/rng.js';
import { dirFromYawPitch, deg, clamp } from '../core/math.js';
import { emit } from './events.js';
import { clampToArena, pushOutOfBoxes, raycastEnemies, rayWorld, eyePos, playerHeight } from './collision.js';
import { activeSolids, campaignSolidsOn, firstSolid, groundHeight, pushHorizontal, snapToGround, voidAt, STEP_UP } from './campaign/solids.js';
import { clampToRoom, sealOf, tickGrapple } from './grapple.js';
import { damageLevelSolid } from './campaign/mechanisms.js';
import { alarmRay, damageAlarm } from './campaign/alarms.js';
import { effectiveGunStats } from './guns.js';
import { damageEnemy, damagePlayer, healPlayer, explode } from './combat.js';
import { createProjectile } from './state.js';

const EMPTY_CMD = { yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {}, slot: -1, wheel: 0, actions: [] };

export function playerInput(state, commands) {
  for (const p of Object.values(state.players)) {
    const c = commands[p.id] || { ...EMPTY_CMD, yaw: p.yaw, pitch: p.pitch };
    p.cmd = c;
    p.yaw = c.yaw;
    p.pitch = clamp(c.pitch, -1.5, 1.5);
    p.zooming = !!c.held.zoom && !p.dead;
  }
}

export function playerMovement(state, dt) {
  for (const p of Object.values(state.players)) {
    if (p.dead) { p.vel.x = p.vel.z = 0; continue; }
    const c = p.cmd;
    if (p.stamina == null) {
      p.stamina = 1;
      p.staminaDelay = 0;
      p.staminaLock = false;
      p.grappleCd = 0;
      p.grapple = null;
    }
    const scales = [];
    if (p.campaignSpeed) scales.push(p.campaignSpeed);
    if (state.mode === 'campaign' && p.hazardSlow != null && p.hazardSlow < 1) scales.push(p.hazardSlow);
    if (p.iceSlow != null && p.iceSlow < 1) scales.push(p.iceSlow);
    if (state.mode === 'campaign' && p.scriptSlow != null && p.scriptSlow < 1) scales.push(p.scriptSlow);
    const solidsNow = activeSolids(state);
    const body = {
      pos: p.pos,
      vel: p.vel,
      yaw: p.yaw,
      pitch: p.pitch,
      onGround: p.onGround,
      downed: !!p.downed,
      zooming: !!p.zooming,
      stamina: p.stamina,
      staminaDelay: p.staminaDelay,
      staminaLock: !!p.staminaLock,
      coyoteT: p.coyoteT || 0,
      jumpBufferT: p.jumpBufferT || 0,
      jumpsLeft: p.jumpsLeft == null ? 2 : p.jumpsLeft,
      invulnT: p.invulnT || 0,
      grapple: p.grapple,
      move: p.move,
      speedScales: scales,
      zoomCancelled: !!p.zoomCancelled,
    };
    stepLocomotion(body, {
      moveX: c.moveX || 0,
      moveZ: c.moveZ || 0,
      sprint: !!(c.held && c.held.sprint),
      jump: !!(c.pressed && c.pressed.jump),
      dash: !!(c.pressed && c.pressed.dash),
      slide: !!(c.pressed && c.pressed.slide),
      crouch: !!(c.held && c.held.crouch),
      zoom: !!(c.held && c.held.zoom),
    }, dt, {
      groundAt: solidsNow
        ? (x, z, radius, feet, reach) => groundHeight(solidsNow, x, z, radius, feet, reach)
        : null,
      emit: (name) => emit(state, name, { playerId: p.id }),
    });
    p.onGround = body.onGround;
    p.stamina = body.stamina;
    p.staminaDelay = body.staminaDelay;
    p.staminaLock = body.staminaLock;
    p.coyoteT = body.coyoteT;
    p.jumpBufferT = body.jumpBufferT;
    p.jumpsLeft = body.jumpsLeft;
    p.invulnT = body.invulnT;
    p.zooming = !!body.zooming;
    // Absent unless sprint has cancelled zoom, so replays that never do that keep their hash.
    if (body.zoomCancelled) p.zoomCancelled = true;
    else delete p.zoomCancelled;

    const seal = sealOf(state, p);
    const m = p.move;
    // Apply gravity and jetpack thrust before the grapple limits the speed.
    applyGravity(body, dt);
    if (state.mode === 'campaign' && state.level && state.level.gravityMult !== 1 && m.mode !== 'dash') {
      p.vel.y -= TUNING.gravity * (state.level.gravityMult - 1) * dt;
    }
    if (state.mode === 'campaign' && p.jetpack && state.level) {
      const lv = state.level;
      if (lv.fuel == null) lv.fuel = 0;
      const infinite = !!(lv.modifiers && lv.modifiers.fuelInfinite);
      const drop = !p.onGround && (c.pressed.slide || (c.held && c.held.slide));
      if (drop) p.vel.y = Math.min(p.vel.y, -16);
      else if (!p.onGround && c.held.jump && (infinite || lv.fuel > 0)) {
        // Undo this frame's gravity and damp, so holding jump keeps the altitude.
        p.vel.y += TUNING.gravity * dt;
        p.vel.y *= Math.max(0, 1 - 8 * dt);
        if (!infinite) lv.fuel = Math.max(0, lv.fuel - 10 * dt);
      }
      if (p.onGround && !infinite && lv.fuel < 100) lv.fuel = Math.min(100, lv.fuel + 25 * dt);
    }
    tickGrapple(state, p, dt);
    p.pos.x += p.vel.x * dt; p.pos.y += p.vel.y * dt; p.pos.z += p.vel.z * dt;
    const wasAir = !p.onGround;
    const solids = activeSolids(state);
    if (solids) {
      pushHorizontal(p, solids, TUNING.playerRadius, playerHeight(p), STEP_UP);
      const beforeY = p.pos.y;
      snapToGround(p, solids, TUNING.playerRadius, STEP_UP);
      if (wasAir && p.onGround && beforeY - p.pos.y > 0.05 && p.vel.y < -6) {
        emit(state, 'land', { playerId: p.id, speed: 6 });
      }
      const hole = voidAt(p.pos, state.level.voids);
      if (hole) {
        const safe = state.level.safePos;
        const useSafe = hole.mode !== 'fixed' && safe;
        const dest = useSafe ? [safe.x, safe.y, safe.z] : hole.to;
        if (dest) {
          p.pos.x = dest[0]; p.pos.y = dest[1]; p.pos.z = dest[2];
          p.vel.x = p.vel.y = p.vel.z = 0;
          p.onGround = true;
          if (hole.penalty) damagePlayer(state, p, { base: p.maxHp * hole.penalty, sourceKind: 'world', fromPos: p.pos });
          if (hole.invuln) p.invulnT = Math.max(p.invulnT || 0, hole.invuln);
          emit(state, 'voidRescue', { id: hole.id || 'void', penalty: hole.penalty || 0 });
        }
      } else if (p.onGround && state.level.voids) {
        state.level.safePos = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
      }
      if (p.pos.y < abyssY(state.level)) {
        // Off the level and past the death floor. No second wind down there: straight to the death screen,
        // which offers the last checkpoint.
        p.hp = 0; p.shield = 0; p.vel.x = p.vel.y = p.vel.z = 0;
        p.dead = true; p.downed = false; p.respawnT = TUNING.sandboxRespawn;
        emit(state, 'playerFell', { playerId: p.id });
        emit(state, 'playerDied', { playerId: p.id });
      }
    } else if (p.pos.y <= 0) {
      p.pos.y = 0;
      if (p.vel.y < 0) { if (wasAir && p.vel.y < -6) emit(state, 'land', { playerId: p.id, speed: -p.vel.y }); p.vel.y = 0; }
      p.onGround = true;
    } else p.onGround = false;
    if (seal) clampToRoom(p, seal);
    if (state.mode === 'campaign' && p.jetpack && state.level) {
      const lids = state.level.flyerLids || (state.level.flyerVolume ? [state.level.flyerVolume] : []);
      for (const lid of lids) {
        if (!lid || !lid.max || !lid.min) continue;
        if (p.pos.x < lid.min[0] || p.pos.x > lid.max[0] || p.pos.z < lid.min[2] || p.pos.z > lid.max[2]) continue;
        const cap = lid.max[1] - 2;
        if (p.pos.y > cap) { p.pos.y = cap; if (p.vel.y > 0) p.vel.y = 0; }
      }
    }
    if (state.mode !== 'campaign') {
      clampToArena(p, TUNING.playerRadius);
      pushOutOfBoxes(state, p, TUNING.playerRadius);
    }
  }
}

function activeGun(p) { return p.guns[p.activeSlot]; }

function switchSlot(state, p, slot) {
  if (slot === p.activeSlot || !slotUsable(p, slot) || !p.guns[slot]) return;
  p.activeSlot = slot;
  p.reloadT = 0;
  const g = p.guns[slot];
  p.swapT = effectiveGunStats(g, p).swapTime;
  p.fireCd = Math.max(p.fireCd, 0);
  emit(state, 'swap', { playerId: p.id, slot });
}

function startReload(state, p, g) {
  if (p.reloadT > 0 || g.ammoInMag >= g.stats.magSize) return;
  const free = state.tuning.infiniteAmmo || state.tuning.godMode || hasInfiniteReserve(g); // god mode: every gun has endless spare ammo
  if (!free && p.ammo[g.ammoType] <= 0) { emit(state, 'ammoEmpty', { playerId: p.id }); return; }
  const st = effectiveGunStats(g, p);
  p.reloadT = st.reloadTime;
  emit(state, 'reloadStart', { playerId: p.id, slot: p.activeSlot, time: st.reloadTime });
  if (g.wacky === 'yeetReload') {
    const eye = eyePos(p);
    const d = dirFromYawPitch(p.yaw, p.pitch + 0.15);
    createProjectile(state, {
      kind: 'yeetGun', faction: 'player', ownerId: p.id, gunId: g.id, sourceKind: 'gun',
      pos: { x: eye.x + d.x * 0.6, y: eye.y + d.y * 0.6, z: eye.z + d.z * 0.6 }, vel: { x: d.x * 20, y: d.y * 20 + 3, z: d.z * 20 },
      radius: 0.3, gravity: 18, damage: g.stats.damage * 3, element: g.element, elementChance: 1, ttl: 3,
      splash: { radius: 3.5, damage: g.stats.damage * g.stats.pellets * 4 + 40, minFalloff: 0.3, selfMult: 0, knockback: 8 },
    });
  }
}

function finishReload(state, p, g) {
  const need = g.stats.magSize - g.ammoInMag;
  const free = state.tuning.infiniteAmmo || state.tuning.godMode || hasInfiniteReserve(g); // god mode: every gun has endless spare ammo
  const take = free ? need : Math.min(need, p.ammo[g.ammoType]);
  if (!free) p.ammo[g.ammoType] -= take;
  g.ammoInMag += take;
  emit(state, 'reloadEnd', { playerId: p.id, slot: p.activeSlot });
}

function coneDir(state, aim, spreadDeg) {
  if (spreadDeg <= 0) return aim;
  const theta = deg(spreadDeg) * Math.sqrt(float(state.rng));
  const phi = float(state.rng) * Math.PI * 2;
  // build basis
  const up = Math.abs(aim.y) < 0.99 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  let rx = aim.y * up.z - aim.z * up.y, ry = aim.z * up.x - aim.x * up.z, rz = aim.x * up.y - aim.y * up.x;
  const rl = Math.hypot(rx, ry, rz); rx /= rl; ry /= rl; rz /= rl;
  const ux = ry * aim.z - rz * aim.y, uy = rz * aim.x - rx * aim.z, uz = rx * aim.y - ry * aim.x;
  const st = Math.sin(theta), ct = Math.cos(theta), cp = Math.cos(phi), sp = Math.sin(phi);
  return { x: aim.x * ct + (rx * cp + ux * sp) * st, y: aim.y * ct + (ry * cp + uy * sp) * st, z: aim.z * ct + (rz * cp + uz * sp) * st };
}

export function fireHitscan(state, p, g, st, origin, dir, extra = {}) {
  let o = origin;
  const ignore = {};
  const rng = gunRange(g); // shots stop at the gun's max range and lose damage past its full-damage range
  let remaining = Math.min(TUNING.hitscanRange, rng.max);
  if (campaignSolidsOn(state)) {
    const solids = activeSolids(state);
    if (solids) {
      const wall = firstSolid(solids, origin, dir, remaining);
      if (wall && !damageLevelSolid(state, wall.solid, { base: st.damage, sourceKind: 'gun' })) remaining = wall.t;
    }
    const alarm = alarmRay(state, origin, dir, remaining);
    if (alarm) {
      damageAlarm(state, alarm, st.damage);
      remaining = alarm.t;
    }
  }
  let pierce = st.pierce;
  let end = null;
  for (let i = 0; i <= pierce; i++) {
    const hit = raycastEnemies(state, o, dir, remaining, ignore);
    if (!hit) break;
    const dist = Math.hypot(hit.point.x - origin.x, hit.point.y - origin.y, hit.point.z - origin.z);
    damageEnemy(state, hit.e, {
      sourceId: p.id, sourceKind: 'gun', base: st.damage * (extra.dmgMult || 1) * rangeFalloff(rng, dist), element: g.element, elementChance: st.elementChance,
      zone: hit.zone, critChance: st.critChance, critMult: st.critMult, canCrit: true, pellet: st.pellets > 1, point: hit.point,
      gunId: g.id, arcane: g.arcane, wacky: g.wacky,
    });
    ignore[hit.e.id] = true;
    end = hit.point;
    remaining -= hit.t;
    o = { x: hit.point.x + dir.x * 0.05, y: hit.point.y + dir.y * 0.05, z: hit.point.z + dir.z * 0.05 };
    if (i === pierce) break;
  }
  if (!end) {
    const t = rayWorld(origin, dir, Math.min(60, rng.max));
    end = { x: origin.x + dir.x * t, y: origin.y + dir.y * t, z: origin.z + dir.z * t };
    if (origin.y + dir.y * t <= 0.01) emit(state, 'impact', { pos: end, element: g.element });
  }
  emit(state, 'tracer', { from: origin, to: end, element: g.element, gunType: g.type, mega: !!extra.mega });
}

export function playerCombat(state, dt) {
  for (const p of Object.values(state.players)) {
    if (p.dead) continue;
    const c = p.cmd;
    // medkit
    if (p.medkitT > 0) {
      p.medkitT -= dt;
      if (p.medkitT <= 0) {
        healPlayer(p, TUNING.medkitHeal);
        emit(state, 'pickup', { playerId: p.id, kind: 'medkit', amount: TUNING.medkitHeal });
      }
    } else if (c.pressed.medkit && p.medkits > 0 && p.hp < p.maxHp && !p.downed) {
      p.medkits--; p.medkitT = TUNING.medkitTime;
      emit(state, 'medkitStart', { playerId: p.id });
    }

    // slot switching
    if (c.slot >= 0) switchSlot(state, p, c.slot);
    else if (c.wheel) {
      for (let i = 1; i <= SLOT_COUNT; i++) {
        const s = (p.activeSlot + c.wheel * i + SLOT_COUNT * SLOT_COUNT) % SLOT_COUNT;
        if (slotUsable(p, s) && p.guns[s]) { switchSlot(state, p, s); break; }
      }
    }

    // recoil recovery
    const rec = p.recoil;
    const recoverRate = deg(9) * dt * (c.held.fire ? 0.35 : 1);
    rec.pitch = Math.max(0, rec.pitch - recoverRate - rec.pitch * 4 * dt * (c.held.fire ? 0.2 : 1));
    rec.yaw *= Math.max(0, 1 - 6 * dt);
    if (!c.held.fire) rec.heat = Math.max(0, rec.heat - 1.5 * dt);

    const g = activeGun(p);
    if (!g) continue;
    const st = effectiveGunStats(g, p);
    if (p.swapT > 0) { p.swapT -= dt; continue; }
    if (p.reloadT > 0) {
      p.reloadT -= dt;
      if (p.reloadT <= 0) { p.reloadT = 0; finishReload(state, p, g); }
      continue;
    }
    if (c.pressed.reload) { startReload(state, p, g); continue; }
    p.fireCd = Math.max(-0.05, p.fireCd - dt);
    if (!c.held.fire || p.fireCd > 0 || p.medkitT > 0) continue;
    if (g.ammoInMag <= 0) { startReload(state, p, g); continue; }
    p.fireCd += 1 / st.fireRate;
    if (!(st.ammoSaveChance > 0 && float(state.rng) < st.ammoSaveChance) && !state.tuning.infiniteAmmo) g.ammoInMag--;
    p.shotCounter++;
    const mega = g.wacky === 'tenthMega' && p.shotCounter % 10 === 0;
    const eye = eyePos(p);
    const aim = dirFromYawPitch(p.yaw + rec.yaw, p.pitch + rec.pitch);
    const muzzle = { x: eye.x + aim.x * 0.5, y: eye.y + aim.y * 0.5 - 0.12, z: eye.z + aim.z * 0.5 };
    if (mega) {
      createProjectile(state, {
        kind: 'megaBullet', ownerId: p.id, gunId: g.id, pos: muzzle, vel: { x: aim.x * 40, y: aim.y * 40, z: aim.z * 40 },
        radius: 0.6, damage: st.damage * st.pellets * 6, element: g.element, elementChance: 1, critMult: st.critMult, pierce: 5, ttl: 3, arcane: g.arcane,
        splash: { radius: 3, damage: st.damage * st.pellets * 3, minFalloff: 0.4, selfMult: 0, knockback: 6 },
      });
    } else if (GUN_TYPES_BY_ID[g.type].projectile === 'rubberBullet') {
      // Duck Gun: a lobbed rubber bullet; one bounce off the floor or wall, explodes on what it hits or where it lands
      const d = coneDir(state, aim, st.spread);
      createProjectile(state, {
        kind: 'rubberBullet', ownerId: p.id, gunId: g.id, pos: muzzle, vel: { x: d.x * st.projectileSpeed, y: d.y * st.projectileSpeed + 2.5, z: d.z * st.projectileSpeed },
        radius: 0.24, gravity: 14, bounces: 1, damage: st.damage, element: g.element, elementChance: st.elementChance, critMult: st.critMult,
        critChance: st.critChance, ttl: 4, arcane: g.arcane, wacky: g.wacky,
        splash: { radius: st.splashRadius, damage: st.splashDamage, minFalloff: 0.35, selfMult: 0, knockback: 9 },
      });
    } else if (GUN_TYPES_BY_ID[g.type].projectile === 'bigBullet') {
      // Big Bullets: a visible heavy round, slight drop, crits, punches through `pierce` targets, bursts on impact
      const d = coneDir(state, aim, st.spread);
      createProjectile(state, {
        kind: 'bigBullet', ownerId: p.id, gunId: g.id, pos: muzzle, vel: { x: d.x * st.projectileSpeed, y: d.y * st.projectileSpeed, z: d.z * st.projectileSpeed },
        radius: 0.32, gravity: 4, damage: st.damage, element: g.element, elementChance: st.elementChance, critMult: st.critMult, critChance: st.critChance,
        pierce: st.pierce, ttl: 3, arcane: g.arcane, wacky: g.wacky,
        splash: { radius: st.splashRadius, damage: st.splashDamage, minFalloff: 0.4, selfMult: 0, knockback: 7 },
      });
    } else if (st.projectileSpeed > 0) {
      const d = coneDir(state, aim, st.spread);
      createProjectile(state, {
        kind: 'rocket', ownerId: p.id, gunId: g.id, pos: muzzle, vel: { x: d.x * st.projectileSpeed, y: d.y * st.projectileSpeed, z: d.z * st.projectileSpeed },
        radius: 0.2, damage: st.damage, element: g.element, elementChance: st.elementChance, critMult: st.critMult, ttl: 5, arcane: g.arcane, wacky: g.wacky,
        splash: { radius: st.splashRadius, damage: st.splashDamage, minFalloff: 0.3, selfMult: 0.35, knockback: 8 },
      });
    } else if (g.wacky === 'rubberDuck') {
      for (let i = 0; i < st.pellets; i++) {
        const d = coneDir(state, aim, st.spread + 1);
        createProjectile(state, {
          kind: 'duckBullet', ownerId: p.id, gunId: g.id, pos: muzzle, vel: { x: d.x * 45, y: d.y * 45, z: d.z * 45 },
          radius: 0.18, gravity: 10, damage: st.damage * 1.15, element: g.element, elementChance: st.elementChance, critMult: st.critMult,
          critChance: st.critChance, bounces: 3, ttl: 3, arcane: g.arcane, wacky: g.wacky, pellet: st.pellets > 1,
        });
      }
    } else {
      for (let i = 0; i < st.pellets; i++) fireHitscan(state, p, g, st, eye, coneDir(state, aim, st.spread));
    }
    // recoil
    rec.pitch += deg(st.recoil) * (1 + rec.heat * 0.6);
    rec.yaw += deg(st.recoilYaw) * range(state.rng, -1, 1);
    rec.pitch = Math.min(rec.pitch, deg(25));
    rec.heat = Math.min(1, rec.heat + 0.08);
    emit(state, 'shot', { playerId: p.id, gunId: g.id, gunType: g.type, manufacturer: g.manufacturer, element: g.element, mega });
    if (g.ammoInMag <= 0) startReload(state, p, g);
  }
}

export function playerVitals(state, dt) {
  for (const p of Object.values(state.players)) {
    p.invulnT = Math.max(0, p.invulnT - dt);
    p.lastDamageT += dt;
    p.lifestealBudget = Math.min(4, p.lifestealBudget + 4 * dt);
    p.xpCaps.dmg = Math.max(0, p.xpCaps.dmg - 15 * dt);
    p.xpCaps.weak = Math.max(0, p.xpCaps.weak - 10 * dt);
    const kf = p.buffs.killFrenzy;
    if (kf.stacks > 0) { kf.t -= dt; if (kf.t <= 0) kf.stacks = 0; }
    if (p.dead) {
      p.respawnT -= dt;
      if (state.mode === 'sandbox' && p.respawnT <= 0) respawn(state, p);
      continue;
    }
    if (p.downed) {
      if (tickDowned(p, dt)) {
        p.dead = true;
        p.respawnT = TUNING.sandboxRespawn;
        emit(state, 'playerDied', { playerId: p.id });
      }
      continue;
    }
    // shield
    if (p.shieldDelayT > 0) {
      p.shieldDelayT -= dt;
      if (p.shieldDelayT <= 0 && p.shield < p.maxShield) emit(state, 'shieldRegenStart', { playerId: p.id });
    } else if (p.shield < p.maxShield) {
      p.shield = Math.min(p.maxShield, p.shield + TUNING.shieldRegen * (p.perks.quickShield ? TUNING.quickShieldRegenMult : 1) * dt);
    }
    // mana
    const inAura = p.inAuraT > 0;
    if (p.spells.manaShieldOn) {
      p.mana -= 4 * dt;
      if (p.mana <= 0) { p.mana = 0; p.spells.manaShieldOn = false; emit(state, 'manaShieldOff', { playerId: p.id }); }
    } else if (!inAura) {
      p.mana = Math.min(p.maxMana, p.mana + TUNING.manaRegen * dt);
    }
    if (state.tuning.godMode) { p.mana = p.maxMana; godTopUp(p); } // god mode: infinite mana (cooldowns still apply), vast resources
    if (p.inAuraT > 0) p.inAuraT -= dt;
  }
}

/** God mode: tickets, ammo and medkits never drop below these (called on toggle and every tick). */
export function godTopUp(p) {
  if (p.tickets < TUNING.godTickets) p.tickets = TUNING.godTickets;
  for (const k of Object.keys(p.ammoCap)) if (p.ammo[k] < p.ammoCap[k]) p.ammo[k] = p.ammoCap[k];
  if (p.medkits < TUNING.medkitCarry) p.medkits = TUNING.medkitCarry;
}

export function respawn(state, p) {
  p.dead = false; p.downed = false;
  p.hp = p.maxHp; p.shield = p.maxShield; p.mana = p.maxMana;
  p.pos = { x: 0, y: 0, z: 8 }; p.prevPos = { ...p.pos }; p.vel = { x: 0, y: 0, z: 0 };
  p.invulnT = 2; p.unkillableUsed = false;
  if (p.downCount != null) delete p.downCount;
  emit(state, 'playerRespawn', { playerId: p.id });
}

export { GUN_TYPES_BY_ID, ARENA_R };
