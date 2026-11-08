// First-person body: the player's rigged Sproto (Mixamo skeleton) attached to the camera, holding the gun.
// Every frame the arms are posed against the gun's own surface (a distance field from gunCollider.js):
//   1. each hand has a grasp in gun space: an anchor inside the part it holds (pistol grip, handguard, or a
//      reload target such as the magazine) and a hand frame (fingers / thumb directions). The palm is slid out
//      of the gun along its normal until it rests on the surface, and the wrist is placed behind it.
//   2. if the short cartoon arms can't reach, the shoulder blade swings forward toward the gun (and, as a last
//      resort, the whole body leans a little; neither is visible in first person).
//   3. two-bone IK places the elbow; the bend side is chosen so the thick sleeves clear the gun.
//   4. fingers and thumb curl joint by joint until they touch the gun, so they wrap it instead of entering it.
// Head and legs are collapsed so only the arms (and a bit of the vest when looking down) are seen. Hand targets
// live on the gun mesh, so the arms follow recoil, sway, swap and reload automatically.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { colliderFor } from './gunCollider.js';
import { enqueue, PRIORITY, retainAsset, peekAsset } from './assets.js';

export const PLAYER_MODEL = 'models/characters/sproto_player.glb';
const BASE = `${import.meta.env.BASE_URL}assets/`;

// Tunables (camera space: x right, y up, -z forward; metres).
export const FP = {
  height: 2.0, // fitted height; slightly over life size so the arms reach the gun comfortably (unnoticeable in first person)
  eye: [0, -0.12, 0.0], // where the neck bone sits relative to the camera (eyes ~12 cm above the neck base)
  // bladed shooting stance: the body turns so the support (left) shoulder comes forward and the right one
  // back, which trades the right arm's slack for left-arm reach (hip-firing / aiming, blended by aim amount)
  bodyYaw: -1.2,
  bodyYawAds: -1.2,
  // body offset from the eye (camera space), hip-firing / aiming: when aiming the body slides left, down and
  // back so the right shoulder sits under the stock and the left shoulder clears it
  bodyHip: [0, 0, 0],
  bodyAds: [-0.1, -0.05, 0.06],
  reachMax: 0.95, // fraction of full arm length the IK may use; beyond that the shoulder blade reaches forward
  protractMax: 0.5, // how far the shoulder blade (clavicle bone) may swing toward the gun (radians)
  reachShift: 0.05, // and then how far the whole body may lean (m)
  gunScale: 0.75,
  hip: { pos: [0.12, -0.24, -0.38] },
  ads: { pos: [0, -0.17, -0.3] },
  // fallback hand anchors in gun-mesh units (before gunScale) for meshes without their own: the gun points
  // along -z, grip under the back of the receiver, handguard under the barrel
  grip: { mg: [0, -0.12, 0.13], shotgun: [0, -0.12, 0.13], sniper: [0, -0.11, 0.13], bazooka: [0, -0.2, 0.1] },
  fore: { mg: [0, -0.07, -0.16], shotgun: [0, -0.08, -0.15], sniper: [0, -0.07, -0.2], bazooka: [0, -0.15, -0.18] },
  // hand frames in gun space (fingers direction, thumb direction); the palm faces into the gun
  //   right: palm on the right side of the pistol grip, fingers forward around its front, thumb along its right side
  //   left: palm up under the handguard, fingers across and up its far side, thumb forward along the barrel
  right: { fingers: [0, -0.35, -1], thumb: [0.3, 1, -0.2] },
  left: { fingers: [1, 0.25, 0.15], thumb: [0, 0.2, -1] },
  palmGap: 0.042, // wrist bone plane to palm skin
  palmCenter: 0.42, // where the palm touches, as a fraction of the wrist-to-knuckle length
  wristClear: 0.05, // while a hand moves between holds, its wrist keeps this far from the gun
  fingerRadius: 0.022, // finger bone to skin (chunky cartoon fingers)
  curlMax: [1.45, 1.6, 1.25], // per finger joint (knuckle, middle, tip)
  triggerCurl: 0.45, // the right index finger rests on the trigger guard
  thumbMax: 1.0,
  armRadius: 0.06, // sleeve radius: elbows bend to the side where the arm keeps this clearance from the gun
  // body geometry near the camera (collar, neck, shoulder tops) is clipped away: anything above clipY AND
  // closer than clipZ in camera space. Arms and hands sit lower/further and stay visible.
  clipY: -0.16,
  clipZ: -0.16,
  poleRight: [0.6, -0.75, 0.25],
  poleLeft: [-0.55, -0.85, 0.1],
};

