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

