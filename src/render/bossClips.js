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
    // walk: 1.0 s straight-legged IK cycle; planted foot 0.633 m/s on a 0.977 m tall model
    walk: { clip: 'walk', speedPerHeight: 0.648 },
    melee: { smash: { clip: 'smash', impact: 24 / 30 } },
  },
  sprotoBeast: {
    // walk: 32 frames, straight-legged IK cycle; planted foot 0.367 m/s on a 0.98 m tall (rest) model
    walk: { clip: 'walk', speedPerHeight: 0.3747 },
    melee: { punch: { clip: 'punch', impact: 22 / 30 }, kick: { clip: 'kick', impact: 21 / 30 } },
  },
  dragon: {
    fly: { clip: 'fly' },
    fireball: { clip: 'fireball', release: 20 / 30 },
  },
  // clipsOnly: every boss action maps to an authored clip (art/blender/new_enemies.blend); idle otherwise.
  // speedPerHeight = the clip's ground speed per metre of model height (stride / stance time / model height).
  carMonster: {
    clipsOnly: true,
    walk: { clip: 'walk', speedPerHeight: 0.555 },
    charge: { clip: 'charge', start: 'charge_start', telegraph: 0.8, speedPerHeight: 1.247 },
    melee: { smash: { clip: 'smash', impact: 24 / 30 } },
    // tyres: throw_start ends on the first release (left hand); throw_loop = one left + one right throw
    barrage: { action: 'missiles', start: 'throw_start', loop: 'throw_loop', telegraph: 0.6, shotsPerLoop: 2, def: 'missiles', count: 'count' },
    stunned: 'stunned', slam: 'slam', roar: 'roar',
  },
  moleMonster: {
    clipsOnly: true,
    walk: { clip: 'walk', speedPerHeight: 0.259 },
    charge: { clip: 'charge', start: 'charge_start', telegraph: 0.8, speedPerHeight: 0.81 },
    melee: { smash: { clip: 'smash', impact: 24 / 30 } },
    // drill heads: shoot_start = 0.5 s aim ending on the first shot; shoot_loop = one recoil per wave
    barrage: { action: 'volley', start: 'shoot_start', loop: 'shoot_loop', telegraph: 0.5, shotsPerLoop: 1, def: 'volley', count: 'waves' },
    stunned: 'stunned', slam: 'slam', roar: 'roar',
  },
};

/** Clip-driven common enemies (render/clipLayer.js): firing clips are timed from the sim's gun timers. */
export const ENEMY_CLIPS = {
  // run: ground speed per metre of model height; release = the clip time of the first shot
  robotLaser: { run: 2.137, cast: { clip: 'cast', release: 15 / 30 } },
  robotShooter: { run: 1.564, cast: { clip: 'cast', release: 14 / 30 }, special: { clip: 'cast_big', release: 30 / 30 } },
};

/** Time in a gun's firing clip: the wind-up maps onto [0, release], then shots follow at the gun's own gap. */
export function gunClipTime(ai, slot, gun, release) {
  const K = (n) => ai[slot + n];
  if (K('aimT') > 0) return release * (1 - K('aimT') / gun.windup);
  if (K('burstLeft') > 0) {
    const fired = gun.burst - K('burstLeft'); // shots already out
    if (fired === 0) return release; // aim just finished; the first shot leaves this tick
    return release + (fired - 1) * gun.burstGap + (gun.burstGap - Math.max(0, K('burstT')));
  }
  if (K('doneT') != null) return release + (gun.burst - 1) * gun.burstGap + K('doneT');
  return null;
}

/**
 * What a clip-driven common enemy plays. s = { type, state, ai, def, speed, fitHeight, durations }.
 * Always returns a clip: these rigs rest in a T-pose, so there is no procedural fallback.
 */
export function enemyClipWant(s) {
  const spec = ENEMY_CLIPS[s.type] || {};
  const ai = s.ai || {}, def = s.def || {};
  const dur = (name) => clipLen(s, name);
  if (s.state === 'stagger') return { clip: 'stun', time: s.stateT ?? 0, blend: BLEND.attack };
  if (spec.special && def.special) {
    const t = gunClipTime(ai, 'sp', def.special, spec.special.release);
    if (t !== null && t < dur(spec.special.clip)) return { clip: spec.special.clip, time: t, blend: BLEND.attack };
  }
  if (spec.cast && def.gun) {
    const t = gunClipTime(ai, '', def.gun, spec.cast.release);
    if (t !== null && t < dur(spec.cast.clip) && (ai.shooting || (ai.doneT != null && ai.doneT < 0.4))) return { clip: spec.cast.clip, time: t, blend: BLEND.attack };
  }
  return locomotionClip(s, { walk: s.pace?.walk, run: spec.run });
}

/** Clip time inside a barrage: wind-up clip over the telegraph, then the loop phase-locked to the shots. */
export function barrageClip(b, t, gap, shots, durations) {
  const dur = (n) => (durations && durations[n]) || 1;
  if (t < b.telegraph) return { clip: b.start, time: dur(b.start) * (t / b.telegraph) };
  const after = t - b.telegraph, period = gap * b.shotsPerLoop;
  if (after < (shots - 1) * gap + gap * 0.75) return { clip: b.loop, time: dur(b.loop) * ((after % period) / period) };
  return null;
}

