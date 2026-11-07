import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { HUB_GAME_ID } from '../src/hub/config.js';
import { LOCAL_SERVER_KEY, nakamaServerKey } from '../src/hub/serverKey.js';
import { HubLink, connectHub, hubExitUrl } from '../src/hub/link.js';

describe('hub server key', () => {
  it('uses the env key when one is set', () => {
    expect(nakamaServerKey({ envKey: 'from-the-build', dev: false, hostname: 'play.example.com' })).toBe('from-the-build');
  });

  it('uses the stock key in dev and on loopback, and nothing on a public host', () => {
    expect(nakamaServerKey({ dev: true, hostname: 'play.example.com' })).toBe(LOCAL_SERVER_KEY);
    expect(nakamaServerKey({ dev: false, hostname: '127.0.0.1' })).toBe(LOCAL_SERVER_KEY);
    expect(nakamaServerKey({ dev: false, hostname: 'localhost' })).toBe(LOCAL_SERVER_KEY);
    expect(nakamaServerKey({ dev: false, hostname: 'play.example.com' })).toBe('');
  });

  it('does not keep the HTTP key in the hub client', () => {
    const src = ['config.js', 'serverKey.js', 'link.js']
      .map((name) => readFileSync(new URL(`../src/hub/${name}`, import.meta.url), 'utf8'))
      .join('\n');
    expect(src).not.toMatch(/http_key/i);
    expect(src).not.toMatch(/\.local-admin-login/);
  });
});

describe('hub visit', () => {
  it('stays offline when init returns a profile but no session was saved', async () => {
    const api = fakeApi();
    const link = await connectHub(api);
    expect(api.inits).toEqual([HUB_GAME_ID]);
    expect(link.connected).toBe(false);
    expect(await link.refreshBalance()).toBe(null);
    expect(api.balances).toBe(0);
  });

  it('is connected when the SDK saved this game\'s session', async () => {
    const store = { [`hub:${HUB_GAME_ID}:session`]: '{"token":"t"}' };
    globalThis.sessionStorage = {
      getItem: (k) => store[k] ?? null,
      setItem() {},
      removeItem() {},
    };
    const api = fakeApi();
    const link = await connectHub(api);
    expect(link.connected).toBe(true);
    expect(await link.refreshBalance()).toBe(12);
    expect(await link.refreshBalance()).toBe(12);
    expect(api.balances).toBe(1);
    delete globalThis.sessionStorage;
  });

  it('records a failed redeem and still lets the game boot', async () => {
    const api = fakeApi();
    api.init = async () => { throw new Error('ticket_game'); };
    const link = await connectHub(api);
    expect(link.connected).toBe(false);
    expect(link.error).toBe('ticket_game');
  });

  it('returns to the hub with this game id, including a standalone visit', () => {
    const gone = [];
    globalThis.window = { location: { assign: (url) => gone.push(url) } };
    const offline = new HubLink({ exit() { throw new Error('should not be required'); } });
    offline.exitHub();
    expect(gone).toEqual([hubExitUrl()]);
    expect(hubExitUrl()).toMatch(/#from=sproto-shooter$/);

    const online = new HubLink({ exit(reason) { online.reason = reason; } });
    online.connected = true;
    online.exitHub();
    expect(online.reason).toBe('return');
    expect(gone).toHaveLength(1);
    delete globalThis.window;
  });
});

function fakeApi() {
  const api = {
    inits: [],
    balances: 0,
    async init(game) {
      api.inits.push(game);
      return { playerId: 'p', ranked: false, relics: [], effects: {}, ticketsCapLeft: 0, serverTime: 0 };
    },
    async getTicketBalance() {
      api.balances += 1;
      return { balance: 12, sessionCapLeft: 1, dailyCapLeft: 1, serverTime: 0 };
    },
    exit() {},
  };
  return api;
}
