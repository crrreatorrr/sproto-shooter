import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CHARACTER_MODELS } from '../../data/stages.js';

const CLIP = { idle: 'idle', run: 'run', cast: 'cast', castBig: 'cast_big', hit: 'hit', defeat: 'defeat', stun: 'stun', jump: 'jump', victory: 'victory', strafeL: 'strafe_l', strafeR: 'strafe_r' };

/**
 * An animated character: { root, play(name, opts), update(dt), setFlash(v), fitTo(height) }.
 * Materials are cloned per instance so hit flashes don't light up every copy.
 */
export function instantiateCharacter(model, stage, fitHeight, control) {
  const path = CHARACTER_MODELS[model][stage - 1];
  const t = control.result(path);
  if (!t || !t.root) return null;
  control.retain(path);
  const inner = cloneSkinned(t.root);
  const mats = [];
  inner.traverse((o) => {
    if (o.isMesh && o.material) {
      o.material = o.material.clone();
      o.material.userData.characterClone = true;
      if (o.material.emissive) mats.push(o.material);
    }
  });
  const root = new THREE.Group();
  root.add(inner);
  const fit = (h) => { const s = h / t.height; inner.scale.setScalar(s); inner.position.y = -t.minY * s; };
  fit(fitHeight);
  const mixer = new THREE.AnimationMixer(inner);
  const actions = {};
  for (const [k, name] of Object.entries(CLIP)) {
    const clip = t.clips.find((c) => c.name.toLowerCase() === name) || t.clips.find((c) => c.name.toLowerCase().includes(name));
    if (clip) actions[k] = mixer.clipAction(clip);
  }
  let current = null, flash = -1, released = false;
  return {
    root, model, stage, path,
    clips: t.clips, // raw clips, for layers that drive them directly (clipLayer.js)
    has: (k) => !!actions[k],
    play(k, { fade = 0.15, once = false, speed = 1, restart = false } = {}) {
      const a = actions[k] || actions.idle;
      if (!a) return;
      a.timeScale = speed;
      if (current === a && !restart) return;
      a.reset();
      a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      a.clampWhenFinished = once;
      a.play();
      if (current && current !== a) current.crossFadeTo(a, fade, false);
      current = a;
    },
    setSpeed(s) { if (current) current.timeScale = s; },
    update(dt) { mixer.update(dt); },
    setFlash(v) {
      if (v === flash) return;
      flash = v;
      for (const m of mats) { m.emissive.setRGB(v, v, v); m.emissiveIntensity = 1; }
    },
    setTint(r, g, b) { for (const m of mats) m.emissive.setRGB(r, g, b); flash = -1; },
    fitTo: fit,
    dispose() {
      if (released) return;
      released = true;
      mixer.stopAllAction();
      for (const m of mats) m.dispose();
      control.release(path);
    },
  };
}
