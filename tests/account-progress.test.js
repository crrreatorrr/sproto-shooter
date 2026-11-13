// Campaign progress belongs to the hub account that earned it (src/save/progress.js).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHubSdk, memoryKeyValue, mintMockTicket, encodeSave, SAVE_MAX_BYTES, HubSdkError } from '@metaverse/hub-sdk';
import { HUB_GAME_ID } from '../src/hub/config.js';
import { connectHub } from '../src/hub/link.js';
import {
  LEGACY_LOADOUT_KEY, LEGACY_OUTBOX_KEY, LEGACY_PROFILE_KEY, MAX_BEST_WAVE, MAX_LEVEL_IDS, MAX_MODIFIER_IDS, PROGRESS_KEY,
  createCampaignProgress, emptyProgress, mergeProgress, normalizeProgress, progressCloudBody,
} from '../src/save/progress.js';
import { SETTINGS_KEY, loadSettings, saveSettings } from '../src/save/settings.js';
import { LOADOUT_KEY, loadoutKeyFor, readLoadout, writeLoadout } from '../src/save/loadout.js';

afterEach(() => {
  delete globalThis.localStorage;
  vi.restoreAllMocks();
});

/** One browser's localStorage. */
function browser() {
  const mem = new Map();
  return {
    mem,
    getItem: (key) => (mem.has(key) ? mem.get(key) : null),
    setItem: (key, value) => { mem.set(key, String(value)); },
    removeItem: (key) => { mem.delete(key); },
  };
}

/** The hub's cloud saves for this game, one per player, as `save.get` / `save.put` keep them. */
function cloud() {
  const saves = new Map();
  const as = (playerId) => ({
    async loadSave() { return saves.has(playerId) ? { data: saves.get(playerId), updatedAt: 1 } : { data: null, updatedAt: null }; },
    async writeSave(data) { const body = JSON.parse(encodeSave(data)); saves.set(playerId, body); return { data: body, updatedAt: 2 }; },
  });
  return { saves, as };
}

/** What connectHub hands the game: a live session for `playerId`, or standalone play. */
const visit = (api, playerId) => ({ bankable: true, playerId, api, noteSessionError: () => false });
const standalone = () => ({ bankable: false, playerId: null, api: null });

function progressOn(storage) {
  return createCampaignProgress({ storage, pushDelayMs: 0, retryDelayMs: 1 });
}

/** A browser that played before this change: the old unscoped profile and the old loadout's best wave. */
function usedBrowser() {
  const ls = browser();
  ls.setItem(LEGACY_PROFILE_KEY, JSON.stringify({
    v: 2, unlocked: ['L01', 'L02', 'L03', 'L04'], modifiers: ['turbo', 'bigHead'],
    settings: { sensitivity: 2.5, volumes: { master: 0.4 } }, updatedAt: 1700000000000, tickets: 999,
  }));
  ls.setItem(LEGACY_LOADOUT_KEY, JSON.stringify({ v: 1, skills: {}, guns: [{ seed: 1, type: 'pistol', quality: 'common' }], bestWave: 12 }));
  return ls;
}

