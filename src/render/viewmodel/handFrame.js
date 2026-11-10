import * as THREE from 'three';
const V = () => new THREE.Vector3();
const _a = V(), _b = V(), _c = V(), _t = V(), _d = V(), _e = V(), _p = V();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _pq = new THREE.Quaternion();
const _m = new THREE.Matrix4();

/** Rotate `bone` (in world space) so the direction bone→`from` turns into bone→`to`. */
export function aim(bone, from, to) {
  bone.getWorldPosition(_p);
  _d.copy(from).sub(_p).normalize();
  _e.copy(to).sub(_p).normalize();
  if (_d.lengthSq() < 1e-8 || _e.lengthSq() < 1e-8) return;
  _q.setFromUnitVectors(_d, _e);
  rotateWorld(bone, _q);
}

/** Pre-multiply a world-space rotation onto a bone, then refresh its matrices. */
export function rotateWorld(bone, qWorld) {
  bone.getWorldQuaternion(_q2);
  _q2.premultiply(qWorld);
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(_q2));
  bone.updateMatrixWorld(true);
}

/** Orthonormal hand frame (fingers, thumbSide, normal = fingers × thumbSide) from bone positions, in world space. */
export function handFrame(hand, middle1, thumb1, out) {
  hand.getWorldPosition(_a);
  middle1.getWorldPosition(_b);
  thumb1.getWorldPosition(_c);
  const f = out.f.copy(_b).sub(_a).normalize();
  const t = out.t.copy(_c).sub(_a);
  t.sub(_d.copy(f).multiplyScalar(t.dot(f))).normalize();
  out.n.crossVectors(f, t).normalize();
  return out;
}
export const frame = () => ({ f: V(), t: V(), n: V() });

/** Orthonormal basis (f, t, n) from a { fingers, thumb } spec. */
export function specBasis(spec, out) {
  out.f.fromArray(spec.fingers).normalize();
  out.t.fromArray(spec.thumb);
  out.t.sub(_d.copy(out.f).multiplyScalar(out.t.dot(out.f))).normalize();
  out.n.crossVectors(out.f, out.t);
  return out;
}
