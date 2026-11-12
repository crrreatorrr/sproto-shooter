import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GAMEPLAY } from '../src/data/gameplay.js';
import { TUNING } from '../src/data/tuning.js';
import { stepLocomotion } from '../src/sim/gameplay.js';
import { LOADOUT } from '../src/sim/pvp/rules.js';

const CORE_NUMBERS = [
  'walkSpeed', 'sprintSpeed', 'groundAccel', 'friction', 'airAccel',
  'jumpVel', 'doubleJumpVel', 'coyote', 'jumpBuffer',
  'slideMinSpeed', 'slideBoost', 'slideCruise', 'slideDrag', 'slideTime', 'slideSlope', 'slideStamina',
  'staminaSprint', 'staminaRegen', 'staminaRefill',
  'grappleRange', 'grappleCd', 'grapplePull', 'grappleSpeed', 'grappleReleaseSpeed', 'grappleArrive',
  'dashSpeed', 'dashTime', 'dashCd', 'dashInvuln', 'dashEndScale',
  'secondWindTime', 'downedSpeedMult',
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((ent) => {
    const full = path.join(dir, ent.name);
    return ent.isDirectory() ? walk(full) : [full];
  });
}

const MODE_FILES = [
  ...walk('src/sim/pvp'),
  ...walk('src/sim/campaign'),
  ...walk('src/sim/coop'),
  'src/sim/player.js',
  'src/sim/grapple.js',
  'src/sim/waves.js',
  'src/sim/combat.js',
  'src/data/waves.js',
  'src/data/coop.js',
].filter((file) => file.endsWith('.js') && fs.existsSync(file));

describe('shared gameplay core', () => {
  it('keeps the core numbers in gameplay.js and only refers to them from tuning', () => {
    const rules = fs.readFileSync('src/data/gameplay.js', 'utf8');
    const tuning = fs.readFileSync('src/data/tuning.js', 'utf8');
    for (const key of CORE_NUMBERS) {
      if (GAMEPLAY[key] == null) continue;
      expect(rules, key).toMatch(new RegExp(`${key}:\\s*`));
      if (key in TUNING) expect(tuning, key).toMatch(new RegExp(`${key}:\\s*G\\.${key}\\b`));
      expect(TUNING[key] == null ? GAMEPLAY[key] : TUNING[key], key).toBe(GAMEPLAY[key]);
    }
    expect(TUNING.walkSpeed).toBe(6.5);
    expect(TUNING.grappleRange).toBe(16);
    expect(TUNING.grapplePull).toBe(54);
  });

  it('fails when a mode defines or overrides a core gameplay number', () => {
    // A core key set to a non-zero literal. Timer fields that merely start at 0 do not count.
    const assignment = new RegExp(
      `\\b(${CORE_NUMBERS.join('|')})\\b\\s*[:=]\\s*-?(?:0*[1-9]\\d*(?:\\.\\d+)?|0\\.\\d*[1-9]\\d*)`,
    );
    expect(MODE_FILES.length).toBeGreaterThan(5);
    for (const file of MODE_FILES) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src, file).not.toMatch(assignment);
      expect(src, file).not.toMatch(/critChance\s*=\s*0|elementChance\s*=\s*0|splashRadius\s*=\s*0|splashDamage\s*=\s*0/);
    }
  });

  it('requires every current mode, and a future coop sim, to call the shared step', () => {
    const player = fs.readFileSync('src/sim/player.js', 'utf8');
    const arena = fs.readFileSync('src/sim/pvp/sim.js', 'utf8');
    const step = fs.readFileSync('src/sim/gameplay.js', 'utf8');
    expect(player).toMatch(/stepLocomotion\(/);
    expect(arena).toMatch(/stepLocomotion\(/);
    expect(step).toMatch(/export function stepLocomotion\(body, wish, dt, world = \{\}\)/);
    expect(step).not.toMatch(/function stepLocomotion\([^)]*rules/);
    for (const file of [...walk('src/sim/coop'), 'src/data/coop.js'].filter((f) => fs.existsSync(f))) {
      expect(fs.readFileSync(file, 'utf8'), file).toMatch(/stepLocomotion|gameplay\.js/);
    }
  });

  it('steps campaign and the arena through the same velocities', () => {
    const wish = { moveX: 0, moveZ: 1, sprint: true, jump: false, dash: false, slide: false, crouch: false, zoom: false };
    const fresh = () => ({
      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      onGround: true,
      downed: false,
      stamina: 1,
      staminaDelay: 0,
      staminaLock: false,
      coyoteT: 0,
      jumpBufferT: 0,
      jumpsLeft: 2,
      invulnT: 0,
      grapple: null,
      speedScales: [],
      move: { mode: 'walk', slideCd: 0, dashCd: 0, dashT: 0, dashDir: { x: 0, z: 0 }, slideT: 0 },
    });
    const campaign = fresh();
    const arena = fresh();
    stepLocomotion(campaign, wish, 1 / 60);
    stepLocomotion(arena, wish, 1 / 60);
    expect(arena.vel).toEqual(campaign.vel);
    expect(arena.move.mode).toBe(campaign.move.mode);
    expect(arena.stamina).toBe(campaign.stamina);
  });

  it('drops zoom and sprints when sprint is held while zoomed', () => {
    const body = {
      pos: { x: 0, y: 0, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      yaw: 0, pitch: 0, onGround: true, downed: false,
      stamina: 1, staminaDelay: 0, staminaLock: false,
      coyoteT: 0, jumpBufferT: 0, jumpsLeft: 2, invulnT: 0, grapple: null,
      zoomCancelled: false,
      move: { mode: 'walk', slideCd: 0, dashCd: 0, dashT: 0, dashDir: { x: 0, z: 0 }, slideT: 0 },
    };
    const go = { moveX: 0, moveZ: 1, sprint: true, zoom: true, jump: false, dash: false, slide: false, crouch: false };
    stepLocomotion(body, go, 1 / 60);
    expect(body.zooming).toBe(false);
    expect(body.zoomCancelled).toBe(true);
    expect(body.move.mode).toBe('sprint');
    for (let i = 0; i < 20; i++) stepLocomotion(body, go, 1 / 60);
    expect(body.zooming).toBe(false);
    expect(body.stamina).toBeLessThan(1);
    expect(Math.hypot(body.vel.x, body.vel.z)).toBeGreaterThan(GAMEPLAY.walkSpeed + 0.2);
    stepLocomotion(body, { ...go, zoom: false, sprint: false, moveZ: 0 }, 1 / 60);
    expect(body.zoomCancelled).toBe(false);
  });

  it('rolls wager crits with the shared pellet rule and keeps splash on the gun', () => {
    const sim = fs.readFileSync('src/sim/pvp/sim.js', 'utf8');
    const trace = sim.slice(sim.indexOf('export function traceShots'), sim.indexOf('function canReload'));
    expect(trace).toMatch(/resolvePellet/);
    const rules = fs.readFileSync('src/sim/pvp/rules.js', 'utf8');
    expect(rules).not.toMatch(/applyWagerCombat/);
    expect(rules).toMatch(/crits: true/);
    expect(LOADOUT.every((gun) => gun.stats.critChance > 0)).toBe(true);
    expect(LOADOUT.every((gun) => gun.element === 'none')).toBe(true);
    expect(LOADOUT.every((gun) => gun.stats.splashRadius === 0)).toBe(true);
  });
});
