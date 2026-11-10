// Plays authored animation clips on a procedurally posed skeleton, with inertialized transitions.
// Each frame, after the procedural rig has posed the bones, apply(dt, want) picks the target pose — the wanted
// clip sampled at an explicit time (or advancing by `rate`), or the procedural pose when no clip is wanted — and
// shows it. Whenever the target source changes (procedural → clip, clip → clip, clip → procedural) the per-bone
// offset between the last shown pose and the new target is recorded and decays to zero with a critically damped
// spring (inertialization: Bollo, GDC 2018; Holden, "Spring-It-On"). Because the offset is fixed at the switch
// and only shrinks, a transition can never flip direction mid-way, even between poses ~180° apart (arms overhead
// vs. down) while the procedural pose keeps moving underneath — which a plain per-frame slerp blend does.
//
// Tracks are evaluated directly with their keyframe interpolants rather than through THREE.AnimationMixer: the
// mixer only writes a bone when its own blended value changed since its last update, so on any frame where a
// clip holds still the bone would silently keep the procedural pose instead.
import * as THREE from 'three';
import { springTo, spring } from './anim.js';

const _o = new THREE.Quaternion(), _inv = new THREE.Quaternion(), _p = new THREE.Vector3();
const IDENTITY = new THREE.Quaternion();

function sampleCurve(samples, phase) {
  if (!samples) return 0;
  const x = phase * (samples.length - 1), i = Math.floor(x);
  return (samples[i] + ((samples[i + 1] ?? samples[i]) - samples[i]) * (x - i)) / 1000;
}