/** Clip choice for bosses whose every action is an authored clip (BOSS_CLIPS[type].clipsOnly). */
function clipsOnlyWant(spec, s) {
  const def = s.def || {}, t = s.actionT || 0, dur = (n) => clipLen(s, n), H = s.fitHeight || def.height || 1;
  const loco = BLEND.locomotion, atk = BLEND.attack;
  switch (s.action) {
    case 'intro': case 'transition': case 'summon':
      return { clip: spec.roar, time: Math.min(dur(spec.roar), t), blend: loco };
    case 'stunned': return { clip: spec.stunned, time: t, blend: atk };
    case 'slam': {
      // With a 10 m/s launch and 30 m/s² gravity, the jump is about 2/3 s.
      // Once it lands, use the actual landing timer (also drives the shockwaves).
      const contact = s.slamContact ?? 20 / 30;
      const airborne = 2 * 10 / 30;
      const time = s.data?.landed
        ? contact + Math.max(0, (s.data.lt || 0) - 1 / 60) / 1.6 * (dur(spec.slam) - contact)
        : Math.min(1, t / airborne) * contact;
      return { clip: spec.slam, time, blend: atk };
    }
    case 'charge':
      if (t < spec.charge.telegraph) return { clip: spec.charge.start, time: dur(spec.charge.start) * (t / spec.charge.telegraph), blend: atk };
      return { clip: spec.charge.clip, rate: gaitRate(s.speed || 0, (s.pace?.charge ?? spec.charge.speedPerHeight) * H), blend: atk, phaseGroup: 'stride' };
    case 'melee': {
      const mel = def.melee || { windup: 0.75, recover: 0.9 };
      const m = spec.melee.smash;
      return { clip: m.clip, time: meleeClipTime(t, mel.windup, mel.recover, m.impact, dur(m.clip)), blend: atk };
    }
    default: break;
  }
  const b = spec.barrage;
  if (b && s.action === b.action && def[b.def]) {
    const cfg = def[b.def];
    const shots = cfg[b.count] + ((s.phaseIdx || 0) >= 2 ? 1 : 0);
    const w = barrageClip(b, t, cfg.gap, shots, s.durations);
    if (w) return { ...w, blend: atk };
  }
  return s.action === 'chase'
    ? locomotionClip(s, { walk: spec.walk.speedPerHeight })
    : { clip: 'idle', blend: loco };
}

/** Blend half-lives (s) between the procedural rig and a clip: attacks take over fast, locomotion eases in. */
export const BLEND = { attack: 0.035, locomotion: 0.10 };

const gaitRate = (speed, clipSpeed) => Math.min(3, speed / Math.max(0.1, clipSpeed));

export function locomotionClip(s, fallback = {}) {
  const height = s.fitHeight || s.def?.height || 1;
  const speed = s.speed || 0, current = s.current;
  const blend = BLEND.locomotion;
  const walking = current === 'walk' || current === 'run' || current?.startsWith('strafe_') || current === 'run_back';
  if (speed < (walking ? 0.19 : 0.32)) return { clip: 'idle', blend };
  const pace = { ...fallback, ...s.pace };
  const strafe = s.side > 0 ? 'strafe_l' : 'strafe_r'; // local +X is the model's left
  let clip;
  if (s.durations?.[strafe] && Math.abs(s.side) > Math.abs(s.forward) * (current === strafe ? 0.9 : 1.35)) clip = strafe;
  else if (s.durations?.run_back && s.forward < -speed * (current === 'run_back' ? 0.5 : 0.72)) clip = 'run_back';
  else if (pace.walk && (!pace.run || !s.durations?.run || speed < pace.walk * height * (current === 'run' ? 1.3 : 1.65))) clip = 'walk';
  else clip = 'run';
  const gaitSpeed = pace[clip] ?? (clip === 'run_back' ? 1.4 : 2.2);
  return { clip, rate: gaitRate(speed, gaitSpeed * height), blend, phaseGroup: 'stride' };
}

/** Actions during which a walking boss uses its walk clip (others keep their procedural pose). */
const WALK_ACTIONS = new Set(['chase']);

/**
 * Melee clip time for a sim action at actionT: the windup stretches/compresses so the clip's impact frame lands
 * on the sim's swing (actionT === windup); the recovery maps onto the rest of the clip.
 */
export function meleeClipTime(t, windup, recover, impact, duration) {
  if (windup > 0 && t <= windup) return impact * Math.max(0, t) / windup;
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
  if (spec.clipsOnly) return clipsOnlyWant(spec, s);
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
  if (spec.walk && (WALK_ACTIONS.has(s.action) || (s.action === 'charge' && s.actionT >= 0.8))) {
    const want = locomotionClip(s, { walk: spec.walk.speedPerHeight });
    if (want.clip !== 'idle') return want;
  }
  return null;
}

const clipLen = (s, name) => (s.durations && s.durations[name]) || 1.5;
