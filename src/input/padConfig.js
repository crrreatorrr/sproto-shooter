// Gamepad layout and feel. W3C "standard" mapping (Xbox names; PlayStation / Switch pads work the same by
// position). Read by src/input/** and the UI only: the sim never sees a pad, it only gets the same
// Command a keyboard and mouse would build.

/** Button names in standard-mapping index order. */
export const PAD_BUTTONS = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'back', 'start', 'l3', 'r3', 'up', 'down', 'left', 'right', 'home'];

/**
 * Gameplay bindings (action -> button). Home is never bound: the OS / browser owns it.
 * Why this layout: fire and spells sit on the triggers (RT fires the gun, LT casts the selected spell,
 * LB picks the next spell, RB dashes), so both thumbs stay on the sticks while fighting. Aim is a
 * right-stick click toggle: click once to aim and stay aiming, again with a sniper to zoom closer, again
 * to stop. The right thumb only leaves the stick for jump, slide, reload / pick up and swap. The D-pad
 * keeps quick casts for three spells and the medkit.
 */
export const PAD_BINDINGS = {
  fire: 'rt',
  castSpell: 'lt', // casts the spell LB selected
  spellSelect: 'lb', // next unlocked spell
  aim: 'r3', // toggle: aim -> (sniper) zoom 2 -> off
  jump: 'a',
  slide: 'b',
  reload: 'x', // tap reloads; holding the same button longer picks up a gun or opens a Weapon Box
  interact: 'x', // hold (only when something is in reach, so a plain reload never waits)
  swap: 'y', // next gun
  dash: 'rb',
  chainZap: 'up',
  swarm: 'right',
  manaShield: 'left',
  medkit: 'down',
  sprint: 'l3', // toggle; stops when you stop pushing forward or start aiming
  pause: 'start',
  panel: 'back', // shop between waves, otherwise your guns
};

/** Menu buttons: A confirms, B goes back, LB / RB switch tabs, View closes a panel, Menu pauses. */
export const PAD_MENU = { confirm: 'a', back: 'b', prevTab: 'lb', nextTab: 'rb', close: 'back', pause: 'start' };

export const PAD = {
  /** Radial deadzones (rescaled so motion starts smoothly from 0). */
  moveDeadzone: 0.2,
  lookDeadzone: 0.15,
  outerDeadzone: 0.95,
  /** Analog trigger counts as held above this, and lets go below press * release. */
  triggerPress: 0.5,
  triggerRelease: 0.7,
  /** Stick or trigger travel that counts as deliberate use (switches prompts to the pad). */
  activity: 0.5,

  /** Right-stick look. Speeds are radians per second at full tilt (before the zoom factor). */
  lookCurve: 1.8,
  yawSpeed: 3.2,
  pitchSpeed: 2.2,
  /** Holding the stick at the rim for `turnBoostDelay` s ramps yaw up by `turnBoost` over `turnBoostRamp` s. */
  turnBoostAt: 0.95,
  turnBoost: 0.6,
  turnBoostDelay: 0.25,
  turnBoostRamp: 0.3,
  /** Aiming slows the stick a little on top of the field-of-view factor the mouse also gets. */
  adsLookScale: 0.85,

  /** Hold the reload button this long to pick up / open instead of reloading. */
  interactHoldMs: 300,
  /** Sprint toggle ends when forward stick drops below this. */
  sprintStopBelow: 0.25,

  /** Menus: stick threshold and key-repeat style auto-repeat. */
  menuStick: 0.5,
  menuRepeatFirstMs: 350,
  menuRepeatMs: 120,
  /** Range sliders move by this fraction of their span per step. */
  sliderStep: 0.05,
};

/**
 * Aim assist, gamepad only (mouse and keyboard never get it).
 * - Slowdown: the stick turns slower while the crosshair is over or near an enemy.
 * - Pull: while aiming (R3 toggle) the view drifts gently toward the nearest enemy's head.
 * The player's "Aim assist" setting (0..1.5, default 1) multiplies `strength`.
 */
export const AIM_ASSIST = {
  enabled: true,
  strength: 1,
  maxRange: 80, // m, also capped by the gun's own range
  minRange: 0.75,
  /** Assist cone: the target's radius plus this margin, as an angle, clamped to these limits. */
  marginM: 0.6,
  minConeDeg: 2.5,
  maxConeDeg: 9,
  /** Look speed is cut by up to this much at the target's centre (hip fire / aiming). */
  slowHip: 0.35,
  slowAds: 0.5,
  minSlow: 0.25,
  /** Pull toward the head while aiming, degrees per second at the centre of the cone. */
  pullDegPerSec: 7,
  /** Pull while the player gives no stick or move input, as a share of the full pull. */
  pullIdleScale: 0.35,
};
