import { describe, expect, it } from 'vitest';
import { box } from '../src/data/levels/kit.js';
import { makeV2Level } from '../src/data/levels/v2.js';
import { installLevel } from '../src/data/levels/index.js';
import { createGameState } from '../src/sim/state.js';
import { startCampaign } from '../src/sim/campaign/campaign.js';
import { noteV2Section } from '../src/sim/campaign/v2.js';
import { getLevelRuntime } from '../src/sim/level/runtime.js';
import { buildIssuedState, buildIssuance } from '../src/server/runContract.js';
import { contentFingerprint } from '../src/data/serverManifest.js';
import { CONTENT_FINGERPRINT } from '../src/sim/pvp/rules.js';

const caller = {
  accountId: 'acct-shooter-1', sessionId: 'sess-shooter-1', day: '2026-11-07', runId: 'run-rebind-1', seed: 7,
};

describe('issued v2 section', () => {
  it('rebinds solids when the banked start is not section one', () => {
    const lv = makeV2Level({
      id: 'T-REBIND',
      name: 'Rebind',
      sections: [
        { id: 'S1', start: [2, 0, 2], geometry: [box({ id: 'floor-a', at: [4, -0.25, 2], size: [8, 0.5, 6] })], encounters: [] },
        { id: 'S4', start: [20, 0, 4], geometry: [box({ id: 'floor-b', at: [20, -0.25, 4], size: [8, 0.5, 6] })], encounters: [] },
      ],
    });
    installLevel(lv);
    const state = createGameState({ seed: 7 });
    const p = state.players[state.localPlayerId];
    startCampaign(state, p, 'T-REBIND');
    expect(state.level.solids.some((s) => s.id === 'floor-a')).toBe(true);
    const section = lv.sections[1];
    state.level.section = section.id;
    state.level.intro = null;
    noteV2Section(state, section, getLevelRuntime('T-REBIND'));
    expect(state._v2section.id).toBe('S4');
    expect(state.level.solids.some((s) => s.id === 'floor-b')).toBe(true);
    expect(state.level.solids.some((s) => s.id === 'floor-a')).toBe(false);
  });

  it('leaves the current v1 Sahil issue alone', () => {
    const built = buildIssuance({ ...caller, canonicalBoss: 'sahil' });
    const state = buildIssuedState(built.issuance);
    expect(state.level.id).toBe('L02');
    expect(state.level.section).toBe('S4');
    expect(state.level.format).not.toBe('v2');
    expect(contentFingerprint(1)).toBe('bfe99bf4');
    expect(CONTENT_FINGERPRINT).toBe('17d87c54');
  });
});
