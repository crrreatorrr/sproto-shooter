// Presentation follows resolved travel and the combat clocks. Collision, steering and damage stay in the sim.
import { DT } from '../sim/simulate.js';
import { damp, smoothstep, wrapAngle } from './anim.js';
import { BLEND, bossClipWant, enemyClipWant, gunClipTime, locomotionClip, meleeClipTime } from './bossClips.js';

const attack = (clip, time) => ({ clip, time, blend: BLEND.attack });

export function creatureTravel(e, yaw) {
  let dx = (e.pos.x - e.prevPos.x) / DT, dz = (e.pos.z - e.prevPos.z) / DT;
  const traveled = Math.hypot(dx, dz), requested = Math.hypot(e.vel.x, e.vel.z);
  // Overlap corrections or teleport/snap repositioning should never produce a sprint.
  // Hex Sahil integrates position directly; its teleport already resets prevPos.
  const limit = e.type === 'hexAuditor' ? 4.5 : requested;
  const ratio = traveled > limit ? limit / traveled : 1;
  dx *= ratio;
  dz *= ratio;
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  return { speed: traveled * ratio, forward: -dx * sin - dz * cos, side: -dx * cos + dz * sin };
}

export function enemyMeleeTime(a, def, contact, duration, heavy = def.behavior === 'bigObama') {
  if (a.phase === 'windup') return contact * smoothstep(a.t / (def.windup ?? 0.25));
  const active = a.phase === 'active' ? a.t : heavy ? 0 : def.active ?? 0.15;
  const recovery = a.phase === 'recover' ? a.t : 0;
  const tail = (heavy ? 0 : def.active ?? 0.15) + (def.recover ?? 0.45);
  return meleeClipTime(active + recovery, 0, tail, contact, duration);
}

const CAMPAIGN_HEAVY = new Set(['slam', 'rugSlam', 'carpetSweep', 'flash', 'blast', 'cloud', 'breath', 'pigRain']);
const HEX_HEAVY = new Set(['taxBolts', 'spiralRing', 'teleport']);
const HEX_CAST = new Set(['ring', 'fan', 'spiral']);

function releasePose(s, clip, elapsed, length = 0.55) {
  const duration = s.durations[clip];
  const release = duration * (s.contact?.[clip] ?? 0.55);
  return attack(clip, meleeClipTime(elapsed, 0, length, release, duration));
}

function legacyEnemy(s, e, def, cue, elapsed) {
  if (e.ai.buried > 0) return attack('idle', 0);
  if (e.state === 'stagger') return attack('stun', e.stateT);
  if (e.state === 'attack' && e.attack) {
    const heavy = def.behavior === 'bigObama' || e.type === 'bigObama';
    const clip = heavy ? 'cast_big' : 'cast';
    const duration = s.durations[clip];
    return attack(clip, enemyMeleeTime(e.attack, def, duration * (s.contact?.[clip] ?? 0.55), duration, heavy));
  }
  if (def.gun && s.durations.cast) {
    const contact = s.durations.cast * (s.contact?.cast ?? 0.55);
    if (e.ai.aimT > 0) return attack('cast', gunClipTime(e.ai, '', def.gun, contact));
    // Each projectile has its own recoil, including the last shot when burstLeft is already zero.
    if (cue?.type === 'enemyShot' && elapsed >= 0 && elapsed < 0.37) {
      const follow = Math.min(0.37, e.ai.burstLeft > 0 ? def.gun.burstGap : 0.37);
      const recoil = (e.ai.burstLeft > 0 ? 0.27 : 1) * Math.min(1, elapsed / follow);
      const time = contact + (s.durations.cast - contact) * recoil;
      return attack('cast', time);
    }
  }
  if (def.archetype?.flash && e.ai.flashCd > def.archetype.flash.every - 0.5) {
    return releasePose(s, 'cast_big', def.archetype.flash.every - e.ai.flashCd, 0.5);
  }
  if (def.archetype?.mortar && e.ai.mortarCd > def.archetype.mortar.every - 0.55) {
    return releasePose(s, 'cast_big', def.archetype.mortar.every - e.ai.mortarCd);
  }
  // Use a held airborne pose. Replaying a complete ground jump while hovering kept landing in mid-air.
  if (def.flying) return s.durations.jump ? attack('jump', s.durations.jump * 0.53) : { clip: 'idle', rate: 0.65 };
  return locomotionClip(s);
}