describe('the progress model', () => {
  const a = { unlocked: ['L01', 'L02'], modifiers: ['turbo'], bestWave: 3 };
  const b = { unlocked: ['L01', 'L05'], modifiers: ['bigHead', 'turbo'], bestWave: 9 };
  const c = { unlocked: ['L03', 'L99'], modifiers: ['moonBoots'], bestWave: 1 };

  it('only keeps or improves progress, and gives the same result in any order', () => {
    const ab = mergeProgress(a, b);
    expect(ab.unlocked).toEqual(['L01', 'L02', 'L05']);
    expect(ab.modifiers).toEqual(['bigHead', 'turbo']);
    expect(ab.bestWave).toBe(9);
    expect(mergeProgress(b, a)).toEqual(ab);
    expect(mergeProgress(mergeProgress(a, b), c)).toEqual(mergeProgress(a, mergeProgress(b, c)));
    expect(mergeProgress(ab, ab)).toEqual(ab);
    expect(mergeProgress(emptyProgress(), ab)).toEqual(ab);
  });

  it('stays associative at the id caps', () => {
    const many = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}${String(i).padStart(3, '0')}`);
    const x = { unlocked: many('A', 50), modifiers: many('m', 100) };
    const y = { unlocked: many('B', 50), modifiers: many('n', 100) };
    const z = { unlocked: many('C', 50), modifiers: many('o', 100) };
    const left = mergeProgress(mergeProgress(x, y), z), right = mergeProgress(x, mergeProgress(y, z));
    expect(left).toEqual(right);
    expect(left.unlocked.length).toBe(MAX_LEVEL_IDS + 1);
    expect(left.unlocked[0]).toBe('L01');
    expect(left.modifiers.length).toBe(MAX_MODIFIER_IDS);
  });

  it('reads the version-2 cloud and local profile, ignoring settings, timestamps and Run Cash', () => {
    const v2 = { v: 2, unlocked: ['L01', 'L02', 7, '../x', ''], modifiers: ['turbo', null], settings: { sensitivity: 3 }, updatedAt: 99, tickets: 5, runCash: 1, guns: [] };
    const p = normalizeProgress(v2);
    expect(p).toEqual({ v: 3, unlocked: ['L01', 'L02'], modifiers: ['turbo'], bestWave: 0 });
    expect(normalizeProgress(null)).toEqual(emptyProgress());
    expect(normalizeProgress({ unlocked: 'L05', bestWave: -4 })).toEqual(emptyProgress());
    expect(normalizeProgress({ bestWave: 1e9 }).bestWave).toBe(MAX_BEST_WAVE);
    const body = progressCloudBody({ ...v2, bestWave: 4 });
    expect(Object.keys(body).sort()).toEqual(['bestWave', 'modifiers', 'unlocked', 'v']);
    expect(JSON.stringify(body)).not.toMatch(/ticket|runCash|guns|settings|updatedAt/i);
  });

  it('fits the largest possible save under SAVE_MAX_BYTES with room to spare', () => {
    const longId = (prefix, i) => `${prefix}${String(i).padStart(4, '0')}`.padEnd(32, 'x');
    const biggest = normalizeProgress({
      unlocked: Array.from({ length: 500 }, (_, i) => longId('L', i)),
      modifiers: Array.from({ length: 500 }, (_, i) => longId('m', i)),
      bestWave: MAX_BEST_WAVE,
    });
    expect(biggest.unlocked.length).toBe(MAX_LEVEL_IDS + 1);
    expect(biggest.modifiers.length).toBe(MAX_MODIFIER_IDS);
    const bytes = new TextEncoder().encode(encodeSave(progressCloudBody(biggest))).length;
    expect(bytes).toBeLessThan(SAVE_MAX_BYTES / 2);
  });
});

describe('progress per hub account', () => {
  it('starts a new account empty on a browser another account and the device already used', async () => {
    const ls = usedBrowser();
    const hub = cloud();
    const first = progressOn(ls);
    expect(first.get().unlocked).toEqual(['L01', 'L02', 'L03', 'L04']); // the device's own progress
    await first.followHub(visit(hub.as('ann'), 'ann'));
    first.levelWon({ next: 'L07' });
    first.waveCleared(20);
    await first.flush();
    expect(hub.saves.get('ann').unlocked).toEqual(['L01', 'L07']);

    // Same browser, next visit, a different account.
    const second = progressOn(ls);
    await second.followHub(visit(hub.as('bob'), 'bob'));
    expect(second.owner()).toEqual({ kind: 'account', playerId: 'bob' });
    expect(second.get()).toEqual(emptyProgress());
    expect(second.isUnlocked('L02')).toBe(false);
    expect(second.isUnlocked('L07')).toBe(false);
    expect(second.bestWave()).toBe(0);
    await second.flush();
    expect(hub.saves.has('bob')).toBe(false); // nothing earned, nothing uploaded
  });

  it('never moves device progress into an account, in either direction', async () => {
    const ls = usedBrowser();
    const hub = cloud();
    const p = progressOn(ls);
    p.levelWon({ next: 'L05', modifiers: ['lightsOut'] }); // standalone play
    await p.followHub(visit(hub.as('ann'), 'ann'));
    p.levelWon({ next: 'L02' });
    await p.flush();
    expect(hub.saves.get('ann')).toEqual({ v: 3, unlocked: ['L01', 'L02'], modifiers: [], bestWave: 0 });
    expect(JSON.parse(ls.getItem(`${PROGRESS_KEY}@ann`)).unlocked).toEqual(['L01', 'L02']);

    // Back to standalone: the device copy has the device's progress only.
    await p.followHub(standalone());
    expect(p.owner()).toEqual({ kind: 'device' });
    expect(p.get().unlocked).toEqual(['L01', 'L02', 'L03', 'L04', 'L05']);
    expect(p.get().modifiers).toEqual(['bigHead', 'lightsOut', 'turbo']);
    expect(p.bestWave()).toBe(12);
  });

  it('loads the account\'s cloud save on a second device', async () => {
    const hub = cloud();
    const laptop = progressOn(usedBrowser());
    await laptop.followHub(visit(hub.as('ann'), 'ann'));
    laptop.levelWon({ next: 'L02', modifiers: ['turbo'] });
    laptop.levelWon({ next: 'L03' });
    laptop.waveCleared(7);
    await laptop.flush();

    const phone = progressOn(browser());
    expect(phone.get()).toEqual(emptyProgress());
    await phone.followHub(visit(hub.as('ann'), 'ann'));
    expect(phone.get()).toEqual({ v: 3, unlocked: ['L01', 'L02', 'L03'], modifiers: ['turbo'], bestWave: 7 });

    // Both devices keep playing; neither overwrites the other.
    phone.levelWon({ next: 'L04' });
    laptop.waveCleared(9);
    await phone.flush();
    await laptop.flush();
    expect(hub.saves.get('ann')).toEqual({ v: 3, unlocked: ['L01', 'L02', 'L03', 'L04'], modifiers: ['turbo'], bestWave: 9 });
  });

  it('keeps an account\'s existing version-2 cloud save', async () => {
    const hub = cloud();
    hub.saves.set('ann', { v: 2, unlocked: ['L01', 'L06'], modifiers: ['confetti'], settings: { sensitivity: 3 }, updatedAt: 5 });
    const p = progressOn(browser());
    await p.followHub(visit(hub.as('ann'), 'ann'));
    expect(p.get()).toEqual({ v: 3, unlocked: ['L01', 'L06'], modifiers: ['confetti'], bestWave: 0 });
    // Same progress: the old body is left alone until there is something new to save.
    expect(hub.saves.get('ann').v).toBe(2);
    p.levelWon({ next: 'L07' });
    await p.flush();
    // Then it is rewritten in the new shape, with no settings in the cloud.
    expect(hub.saves.get('ann')).toEqual({ v: 3, unlocked: ['L01', 'L06', 'L07'], modifiers: ['confetti'], bestWave: 0 });
  });

  it('gives a win made while the visit was starting to the account', async () => {
    const ls = usedBrowser();
    const hub = cloud();
    const p = progressOn(ls);
    p.hold();
    expect(p.owner()).toEqual({ kind: 'pending' });
    expect(p.get()).toEqual(emptyProgress());
    p.levelWon({ next: 'L09' });
    p.waveCleared(30);
    await p.followHub(visit(hub.as('ann'), 'ann'));
    expect(p.get().unlocked).toEqual(['L01', 'L09']);
    expect(hub.saves.get('ann')).toEqual({ v: 3, unlocked: ['L01', 'L09'], modifiers: [], bestWave: 30 });
    expect(ls.getItem(PROGRESS_KEY)).toBeNull(); // the device copy never saw it
  });

  it('gives a held win back to the device when the visit turns out standalone', async () => {
    const ls = browser();
    const p = progressOn(ls);
    p.hold();
    p.levelWon({ next: 'L02' });
    await p.followHub(standalone());
    expect(JSON.parse(ls.getItem(PROGRESS_KEY)).unlocked).toEqual(['L01', 'L02']);
  });

  it('keeps legacy progress on the device', async () => {
    const ls = usedBrowser();
    const hub = cloud();
    const p = progressOn(ls);
    expect(p.get()).toEqual({ v: 3, unlocked: ['L01', 'L02', 'L03', 'L04'], modifiers: ['bigHead', 'turbo'], bestWave: 12 });
    await p.followHub(visit(hub.as('ann'), 'ann'));
    expect(p.get()).toEqual(emptyProgress());
    p.waveCleared(2);
    await p.flush();
    expect(hub.saves.get('ann')).toEqual({ v: 3, unlocked: ['L01'], modifiers: [], bestWave: 2 });
    // The old keys are left as they were.
    expect(JSON.parse(ls.getItem(LEGACY_PROFILE_KEY)).unlocked).toEqual(['L01', 'L02', 'L03', 'L04']);
    expect(JSON.parse(ls.getItem(LEGACY_LOADOUT_KEY)).bestWave).toBe(12);
  });

  it('hands the old build\'s queued cloud save to its own account only', async () => {
    const hub = cloud();
    const ls = browser();
    ls.setItem(LEGACY_OUTBOX_KEY, JSON.stringify({ playerId: 'ann', data: { v: 2, unlocked: ['L01', 'L08'], modifiers: [], settings: {}, updatedAt: 3 } }));
    const bob = progressOn(ls);
    await bob.followHub(visit(hub.as('bob'), 'bob'));
    expect(bob.isUnlocked('L08')).toBe(false);
    expect(ls.getItem(LEGACY_OUTBOX_KEY)).toBeNull();

    ls.setItem(LEGACY_OUTBOX_KEY, JSON.stringify({ playerId: 'ann', data: { v: 2, unlocked: ['L01', 'L08'], modifiers: [], settings: {}, updatedAt: 3 } }));
    const ann = progressOn(ls);
    await ann.followHub(visit(hub.as('ann'), 'ann'));
    expect(ann.isUnlocked('L08')).toBe(true);
    await ann.flush();
    expect(hub.saves.get('ann').unlocked).toEqual(['L01', 'L08']);
  });

  it('merges progress another tab saved for the same account', async () => {
    const ls = browser();
    const hub = cloud();
    const tabA = progressOn(ls), tabB = progressOn(ls);
    await tabA.followHub(visit(hub.as('ann'), 'ann'));
    await tabB.followHub(visit(hub.as('ann'), 'ann'));
    tabA.levelWon({ next: 'L02' });
    expect(tabB.watches(`${PROGRESS_KEY}@ann`)).toBe(true);
    expect(tabB.watches(PROGRESS_KEY)).toBe(false);
    tabB.refresh();
    expect(tabB.isUnlocked('L02')).toBe(true);
    tabB.levelWon({ next: 'L03' });
    await tabA.flush();
    await tabB.flush();
    expect(hub.saves.get('ann').unlocked).toEqual(['L01', 'L02', 'L03']);
  });

  it('retries a failed cloud write and tells the link about a dead session', async () => {
    const hub = cloud();
    const api = hub.as('ann');
    let fail = 1;
    const flaky = { loadSave: api.loadSave, async writeSave(data) { if (fail-- > 0) throw new Error('offline'); return api.writeSave(data); } };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const p = progressOn(browser());
    await p.followHub(visit(flaky, 'ann'));
    p.levelWon({ next: 'L02' });
    await p.flush();
    expect(p.sync()).toBe('offline');
    await vi.waitFor(() => expect(hub.saves.get('ann')?.unlocked).toEqual(['L01', 'L02']));

    const seen = [];
    const dead = { async loadSave() { throw new HubSdkError('session_closed', 'taken over'); }, writeSave: api.writeSave };
    const q = progressOn(browser());
    await q.followHub({ ...visit(dead, 'ann'), noteSessionError: (err) => seen.push(err.code) });
    expect(seen).toEqual(['session_closed']);
  });

  it('follows a real hub visit from connectHub', async () => {
    const local = memoryKeyValue(); // the mock hub keeps its cloud saves here
    const sdkFor = async (playerId, jti) => {
      const box = { hash: '' };
      const sdk = createHubSdk({
        useMock: true, session: memoryKeyValue(), local, now: () => Date.now(),
        readHash: () => box.hash, writeHash: (next) => { box.hash = next; }, hubUrl: 'https://hub.example/hub/', assign() {},
      });
      box.hash = `#t=${await mintMockTicket({ game: HUB_GAME_ID, playerId, now: Date.now(), jti })}`;
      return sdk;
    };
    globalThis.localStorage = browser(); // HubLink's balance cache
    const ls = usedBrowser();
    const ann = progressOn(ls);
    ann.hold();
    const linkA = await connectHub(await sdkFor('ann', 'a1'));
    expect(linkA.bankable).toBe(true);
    await ann.followHub(linkA);
    expect(ann.get()).toEqual(emptyProgress());
    ann.levelWon({ next: 'L02' });
    await ann.flush();

    const bob = progressOn(ls);
    bob.hold();
    await bob.followHub(await connectHub(await sdkFor('bob', 'b1')));
    expect(bob.owner()).toEqual({ kind: 'account', playerId: 'bob' });
    expect(bob.get()).toEqual(emptyProgress());

    const phone = progressOn(browser());
    phone.hold();
    await phone.followHub(await connectHub(await sdkFor('ann', 'a2')));
    expect(phone.get().unlocked).toEqual(['L01', 'L02']);

    const offline = progressOn(ls);
    await offline.followHub(await connectHub(createHubSdk({ useMock: true, session: memoryKeyValue(), local: memoryKeyValue(), readHash: () => '', writeHash() {}, hubUrl: '/hub/', assign() {} })));
    expect(offline.owner()).toEqual({ kind: 'device' });
    expect(offline.get().unlocked).toEqual(['L01', 'L02', 'L03', 'L04']);
  });
});

