import { describe, expect, it } from 'vitest';
import { AnimationClip, Bone, Group, VectorKeyframeTrack } from 'three';
import { BOSSES, ENEMIES } from '../src/data/enemies.js';
import { createEnemy, createGameState } from '../src/sim/state.js';
import { pushHorizontal } from '../src/sim/campaign/solids.js';
import { bossClipWant, locomotionClip } from '../src/render/bossClips.js';
import { createClipLayer } from '../src/render/clipLayer.js';
import { creatureClip, creatureTravel, creatureYaw, enemyMeleeTime } from '../src/render/creatureMotion.js';
import { CREATURE_MOTION } from '../src/render/creatureMotionData.js';

describe('creature locomotion follows collision-resolved travel', () => {
  it('stops advancing toward a wall even while the sim velocity presses into it', () => {
    const e = createEnemy(createGameState({ seed: 1 }), 'midget', { pos: { x: 0, z: 0.5501 } });
    e.vel.z = -6;
    e.pos.z -= 0.1;
    pushHorizontal(e, [{ kind: 'box', min: [-2, 0, -2], max: [2, 4, 0.1] }], e.radius, e.height);
    const travel = creatureTravel(e, 0);
    expect(e.vel.z).toBe(-6);
    expect(travel.speed).toBeCloseTo(0);
    expect(locomotionClip({ ...travel, current: 'run' }).clip).toBe('idle');
  });

  it('selects backpedal, strafe, walk and run from resolved movement', () => {
    const base = { fitHeight: 2, pace: { walk: 0.5, run: 1.5 }, durations: { walk: 1, run: 0.5, run_back: 0.8, strafe_l: 0.6 } };
    expect(locomotionClip({ ...base, speed: 1, side: 1, forward: 0 }).clip).toBe('strafe_l');
    expect(locomotionClip({ ...base, speed: 1, side: 0, forward: -1 }).clip).toBe('run_back');
    expect(locomotionClip({ ...base, speed: 1, side: 0, forward: 1 })).toMatchObject({ clip: 'walk', rate: 1 });
    expect(locomotionClip({ ...base, speed: 3, side: 0, forward: 3 })).toMatchObject({ clip: 'run', rate: 1 });
  });

  it('matches the collision-facing direction at contact', () => {
    const e = { yaw: 2, state: 'attack', ai: {} };
    expect(creatureYaw(e, 0, 1 / 60)).toBe(2);
    expect(Math.abs(creatureYaw({ ...e, state: 'chase' }, 0, 1 / 60) - 2)).toBeLessThan(0.16);
  });
});

describe('creature attack contact poses', () => {
  it('maps the light lunge and heavy ground pound to the first damaging phase', () => {
    for (const [def, phase, heavy] of [[ENEMIES.midget, 'active', false], [ENEMIES.bigObama, 'recover', true]]) {
      const contact = 0.67, duration = 1.4;
      expect(enemyMeleeTime({ phase: 'windup', t: def.windup }, def, contact, duration, heavy)).toBe(contact);
      expect(enemyMeleeTime({ phase, t: 0 }, def, contact, duration, heavy)).toBe(contact);
    }
  });

  it('matches the car and mole slam strike pose to their first shockwave', () => {
    for (const type of ['carMonster', 'moleMonster']) {
      const contact = 20 / 30;
      const s = { type, action: 'slam', actionT: 0.65, def: BOSSES[type], durations: { slam: 2.3 } };
      expect(bossClipWant(s).time).toBeLessThan(contact);
      expect(bossClipWant({ ...s, data: { landed: true, lt: 1 / 60 } }).time).toBe(contact);
    }
  });

  it('poses Mega Tinubu’s melee strike on its hit tick', () => {
    const def = BOSSES.megaSproto;
    const e = { type: 'megaSproto', pos: { y: 0 }, ai: {}, boss: { action: { id: 'melee', t: def.melee.windup } } };
    const parts = { clips: { durations: { cast_big: 1.25 }, state: {} }, motion: { contact: { cast_big: 0.64 } } };
    const pose = creatureClip(e, def, parts, { speed: 0 }, 1);
    expect(pose.clip).toBe('cast_big');
    expect(pose.time).toBeCloseTo(0.8);
  });

  it('poses the final enemy shot and instant campaign cast at release', () => {
    const parts = { clips: { durations: { cast: 1, cast_big: 1.3 }, state: {} }, motion: { contact: { cast: 0.65 } } };
    const travel = { speed: 0 };
    const enemy = { type: 'obama', state: 'chase', ai: { burstLeft: 0 }, pos: { y: 0 } };
    expect(creatureClip(enemy, ENEMIES.obama, parts, travel, 2, { type: 'enemyShot' }, 0)).toMatchObject({ clip: 'cast', time: 0.65 });
    const boss = { ...enemy, type: 'sahil', boss: { action: { id: 'idle', t: 0 } } };
    expect(creatureClip(boss, BOSSES.sahil, parts, travel, 2, { type: 'bossAttack', attack: 'bolt' }, 0)).toMatchObject({ clip: 'cast', time: 0.65 });
  });

  it('loads a real first pose, preserves gait phase, and applies the baked clearance', () => {
    const root = new Group(), bone = new Bone();
    bone.name = 'Hip';
    root.add(bone);
    const clip = (name, duration) => new AnimationClip(name, duration, [
      new VectorKeyframeTrack('Hip.position', [0, duration], [0, 1, 0, 0, 2, 0]),
    ]);
    const layer = createClipLayer({ root, clips: [clip('walk', 1), clip('run', 0.5)] }, {
      procedural: false, floor: { walk: [20, 40] },
    });
    layer.apply(0.25, { clip: 'walk', phaseGroup: 'stride' });
    expect(bone.position.y).toBe(1.25);
    expect(layer.state.clearance).toBeCloseTo(0.025);
    layer.apply(0, { clip: 'run', phaseGroup: 'stride' });
    expect(layer.state.time).toBe(0.125);
    expect(CREATURE_MOTION.sproto_monster.tailPitch.kick[14]).toBeGreaterThan(0);
  });
});
