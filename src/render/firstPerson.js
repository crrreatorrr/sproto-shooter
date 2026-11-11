// First-person Mixamo rig. Surface contacts place the palms against the held weapon.
// Two-bone IK and shoulder protraction keep the elbows and sleeves outside the weapon.
// Fingers curl to contact. Pepe rigs also probe their glove geometry and clear the torso and opposite arm.
// The gun carries recoil, sway and reload targets, so the hands track its motion.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { colliderFor } from './gunCollider.js';
import { createBodyClearance, pushWristOut } from './viewmodel/armClearance.js';
import { enqueue, PRIORITY, retainAsset, releaseAsset, peekAsset } from './assets.js';
import { FP as STOCK_POSE } from './viewmodel/fpPose.js';
import { aim, rotateWorld, handFrame, frame, specBasis } from './viewmodel/handFrame.js';
import { preparePlayerBody, disposePlayerBody, firstPersonPose, PEPE_MG_SUPPORT } from './viewmodel/playerBody.js';
export { FP, cleanArmWeights } from './viewmodel/fpPose.js';

import { damp, smoothstep, wrapAngle } from './anim.js';
import { PLAYER_CHARACTERS } from './playerCharacters.js';

const STOCK_MODEL = PLAYER_CHARACTERS[0].model;
// Pepe sniper support hand: cupped under the handguard, as fractions of the model's size [y, z offset from the
// gun's own fore anchor]. Calibrated with dev/fpLab.js for all three Pepe rigs at hip and aim.
const PEPE_SNIPER_FORE = [0.06, 0.05];
const BASE = `${import.meta.env.BASE_URL}assets/`;

const V = () => new THREE.Vector3();
const _a = V(), _b = V(), _c = V(), _t = V(), _d = V(), _e = V(), _p = V();
const _q2 = new THREE.Quaternion(), _pq = new THREE.Quaternion();
const _m = new THREE.Matrix4();

const armsLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
export function loadPlayerModel(path) {
  return enqueue(path, () => armsLoader.loadAsync(BASE + path), PRIORITY.NOW);
}