export function createClipLayer(ch, { blendHalfLife = 0.1, procedural = true, floor = {}, tailPitch = {} } = {}) {
  const clips = ch.clips || [];
  if (!clips.length) return null;
  const byName = {};
  ch.root.traverse((o) => { if (o.isBone) byName[o.name] = o; });
  const bones = [], index = new Map();
  const boneIdx = (name) => {
    if (!index.has(name)) { index.set(name, bones.length); bones.push(byName[name]); }
    return index.get(name);
  };
  const acts = {};
  for (const clip of clips) {
    const rot = [], pos = [];
    for (const tr of clip.tracks) {
      const dot = tr.name.lastIndexOf('.');
      const bone = tr.name.slice(0, dot), prop = tr.name.slice(dot + 1);
      if (!byName[bone]) continue;
      if (prop === 'quaternion') rot.push([boneIdx(bone), tr.createInterpolant()]);
      else if (prop === 'position') pos.push([boneIdx(bone), tr.createInterpolant()]);
    }
    if (clip.duration > 0 && (rot.length || pos.length)) {
      acts[clip.name] = { rot, pos, time: 0, dur: clip.duration, floor: floor[clip.name], tailPitch: tailPitch[clip.name] };
    }
  }
  if (!Object.keys(acts).length) return null;
  const bindQ = bones.map((bone) => bone.quaternion.clone());
  const bindP = bones.map((bone) => bone.position.clone());
  const n = bones.length;
  const tgtQ = Array.from({ length: n }, () => new THREE.Quaternion()), tgtP = Array.from({ length: n }, () => new THREE.Vector3());
  const outQ = Array.from({ length: n }, () => new THREE.Quaternion()), outP = Array.from({ length: n }, () => new THREE.Vector3());
  const offQ = Array.from({ length: n }, () => new THREE.Quaternion()), offP = Array.from({ length: n }, () => new THREE.Vector3());
  const hasQ = new Uint8Array(n), hasP = new Uint8Array(n);
  const decay = spring(), clipW = spring();
  const durations = Object.fromEntries(Object.entries(acts).map(([k, v]) => [k, v.dur]));
  const state = { weight: 0, clip: null, time: 0, settle: 0, clearance: 0, tailPitch: 0 }; // for debugging/inspection
  let mode = null, hl = blendHalfLife, shown = false, clearanceOffset = 0, tailOffset = 0;

  return {
    state,
    durations,
    has: (name) => !!acts[name],
    reset() {
      mode = state.clip = null;
      state.phaseGroup = undefined;
      shown = false;
      decay.x = decay.v = clipW.x = clipW.v = 0;
      state.weight = state.clearance = state.tailPitch = state.time = 0;
      for (const a of Object.values(acts)) a.time = 0;
    },
    /** want = { clip, time?, rate?, blend? (half-life s) } or null. Returns how much a clip drives the pose (0..1). */
    apply(dt, want) {
      const live = want && acts[want.clip] ? want : null;
      const next = live ? live.clip : null;
      if (live) {
        const s = acts[next];
        if (live.time != null) s.time = Math.min(s.dur, Math.max(0, live.time));
        else {
          if (next !== mode && live.phaseGroup && live.phaseGroup === state.phaseGroup) {
            s.time = acts[mode].time / acts[mode].dur * s.dur;
          }
          s.time = (s.time + dt * (live.rate ?? 1)) % s.dur;
        }
      }
      // procedural is fully in charge and settled: leave the bones alone
      if (!next && !mode && decay.x < 1e-3) {
        shown = false;
        state.weight = springTo(clipW, 0, hl, dt);
        state.clip = null;
        state.clearance = state.tailPitch = 0;
        return state.weight;
      }

      // target pose: the clip's tracks where it has them, the procedural pose (already on the bones) elsewhere
      hasQ.fill(0); hasP.fill(0);
      let clearance = 0, pitch = 0;
      if (next) {
        const s = acts[next];
        const phase = s.time / s.dur;
        clearance = sampleCurve(s.floor, phase);
        pitch = sampleCurve(s.tailPitch, phase);
        for (const [i, it] of s.rot) { const v = it.evaluate(s.time); tgtQ[i].set(v[0], v[1], v[2], v[3]); hasQ[i] = 1; }
        for (const [i, it] of s.pos) { const v = it.evaluate(s.time); tgtP[i].set(v[0], v[1], v[2]); hasP[i] = 1; }
      }
      for (let i = 0; i < n; i++) {
        if (!hasQ[i]) tgtQ[i].copy(procedural ? bones[i].quaternion : bindQ[i]);
        if (!hasP[i]) tgtP[i].copy(procedural ? bones[i].position : bindP[i]);
      }

      // source changed: remember where the pose was (last shown, or the procedural pose on the bones now) as an
      // offset from the new target, then let it decay
      if (next !== mode) {
        if (live) hl = live.blend ?? blendHalfLife;
        for (let i = 0; i < n; i++) {
          const fromQ = shown ? outQ[i] : bones[i].quaternion, fromP = shown ? outP[i] : bones[i].position;
          _inv.copy(tgtQ[i]).invert();
          offQ[i].copy(fromQ).multiply(_inv); // from = off * target
          if (offQ[i].w < 0) offQ[i].set(-offQ[i].x, -offQ[i].y, -offQ[i].z, -offQ[i].w); // the short way back
          offP[i].copy(fromP).sub(tgtP[i]);
        }
        clearanceOffset = state.clearance - clearance;
        tailOffset = state.tailPitch - pitch;
        // A clip-only rig starts in its first real pose, rather than easing out of its bind pose.
        decay.x = shown || procedural ? 1 : 0;
        decay.v = 0;
        mode = next;
      }
      const k = Math.max(0, springTo(decay, 0, hl, dt));
      for (let i = 0; i < n; i++) {
        const b = bones[i];
        _o.copy(IDENTITY).slerp(offQ[i], k);
        b.quaternion.copy(_o.multiply(tgtQ[i]));
        _p.copy(offP[i]).multiplyScalar(k);
        b.position.copy(tgtP[i]).add(_p);
        outQ[i].copy(b.quaternion); outP[i].copy(b.position);
      }
      shown = true;
      const W = procedural ? springTo(clipW, mode ? 1 : 0, hl, dt) : Number(!!mode);
      state.weight = W; state.clip = mode; state.time = mode ? acts[mode].time : 0; state.settle = k;
      state.phaseGroup = live?.phaseGroup;
      state.clearance = clearance + clearanceOffset * k;
      state.tailPitch = pitch + tailOffset * k;
      return W;
    },
  };
}