describe('what stays on the device', () => {
  it('keeps settings in their own key, read once from the old profile', () => {
    const ls = usedBrowser();
    globalThis.localStorage = ls;
    expect(loadSettings().sensitivity).toBe(2.5);
    expect(loadSettings().volumes.master).toBe(0.4);
    saveSettings({ ...loadSettings(), sensitivity: 1.2 });
    expect(JSON.parse(ls.getItem(SETTINGS_KEY)).sensitivity).toBe(1.2);
    expect(loadSettings().sensitivity).toBe(1.2);
    expect(JSON.parse(ls.getItem(LEGACY_PROFILE_KEY)).settings.sensitivity).toBe(2.5); // untouched
  });

  it('keeps each owner\'s Wave Mode loadout apart in this browser', () => {
    const ls = usedBrowser();
    globalThis.localStorage = ls;
    expect(loadoutKeyFor({ kind: 'device' })).toBe(LOADOUT_KEY);
    expect(loadoutKeyFor({ kind: 'account', playerId: 'ann' })).toBe(`${LOADOUT_KEY}@ann`);
    expect(loadoutKeyFor({ kind: 'pending' })).toBeNull();
    expect(readLoadout(LOADOUT_KEY).guns.length).toBe(1);
    expect(readLoadout(`${LOADOUT_KEY}@ann`).guns).toEqual([]);
    expect(readLoadout(null).guns).toEqual([]);
    writeLoadout({ guns: [{ seed: 9, type: 'pistol', quality: 'rare' }] }, `${LOADOUT_KEY}@ann`);
    writeLoadout({ guns: [{ seed: 7, type: 'pistol', quality: 'rare' }] }, null); // pending: not kept
    expect(readLoadout(`${LOADOUT_KEY}@ann`).guns[0].seed).toBe(9);
    expect(readLoadout(LOADOUT_KEY).guns[0].seed).toBe(1);
    expect(readLoadout(`${LOADOUT_KEY}@bob`).guns).toEqual([]);
  });
});
