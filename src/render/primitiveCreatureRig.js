import { Group } from 'three';
import { damp, legCycle, smoothstep } from './anim.js';

function pivot(group, indices, x, y, z) {
  const meshes = group.children.slice();
  const joint = new Group();
  joint.position.set(x, y, z);
  group.add(joint);
  for (const i of indices) if (meshes[i]) joint.attach(meshes[i]);
  return joint;
}

/** Simple part rigs for the campaign creatures built from primitives and loading placeholders. */
export function createPrimitiveCreatureRig(body, type, def, isBoss) {
  const hound = type === 'frostHound';
  const drone = type === 'spotterDrone';
  const flyer = !!def.flying || type === 'hexAuditor' || type === 'dragon';
  const fixed = type === 'dummy' || def.speed === 0;
  const squashy = type.startsWith('gooGlob') || type === 'manaLeech' || !!body.userData.bodyMat;
  const height = def.height;
  let legs = [], head, tail, rotors;
  if (hound) {
    const parts = body.children.slice();
    legs = [2, 3, 4, 5].map((i) => {
      const [x, z] = def.look[i].at.filter((_, axis) => axis !== 1);
      const joint = pivot(body, [body.children.indexOf(parts[i])], x, 0.45, z);
      return joint;
    });
    head = pivot(body, [parts[1], parts[7], parts[8]].map((mesh) => body.children.indexOf(mesh)), 0, 0.65, 0.35);
    tail = pivot(body, [body.children.indexOf(parts[6])], 0, 0.55, -0.38);
  } else if (drone) {
    const discs = body.children.slice(2);
    rotors = discs.map((mesh, i) => {
      const [x, y, z] = def.look[i + 2].at;
      return pivot(body, [body.children.indexOf(mesh)], x, y, z);
    });
  } else if (type === 'flakPod') {
    head = pivot(body, [1], 0, 1.7, 0);
  } else if (type === 'barkBrute') {
    head = pivot(body, [2], 0, 1.75, 0);
  }
  let phase = 0, time = 0, pace = 0, pitch = 0, roll = 0;
  return (e, travel, dt) => {
    time += dt;
    const speed = fixed ? 0 : travel.speed;
    pace = damp(pace, Math.min(1, speed / Math.max(1, height * 2)), 0.075, dt);
    phase = (phase + speed * dt / Math.max(0.3, height * (hound ? 1.45 : 0.9))) % 1;
    const step = Math.sin(2 * Math.PI * phase);
    const a = e.state === 'attack' ? e.attack : null;
    const wind = a?.phase === 'windup' ? smoothstep(a.t / (def.windup ?? 0.25)) : 0;
    const hit = a?.phase === 'active' ? 1 : a?.phase === 'recover' ? 1 - smoothstep(a.t / (def.recover ?? 0.45)) : 0;
    const flinch = e.state === 'stagger' ? Math.sin(e.stateT * 27) * Math.exp(-e.stateT * 8) : 0;
    const pulse = def.archetype?.wisp ? Math.max(0, 1 - (def.archetype.wisp.every - (e.ai.wispCd ?? 0)) * 5) : 0;
    const targetPitch = flyer ? travel.forward * 0.035 - pulse * 0.15 : wind * -0.10 + hit * 0.13;
    pitch = damp(pitch, targetPitch, 0.04, dt);
    roll = damp(roll, (flyer ? -travel.side * 0.04 : pace * step * 0.06) + flinch * 0.1, 0.06, dt);
    // Keep ground props based at their collision origin. Tilt their articulated pieces above the base.
    body.rotation.set(flyer ? pitch : 0, 0, flyer ? roll : 0);
    const compression = 1 + (squashy ? pace * step * 0.07 : 0) - wind * 0.15 + hit * 0.09;
    body.scale.set(1 + (1 - compression) * 0.45, compression, 1 + (1 - compression) * 0.45);
    if (!isBoss && flyer) body.position.y = Math.sin(time * 5) * 0.06;
    if (hound) {
      legs.forEach((leg, i) => {
        const stride = legCycle(phase + ([0, 0.5, 0.5, 0][i]), 0.54);
        leg.rotation.x = -stride.swing * pace * 0.60 + wind * 0.2;
        leg.position.y = 0.45 + stride.lift * pace * 0.11;
      });
      tail.rotation.y = step * (0.15 + pace * 0.28);
    }
    if (head) {
      head.rotation.x = pitch;
      head.rotation.z = roll;
    }
    if (rotors) rotors.forEach((joint, i) => {
      joint.rotation.y += (i % 2 ? 1 : -1) * dt * (24 + speed);
      joint.scale.set(1 + pace * 0.08, 1, 1 - pace * 0.08);
    });
  };
}
