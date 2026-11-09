// Gamepad layout and feel. W3C "standard" mapping (Xbox names; PlayStation / Switch pads work the same by
// position). Read by src/input/** and the UI only: the sim never sees a pad, it only gets the same
// Command a keyboard and mouse would build.

/** Button names in standard-mapping index order. */
export const PAD_BUTTONS = ['a', 'b', 'x', 'y', 'lb', 'rb', 'lt', 'rt', 'back', 'start', 'l3', 'r3', 'up', 'down', 'left', 'right', 'home'];

/**
 * Gameplay bindings (action -> button). Home is never bound: the OS / browser owns it.
 * Why this layout: both thumbs stay on the sticks for the things you do while fighting (fire, aim, dash,
 * Goo Bolt on the four shoulder buttons). The right thumb only leaves the stick for jump, slide, reload
 * and swap, like every console shooter. The D-pad holds the slower spells and the medkit.
 */
export const PAD_BINDINGS = {
  fire: 'rt',
  aim: 'lt',
  jump: 'a',
  slide: 'b',
  reload: 'x', // tap; hold picks up a gun or opens a Weapon Box when one is in reach
  interact: 'x', // hold (only when something is in reach, so a plain reload never waits)
  swap: 'y', // next gun; while aiming a two-zoom scope it switches zoom 1 / 2 (like the mouse wheel)
  dash: 'lb',
  gooBolt: 'rb',
  chainZap: 'up',
  swarm: 'right',
  manaShield: 'left',
  medkit: 'down',
  meteor: 'r3',
  sprint: 'l3', // toggle; stops when you stop pushing forward
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

  /** Hold X this long to pick up / open instead of reloading. */
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
 * - Pull: while aiming (LT) the view drifts gently toward the nearest enemy's head.
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
