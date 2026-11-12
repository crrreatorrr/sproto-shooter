// Global tuning constants (PLAN §7.1). Movement and combat numbers come from GAMEPLAY.
import { GAMEPLAY as G } from './gameplay.js';

export const TUNING = {
  arenaRadius: 45,
  spawnRadius: 43,
  spawnPointCount: 16,

  eyeHeight: G.eyeHeight, slideEye: G.slideEye, downedEye: G.downedEye,
  playerRadius: G.playerRadius, playerHeight: G.playerHeight,
  walkSpeed: G.walkSpeed, sprintSpeed: G.sprintSpeed,
  groundAccel: G.groundAccel, friction: G.friction, airAccel: G.airAccel,
  gravity: G.gravity,
  jumpVel: G.jumpVel, doubleJumpVel: G.doubleJumpVel,
  coyote: G.coyote, jumpBuffer: G.jumpBuffer,
  slideMinSpeed: G.slideMinSpeed, slideBoost: G.slideBoost, slideCruise: G.slideCruise, slideDrag: G.slideDrag, slideTime: G.slideTime,
  slideCd: G.slideCd, slideHopCd: G.slideHopCd, slideHopBoost: G.slideHopBoost, slideSlope: G.slideSlope, slideStamina: G.slideStamina,
  staminaSprint: G.staminaSprint, staminaRegenDelay: G.staminaRegenDelay, staminaRegen: G.staminaRegen, staminaRefill: G.staminaRefill,
  grappleRange: G.grappleRange, grappleCd: G.grappleCd, grapplePull: G.grapplePull, grappleSpeed: G.grappleSpeed, grappleReleaseSpeed: G.grappleReleaseSpeed, grappleArrive: G.grappleArrive,
  dashSpeed: G.dashSpeed, dashTime: G.dashTime, dashCd: G.dashCd, dashInvuln: G.dashInvuln,

  fovBase: 90, fovSprint: 6, fovAds: 70, fovScope: 12,
  // god mode keeps you at or above these while it's on
  godTickets: 99999,

  maxHp: G.maxHp, maxShield: G.maxShield, maxMana: 100,
  shieldDelay: G.shieldDelay, shieldRegen: G.shieldRegen,
  quickShieldDelay: 1.8, quickShieldRegenMult: 1.5,
  manaRegen: 5,
  secondWindTime: G.secondWindTime, reviveHpFrac: 0.3, reviveInvuln: 2, downedSpeedMult: G.downedSpeedMult,
  sandboxRespawn: 3,

  startAmmo: { bullets: 240, shells: 24, sniper: 12, rockets: 4 },
  ammoCap: { bullets: 480, shells: 64, sniper: 36, rockets: 12 },
  ammoDrop: { bullets: 45, shells: 8, sniper: 5, rockets: 2 },
  medkitHeal: 50, medkitTime: 0.8, medkitCarry: 3,
  healthOrb: 20, bigOrb: 60, manaOrb: 25,
  magnetRadius: 4, magnetAccel: 30, collectRadius: 0.9, pickupTtl: 30, gunPickupTtl: 120,
  gunPickupRadius: 2.2,
  hitscanRange: G.hitscanRange,
};

export const ARENA_R = TUNING.arenaRadius;
