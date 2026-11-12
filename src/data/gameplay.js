// The only place movement, grapple, slide, sprint stamina, and the shared combat
// numbers are defined. Campaign, Wave Mode, Sandbox, and Free 1v1 read this.
// A future coop sim must read it too. Modes do not get their own copies.
//
// Wager matches still clamp crit, element, and splash (see WAGER_COMBAT). Those
// rolls use the combat RNG. Enabling them would let the combat seed change who
// wins a wager. That clamp is the one remaining combat exception, and it lives
// here so a mode file cannot invent a second set of numbers.

export const GAMEPLAY = Object.freeze({
  eyeHeight: 1.6,
  slideEye: 0.72,
  downedEye: 0.6,
  playerRadius: 0.4,
  playerHeight: 1.8,
  walkSpeed: 6.5,
  sprintSpeed: 9.5,
  groundAccel: 60,
  friction: 10,
  airAccel: 18,
  gravity: 22,
  jumpVel: 8.0,
  doubleJumpVel: 7.0,
  coyote: 0.1,
  jumpBuffer: 0.1,
  slideMinSpeed: 4.2,
  slideBoost: 16,
  slideCruise: 8,
  slideDrag: 2.4,
  slideTime: 0.7,
  slideCd: 0.22,
  slideHopCd: 0.85,
  slideHopBoost: 1.12,
  slideSlope: 14,
  slideStamina: 0.14,
  slideSteer: 10,
  slideStopFrac: 0.9,
  slideProbe: Object.freeze({
    radius: 0.15,
    ahead: 0.75,
    hereFeet: 0.5,
    hereReach: 0.8,
    thereFeet: 1.4,
    thereReach: 1.4,
    drop: 0.02,
    gain: 12,
  }),
  dashEndScale: 0.45,
  staminaSprint: 4.5,
  staminaRegenDelay: 0.55,
  staminaRegen: 1.7,
  staminaRefill: 0.28,
  grappleRange: 16,
  grappleCd: 6,
  grapplePull: 54,
  grappleSpeed: 12.5,
  grappleReleaseSpeed: 8.5,
  grappleArrive: 1.35,
  grappleOrigin: 0.9,
  dashSpeed: 24,
  dashTime: 0.15,
  dashCd: 2.0,
  dashInvuln: 0.12,
  maxHp: 100,
  maxShield: 50,
  shieldDelay: 3.0,
  shieldRegen: 25,
  secondWindTime: 10,
  downedSpeedMult: 0.3,
  hitscanRange: 150,
  pitchLimit: 1.5,
});

/** Fields a wager loadout must not roll. Not a movement profile. */
export const WAGER_COMBAT_KEYS = Object.freeze(['elementChance', 'critChance', 'splashRadius', 'splashDamage']);

export const WAGER_COMBAT = Object.freeze({
  elementChance: 0,
  critChance: 0,
  splashRadius: 0,
  splashDamage: 0,
});

export function applyWagerCombat(stats) {
  stats.elementChance = WAGER_COMBAT.elementChance;
  stats.critChance = WAGER_COMBAT.critChance;
  stats.splashRadius = WAGER_COMBAT.splashRadius;
  stats.splashDamage = WAGER_COMBAT.splashDamage;
}
