// Which authored clip a boss plays, and at what time, given its sim state. Pure functions (no three.js) so the
// timing can be unit-tested. The clips are authored in Blender (art/blender/boss_animations.blend) at 30 fps,
// in place; the renderer blends them over the procedural rigs (humanoidRig.js, dragonRig.js), which still
// drive every state that has no clip (charge, slam, stunned, volleys, the dragon on the ground...).
//
// Timing contract: an attack clip's contact frame is pinned to the moment the sim applies damage or spawns the
// projectile, so what the player sees and what hits them never drift apart:
//   melee   - the sim swings at actionT === melee.windup; the clip's `impact` time maps exactly there.
//   fireball (in flight) - the sim spawns a fireball every fly.shotEvery seconds; the clip's `release` time
//             (mouth fully open) lands on each spawn.

export const BOSS_CLIPS = {
  monster: {
    // walk: 1.2 s cycle, 0.26 m stride over a 0.6 duty factor on a 0.978 m tall model
    walk: { clip: 'walk', speedPerHeight: 0.3692 },
    melee: { smash: { clip: 'smash', impact: 24 / 30 } },
  },
  sprotoBeast: {
    // walk: 32 frames, 0.24 m stride over a 0.58 duty factor on a 0.98 m tall model
    walk: { clip: 'walk', speedPerHeight: 0.3958 },
    melee: { punch: { clip: 'punch', impact: 22 / 30 }, kick: { clip: 'kick', impact: 21 / 30 } },
  },
  dragon: {
    fly: { clip: 'fly' },
    fireball: { clip: 'fireball', release: 20 / 30 },
  },
};

/** Blend half-lives (s) between the procedural rig and a clip: attacks take over fast, locomotion eases in. */
export const BLEND = { attack: 0.06, locomotion: 0.16 };

/** Actions during which a walking boss uses its walk clip (others keep their procedural pose). */
const WALK_ACTIONS = new Set(['chase']);

/**
 * Melee clip time for a sim action at actionT: the windup stretches/compresses so the clip's impact frame lands
 * on the sim's swing (actionT === windup); the recovery maps onto the rest of the clip.
 */
export function meleeClipTime(t, windup, recover, impact, duration) {
  if (t <= windup) return impact * Math.max(0, t) / Math.max(1e-3, windup);
  return Math.min(duration, impact + (t - windup) * ((duration - impact) / Math.max(0.05, recover)));
}

/**
 * Fireball clip time while the dragon circles in flight, or null when it should just fly.
 * toNext: seconds until the next scheduled fireball (Infinity if none); sinceShot: seconds since the last one
 * (Infinity if none yet). The clip opens toward `release` before a shot and recovers after it; when the next
 * windup overlaps the previous recovery, the windup wins once the previous spit has mostly recovered.
 */
export function flightFireballTime(toNext, sinceShot, release, duration) {
  const recovering = sinceShot >= 0 && sinceShot < duration - release;
  const winding = toNext >= 0 && toNext <= release;
  if (winding && (!recovering || sinceShot > 0.55)) return release - toNext;
  if (recovering) return release + sinceShot;
  return null;
}

/**
 * What the clip layer should play this frame.
 * s = { type, action, actionT, variant, speed, fitHeight, altitude, data, def, phaseIdx, durations: {clip: seconds} }
 * Returns { clip, time? , rate? } or null (procedural only).
 */
export function bossClipWant(s) {
  const spec = BOSS_CLIPS[s.type];
  if (!spec) return null;
  const def = s.def || {};
  if (s.type === 'dragon') {
    if (!(s.altitude > 0.4)) return null; // on the ground the procedural rig (stalk, breath, tail swipe) drives
    const fb = spec.fireball, fly = def.fly;
    if (s.action === 'fly' && fly && fb) {
      const data = s.data || {};
      const cruiseT = s.actionT - fly.rise;
      const dur = fly.duration * (s.phaseIdx >= 2 ? 1.3 : 1);
      const next = data.shot ?? fly.shotEvery * 0.5; // next scheduled shot, in cruise time
      const toNext = cruiseT < dur && next < dur ? next - cruiseT : Infinity;
      const fired = data.shot !== undefined && data.shot > fly.shotEvery * 0.5;
      const sinceShot = fired ? cruiseT - (next - fly.shotEvery) : Infinity;
      const t = flightFireballTime(toNext, sinceShot, fb.release, clipLen(s, fb.clip));
      if (t !== null) return { clip: fb.clip, time: t, blend: BLEND.locomotion };
    }
    return { clip: spec.fly.clip, rate: 1 + Math.min(0.6, (s.speed || 0) / 40), blend: BLEND.locomotion };
  }
  if (s.action === 'melee' && spec.melee) {
    const mel = def.melee || { windup: 0.6, recover: 0.8 };
    if (!s.variant && mel.combo) return null; // punch/kick not chosen yet (the first tick): no clip, no snap
    const m = spec.melee[s.variant || 'smash'] || spec.melee.smash || Object.values(spec.melee)[0];
    if (m) return { clip: m.clip, time: meleeClipTime(s.actionT, mel.windup, mel.recover, m.impact, clipLen(s, m.clip)), blend: BLEND.attack };
  }
  if (spec.walk && WALK_ACTIONS.has(s.action) && (s.speed || 0) > 0.4) {
    const clipSpeed = spec.walk.speedPerHeight * (s.fitHeight || def.height || 1);
    return { clip: spec.walk.clip, rate: Math.max(0.6, Math.min(2.4, s.speed / clipSpeed)), blend: BLEND.locomotion };
  }
  return null;
}

const clipLen = (s, name) => (s.durations && s.durations[name]) || 1.5;