function legacyBoss(s, e, def, cue, elapsed) {
  const id = s.action;
  if (id === 'stunned' || e.boss.stunT > 0) return attack('stun', s.durations.stun * 0.55);
  if (def.campaign) {
    if (cue?.type === 'bossAttack' && elapsed >= 0 && elapsed < 0.55) {
      if (cue.attack === 'fly') return attack('jump', s.durations.jump * 0.53);
      return releasePose(s, CAMPAIGN_HEAVY.has(cue.attack) ? 'cast_big' : 'cast', elapsed);
    }
    if (e.pos.y > 0.5 && s.durations.jump) return attack('jump', s.durations.jump * 0.53);
    return locomotionClip(s);
  }
  if (id === 'intro' || id === 'transition' || id === 'summon') return attack('victory', s.actionT);
  if (def.ai === 'hex') {
    if (id === 'teleport') return attack('cast_big', s.actionT * s.durations.cast_big);
    if (HEX_HEAVY.has(id) || HEX_CAST.has(id)) {
      const clip = HEX_HEAVY.has(id) ? 'cast_big' : 'cast';
      if (id.startsWith('spiral')) {
        // Hold the channel through the stream, with a stronger release on the extra ring.
        const ringT = s.actionT - 1.2;
        if (id === 'spiralRing' && ringT >= 0 && ringT < 0.38) return releasePose(s, clip, ringT, 0.38);
        return attack(clip, s.durations[clip] * ((s.contact?.[clip] ?? 0.55) + Math.sin(s.actionT * 7) * 0.035));
      }
      if (s.actionT < 0.65) return releasePose(s, clip, s.actionT, 0.65);
    }
    return { clip: 'idle', rate: 0.65 };
  }
  if (id === 'melee' && def.melee) {
    const duration = s.durations.cast_big;
    const contact = duration * (s.contact?.cast_big ?? 0.55);
    return attack('cast_big', meleeClipTime(s.actionT, def.melee.windup, def.melee.recover, contact, duration));
  }
  if (id === 'charge' && s.actionT < 0.8) {
    return attack('cast_big', s.durations.cast_big * (s.contact?.cast_big ?? 0.55) * (s.actionT / 0.8));
  }
  if (id === 'slam') {
    // Keep the takeoff pose held aloft and follow through when the simulated feet touch down.
    return s.data.landed
      ? releasePose(s, 'cast_big', Math.max(0, s.data.lt - DT), 0.65)
      : attack('jump', s.durations.jump * (0.25 + 0.4 * smoothstep(s.actionT / 0.64)));
  }
  if (id === 'volley' || id === 'missiles') {
    const first = id === 'volley' ? 0.5 : 0.6;
    const clip = id === 'volley' ? 'cast_big' : 'cast';
    const release = s.durations[clip] * (s.contact?.[clip] ?? 0.55);
    if (s.actionT < first) return attack(clip, release * s.actionT / first);
    const gap = def[id].gap;
    const age = s.actionT - first - Math.max(0, (s.data.fired ?? 1) - 1) * gap;
    return releasePose(s, clip, Math.max(0, age), gap);
  }
  return locomotionClip(s);
}

export function creatureClip(e, def, parts, travel, fitHeight, cue, elapsed) {
  const { clips, motion } = parts;
  const a = e.boss?.action;
  const s = { type: e.type, state: e.state, stateT: e.stateT, ai: e.ai, def, ...travel, fitHeight,
    durations: clips.durations, current: clips.state.clip, ...motion,
    action: a?.id, actionT: a?.t ?? 0, data: a?.data ?? {}, variant: a?.data?.variant,
    altitude: e.pos.y, phaseIdx: e.boss?.phaseIdx };
  if (e.type === 'gateGenerator') return { clip: 'idle' };
  if (!e.boss && def.clips) return enemyClipWant(s);
  if (!e.boss) return legacyEnemy(s, e, def, cue, elapsed);
  if (parts.rig || def.rig === 'clips') return bossClipWant(s);
  return legacyBoss(s, e, def, cue, elapsed);
}

export function creatureYaw(e, previous, dt) {
  const exact = e.state === 'attack' || e.ai.shooting || e.type === 'bigObama' ||
    (e.boss && !['chase', 'stalk', 'drift'].includes(e.boss.action?.id));
  if (previous == null || exact) return e.yaw;
  const error = wrapAngle(previous - e.yaw);
  // Keep the silhouette close to its directional hitboxes, even during a rapid turn.
  return e.yaw + damp(Math.max(-0.16, Math.min(0.16, error)), 0, 0.045, dt);
}
