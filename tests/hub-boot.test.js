// The game boots while the hub visit settles (src/main.js), and the title's wager offer reads the
// guest answer from shooter.version when the hub sends it, without the matchmaker probe.
import { afterEach, describe, expect, it } from 'vitest';
import { createHubSdk, memoryKeyValue, mintMockTicket } from '@metaverse/hub-sdk';
import { HUB_GAME_ID } from '../src/hub/config.js';
import { HubLink, hubChipHtml, restRpcFor, startHub } from '../src/hub/link.js';
import { createWagerFlow, serverGuestAnswer } from '../src/hub/wagers.js';

afterEach(() => {
  delete globalThis.localStorage;
});

function memoryStorage() {
  const mem = new Map();
  return {
    getItem: (key) => (mem.has(key) ? mem.get(key) : null),
    setItem: (key, value) => mem.set(key, String(value)),
    removeItem: (key) => mem.delete(key),
  };
}

function mockVisit() {
  const box = { hash: '', now: Date.now() };
  const sdk = createHubSdk({
    useMock: true,
    session: memoryKeyValue(),
    local: memoryKeyValue(),
    now: () => box.now,
    readHash: () => box.hash,
    writeHash: (next) => { box.hash = next; },
    hubUrl: 'https://hub.example/hub/',
    assign: () => {},
  });
  return { sdk, box };
}

describe('startHub', () => {
  it('hands back a connecting link at once and settles that same link', async () => {
    globalThis.localStorage = memoryStorage();
    const visit = mockVisit();
    const ticket = await mintMockTicket({ game: HUB_GAME_ID, playerId: 'player-1', now: visit.box.now, jti: 'boot' });
    visit.box.hash = `#t=${ticket}`;
    const { link, ready } = startHub(visit.sdk);
    expect(link.status).toBe('connecting');
    expect(link.settled).toBe(false);
    expect(link.bankable).toBe(false);
    expect(hubChipHtml(link)).toMatch(/data-hub="connecting"/);
    const settled = await ready;
    expect(settled).toBe(link);
    expect(link.settled).toBe(true);
    expect(link.bankable).toBe(true);
    expect(link.playerId).toBe('player-1');
  });

  it('settles offline without a ticket or session, and a plain HubLink is already settled', async () => {
    const { link, ready } = startHub(mockVisit().sdk);
    await ready;
    expect(link.status).toBe('offline');
    expect(link.settled).toBe(true);
    expect(new HubLink({}).settled).toBe(true);
  });

  it('settles a failing init as an error, never a rejection', async () => {
    const { link, ready } = startHub({ init: async () => { throw new Error('down'); } });
    await expect(ready).resolves.toBe(link);
    expect(link.status).toBe('error');
  });
});

describe('restRpcFor', () => {
  it('sends the session token and refreshes one about to expire', async () => {
    const sent = [];
    const client = { rpc: async (id, body, opts) => { sent.push({ id, body, token: opts.token }); return { ok: true }; } };
    let session = { token: 'old', expiresAt: Date.now() + 60_000 };
    const sdk = { getSession: () => session, refreshSession: async () => { session = { token: 'new', expiresAt: Date.now() + 3_600_000 }; return session; } };
    await expect(restRpcFor(sdk, client)('shooter.version', {})).resolves.toEqual({ ok: true });
    expect(sent).toEqual([{ id: 'shooter.version', body: {}, token: 'new' }]);
  });

  it('refuses without a session', async () => {
    await expect(restRpcFor({ getSession: () => null }, { rpc: async () => ({}) })('shooter.version')).rejects.toMatchObject({ code: 'offline' });
  });
});

describe('guest answer from shooter.version', () => {
  it('reads isGuest and wagerEligible, and is null when the hub sends neither', () => {
    expect(serverGuestAnswer(null)).toBeNull();
    expect(serverGuestAnswer({ wagerEnabled: true })).toBeNull();
    expect(serverGuestAnswer({ wagerEnabled: true, isGuest: true })).toBe('wager_guest');
    expect(serverGuestAnswer({ wagerEnabled: true, isGuest: false, wagerEligible: true })).toBe('');
    expect(serverGuestAnswer({ wagerEnabled: true, wagerEligible: false })).toBe('wager_guest');
    expect(serverGuestAnswer({ wagerEnabled: false, wagerEligible: false })).toBe('');
  });

  it('skips the matchmaker probe when the hub answers, and still probes an older hub', async () => {
    const session = () => ({ playerId: 'player-a', bankable: true, guest: false, status: 'connected' });
    for (const [body, probes, enabled] of [
      [{ wagerEnabled: true, isGuest: false, wagerEligible: true }, 0, true],
      [{ wagerEnabled: true, isGuest: true, wagerEligible: false }, 0, false],
      [{ wagerEnabled: true }, 1, true],
    ]) {
      let probed = 0;
      const flow = createWagerFlow({
        session,
        balance: async () => 40,
        rpc: async (id) => (id === 'shooter.version' ? body : {}),
        readServerRefusal: async () => { probed += 1; return ''; },
      });
      await flow.refresh();
      expect(probed).toBe(probes);
      expect(flow.view.offer.enabled).toBe(enabled);
      if (!enabled) expect(flow.view.offer.guest).toBe(true);
    }
  });
});
