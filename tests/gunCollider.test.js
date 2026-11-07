import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildCollider, collectTriangles } from '../src/render/gunCollider.js';

// A 0.2 x 0.1 x 0.6 box (gun-sized) centred at the origin, plus a thin side plate that is not watertight.
function gunLike() {
  const root = new THREE.Group();
  root.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.6)));
  return root;
}

describe('gun collider', () => {
  const col = buildCollider(collectTriangles(gunLike()), { cell: 0.005, pad: 0.1 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  it('marks the inside of a closed mesh solid and the outside empty', () => {
    expect(col.inside(V(0, 0, 0))).toBe(true);
    expect(col.inside(V(0.09, 0.04, 0.28))).toBe(true);
    expect(col.inside(V(0.12, 0, 0))).toBe(false);
    expect(col.inside(V(0, 0.07, 0))).toBe(false);
  });

  it('measures distance to the surface (chamfer error under a cell)', () => {
    expect(col.distance(V(0, 0, 0))).toBe(0);
    expect(col.distance(V(0.15, 0, 0))).toBeCloseTo(0.05, 1);
    expect(Math.abs(col.distance(V(0, 0.09, 0)) - 0.04)).toBeLessThan(0.006);
    expect(Math.abs(col.distance(V(0, 0, -0.38)) - 0.08)).toBeLessThan(0.006);
    // outside the padded grid: still grows with distance
    expect(col.distance(V(0.6, 0, 0))).toBeGreaterThan(0.45);
  });

  it('walks out of the mesh until a clearance is reached', () => {
    // from the centre, straight down: the bottom face is at y = -0.05, so 3 cm of clearance is reached ~0.08 down
    const s = col.clearAlong(V(0, 0, 0), V(0, -1, 0), 0.03);
    expect(s).toBeGreaterThan(0.07);
    expect(s).toBeLessThan(0.09);
    expect(col.clearAlong(V(0, 0.5, 0), V(0, 1, 0), 0.03)).toBe(0);
  });

  it('tolerates a hole in one face (majority vote over three scan axes)', () => {
    const g = new THREE.BoxGeometry(0.2, 0.1, 0.6).toNonIndexed();
    // drop one triangle of the +x face
    const pos = g.attributes.position.array;
    const cut = new Float32Array(pos.length - 9);
    cut.set(pos.subarray(9));
    const holed = new THREE.BufferGeometry();
    holed.setAttribute('position', new THREE.BufferAttribute(cut, 3));
    const root = new THREE.Group(); root.add(new THREE.Mesh(holed));
    const c2 = buildCollider(collectTriangles(root), { cell: 0.005, pad: 0.05 });
    expect(c2.inside(V(0, 0, 0))).toBe(true);
    expect(c2.inside(V(0, 0, 0.2))).toBe(true);
    expect(c2.inside(V(0.15, 0, 0))).toBe(false);
  });
});
