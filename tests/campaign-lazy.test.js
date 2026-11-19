// The browser build swaps src/data/levels/campaign.js for menu stubs and loads each level body when
// it starts (vite.config.js, src/game/campaignLevelStubs.js, src/game/campaignLevels.js).
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_LEVELS } from '../src/data/levels/campaign.js';
import { CAMPAIGN_LEVELS as STUBS, replaceCampaignLevel } from '../src/game/campaignLevelStubs.js';
import { campaignLevelReady, loadAllCampaignLevels, loadCampaignLevel } from '../src/game/campaignLevels.js';

describe('campaign level stubs', () => {
  it('match the real levels in order, id, name and stage', () => {
    expect(STUBS.map(({ id, name, stage }) => ({ id, name, stage })))
      .toEqual(CAMPAIGN_LEVELS.map(({ id, name, stage }) => ({ id, name, stage })));
    for (const stub of STUBS) {
      expect(stub.pending).toBe(true);
      expect(stub.sections).toBeUndefined();
    }
  });

  it('take a loaded level in its own slot', () => {
    const copy = STUBS.slice();
    try {
      replaceCampaignLevel(CAMPAIGN_LEVELS[2]);
      expect(STUBS[2]).toBe(CAMPAIGN_LEVELS[2]);
      expect(STUBS[1].pending).toBe(true);
    } finally {
      STUBS.splice(0, STUBS.length, ...copy);
    }
  });
});

describe('campaign level loader outside the browser build', () => {
  it('finds every level already installed and resolves aliases', async () => {
    for (const id of ['L01', 'L10', '3', 'l05', 'nope', null]) expect(campaignLevelReady(id)).toBe(true);
    await expect(loadCampaignLevel('2')).resolves.toBe('L02');
    await expect(loadAllCampaignLevels()).resolves.toHaveLength(10);
  });
});

describe('client build resolver', () => {
  it('only swaps the campaign list, and never under Vitest or for the server bundles', async () => {
    const src = (await import('node:fs')).readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
    expect(src).toMatch(/process\.env\.VITEST/);
    expect(src).toMatch(/resolved\.id === CAMPAIGN_FILE \? CAMPAIGN_STUBS : null/);
    const server = (await import('node:fs')).readFileSync(new URL('../scripts/build-server-sim.mjs', import.meta.url), 'utf8');
    expect(server).not.toMatch(/campaignLevelStubs/);
  });
});
