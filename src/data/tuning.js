// Global tuning constants (PLAN §7.1)
export const TUNING = {
  arenaRadius: 45,
  spawnRadius: 43,
  spawnPointCount: 16,

  eyeHeight: 1.6, slideEye: 0.72, downedEye: 0.6,
  playerRadius: 0.4, playerHeight: 1.8,
  walkSpeed: 6.5, sprintSpeed: 9.5,
  groundAccel: 60, friction: 10, airAccel: 18,
  gravity: 22,
  jumpVel: 8.0, doubleJumpVel: 7.0,
  coyote: 0.1, jumpBuffer: 0.1,
  slideMinSpeed: 4.2, slideBoost: 16, slideCruise: 8, slideDrag: 2.4, slideTime: 0.7,
  slideCd: 0.22, slideHopCd: 0.85, slideHopBoost: 1.12, slideSlope: 14, slideStamina: 0.14,
  staminaSprint: 4.5, staminaRegenDelay: 0.55, staminaRegen: 1.7, staminaRefill: 0.28,
  grappleRange: 30, grappleCd: 6, grapplePull: 90, grappleArrive: 1.35,
  dashSpeed: 24, dashTime: 0.15, dashCd: 2.0, dashInvuln: 0.12,

  fovBase: 90, fovSprint: 6, fovAds: 70, fovScope: 12,
  // god mode keeps you at or above these while it's on
  godTickets: 99999,

  maxHp: 100, maxShield: 50, maxMana: 100,
  shieldDelay: 3.0, shieldRegen: 25,
  quickShieldDelay: 1.8, quickShieldRegenMult: 1.5,
  manaRegen: 5,
  secondWindTime: 10, reviveHpFrac: 0.3, reviveInvuln: 2, downedSpeedMult: 0.3,
  sandboxRespawn: 3,

  startAmmo: { bullets: 240, shells: 24, sniper: 12, rockets: 4 },
  ammoCap: { bullets: 480, shells: 64, sniper: 36, rockets: 12 },
  ammoDrop: { bullets: 45, shells: 8, sniper: 5, rockets: 2 },
  medkitHeal: 50, medkitTime: 0.8, medkitCarry: 3,
  healthOrb: 20, bigOrb: 60, manaOrb: 25,
  magnetRadius: 4, magnetAccel: 30, collectRadius: 0.9, pickupTtl: 30, gunPickupTtl: 120,
  gunPickupRadius: 2.2,
  hitscanRange: 150,
};

export const ARENA_R = TUNING.arenaRadius;
