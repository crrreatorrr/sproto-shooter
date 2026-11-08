import * as THREE from 'three';
import { fxRandom } from '../core/fxRandom.js';

export function mountVfx(env) {
  const { G, lerp, scene } = env;
  // ---------- VFX: tracers, confetti, explosions, flashes ----------
  const TRACER_N = 96;
  const tracerGeo = new THREE.BufferGeometry();
  const tracerPos = new Float32Array(TRACER_N * 6);
  const tracerCol = new Float32Array(TRACER_N * 6);
  tracerGeo.setAttribute('position', new THREE.BufferAttribute(tracerPos, 3));
  tracerGeo.setAttribute('color', new THREE.BufferAttribute(tracerCol, 3));
  const tracerLines = new THREE.LineSegments(tracerGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, toneMapped: false }));
  tracerLines.frustumCulled = false;
  scene.add(tracerLines);
  const tracers = Array.from({ length: TRACER_N }, () => ({ life: 0, max: 0.06 }));
  let tracerIdx = 0;
  function addTracer(from, to, color, life = 0.06, jag = false) {
    if (jag) {
      // zigzag lightning in 4 segments
      let prev = from;
      for (let i = 1; i <= 4; i++) {
        const t = i / 4;
        const p = i === 4 ? to : { x: lerp(from.x, to.x, t) + (fxRandom() - 0.5) * 0.8, y: lerp(from.y, to.y, t) + (fxRandom() - 0.5) * 0.8, z: lerp(from.z, to.z, t) + (fxRandom() - 0.5) * 0.8 };
        addTracer(prev, p, color, 0.18, false);
        prev = p;
      }
      return;
    }
    const i = tracerIdx++ % TRACER_N;
    tracers[i].life = life; tracers[i].max = life;
    tracerPos.set([from.x, from.y, from.z, to.x, to.y, to.z], i * 6);
    const c = new THREE.Color(color);
    tracerCol.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
  }

  const CONF_N = 1500;
  const confGeo = new THREE.PlaneGeometry(0.12, 0.08);
  const confetti = new THREE.InstancedMesh(confGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), CONF_N);
  confetti.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CONF_N * 3), 3);
  confetti.frustumCulled = false;
  scene.add(confetti);
  const cp = new Float32Array(CONF_N * 3), cv = new Float32Array(CONF_N * 3), cl = new Float32Array(CONF_N), cr = new Float32Array(CONF_N);
  let confIdx = 0;
  const CONF_COLORS = [0xff5ec4, 0xffd166, 0x4fe3ff, 0x7fd34e, 0xff8a3d, 0xb07cff, 0xffffff].map((c) => new THREE.Color(c));
  function burstConfetti(pos, n, speed = 6, colors = CONF_COLORS) {
    for (let k = 0; k < n; k++) {
      const i = confIdx++ % CONF_N;
      cp[i * 3] = pos.x; cp[i * 3 + 1] = pos.y; cp[i * 3 + 2] = pos.z;
      const a = fxRandom() * Math.PI * 2, u = fxRandom() * 0.8 + 0.2;
      cv[i * 3] = Math.cos(a) * speed * u; cv[i * 3 + 1] = fxRandom() * speed + 2; cv[i * 3 + 2] = Math.sin(a) * speed * u;
      cl[i] = 1.2 + fxRandom() * 0.8; cr[i] = fxRandom() * 10;
      confetti.setColorAt(i, colors[(fxRandom() * colors.length) | 0]);
    }
    confetti.instanceColor.needsUpdate = true;
  }

  const booms = [];
  function addBoom(pos, radius, color, life = 0.35) {
    const m = new THREE.Mesh(G.sphereLo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }));
    m.position.set(pos.x, pos.y, pos.z);
    scene.add(m);
    booms.push({ m, life, max: life, radius });
  }
  // Ray Gun lasers: a white-hot core inside a coloured additive glow, stretched from muzzle to hit point; they
  // flare for a few frames and thin out as they fade
  const BEAM_N = 24, RAY_COL = 0x5dfcff;
  const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).rotateX(Math.PI / 2); // axis along +Z, unit length
  const beams = Array.from({ length: BEAM_N }, () => {
    const glow = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: RAY_COL, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const core = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
    const g = new THREE.Group(); g.add(glow, core); g.visible = false; g.frustumCulled = false;
    glow.frustumCulled = core.frustumCulled = false;
    scene.add(g);
    return { g, glow, core, life: 0, max: 0.16, len: 1 };
  });
  let beamIdx = 0;
  function addBeam(from, to, color) {
    const b = beams[beamIdx++ % BEAM_N];
    const len = Math.max(0.01, Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z));
    b.g.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    b.g.lookAt(to.x, to.y, to.z);
    b.len = len; b.life = b.max; b.g.visible = true;
    b.glow.material.color.set(color);
    addBoom(to, 0.35, color, 0.12); // hit flare
  }
  function updateBeams(fdt) {
    for (const b of beams) {
      if (b.life <= 0) continue;
      b.life -= fdt;
      if (b.life <= 0) { b.g.visible = false; continue; }
      const k = b.life / b.max; // 1 → 0
      b.glow.scale.set(0.14 * k + 0.03, 0.14 * k + 0.03, b.len);
      b.core.scale.set(0.045 * k + 0.01, 0.045 * k + 0.01, b.len);
      b.glow.material.opacity = 0.55 * k; b.core.material.opacity = 0.95 * k;
    }
  }

  const flashLight = new THREE.PointLight(0xffcc66, 0, 12);
  scene.add(flashLight);
  env.flashT = 0;
  Object.assign(env, { TRACER_N, tracerGeo, tracerPos, tracerCol, tracerLines, tracers, addTracer, CONF_N, confGeo, confetti, cp, cv, cl, cr, CONF_COLORS, burstConfetti, booms, addBoom, BEAM_N, RAY_COL, beamGeo, beams, addBeam, updateBeams, flashLight });
}
