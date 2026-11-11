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

const _g = new THREE.Vector3(), _gp = new THREE.Vector3();

/** Move a world point out along the distance field's gradient until it has `clear` (world m) from the gun. */
export function pushWristOut(p, clear, gun, col, gunWorldScale) {
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
