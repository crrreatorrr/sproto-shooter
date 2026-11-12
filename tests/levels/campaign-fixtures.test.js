import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, InstancedMesh, Matrix4, MeshStandardMaterial } from 'three';
import { createCampaignFixtureLights } from '../../src/render/level/campaignFixtureLights.js';

describe('campaign fixture lighting', () => {
  it('lights the nearest instanced lamps at their transformed lenses', () => {
    const group = new Group();
    const fixtures = createCampaignFixtureLights();
    const model = new InstancedMesh(new BoxGeometry(), new MeshStandardMaterial(), 4);
    model.name = 'lantern_post';
    for (let i = 0; i < 4; i++) model.setMatrixAt(i, new Matrix4().makeTranslation(i * 2, 0, 0));
    group.add(model);
    fixtures.rebuild(group, 'L02');
    fixtures.sync({ x: 2.77, y: 2.81, z: 0 }, 3);
    const lamps = group.children.filter(o => o.isPointLight);
    expect(lamps).toHaveLength(3);
    expect(lamps[0].position.toArray()).toEqual([2.77, 2.81, 0]);
    expect(lamps.every(light => light.intensity > 0 && !light.castShadow)).toBe(true);
    fixtures.sync({ x: 99, y: 0, z: 0 }, 5);
    expect(lamps.every(light => light.intensity === 0)).toBe(true);
    group.clear();
    fixtures.rebuild(group, 'L02');
    expect(group.children).toHaveLength(0);
  });
});
