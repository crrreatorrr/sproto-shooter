import * as THREE from 'three';
import { createFirstPerson, FP } from '../firstPerson.js';
import { colliderFor } from '../gunCollider.js';
import { fxRandom } from '../core/fxRandom.js';
import { TUNING } from '../../data/tuning.js';

export function mountViewmodel(env, playerModel) {
  const { E, ELEM_COL, G, GUN_MODEL_LEN, HAND_FRAC, LEFT_SPEC, RAY_COL, VM_LAYER, addBeam, addBoom, addTracer, buildGunModel, burstConfetti, bus, camera, flashLight } = env;
  const vmRoot = new THREE.Group();
  camera.add(vmRoot);
  const vmLight = new THREE.PointLight(0xffffff, 0.6, 3); vmLight.position.set(0.3, 0.3, 0); camera.add(vmLight);
  vmLight.layers.enable(VM_LAYER);
  flashLight.layers.enable(VM_LAYER);
  const muzzleFlash = new THREE.Mesh(G.sphereLo, E(0xffdd66)); muzzleFlash.visible = false;
  vmRoot.add(muzzleFlash);
  const setVmLayer = (o) => o.traverse((c) => c.layers.set(VM_LAYER));
  setVmLayer(vmRoot);
  // Viewmodel pose: [x, y, z] at rest / aiming, plus yaw/roll at rest. Modeled guns sit big in the lower right,
  // barrel angled in toward the crosshair; aiming pulls them to the center.
  const VM_POSE = {
    box: { rest: FP.hip.pos, ads: FP.ads.pos, yaw: 0, roll: 0, scale: FP.gunScale }, // placeholder while a model loads
    model: { rest: [0.2, -0.17, -0.5], ads: [0, -0.27, -0.45], yaw: 0.06, roll: -0.03, scale: 1 },
    // The MG's front sight sits above the barrel shroud. Keep it just below the crosshair in ADS.
    mg: { rest: [0.21, -0.18, -0.5], ads: [0, -0.16, -0.45], yaw: 0.06, roll: -0.03, scale: 1 },
    // slim shotgun sits a little higher; its barrel is the top of the model, so aiming can stay close to center
    shotgun: { rest: [0.19, -0.15, -0.5], ads: [0, -0.16, -0.45], yaw: 0.06, roll: -0.03, scale: 1 },
    // bazooka: same rules as the other guns, a little lower because the tube is tall; aiming keeps its top
    // below the crosshair
    bazooka: { len: 0.72, rest: [0.22, -0.22, -0.55], ads: [0, -0.3, -0.55], yaw: 0.06, roll: -0.03, scale: 1 },
    // boss weapons: chunky two-handed pistols, held a little closer; aiming lines the dish / bell up under the
    // crosshair
    raygun: { len: 0.5, rest: [0.17, -0.17, -0.45], ads: [0, -0.2, -0.42], yaw: 0.08, roll: -0.03, scale: 1 },
    bigbullets: { len: 0.58, rest: [0.18, -0.19, -0.48], ads: [0, -0.24, -0.46], yaw: 0.08, roll: -0.03, scale: 1 },
    // legendary Duck Gun: a stocked rifle with a duck head on the front
    duckgun: { len: 0.72, rest: [0.2, -0.19, -0.5], ads: [0, -0.25, -0.47], yaw: 0.07, roll: -0.03, scale: 1 },
  };
  const fp = createFirstPerson(camera, playerModel); // first-person arms (main): drawn in the viewmodel pass with the gun
  // The arms' gun collider takes ~50 ms to build per model: build it in idle time for every gun carried, so
  // switching to one doesn't hitch.
  const warmed = new Set();
  const idle = (f) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(f, { timeout: 2000 }) : setTimeout(f, 100));
  function warmColliders(guns) {
    for (const g of guns) {
      if (!g || !GUN_MODEL_LEN[g.type]) continue;
      const len = (VM_POSE[g.type] && VM_POSE[g.type].len) || GUN_MODEL_LEN[g.type];
      const key = `model:${g.type}:${len}`;
      if (warmed.has(key)) continue;
      const mesh = buildGunModel(g, len);
      if (!mesh) continue; // model not downloaded yet
      warmed.add(key);
      idle(() => colliderFor(mesh, key));
    }
  }
  const vm = { kick: 0, swayX: 0, swayY: 0, bob: 0, swap: 0, lastYaw: 0, lastPitch: 0 };

  // ---------- reload animations ----------
  // Procedural, per gun type, driven by reload progress t (0..1) so they always fit the real reload time.
  // Returns camera-space offsets { x, y, z } and local rotations { rx, ry, rz }.
  const smooth = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
  // Keep the Soldier's reload beats and contact points, with gentler accents for the heavier Pepe gloves.
  const pulse = (t, c, w) => fp.usesPepeRig
    ? 0.62 * Math.exp(-(((t - c) / (w * 1.3)) ** 2))
    : Math.exp(-(((t - c) / w) ** 2));
  const RELOAD_ANIM = {
    // drum swap: roll the underside toward the support hand, pull down, then seat the drum
    mg: (t, e) => ({
      x: -0.02 * e, y: -0.06 * e - 0.03 * pulse(t, 0.35, 0.06) + 0.035 * pulse(t, 0.6, 0.04), z: 0.08 * e,
      rx: 0.25 * e - 0.1 * pulse(t, 0.35, 0.06), ry: 0.1 * e, rz: -0.5 * e - 0.12 * pulse(t, 0.6, 0.04),
    }),
    // shell by shell: gun canted up and left, a push per shell, then a big pump
    shotgun: (t, e) => {
      let push = 0;
      for (let i = 0; i < 5; i++) push += pulse(t, 0.22 + i * 0.12, 0.03);
      return { x: -0.02 * e, y: -0.06 * e, z: -0.02 * push + 0.07 * pulse(t, 0.88, 0.04),
        rx: 0.35 * e + 0.05 * push, ry: -0.15 * e, rz: -0.35 * e };
    },
    // bolt action + mag: turn the gun to show its side, bolt up and back, swap the mag, bolt home
    // (pulled in toward the body so the right hand can still reach the grip while the left swaps the mag)
    sniper: (t, e) => ({
      x: -0.04 * e, y: -0.05 * e - 0.04 * pulse(t, 0.5, 0.05) + 0.03 * pulse(t, 0.62, 0.04), z: 0.1 * e + 0.04 * pulse(t, 0.25, 0.05) - 0.04 * pulse(t, 0.86, 0.04),
      rx: 0.15 * e, ry: 0.12 * e, rz: 0.35 * e + 0.15 * pulse(t, 0.25, 0.05) - 0.12 * pulse(t, 0.86, 0.04),
    }),
    // swing the back of the gun round in front, swap the power cell there, then a charge-up twirl
    raygun: (t, e) => ({
      x: -0.05 * e, y: -0.03 * e, z: -0.05 * e,
      rx: 0.15 * e, ry: -0.6 * e, rz: 0.25 * e + (fp.usesPepeRig ? 0.22 : 0.6) * pulse(t, 0.84, 0.05),
    }),
    // roll the drum toward the left hand, thumb in four big rounds (a nudge per round), flick the drum shut
    bigbullets: (t, e) => {
      let push = 0;
      for (let i = 0; i < 4; i++) push += pulse(t, 0.3 + i * 0.11, 0.03);
      return { x: -0.03 * e, y: -0.05 * e, z: 0.07 * e,
        rx: 0.2 * e + 0.03 * push, ry: -0.2 * e, rz: -0.6 * e - 0.5 * pulse(t, 0.84, 0.05) };
    },
    // tilt the duck so its back faces the left hand, a nudge per rubber round fed in, then a squeeze of the head
    duckgun: (t, e) => {
      let push = 0;
      for (let i = 0; i < 3; i++) push += pulse(t, 0.32 + i * 0.13, 0.03);
      return { x: -0.03 * e, y: -0.05 * e, z: 0.05 * e,
        rx: 0.25 * e - 0.04 * push, ry: 0.2 * e, rz: 0.45 * e - 0.15 * pulse(t, 0.8, 0.04) };
    },
    // swing the tube out to the right so its open back end comes round in front, load a rocket, swing back
    bazooka: (t, e) => ({
      x: -0.06 * e, y: -0.08 * e + 0.02 * pulse(t, 0.6, 0.05), z: -0.1 * e - 0.03 * pulse(t, 0.6, 0.05),
      rx: -0.2 * e, ry: -0.75 * e, rz: 0.12 * e,
    }),
  };
  const NO_RELOAD = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
  function reloadOffsets(type, reloadT, total) {
    if (!(reloadT > 0) || !total) return NO_RELOAD;
    const t = reloadProgress(reloadT, total);
    const e = smooth(0, 0.15, t) * (1 - smooth(0.85, 1, t)); // ease in and out of the reload pose
    const pose = (RELOAD_ANIM[type] || RELOAD_ANIM.mg)(t, e);
    if (fp.usesPepeRig) {
      const settle = smooth(0, 0.06, t) * (1 - smooth(0.94, 1, t));
      return { x: pose.x * settle, y: pose.y * settle, z: pose.z * settle,
        rx: pose.rx * settle, ry: pose.ry * settle, rz: pose.rz * settle };
    }
    return pose;
  }
  const reloadProgress = (reloadT, total) => Math.min(1, Math.max(0, 1 - reloadT / total));

  // ---------- reload hand work ----------
  // While the gun moves, the hands leave their holds to do the actual reload: grab the hopper, feed shells,
  // work the bolt, push a rocket in. Each track gives, per hand, a weight (0 = normal hold, 1 = this target)
  // and a target anchor as fractions of the model's size [x, y, z] (same convention as HAND_FRAC). Anchors
  // inside the gun put the palm on its surface; anchors in the air are free hand positions (fetching a new
  // magazine, holding a rocket). Keys ease with smoothstep.
  const track = (t, keys) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1] = keys[i];
      if (t <= t1) {
        const [t0, v0] = keys[i - 1], k = smooth(t0, t1, t);
        return Array.isArray(v0) ? v0.map((x, j) => x + (v1[j] - x) * k) : v0 + (v1 - v0) * k;
      }
    }
    return keys[keys.length - 1][1];
  };
  const PALM_DOWN_L = { fingers: [0, -0.2, -1], thumb: [1, 0, 0] }; // left hand on top of something
  const PUSH_FWD_L = { fingers: [0, 1, 0.25], thumb: [1, 0, 0] }; // left palm facing forward (pushing in)
  const BOLT_R = { fingers: [-0.3, -1, -0.3], thumb: [0, 0.2, -1] }; // right hand pinching a bolt knob from above
  const HAND_ANIM = {
    // Left hand clears the shroud, cups the drum from below and pushes up to seat it.
    mg: (t) => {
      const fore = HAND_FRAC.mg.fore, clear = [-0.6, -0.58, fore[2]];
      const drum = [0, -0.43, -0.065], under = [0, -0.67, -0.065], low = [-0.42, -0.98, -0.065];
      return { left: { w: track(t, [[0.04, 0], [0.15, 1], [0.85, 1], [0.96, 0]]),
        at: track(t, [[0.04, fore], [0.15, clear], [0.19, under], [0.26, drum], [0.35, drum], [0.46, low], [0.55, low],
          [0.65, drum], [0.73, drum], [0.8, under], [0.87, clear], [0.96, fore]]) } };
    },
    // left hand: from the pump down to the loading port, push a shell in per bump, back to the pump and rack it
    shotgun: (t) => {
      const fore = HAND_FRAC.shotgun.fore, port = [0, -0.1, 0.07], below = [0, -0.6, 0.07];
      const keys = [[0.04, fore], [0.14, below]];
      for (let i = 0; i < 5; i++) { const c = 0.22 + i * 0.12; keys.push([c - 0.03, below], [c, port], [c + 0.04, below]); }
      keys.push([0.77, [-0.9, -0.5, -0.15]], [0.82, fore], [0.87, [fore[0], fore[1], fore[2] + 0.16]], [0.93, fore]); // out round the side, then rack
      return { left: { w: smooth(0, 0.04, t) * (1 - smooth(0.95, 1, t)), at: track(t, keys) } };
    },
    // right hand works the bolt (up and back, later home), left hand swaps the magazine in between
    sniper: (t) => {
      const knob = [0.376, -0.017, 0.175], back = [0.376, 0.01, 0.29], mag = [0, -0.45, -0.07], drop = [-0.2, -1.1, -0.05];
      return {
        right: { spec: BOLT_R, w: track(t, [[0.1, 0], [0.18, 1], [0.34, 1], [0.42, 0], [0.7, 0], [0.76, 1], [0.9, 1], [0.96, 0]]),
          at: track(t, [[0.12, [0.9, 0.1, 0.2]], [0.18, knob], [0.26, back], [0.34, back], [0.76, back], [0.86, knob]]) }, // approach from the right
        left: { w: track(t, [[0.36, 0], [0.44, 1], [0.66, 1], [0.74, 0]]), at: track(t, [[0.44, mag], [0.5, drop], [0.58, mag]]),
          spec: { fingers: [1, 0.25, 0.15], thumb: [0, 0.2, -1] } },
      };
    },
    // left hand pulls the power cell out of the back, fetches a fresh one from below, plugs it in
    raygun: (t) => {
      const cell = [0, 0.2, 0.5], out = [-0.4, 0.35, 0.95], low = [-1.3, -0.7, 0.4];
      const path = [[0.2, cell], [0.3, cell], [0.4, out], [0.5, low], [0.6, out], [0.68, cell], [0.74, cell]];
      const weights = [[0.08, 0], [0.2, 1], [0.74, 1], [0.86, 0]];
      if (fp.usesPepeRig) {
        // The Pepe support hand exits under the emitter while it rolls back toward aim.
        path.unshift([0.08, [-0.75, -0.85, -0.22]], [0.15, low]);
        path.push([0.80, [-1.05, -0.8, 0.2]], [0.90, [-0.6, -0.95, -0.18]]);
        weights.splice(0, 4, [0.11, 0], [0.21, 1], [0.90, 1], [0.98, 0]);
      }
      return { left: { spec: PUSH_FWD_L, w: track(t, weights), at: track(t, path) } };
    },
    // left hand on the side of the drum, pushing a round in per nudge (out to fetch the next between)
    bigbullets: (t) => {
      const drum = [-0.3, 0.08, -0.09], away = [-1.1, -0.1, -0.05], fore = HAND_FRAC.bigbullets.fore;
      const below = [fore[0] - 0.3, fore[1] - 0.6, fore[2]]; // drop clear of the gun before turning the hand
      const keys = [[0.12, below], [0.2, away]];
      for (let i = 0; i < 4; i++) { const c = 0.3 + i * 0.11; keys.push([c - 0.04, away], [c, drum], [c + 0.04, away]); }
      keys.push([0.8, away], [0.86, below]);
      return { left: { spec: LEFT_SPEC.foregrip, w: track(t, [[0.04, 0], [0.12, 1], [0.86, 1], [0.94, 0]]), at: track(t, keys) } };
    },
    // left hand: down for a rubber round, push it into the hatch on the duck's back (×3), then squeeze its head
    duckgun: (t) => {
      const fore = HAND_FRAC.duckgun.fore, below = [fore[0] - 1.2, fore[1] - 0.7, fore[2]];
      const hatch = [-0.05, 0.36, -0.18], over = [-1.0, 0.9, -0.1], head = [0, 0.4, -0.22];
      const keys = [[0.08, below], [0.18, over]];
      for (let i = 0; i < 3; i++) { const c = 0.32 + i * 0.13; keys.push([c - 0.05, over], [c, hatch], [c + 0.04, over]); }
      keys.push([0.74, over], [0.8, head], [0.84, over], [0.9, below]);
      return { left: { spec: PALM_DOWN_L, w: track(t, [[0.03, 0], [0.1, 1], [0.9, 1], [0.97, 0]]), at: track(t, keys) } };
    },
    // left hand leaves the foregrip, takes a rocket from behind the tube and pushes it in, back to the grip
    bazooka: (t) => {
      const behind = [0, 0.05, 0.85], mouth = [0, 0.05, 0.56], low = [-0.6, -0.5, 0.6];
      return { left: { spec: PUSH_FWD_L, w: track(t, [[0.08, 0], [0.2, 1], [0.76, 1], [0.88, 0]]),
        at: track(t, [[0.2, low], [0.32, behind], [0.45, behind], [0.6, mouth], [0.7, mouth], [0.76, low]]) } };
    },
  };
  /** Hand targets for the first-person rig during a reload, in the held model's local units. */
  function reloadHands(gunMesh, type, reloadT, total) {
    if (!(reloadT > 0) || !total || !gunMesh.userData.size || !HAND_ANIM[type]) return null;
    const h = HAND_ANIM[type](reloadProgress(reloadT, total)), sz = gunMesh.userData.size, out = {};
    for (const side of ['left', 'right']) {
      const o = h[side];
      if (o && o.w > 0) out[side] = { w: o.w, spec: o.spec, anchor: [o.at[0] * sz.x, o.at[1] * sz.y, o.at[2] * sz.z] };
    }
    return out;
  }

  // ---------- camera feel ----------
  const feel = { trauma: 0, fovPunch: 0, fov: TUNING.fovBase, landDip: 0 };
  function addTrauma(t) { feel.trauma = Math.min(1, feel.trauma + t); }
  // ---------- event listeners ----------
  bus.on('shot', (ev) => {
    vm.kick = Math.min(1, vm.kick + (ev.gunType === 'mg' || ev.gunType === 'raygun' ? 0.25 : 1));
    muzzleFlash.visible = true; env.flashT = 0.05;
    const big = ev.gunType !== 'mg' && ev.gunType !== 'raygun';
    muzzleFlash.scale.setScalar(big ? 0.12 : 0.07 * (ev.manufacturer === 'blastco' ? 1.6 : 1));
    muzzleFlash.material.color.set(ev.gunType === 'raygun' && ev.element === 'none' ? RAY_COL : ELEM_COL[ev.element]);
    if (ev.gunType === 'bigbullets') muzzleFlash.scale.setScalar(0.2);
    addTrauma(ev.mega ? 0.5 : ev.gunType === 'mg' ? 0.03 : ev.gunType === 'raygun' ? 0.02 : ev.gunType === 'sniper' ? 0.25 : ev.gunType === 'bigbullets' ? 0.4 : 0.2);
    feel.fovPunch += ev.gunType === 'mg' || ev.gunType === 'raygun' ? 0.2 : ev.gunType === 'bigbullets' ? 3.5 : 2;
  });
  bus.on('tracer', (ev) => {
    const col = ev.zap ? 0x9ff3ff : ELEM_COL[ev.element] || 0xffe9a8;
    let from = ev.from;
    if (!ev.zap) {
      // start at viewmodel muzzle for player's shots
      const mp = new THREE.Vector3(); muzzleFlash.getWorldPosition(mp);
      if (Math.hypot(ev.from.x - camera.position.x, ev.from.z - camera.position.z) < 1.5) from = { x: mp.x, y: mp.y, z: mp.z };
    }
    if (ev.gunType === 'raygun') addBeam(from, ev.to, ev.element && ev.element !== 'none' ? ELEM_COL[ev.element] : RAY_COL);
    else addTracer(from, ev.to, col, ev.zap ? 0.18 : ev.gunType === 'sniper' ? 0.15 : 0.05, !!ev.zap);
    if (ev.mega) addTracer(from, ev.to, 0xffffff, 0.2);
  });
  bus.on('impact', (ev) => burstConfetti({ ...ev.pos, y: Math.max(0.05, ev.pos.y) }, 3, 2, [new THREE.Color(ELEM_COL[ev.element])]));
  bus.on('damage', (ev) => {
    if (ev.isWeak) burstConfetti(ev.pos, 6, 3, [new THREE.Color(0xffee55), new THREE.Color(0xffffff)]);
    else if (fxRandom() < 0.4) burstConfetti(ev.pos, 2, 2, [new THREE.Color(ELEM_COL[ev.element])]);
  });
  bus.on('kill', (ev) => {
    if (ev.isDummy) return;
    const big = ev.bossTag ? 4 : ev.elite ? 2 : 1;
    burstConfetti(ev.pos, 40 * big, 7 * Math.sqrt(big));
    addBoom(ev.pos, ev.bossTag ? 6 : 1.2, 0xffffff, 0.2);
    addTrauma(ev.bossTag ? 0.8 : 0.08);
  });
  bus.on('fuseLit', (ev) => { addBoom({ ...ev.pos, y: ev.pos.y + 1.6 }, 0.6, 0xffe14a, 0.2); });
  bus.on('explosion', (ev) => {
    addBoom(ev.pos, ev.radius, ELEM_COL[ev.element] === 0xffe9a8 ? 0xffa040 : ELEM_COL[ev.element], 0.4);
    burstConfetti(ev.pos, 12, 6, [new THREE.Color(0xffa040), new THREE.Color(0xffe14a), new THREE.Color(0x666666)]);
    flashLight.position.set(ev.pos.x, ev.pos.y + 1, ev.pos.z); flashLight.intensity = 30; flashLight.color.set(0xffaa55);
    const d = Math.hypot(ev.pos.x - camera.position.x, ev.pos.z - camera.position.z);
    addTrauma(Math.max(0, 0.6 - d / 25) * (ev.radius / 4));
  });
  bus.on('meteorImpact', (ev) => { addBoom({ ...ev.pos, y: 0.5 }, 7, 0xff4400, 0.7); burstConfetti(ev.pos, 150, 12); addTrauma(1); });
  bus.on('splat', (ev) => burstConfetti(ev.pos, ev.element === 'fire' ? 18 : 10, 3, ev.element === 'fire' ? [new THREE.Color(0xff7a1a), new THREE.Color(0xffd166), new THREE.Color(0x553322)] : [new THREE.Color(0x9be33b), new THREE.Color(0x5aa02c)]));
  bus.on('playerDamaged', (ev) => addTrauma(ev.noDamage ? 0.3 : Math.min(0.5, ev.amount / 40)));
  bus.on('bossMeleeHit', () => addTrauma(0.5)); // heavy hit: big shake (trauma², decays)
  bus.on('land', (ev) => { feel.landDip = Math.min(0.25, ev.speed / 60); });
  bus.on('dash', () => { feel.fovPunch += 8; });
  bus.on('slide', () => { feel.fovPunch += 4; });
  bus.on('reloadStart', (ev) => { vm.reloadTime = ev.time || 1.5; });
  bus.on('swap', () => { vm.swap = 1; });
  bus.on('gunPickedUp', () => { vm.swap = 1; });
  bus.on('stomp', (ev) => burstConfetti({ ...ev.pos, y: 0.1 }, 8, 3, [new THREE.Color(0xff5ec4)]));
  bus.on('pound', (ev) => { addBoom({ ...ev.pos, y: 0.2 }, 3.2, 0x9fb4ff, 0.3); addTrauma(0.2); });
  bus.on('bossStunned', (ev) => { addTrauma(0.6); burstConfetti({ ...ev.pos, y: 4 }, 30, 5, [new THREE.Color(0xffee55)]); });
  bus.on('bossTeleport', (ev) => burstConfetti(ev.pos, 40, 5, [new THREE.Color(0xb07cff), new THREE.Color(0x222222)]));
  bus.on('allyPoof', (ev) => burstConfetti({ ...ev.pos, y: 0.4 }, 10, 2));
  bus.on('craftComplete', (ev) => burstConfetti({ ...ev.pos, y: 1.5 }, 30, 4, [new THREE.Color(0x4fd1c5), new THREE.Color(0xffd166)]));
  bus.on('levelUp', () => feel.fovPunch += 3);
  bus.on('duckBounce', (ev) => burstConfetti(ev.pos, 2, 2, [new THREE.Color(0xffe14a)]));
  bus.on('bounce', (ev) => burstConfetti(ev.pos, 3, 3, [new THREE.Color(0x6b6b6b), new THREE.Color(0x3a3a3a)])); // tyre hitting the ground
  Object.assign(env, { vmRoot, vmLight, muzzleFlash, setVmLayer, VM_POSE, fp, warmed, idle, warmColliders, vm, smooth, pulse, RELOAD_ANIM, NO_RELOAD, reloadOffsets, reloadProgress, track, PALM_DOWN_L, PUSH_FWD_L, BOLT_R, HAND_ANIM, reloadHands, feel, addTrauma });
}
