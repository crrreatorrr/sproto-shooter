import { afterEach, describe, expect, it } from 'vitest';
import { assetUsers } from '../src/render/assets.js';
import { KIT, kitProp, kitPropPaths, kitPropScope } from '../src/render/level/kitModels.js';
import { PROPS } from '../src/render/level/kitPropPaths.js';

const [a, b] = Object.keys(PROPS);

describe('campaign kit props', () => {
  afterEach(() => kitPropScope(null));

  it('holds each prop once per level and lets go of all of them when the level changes', () => {
    kitPropScope('L01');
    kitProp(a);
    kitProp(a);
    kitProp(b);
    expect(kitPropPaths().sort()).toEqual([KIT.prop(a), KIT.prop(b)].sort());
    expect(assetUsers(KIT.prop(a))).toBe(1);
    expect(assetUsers(KIT.prop(b))).toBe(1);
    // Another section of the same level keeps them.
    kitPropScope('L01');
    expect(assetUsers(KIT.prop(a))).toBe(1);
    kitPropScope('L02');
    expect(kitPropPaths()).toEqual([]);
    expect(assetUsers(KIT.prop(a))).toBe(0);
    expect(assetUsers(KIT.prop(b))).toBe(0);
  });

  it('releases everything when no level is shown', () => {
    kitPropScope('L03');
    kitProp(b);
    expect(assetUsers(KIT.prop(b))).toBe(1);
    kitPropScope(null);
    expect(assetUsers(KIT.prop(b))).toBe(0);
  });

  it('ignores a model with no kit file', () => {
    kitPropScope('L01');
    expect(kitProp('no_such_model')).toBeNull();
    expect(kitPropPaths()).toEqual([]);
  });
});
