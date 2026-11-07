// First-person body: the player's rigged Sproto (Mixamo skeleton) attached to the camera, holding the gun.
// The arms are posed every frame with analytic two-bone IK: right hand on the pistol grip, left hand on the
// handguard. The hands turn to wrap the gun and the fingers curl. Head and legs are collapsed so only the
// arms (and a bit of the vest when looking down) are seen. Hand targets live on the gun mesh, so the arms
// follow recoil, sway, swap and reload automatically.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export const PLAYER_MODEL = 'models/characters/sproto_player.glb';
const BASE = `${import.meta.env.BASE_URL}assets/`;

// Tunables (camera space: x right, y up, -z forward; metres).
export const FP = {
  height: 2.0, // fitted height; slightly over life size so the arms reach the gun comfortably (unnoticeable in first person)
  eye: [0, -0.12, 0.0], // where the neck bone sits relative to the camera (eyes ~12 cm above the neck base)
  bodyYaw: -0.6, // bring the support (left) shoulder forward, like a shooting stance
  gunScale: 0.75,
  hip: { pos: [0.12, -0.24, -0.38] },
  ads: { pos: [0, -0.17, -0.3] },
  // hand targets in gun-mesh units (before gunScale): the gun points along -z, grip under the receiver
  grip: { mg: [0, -0.12, 0.13], shotgun: [0, -0.12, 0.13], sniper: [0, -0.11, 0.13], bazooka: [0, -0.2, 0.1] },
  fore: { mg: [0, -0.07, -0.16], shotgun: [0, -0.08, -0.15], sniper: [0, -0.07, -0.2], bazooka: [0, -0.15, -0.18] },
  // desired hand frames in gun space: fingers direction and thumb direction
  right: { fingers: [-1, -0.25, -0.35], thumb: [0, 0.55, -1] },
  left: { fingers: [0.85, 0.6, 0], thumb: [0, 0.25, -1] },
  // body geometry near the camera (collar, neck, shoulder tops) is clipped away: anything above clipY AND
  // closer than clipZ in camera space. Arms and hands sit lower/further and stay visible.
  clipY: -0.16,
  clipZ: -0.16,
  curl: 1.15, // radians per finger joint at full grip (index slightly less on the right: trigger finger)
  thumbCurl: 0.5,
  poleRight: [0.55, -0.7, 0.2],
  poleLeft: [-0.55, -0.75, 0.0],
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

/** Orthonormal hand frame (fingers, thumbSide, palmNormal) from bone positions, in world space. */
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

export function createFirstPerson(camera) {
  const root = new THREE.Group(); // child of camera
  root.visible = false;
  camera.add(root);
  let ready = false;
  let bones = {};
  let bind = new Map();
  let arms = null;
  let gun = null, gunType = 'mg';
  const clipPlanes = [new THREE.Plane(), new THREE.Plane()];
  const _cn = V(), _cp = V(), _cq = new THREE.Quaternion();
  function updateClip() {
    camera.getWorldQuaternion(_cq);
    clipPlanes[0].setFromNormalAndCoplanarPoint(_cn.set(0, -1, 0).applyQuaternion(_cq), camera.localToWorld(_cp.set(0, FP.clipY, 0)));
    clipPlanes[1].setFromNormalAndCoplanarPoint(_cn.set(0, 0, -1).applyQuaternion(_cq), camera.localToWorld(_cp.set(0, 0, FP.clipZ)));
  }

  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(BASE + PLAYER_MODEL).then((g) => {
    const body = g.scene;
    body.traverse((o) => {
      if (o.isSkinnedMesh) {
        o.frustumCulled = false; o.renderOrder = 2;
        for (const m of [].concat(o.material)) { m.clippingPlanes = clipPlanes; m.clipIntersection = true; }
      }
      if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o;
    });
    // fit to height
    const box = new THREE.Box3().setFromObject(body, true);
    const k = FP.height / Math.max(0.01, box.max.y - box.min.y);
    body.scale.setScalar(k);
    const holder = new THREE.Group();
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
    root.updateMatrixWorld(true);
    for (const b of Object.values(bones)) bind.set(b, b.quaternion.clone());
    const side = (s) => ({
      upper: bones[`${s}Arm`], lower: bones[`${s}ForeArm`], hand: bones[`${s}Hand`],
      middle1: bones[`${s}HandMiddle1`], thumb1: bones[`${s}HandThumb1`],
      fingers: FINGERS.map((f) => [1, 2, 3].map((i) => bones[`${s}Hand${f}${i}`]).filter(Boolean)).filter((c) => c.length),
      thumb: [1, 2, 3].map((i) => bones[`${s}HandThumb${i}`]).filter(Boolean),
      lenA: 0, lenB: 0,
    });
    arms = { Right: side('Right'), Left: side('Left') };
    for (const a of Object.values(arms)) {
      a.lenA = a.upper.getWorldPosition(V()).distanceTo(a.lower.getWorldPosition(V()));
      a.lenB = a.lower.getWorldPosition(V()).distanceTo(a.hand.getWorldPosition(V()));
    }
    ready = !!(arms.Right.upper && arms.Left.upper);
    if (!ready) console.warn('[firstPerson] player rig is missing arm bones; arms disabled');
  }).catch((e) => console.warn('[firstPerson] could not load player model', e.message));

  function solveArm(a, target, poleCam, gunQuat, spec, curl, trigger) {
    // 1) two-bone IK: place the elbow, then aim upper arm at it and forearm at the target
    a.upper.getWorldPosition(_a);
    const reach = a.lenA + a.lenB - 1e-3;
    _d.copy(target).sub(_a);
    let dist = _d.length();
    const dir = _d.normalize().clone();
    dist = Math.min(Math.max(dist, 1e-3), reach);
    const x = (a.lenA * a.lenA - a.lenB * a.lenB + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, a.lenA * a.lenA - x * x));
    const pole = _t.fromArray(poleCam).applyQuaternion(camera.getWorldQuaternion(_q2)).add(_a);
    const pd = pole.sub(_a);
    pd.sub(_e.copy(dir).multiplyScalar(pd.dot(dir))).normalize();
    const elbow = _b.copy(_a).addScaledVector(dir, x).addScaledVector(pd, h);
    aim(a.upper, a.lower.getWorldPosition(_c), elbow);
    const tgt = _c.copy(_a).addScaledVector(dir, dist);
    aim(a.lower, a.hand.getWorldPosition(V()), tgt);
    // 2) hand orientation: match the bind-pose hand frame to the desired frame on the gun
    const cur = handFrame(a.hand, a.middle1, a.thumb1, a.frame || (a.frame = frame()));
    const wf = V().fromArray(spec.fingers).normalize().applyQuaternion(gunQuat);
    const wt = V().fromArray(spec.thumb).applyQuaternion(gunQuat);
    wt.sub(V().copy(wf).multiplyScalar(wt.dot(wf))).normalize();
    const wn = V().crossVectors(wf, wt);
    const mCur = _m.makeBasis(cur.f, cur.t, cur.n);
    const qCur = new THREE.Quaternion().setFromRotationMatrix(mCur);
    const qWant = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(wf, wt, wn));
    rotateWorld(a.hand, qWant.multiply(qCur.invert()));
    // 3) curl fingers toward the palm around the knuckle axis
    const fr = handFrame(a.hand, a.middle1, a.thumb1, a.frame);
    a.fingers.forEach((chain, i) => {
      const amt = curl * (trigger && i === 0 ? 0.55 : 1);
      for (const b of chain) rotateWorld(b, _q.setFromAxisAngle(fr.t, -amt));
    });
    for (const b of a.thumb.slice(1)) rotateWorld(b, _q.setFromAxisAngle(fr.f, FP.thumbCurl));
  }

  const gq = new THREE.Quaternion();
  return {
    root,
    get ready() { return ready; },
    /** The gun mesh currently held (a child of the viewmodel root) and its type. */
    setGun(mesh, type) { gun = mesh; gunType = type; },
    update(visible) {
      root.visible = ready && visible && !!gun;
      if (!root.visible) return;
      for (const [b, q] of bind) b.quaternion.copy(q);
      camera.updateMatrixWorld(true);
      updateClip();
      root.updateMatrixWorld(true);
      gun.updateMatrixWorld(true);
      gun.getWorldQuaternion(gq);
      const grip = gun.localToWorld(V().fromArray(FP.grip[gunType] || FP.grip.mg));
      const fore = gun.localToWorld(V().fromArray(FP.fore[gunType] || FP.fore.mg));
      solveArm(arms.Right, grip, FP.poleRight, gq, FP.right, FP.curl, true);
      solveArm(arms.Left, fore, FP.poleLeft, gq, FP.left, FP.curl, false);
    },
  };
}