export function createFirstPerson(camera, initialModel = STOCK_MODEL) {
  const root = new THREE.Group(); // child of camera
  root.visible = false;
  camera.add(root);
  let ready = false;
  let FP = STOCK_POSE;
  let protectBody = false;
  const torsoCentre = V(), torsoHalf = V();
  const bodyInverse = new THREE.Matrix4(), gunInverse = new THREE.Matrix4();
  let bones = {};
  let bind = new Map();
  let arms = null;
  let holder = null;
  const holderBase = V();
  const lean = V(); // smoothed body lean toward the gun when the arms come up short
  let gun = null, gunType = 'mg', col = null;

  let desiredPath = '';
  let mountedPath = '';
  let requested = 0;
  let invalidPath = '';
  function attachArms(g, path) {
    if (mountedPath === path) return;
    const nextPose = firstPersonPose(path);
    const prepared = preparePlayerBody(g.scene, camera, root, nextPose, path !== STOCK_MODEL);
    if (!prepared) {
      invalidPath = path;
      console.warn('[firstPerson] player rig is missing arm bones', path);
      return;
    }
    if (holder) {
      disposePlayerBody(holder);
      releaseAsset(mountedPath);
    }
    retainAsset(path);
    mountedPath = path;
    protectBody = path !== STOCK_MODEL;
    FP = nextPose;
    ({ bones, bind, arms, holder } = prepared);
    prepared.torso.getCenter(torsoCentre);
    prepared.torso.getSize(torsoHalf).multiplyScalar(0.5);
    holderBase.copy(holder.position);
    lean.set(0, 0, 0);
    root.userData.vmLayer = false;
    ready = true;
  }
  function selectModel(path) {
    if (path === desiredPath) return;
    desiredPath = path;
    const request = ++requested;
    loadPlayerModel(path).then((g) => {
      if (request !== requested) return;
      if (g?.scene) attachArms(g, path);
      else if (!ready && path !== STOCK_MODEL) {
        return loadPlayerModel(STOCK_MODEL).then((stock) => {
          if (request === requested && !ready && stock?.scene) attachArms(stock, STOCK_MODEL);
        });
      }
    }).catch((error) => console.warn('[firstPerson] could not load player model', error.message));
  }
  selectModel(initialModel);

  // ---------- grasp ----------
  const gq = new THREE.Quaternion();
  const basis = frame(), basisB = frame();
  const _anchor = V(), _palm = V(), _pn = V();
  const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion();
  let gunWorldScale = 1;

  /** Wrist position (world) and hand orientation (world quaternion) for a grasp { anchor (gun local), spec }. */
  function grasp(a, anchor, spec, outPos, outQ) {
    specBasis(spec, basis);
    _pn.copy(basis.n).multiplyScalar(a.palmSign); // palm normal in gun space: from the palm into the gun
    const toLocal = 1 / gunWorldScale;
    _anchor.fromArray(anchor);
    // slide out of the gun, against the palm normal, until the palm (palmGap in front of the bone plane) rests on it
    const s = col ? col.clearAlong(_anchor, _d.copy(_pn).negate(), FP.palmGap * toLocal) : FP.palmGap * toLocal;
    _palm.copy(_anchor).addScaledVector(_pn, -s);
    // wrist sits behind the palm contact, along the fingers
    _palm.addScaledVector(basis.f, -FP.palmCenter * a.palmLen * toLocal);
    outPos.copy(_palm);
    gun.localToWorld(outPos);
    a.away.copy(_pn).negate().applyQuaternion(gq);
    // world hand frame → quaternion
    const wf = _a.copy(basis.f).applyQuaternion(gq), wt = _b.copy(basis.t).applyQuaternion(gq), wn = _c.crossVectors(wf, wt);
    outQ.setFromRotationMatrix(_m.makeBasis(wf, wt, wn));
  }

  /** Smallest clearance (world m) between the gun and points along segment p→q, from t0 to t1. */
  const _s = V();
  const rightArm = [V(), V(), V()];
  const supported = V(), shoulderAt = V();
  const pepeBends = [0, .3, -.3, .6, -.6, .9, -.9, 1.25, -1.25, 1.6, -1.6, 2, -2, 2.4, -2.4, Math.PI];
  function segClear(p, q, t0, t1, n = 5) {
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      const t = t0 + ((t1 - t0) * i) / (n - 1);
      _s.copy(p).lerp(q, t);
      _s.applyMatrix4(gunInverse);
      best = Math.min(best, col.distance(_s) * gunWorldScale);
    }
    return best;
  }

  const { rightArmClear, bodyClear } = createBodyClearance(torsoCentre, torsoHalf, bodyInverse, rightArm);

  const BENDS = [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9, 1.25, -1.25];
  const _sh = V(), _dir = V(), _pole = V(), _elbow = V(), _tgt = V(), _rot = new THREE.Quaternion();
  function solveArm(a, wrist, poleCam, handQ, dt, previousBend) {
    // 1) two-bone IK with the elbow swung around the shoulder→wrist axis to the side where the sleeve clears the gun
    a.upper.getWorldPosition(_sh);
    const reach = a.lenA + a.lenB - 1e-3;
    _dir.copy(wrist).sub(_sh);
    let dist = _dir.length();
    _dir.normalize();
    dist = Math.min(Math.max(dist, 1e-3), reach);
    const x = (a.lenA * a.lenA - a.lenB * a.lenB + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, a.lenA * a.lenA - x * x));
    _pole.fromArray(poleCam).applyQuaternion(camera.getWorldQuaternion(_q2));
    _pole.sub(_t.copy(_dir).multiplyScalar(_pole.dot(_dir))).normalize();
    _tgt.copy(_sh).addScaledVector(_dir, dist);
    let pick = 0, pickClear = -Infinity, clear = false;
    if (col && h > 1e-3) {
      for (const ang of protectBody ? pepeBends : BENDS) {
        const score = protectBody ? Math.abs(wrapAngle(ang - previousBend)) + Math.abs(ang) * 1.1 : 0;
        if (clear && score >= pickClear) continue;
        _rot.setFromAxisAngle(_dir, ang);
        _elbow.copy(_pole).applyQuaternion(_rot).multiplyScalar(h).addScaledVector(_dir, x).add(_sh);
        const weapon = Math.min(segClear(_sh, _elbow, 0.35, 1), segClear(_elbow, _tgt, 0, protectBody ? 0.8 : 0.7));
        const c = protectBody ? Math.min(weapon, bodyClear(_sh, _elbow, _tgt, a.name === 'Left')) : weapon;
        if (c >= FP.armRadius) {
          if (!protectBody) { pick = ang; break; }
          // Prefer a safe elbow near the previous one, with a bias back to the natural bend.
          if (!clear || score < pickClear) { clear = true; pick = ang; pickClear = score; }
        } else if (!clear && c > pickClear + 0.004) { pickClear = c; pick = ang; }
      }
    }
    a.bend = protectBody
      ? wrapAngle(damp(previousBend, previousBend + wrapAngle(pick - previousBend), 0.047, dt))
      : a.bend + (pick - a.bend) * Math.min(1, dt * 12);
    _rot.setFromAxisAngle(_dir, a.bend);
    _elbow.copy(_pole).applyQuaternion(_rot).multiplyScalar(h).addScaledVector(_dir, x).add(_sh);
    aim(a.upper, a.lower.getWorldPosition(_c), _elbow);
    aim(a.lower, a.hand.getWorldPosition(_c), _tgt);
    // 2) hand orientation: turn the current hand frame onto the wanted one
    const cur = handFrame(a.hand, a.middle1, a.thumb1, a.frame);
    _qb.setFromRotationMatrix(_m.makeBasis(cur.f, cur.t, cur.n));
    rotateWorld(a.hand, _qa.copy(handQ).multiply(_qb.invert()));
  }

  /** Smallest clearance (world) of a finger chain from joint j outward: mid-segments, joints and the fingertip. */
  const _tip = V(), _j = V(), _k = V(), _mid = V();
  function chainClear(chain, j) {
    const last = chain[chain.length - 1];
    last.getWorldPosition(_tip);
    (chain.length > 1 ? chain[chain.length - 2] : last.parent).getWorldPosition(_k);
    _tip.addScaledVector(_k.sub(_tip).negate(), 0.8);
    let best = Infinity;
    const clear = (p) => { best = Math.min(best, col.distance(gun.worldToLocal(p)) * gunWorldScale); };
    for (let i = j; i < chain.length; i++) {
      chain[i].getWorldPosition(_j);
      if (i + 1 < chain.length) chain[i + 1].getWorldPosition(_k); else _k.copy(_tip);
      clear(_mid.copy(_j).lerp(_k, 0.5));
      clear(_mid.copy(_k));
    }
    return best;
  }

  /** Curl each joint of a chain toward the palm until the rest of the finger touches the gun. */
  const _q0 = new THREE.Quaternion(), _qc = new THREE.Quaternion();
  function curlChain(chain, axis, sign, maxes, scale) {
    for (let j = 0; j < chain.length; j++) {
      const full = maxes[j] ?? maxes[maxes.length - 1];
      const bone = chain[j];
      _q0.copy(bone.quaternion);
      const tryAngle = (ang) => { bone.quaternion.copy(_q0); bone.updateMatrixWorld(true); rotateWorld(bone, _qc.setFromAxisAngle(axis, sign * ang)); return chainClear(chain, j); };
      // a relaxed finger (scale < 1, e.g. on the trigger guard) still curls further if the gun is in its way
      let max = full * scale;
      if (col && scale < 1 && tryAngle(max) < FP.fingerRadius) max = full;
      let ang;
      if (!col) ang = max * 0.8;
      else if (tryAngle(max) >= FP.fingerRadius) ang = max; // nothing in the way: full curl
      else if (tryAngle(0) < FP.fingerRadius) {
        // already touching when straight: take whatever angle opens the most room
        ang = 0; let bestC = -1;
        for (let i = 0; i <= 6; i++) { const c = tryAngle((max * i) / 6); if (c > bestC + 1e-4) { bestC = c; ang = (max * i) / 6; } }
      } else {
        let lo = 0, hi = max;
        for (let it = 0; it < 6; it++) { const mid = (lo + hi) / 2; if (tryAngle(mid) >= FP.fingerRadius) lo = mid; else hi = mid; }
        ang = lo;
      }
      tryAngle(ang);
    }
  }

  function curlHand(a, trigger) {
    const fr = handFrame(a.hand, a.middle1, a.thumb1, a.frame);
    // rotating about t by -θ swings the fingers toward +n; palmSign picks the palm's side
    a.fingers.forEach((chain, i) => curlChain(chain, fr.t, -a.palmSign, FP.curlMax, trigger && i === 0 ? FP.triggerCurl : 1));
    // thumb: about the fingers axis, toward the palm
    if (a.thumb.length > 1) curlChain(a.thumb, fr.f, a.palmSign, [0.35, FP.thumbMax, FP.thumbMax], 1);
  }

  const glovePoint = V(), shifted = V(), separation = V(), localAway = V();
  const GLOVE_SKIN = .002; // the probe ends just outside the gun surface
  const GLOVE_SQUASH = .006; // a padded glove may sink this far before the hand moves
  function poseGrasp(a, wrist, pole, orientation, dt, trigger) {
    // Glove clearance can solve again in the same frame; those passes share one time step.
    const previousBend = a.bend;
    solveArm(a, wrist, pole, orientation, dt, previousBend);
    curlHand(a, trigger);
    if (!protectBody || !col) return;
    let clear = 0, bodyPush = 0;
    localAway.copy(a.away).transformDirection(gunInverse);
    for (let pass = 0; pass < 2; pass++) {
      let push = 0, cross = 0;
      for (const [mesh, vertex] of a.probes) {
        mesh.getVertexPosition(vertex, glovePoint).applyMatrix4(mesh.matrixWorld);
        if (!trigger) cross = Math.max(cross, .017 - rightArmClear(glovePoint));
        glovePoint.applyMatrix4(gunInverse);
        // Only glove geometry that sinks into the gun moves the hand, and only by how far it sank past the
        // padding a soft glove may squash. Clearing every probe by a margin left the palm floating off the grip.
        if (col.inside(glovePoint)) {
          const depth = col.clearAlong(glovePoint, localAway, GLOVE_SKIN / gunWorldScale, .16 / gunWorldScale, col.cell);
          push = Math.max(push, depth * gunWorldScale - GLOVE_SQUASH);
        }
      }
      if ((!push || clear >= .16) && (!cross || bodyPush >= .24)) break;
      clear = Math.min(.16, clear + push);
      bodyPush = Math.min(.24, bodyPush + cross * 1.7);
      shifted.copy(wrist).addScaledVector(a.away, clear);
      shifted.addScaledVector(supported.set(-.68, -.72, 0).applyQuaternion(camera.getWorldQuaternion(_pq)), bodyPush);
      for (const chain of [...a.fingers, a.thumb]) for (const bone of chain) bone.quaternion.copy(bind.get(bone));
      solveArm(a, shifted, pole, orientation, dt, previousBend);
      curlHand(a, trigger);
    }
  }

  const posB = V(), qB = new THREE.Quaternion(), _kn = V(), _kb = V(), _beforePush = V();
  const wristL = V(), wristR = V(), qL = new THREE.Quaternion(), qR = new THREE.Quaternion();
  const bodyOff = V(), _need = V();
  /** Default or blended grasp for one hand: `over` = { anchor, spec?, w } (gun local) blends toward another hold. */
  function target(a, anchor, spec, over, outPos, outQ) {
    grasp(a, anchor, spec, outPos, outQ);
    if (over && over.w > 0) {
      grasp(a, over.anchor, over.spec || spec, posB, qB);
      outPos.lerp(posB, over.w);
      outQ.slerp(qB, over.w);
      // moving between holds the straight path can cut through the gun: push the hand back out of it, wrist and
      // knuckles both (the fingers curl to contact afterwards, but can't fix a palm that's already inside)
      if (col && over.w < 1) {
        const weight = protectBody ? smoothstep(over.w / 0.15) * smoothstep((1 - over.w) / 0.15) : 1;
        _beforePush.copy(outPos);
        pushWristOut(outPos, FP.wristClear, gun, col, gunWorldScale);
        outPos.lerp(_beforePush, 1 - weight);
        _kn.set(1, 0, 0).applyQuaternion(outQ).multiplyScalar(a.palmLen).add(outPos);
        _kb.copy(_kn);
        pushWristOut(_kn, FP.wristClear, gun, col, gunWorldScale);
        outPos.addScaledVector(_kn.sub(_kb), weight);
      }
    }
  }

  return {
    root,
    get ready() { return ready; },
    get modelPath() { return desiredPath; },
    get weaponOffset() { return FP.weaponOffset; },
    get usesPepeRig() { return protectBody; },
    selectModel,
    /** The gun mesh currently held (a child of the viewmodel root) and its type. */
    setGun(mesh, type) {
      if (mesh !== gun) col = mesh ? colliderFor(mesh, mesh.userData.colliderKey) : null;
      gun = mesh; gunType = type;
    },
    /**
     * Pose the arms. opts: { dt, ads (0..1 aim blend), left / right: { anchor: [x,y,z] gun local, spec?, w } to
     * move a hand off its default hold (reloads) }.
     */
    update(visible, opts = {}) {
      const cached = mountedPath !== desiredPath && invalidPath !== desiredPath && peekAsset(desiredPath);
      if (cached?.scene) attachArms(cached, desiredPath);
      root.visible = ready && visible && !!gun && !(typeof window !== 'undefined' && window.__hideFP); // __hideFP: dev hook to inspect the gun alone
      if (!root.visible) return;
      const dt = Math.min(0.1, opts.dt ?? 1 / 60), ads = opts.ads || 0;
      for (const [b, q] of bind) b.quaternion.copy(q);
      camera.updateMatrixWorld(true);
      gun.updateMatrixWorld(true);
      gun.getWorldQuaternion(gq);
      gunInverse.copy(gun.matrixWorld).invert();
      gunWorldScale = gun.getWorldScale(_e).x;
      // a gun mesh can carry its own hand anchors (model guns do); otherwise use the per-type defaults
      const gripA = gun.userData.grip || FP.grip[gunType] || FP.grip.mg;
      let foreA = gun.userData.fore || FP.fore[gunType] || FP.fore.mg;
      const mgSupport = protectBody && gunType === 'mg';
      if (mgSupport) foreA = [foreA[0] - .052, foreA[1] - .079, foreA[2] + .07];
      if (protectBody && gunType === 'duckgun') foreA = [foreA[0] - .025, foreA[1], foreA[2] - .023];
      // The sniper's side foregrip hold sits on the far (right) side of a slim stock. The Pepe forearm is too thick
      // to reach round it, so it cut through the gun when aiming: cup the handguard from below instead.
      const sniperCup = protectBody && gunType === 'sniper' && gun.userData.size;
      if (sniperCup) foreA = [0, PEPE_SNIPER_FORE[0] * gun.userData.size.y, foreA[2] + PEPE_SNIPER_FORE[1] * gun.userData.size.z];
      // and its own hand frames (e.g. a vertical foregrip is held like a pistol grip, not cupped from below)
      target(arms.Right, gripA, gun.userData.rightSpec || FP.right, opts.right, wristR, qR);
      target(arms.Left, foreA, mgSupport ? PEPE_MG_SUPPORT : sniperCup ? FP.left : gun.userData.leftSpec || FP.left, opts.left, wristL, qL);
      // body: stance turn and offset
      holder.rotation.y = Math.PI + FP.bodyYaw + (FP.bodyYawAds - FP.bodyYaw) * ads;
      bodyOff.fromArray(FP.bodyHip).lerp(_e.fromArray(FP.bodyAds), ads);
      holder.position.copy(holderBase).add(bodyOff).add(lean);
      root.updateMatrixWorld(true);
      // out of reach: the shoulder blade swings the shoulder joint toward the hand target (scapula protraction)
      _need.set(0, 0, 0);
      for (const [a, w] of [[arms.Right, wristR], [arms.Left, wristL]]) {
        a.upper.getWorldPosition(_sh);
        let over = _sh.distanceTo(w) - FP.reachMax * (a.lenA + a.lenB);
        if (over > 0 && a.clavicle) {
          a.clavicle.getWorldPosition(_p);
          const c = _p.distanceTo(_sh);
          const ang = Math.min(FP.protractMax, over / Math.max(c, 1e-3));
          // rotate about the axis perpendicular to (clavicle→shoulder) and (shoulder→target)
          _t.copy(_sh).sub(_p).normalize();
          _dir.copy(w).sub(_sh).normalize();
          _pole.crossVectors(_t, _dir);
          if (_pole.lengthSq() > 1e-8) { rotateWorld(a.clavicle, _rot.setFromAxisAngle(_pole.normalize(), ang)); a.upper.getWorldPosition(_sh); }
          over = _sh.distanceTo(w) - FP.reachMax * (a.lenA + a.lenB);
        }
        if (over > 0) _need.add(camera.worldToLocal(_t.copy(w)).sub(camera.worldToLocal(_e.copy(_sh))).normalize().multiplyScalar(over));
      }
      // lean is relative to the current lean: integrate, relax when not needed
      const want = _t.copy(lean).add(_need);
      if (_need.lengthSq() === 0) want.multiplyScalar(0.9);
      if (want.length() > FP.reachShift) want.setLength(FP.reachShift);
      lean.lerp(want, Math.min(1, dt * 14));
      holder.position.copy(holderBase).add(bodyOff).add(lean);
      root.updateMatrixWorld(true);
      if (protectBody) bodyInverse.copy(holder.matrixWorld).invert();
      poseGrasp(arms.Right, wristR, FP.poleRight, qR, dt, true);
      if (protectBody) {
        arms.Right.lower.getWorldPosition(rightArm[0]);
        arms.Right.hand.getWorldPosition(rightArm[1]);
        arms.Right.middle1.getWorldPosition(rightArm[2]);
        // Keep the support hand on its side of the firing hand during crossing reload paths.
        separation.subVectors(wristL, rightArm[1]);
        const work = Math.max(opts.left?.w || 0, opts.right?.w || 0);
        const min = gunType === 'duckgun' ? .25 : .15 + .08 * smoothstep(work / 0.45);
        const gap = min - separation.length();
        if (gap > 0) {
          const bias = 0.13 * smoothstep(gap / 0.06);
          separation.addScaledVector(_a.set(-1, -.5, 0).applyQuaternion(camera.getWorldQuaternion(_pq)), bias);
          wristL.copy(rightArm[1]).add(separation.setLength(min));
        }
        // Limit a left wrist target that still crosses the right forearm or palm.
        arms.Left.upper.getWorldPosition(shoulderAt);
        for (let i = 0; i < 3; i++) {
          const at = supported.copy(shoulderAt).lerp(wristL, .8 + i*.1);
          const overlap = .055 - rightArmClear(at);
          if (overlap > 0) wristL.addScaledVector(_a.set(-.55, -.83, 0).applyQuaternion(camera.getWorldQuaternion(_pq)), overlap);
        }
      }
      poseGrasp(arms.Left, wristL, FP.poleLeft, qL, dt, false);
    },
    /** Dev: rig internals for tuning tools. */
    debug: () => ({ bones, arms, lean: lean.clone(), collider: col, FP }),
  };
}
