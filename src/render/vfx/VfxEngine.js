// @ts-check
import * as THREE from 'three';
import { ELEM_COL } from '../materials/geometries.js';
import { fxRandom } from '../core/fxRandom.js';

const lerp = (a, b, t) => a + (b - a) * t;
const TRACER_N = 96;
const CONF_N = 1500;

export function createVfx(ctx, mats, bus, deps) {
  const { scene, camera } = ctx;
  const { G } = mats;
  const { cameraRig, viewmodel } = deps;

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
  const scratch = new THREE.Color();

  function addTracer(from, to, color, life = 0.06, jag = false) {
    if (jag) {
      let prev = from;
      for (let i = 1; i <= 4; i++) {
        const t = i / 4;
        const p = i === 4 ? to : {
          x: lerp(from.x, to.x, t) + (fxRandom() - 0.5) * 0.8,
          y: lerp(from.y, to.y, t) + (fxRandom() - 0.5) * 0.8,
          z: lerp(from.z, to.z, t) + (fxRandom() - 0.5) * 0.8,
        };
        addTracer(prev, p, color, 0.18, false);
        prev = p;
      }
      return;
    }
    const i = tracerIdx++ % TRACER_N;
    tracers[i].life = life; tracers[i].max = life;
    tracerPos.set([from.x, from.y, from.z, to.x, to.y, to.z], i * 6);
    scratch.set(color);
    tracerCol.set([scratch.r, scratch.g, scratch.b, scratch.r, scratch.g, scratch.b], i * 6);
  }

  const confGeo = new THREE.PlaneGeometry(0.12, 0.08);
  const confetti = new THREE.InstancedMesh(confGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), CONF_N);
  confetti.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CONF_N * 3), 3);
  confetti.frustumCulled = false;
  scene.add(confetti);
  const cp = new Float32Array(CONF_N * 3), cv = new Float32Array(CONF_N * 3), cl = new Float32Array(CONF_N), cr = new Float32Array(CONF_N);
  let confIdx = 0;
  const dummy = new THREE.Object3D();
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
    if (confetti.instanceColor) confetti.instanceColor.needsUpdate = true;
  }

  const booms = [];
  function addBoom(pos, radius, color, life = 0.35) {
    const m = new THREE.Mesh(G.sphereLo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }));
    m.position.set(pos.x, pos.y, pos.z);
    scene.add(m);
    booms.push({ m, life, max: life, radius });
  }
  const flashLight = new THREE.PointLight(0xffcc66, 0, 12);
  scene.add(flashLight);

  function col(element) { return ELEM_COL[element] || 0xffe9a8; }

  bus.on('shot', (ev) => {
    viewmodel.onShot(ev);
    cameraRig.addTrauma(ev.mega ? 0.5 : ev.gunType === 'mg' ? 0.03 : ev.gunType === 'sniper' ? 0.25 : 0.2);
    cameraRig.feel.fovPunch += ev.gunType === 'mg' ? 0.2 : 2;
  });
  bus.on('tracer', (ev) => {
    const c = ev.zap ? 0x9ff3ff : col(ev.element);
    let from = ev.from;
    if (!ev.zap) {
      const mp = viewmodel.muzzleWorld();
      if (Math.hypot(ev.from.x - camera.position.x, ev.from.z - camera.position.z) < 1.5) from = { x: mp.x, y: mp.y, z: mp.z };
    }
    addTracer(from, ev.to, c, ev.zap ? 0.18 : ev.gunType === 'sniper' ? 0.15 : 0.05, !!ev.zap);
    if (ev.mega) addTracer(from, ev.to, 0xffffff, 0.2);
  });
  bus.on('impact', (ev) => burstConfetti({ ...ev.pos, y: Math.max(0.05, ev.pos.y) }, 3, 2, [new THREE.Color(col(ev.element))]));
  bus.on('damage', (ev) => {
    if (ev.isWeak) burstConfetti(ev.pos, 6, 3, [new THREE.Color(0xffee55), new THREE.Color(0xffffff)]);
    else if (fxRandom() < 0.4) burstConfetti(ev.pos, 2, 2, [new THREE.Color(col(ev.element))]);
  });
  bus.on('kill', (ev) => {
    if (ev.isDummy) return;
    const big = ev.bossTag ? 4 : ev.elite ? 2 : 1;
    burstConfetti(ev.pos, 40 * big, 7 * Math.sqrt(big));
    addBoom(ev.pos, ev.bossTag ? 6 : 1.2, 0xffffff, 0.2);
    cameraRig.addTrauma(ev.bossTag ? 0.8 : 0.08);
  });
  bus.on('explosion', (ev) => {
    addBoom(ev.pos, ev.radius, col(ev.element) === 0xffe9a8 ? 0xffa040 : col(ev.element), 0.4);
    burstConfetti(ev.pos, 12, 6, [new THREE.Color(0xffa040), new THREE.Color(0xffe14a), new THREE.Color(0x666666)]);
    flashLight.position.set(ev.pos.x, ev.pos.y + 1, ev.pos.z); flashLight.intensity = 30; flashLight.color.set(0xffaa55);
    const d = Math.hypot(ev.pos.x - camera.position.x, ev.pos.z - camera.position.z);
    cameraRig.addTrauma(Math.max(0, 0.6 - d / 25) * (ev.radius / 4));
  });
  bus.on('meteorImpact', (ev) => { addBoom({ ...ev.pos, y: 0.5 }, 7, 0xff4400, 0.7); burstConfetti(ev.pos, 150, 12); cameraRig.addTrauma(1); });
  bus.on('splat', (ev) => burstConfetti(ev.pos, 10, 3, [new THREE.Color(0x9be33b), new THREE.Color(0x5aa02c)]));
  bus.on('playerDamaged', (ev) => cameraRig.addTrauma(Math.min(0.5, ev.amount / 40)));
  bus.on('land', (ev) => { cameraRig.feel.landDip = Math.min(0.25, ev.speed / 60); });
  bus.on('dash', () => { cameraRig.feel.fovPunch += 8; });
  bus.on('slide', () => { cameraRig.feel.fovPunch += 4; });
  bus.on('reloadStart', (ev) => viewmodel.onReload(ev));
  bus.on('swap', () => viewmodel.onSwap());
  bus.on('gunPickedUp', () => viewmodel.onSwap());
  bus.on('stomp', (ev) => burstConfetti({ ...ev.pos, y: 0.1 }, 8, 3, [new THREE.Color(0xff5ec4)]));
  bus.on('pound', (ev) => { addBoom({ ...ev.pos, y: 0.2 }, 3.2, 0x9fb4ff, 0.3); cameraRig.addTrauma(0.2); });
  bus.on('bossStunned', (ev) => { cameraRig.addTrauma(0.6); burstConfetti({ ...ev.pos, y: 4 }, 30, 5, [new THREE.Color(0xffee55)]); });
  bus.on('bossTeleport', (ev) => burstConfetti(ev.pos, 40, 5, [new THREE.Color(0xb07cff), new THREE.Color(0x222222)]));
  bus.on('allyPoof', (ev) => burstConfetti({ ...ev.pos, y: 0.4 }, 10, 2));
  bus.on('craftComplete', (ev) => burstConfetti({ ...ev.pos, y: 1.5 }, 30, 4, [new THREE.Color(0x4fd1c5), new THREE.Color(0xffd166)]));
  bus.on('levelUp', () => { cameraRig.feel.fovPunch += 3; });
  bus.on('duckBounce', (ev) => burstConfetti(ev.pos, 2, 2, [new THREE.Color(0xffe14a)]));

  return {
    update(dt) {
      for (let i = 0; i < TRACER_N; i++) {
        const tr = tracers[i];
        if (tr.life > 0) { tr.life -= dt; if (tr.life <= 0) tracerPos.fill(0, i * 6, i * 6 + 6); }
      }
      tracerGeo.attributes.position.needsUpdate = true;
      tracerGeo.attributes.color.needsUpdate = true;
      for (let i = 0; i < CONF_N; i++) {
        if (cl[i] <= 0) { dummy.scale.setScalar(0); dummy.position.set(0, -100, 0); dummy.updateMatrix(); confetti.setMatrixAt(i, dummy.matrix); continue; }
        cl[i] -= dt;
        cv[i * 3 + 1] -= 9 * dt;
        cv[i * 3] *= 1 - dt * 1.5; cv[i * 3 + 2] *= 1 - dt * 1.5;
        if (cv[i * 3 + 1] < -2.5) cv[i * 3 + 1] = -2.5;
        cp[i * 3] += cv[i * 3] * dt; cp[i * 3 + 1] += cv[i * 3 + 1] * dt; cp[i * 3 + 2] += cv[i * 3 + 2] * dt;
        if (cp[i * 3 + 1] < 0.02) { cp[i * 3 + 1] = 0.02; cv[i * 3] = cv[i * 3 + 2] = 0; }
        cr[i] += dt * 8;
        dummy.position.set(cp[i * 3], cp[i * 3 + 1], cp[i * 3 + 2]);
        dummy.rotation.set(cr[i], cr[i] * 0.7, 0);
        dummy.scale.setScalar(Math.min(1, cl[i] * 2));
        dummy.updateMatrix();
        confetti.setMatrixAt(i, dummy.matrix);
      }
      confetti.instanceMatrix.needsUpdate = true;
      for (let i = booms.length - 1; i >= 0; i--) {
        const b = booms[i];
        b.life -= dt;
        const k = 1 - b.life / b.max;
        b.m.scale.setScalar(b.radius * (0.3 + 0.7 * Math.sqrt(k)));
        b.m.material.opacity = 0.8 * (1 - k);
        if (b.life <= 0) { scene.remove(b.m); b.m.material.dispose(); booms.splice(i, 1); }
      }
      flashLight.intensity = Math.max(0, flashLight.intensity - dt * 120);
    },
    liveFx() {
      let n = booms.length;
      for (let i = 0; i < CONF_N; i++) if (cl[i] > 0) n++;
      for (let i = 0; i < tracers.length; i++) if (tracers[i].life > 0) n++;
      return n;
    },
  };
}
