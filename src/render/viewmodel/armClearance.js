import * as THREE from 'three';

/** Conservative torso and opposite-arm clearance for the Pepe rig's candidate elbows. */
export function createBodyClearance(torsoCentre, torsoHalf, bodyInverse, rightArm) {
  const _s = new THREE.Vector3(), _body = new THREE.Vector3(), _other = new THREE.Vector3();
  function torsoClear(p) {
    _body.copy(p).applyMatrix4(bodyInverse).sub(torsoCentre);
    const span = Math.hypot(_body.x / torsoHalf.x, _body.z / torsoHalf.z);
    return Math.max((span - 0.93) * Math.min(torsoHalf.x, torsoHalf.z), Math.abs(_body.y) - torsoHalf.y);
  }

  function rightArmClear(point) {
    let clearance = Infinity;
    for (let i = 0; i < 2; i++) {
      const a = rightArm[i], b = rightArm[i+1];
      _other.subVectors(b, a);
      const t = THREE.MathUtils.clamp(_body.subVectors(point, a).dot(_other) / Math.max(1e-6, _other.lengthSq()), 0, 1);
      clearance = Math.min(clearance, point.distanceTo(_other.multiplyScalar(t).add(a)) - (i ? .095 : .070));
    }
    return clearance;
  }

  function bodyClear(shoulder, elbow, wrist, checkOtherArm) {
    let best = Infinity;
    for (let i = 0; i <= 7; i++) {
      _s.copy(i < 3 ? shoulder : elbow).lerp(i < 3 ? elbow : wrist, i < 3 ? .50 + i * .2 : (i - 3) * .25);
      best = Math.min(best, torsoClear(_s));
      if (checkOtherArm && i >= 3) best = Math.min(best, rightArmClear(_s));
    }
    return best;
  }

  return { rightArmClear, bodyClear };
}