const FINGERS = ['Index', 'Middle', 'Ring', 'Pinky'];
const V = () => new THREE.Vector3();
const _a = V(), _b = V(), _c = V(), _t = V(), _d = V(), _e = V(), _p = V();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _pq = new THREE.Quaternion();
const _m = new THREE.Matrix4();

/** Rotate `bone` (in world space) so the direction bone→`from` turns into bone→`to`. */
function aim(bone, from, to) {
  bone.getWorldPosition(_p);
  _d.copy(from).sub(_p).normalize();
  _e.copy(to).sub(_p).normalize();
  if (_d.lengthSq() < 1e-8 || _e.lengthSq() < 1e-8) return;
  _q.setFromUnitVectors(_d, _e);
  rotateWorld(bone, _q);
}

/** Pre-multiply a world-space rotation onto a bone, then refresh its matrices. */
function rotateWorld(bone, qWorld) {
  bone.getWorldQuaternion(_q2);
  _q2.premultiply(qWorld);
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_q2));
  bone.updateMatrixWorld(true);
}

/** Orthonormal hand frame (fingers, thumbSide, normal = fingers × thumbSide) from bone positions, in world space. */
function handFrame(hand, middle1, thumb1, out) {
  hand.getWorldPosition(_a);
  middle1.getWorldPosition(_b);
  thumb1.getWorldPosition(_c);
  const f = out.f.copy(_b).sub(_a).normalize();
  const t = out.t.copy(_c).sub(_a);
  t.sub(_d.copy(f).multiplyScalar(t.dot(f))).normalize();
  out.n.crossVectors(f, t).normalize();
  return out;
}
const frame = () => ({ f: V(), t: V(), n: V() });

/** Orthonormal basis (f, t, n) from a { fingers, thumb } spec. */
function specBasis(spec, out) {
  out.f.fromArray(spec.fingers).normalize();
  out.t.fromArray(spec.thumb);
  out.t.sub(_d.copy(out.f).multiplyScalar(out.t.dot(out.f))).normalize();
  out.n.crossVectors(out.f, out.t);
  return out;
}

/**
 * Skin-weight cleanup for the first-person arms: Tripo's auto-rig gives some forearm, hand and finger vertices
 * a share of a spine or other-side bone. With the torso still and the arms posed, those vertices get dragged back
 * toward the body in thin streaks (the "arm going into the gun" look). Distal arm vertices keep only influences
 * from their own arm chain.
 */
export function cleanArmWeights(mesh) {
  const bones = mesh.skeleton.bones;
  const name = bones.map((b) => b.name.replace(/^mixamorig:?/, ''));
  const side = name.map((n) => (/^Left/.test(n) ? 'L' : /^Right/.test(n) ? 'R' : ''));
  const distal = name.map((n) => /(ForeArm|Hand)/.test(n));
  const chain = name.map((n) => /(Shoulder|Arm|ForeArm|Hand)/.test(n));
  const si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight;
  let fixed = 0;
  for (let i = 0; i < si.count; i++) {
    let best = 0, dom = -1;
    for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > best) { best = w; dom = si.getComponent(i, k); } }
    if (dom < 0 || !distal[dom]) continue;
    let sum = 0, changed = false;
    for (let k = 0; k < 4; k++) {
      const b = si.getComponent(i, k), w = sw.getComponent(i, k);
      if (w > 0 && !(chain[b] && side[b] === side[dom])) { sw.setComponent(i, k, 0); changed = true; } else sum += w;
    }
    if (changed && sum > 0) { for (let k = 0; k < 4; k++) sw.setComponent(i, k, sw.getComponent(i, k) / sum); fixed++; }
  }
  sw.needsUpdate = true;
  return fixed;
}

export function createFirstPerson(camera) {
  const root = new THREE.Group(); // child of camera
  root.visible = false;
  camera.add(root);
  let ready = false;
  let bones = {};
  let bind = new Map();
  let arms = null;
  let holder = null;
  const holderBase = V();
  const lean = V(); // smoothed body lean toward the gun when the arms come up short
  let gun = null, gunType = 'mg', col = null;
  const clipPlanes = [new THREE.Plane(), new THREE.Plane()];
  const _cn = V(), _cp = V(), _cq = new THREE.Quaternion();
  function updateClip() {
    camera.getWorldQuaternion(_cq);
    clipPlanes[0].setFromNormalAndCoplanarPoint(_cn.set(0, -1, 0).applyQuaternion(_cq), camera.localToWorld(_cp.set(0, FP.clipY, 0)));
    clipPlanes[1].setFromNormalAndCoplanarPoint(_cn.set(0, 0, -1).applyQuaternion(_cq), camera.localToWorld(_cp.set(0, 0, FP.clipZ)));
  }

  const armsLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  let armsHeld = false;
  function attachArms(g) {
    if (ready || armsHeld || !g || !g.scene) return;
    armsHeld = true;
    retainAsset(PLAYER_MODEL);
    const body = g.scene;
    body.traverse((o) => {
      if (o.isSkinnedMesh) {
        o.frustumCulled = false; o.renderOrder = 2;
        for (const m of [].concat(o.material)) { m.clippingPlanes = clipPlanes; m.clipIntersection = true; }
        cleanArmWeights(o);
      }
      if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o;
    });
    // fit to height
    const box = new THREE.Box3().setFromObject(body, true);
    const k = FP.height / Math.max(0.01, box.max.y - box.min.y);
    body.scale.setScalar(k);
    holder = new THREE.Group();
    holder.add(body);
    holder.rotation.y = Math.PI + FP.bodyYaw; // model faces +z; turn to face the camera's -z, plus a shooting stance
    root.add(holder);
    // hide head (we are inside it) and legs
    for (const n of ['Neck', 'Head', 'LeftUpLeg', 'RightUpLeg']) if (bones[n]) bones[n].scale.setScalar(1e-4);
    // place the head bone at FP.eye relative to the camera
    root.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const head = bones.Neck || bones.Head; // the neck bone's position is kept even though its geometry is collapsed
    const hw = head.getWorldPosition(V());
    const local = camera.worldToLocal(hw.clone());
    holder.position.set(FP.eye[0] - local.x, FP.eye[1] - local.y, FP.eye[2] - local.z);
    holderBase.copy(holder.position);
    root.updateMatrixWorld(true);
    for (const b of Object.values(bones)) bind.set(b, b.quaternion.clone());
    const side = (s) => ({
      name: s,
      clavicle: bones[`${s}Shoulder`], upper: bones[`${s}Arm`], lower: bones[`${s}ForeArm`], hand: bones[`${s}Hand`],
      middle1: bones[`${s}HandMiddle1`], thumb1: bones[`${s}HandThumb1`],
      fingers: FINGERS.map((f) => [1, 2, 3].map((i) => bones[`${s}Hand${f}${i}`]).filter(Boolean)).filter((c) => c.length),
      thumb: [1, 2, 3].map((i) => bones[`${s}HandThumb${i}`]).filter(Boolean),
      lenA: 0, lenB: 0, palmLen: 0,
      palmSign: 1, // which side of the hand frame's normal the palm is on (mirrored between hands)
      bend: 0, // smoothed elbow swing around the shoulder-wrist axis
      frame: frame(),
    });
    arms = { Right: side('Right'), Left: side('Left') };
    ready = !!(arms.Right.upper && arms.Left.upper && arms.Right.middle1 && arms.Left.middle1 && arms.Right.thumb1 && arms.Left.thumb1);
    if (!ready) { console.warn('[firstPerson] player rig is missing arm bones; arms disabled'); return; }
    for (const a of Object.values(arms)) {
      a.lenA = a.upper.getWorldPosition(V()).distanceTo(a.lower.getWorldPosition(V()));
      a.lenB = a.lower.getWorldPosition(V()).distanceTo(a.hand.getWorldPosition(V()));
      a.palmLen = a.hand.getWorldPosition(V()).distanceTo(a.middle1.getWorldPosition(V()));
      // fingers in the bind pose are slightly bent toward the palm: that tells which way the palm faces
      const fr = handFrame(a.hand, a.middle1, a.thumb1, a.frame);
      const tip = a.fingers[1] ? a.fingers[1][a.fingers[1].length - 1].getWorldPosition(V()) : a.middle1.getWorldPosition(V());
      a.palmSign = tip.sub(a.middle1.getWorldPosition(V())).dot(fr.n) >= 0 ? 1 : -1;
    }
  }
  enqueue(PLAYER_MODEL, () => new Promise((resolve, reject) => {
    armsLoader.load(BASE + PLAYER_MODEL, resolve, undefined, (err) => reject(err instanceof Error ? err : new Error('arms failed')));
  }), PRIORITY.NOW).then((g) => attachArms(g)).catch((e) => console.warn('[firstPerson] could not load player model', e.message));

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
    // world hand frame → quaternion
    const wf = _a.copy(basis.f).applyQuaternion(gq), wt = _b.copy(basis.t).applyQuaternion(gq), wn = _c.crossVectors(wf, wt);
    outQ.setFromRotationMatrix(_m.makeBasis(wf, wt, wn));
  }

  /** Smallest clearance (world m) between the gun and points along segment p→q, from t0 to t1. */
  const _s = V();
  function segClear(p, q, t0, t1, n = 5) {
    let best = Infinity;
    for (let i = 0; i < n; i++) {
      const t = t0 + ((t1 - t0) * i) / (n - 1);
      _s.copy(p).lerp(q, t);
      gun.worldToLocal(_s);
      best = Math.min(best, col.distance(_s) * gunWorldScale);
    }
    return best;
  }

  const BENDS = [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9, 1.25, -1.25];
  const _sh = V(), _dir = V(), _pole = V(), _elbow = V(), _tgt = V(), _rot = new THREE.Quaternion();
  function solveArm(a, wrist, poleCam, handQ, dt) {
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
    let pick = 0, pickClear = -Infinity;
    if (col && h > 1e-3) {
      for (const ang of BENDS) {
        _rot.setFromAxisAngle(_dir, ang);
        _elbow.copy(_pole).applyQuaternion(_rot).multiplyScalar(h).addScaledVector(_dir, x).add(_sh);
        const c = Math.min(segClear(_sh, _elbow, 0.35, 1), segClear(_elbow, _tgt, 0, 0.7));
        if (c >= FP.armRadius) { pick = ang; pickClear = c; break; }
        if (c > pickClear + 0.004) { pickClear = c; pick = ang; }
      }
    }
    a.bend += (pick - a.bend) * Math.min(1, dt * 12);
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

  const posB = V(), qB = new THREE.Quaternion(), _kn = V(), _kb = V();
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
        pushOut(outPos, FP.wristClear);
        _kn.set(1, 0, 0).applyQuaternion(outQ).multiplyScalar(a.palmLen).add(outPos);
        _kb.copy(_kn);
        pushOut(_kn, FP.wristClear);
        outPos.add(_kn.sub(_kb));
      }
    }
  }

  /** Move a world point out along the distance field's gradient until it has `clear` (world m) from the gun. */
  const _g = V(), _gp = V();
  function pushOut(p, clear) {
    gun.worldToLocal(p);
    const want = clear / gunWorldScale, h = col.cell;
    for (let i = 0; i < 12; i++) {
      const d = col.distance(p);
      if (d >= want) break;
      _g.set(
        col.distance(_gp.copy(p).setX(p.x + h)) - col.distance(_gp.copy(p).setX(p.x - h)),
        col.distance(_gp.copy(p).setY(p.y + h)) - col.distance(_gp.copy(p).setY(p.y - h)),
        col.distance(_gp.copy(p).setZ(p.z + h)) - col.distance(_gp.copy(p).setZ(p.z - h)),
      );
      if (_g.lengthSq() < 1e-12) _g.set(0, -1, 0); // deep inside (flat field): drop out of the bottom
      p.addScaledVector(_g.normalize(), Math.max(want - d, h));
    }
    gun.localToWorld(p);
  }

  return {
    root,
    get ready() { return ready; },
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
      if (!ready) attachArms(peekAsset(PLAYER_MODEL));
      root.visible = ready && visible && !!gun && !(typeof window !== 'undefined' && window.__hideFP); // __hideFP: dev hook to inspect the gun alone
      if (!root.visible) return;
      const dt = Math.min(0.1, opts.dt ?? 1 / 60), ads = opts.ads || 0;
      for (const [b, q] of bind) b.quaternion.copy(q);
      camera.updateMatrixWorld(true);
      updateClip();
      gun.updateMatrixWorld(true);
      gun.getWorldQuaternion(gq);
      gunWorldScale = gun.getWorldScale(_e).x;
      // a gun mesh can carry its own hand anchors (model guns do); otherwise use the per-type defaults
      const gripA = gun.userData.grip || FP.grip[gunType] || FP.grip.mg;
      const foreA = gun.userData.fore || FP.fore[gunType] || FP.fore.mg;
      // and its own hand frames (e.g. a vertical foregrip is held like a pistol grip, not cupped from below)
      target(arms.Right, gripA, gun.userData.rightSpec || FP.right, opts.right, wristR, qR);
      target(arms.Left, foreA, gun.userData.leftSpec || FP.left, opts.left, wristL, qL);
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
      solveArm(arms.Right, wristR, FP.poleRight, qR, dt);
      solveArm(arms.Left, wristL, FP.poleLeft, qL, dt);
      curlHand(arms.Right, true);
      curlHand(arms.Left, false);
    },
    /** Dev: rig internals for tuning tools. */
    debug: () => ({ bones, arms, lean: lean.clone(), collider: col, FP }),
  };
}
