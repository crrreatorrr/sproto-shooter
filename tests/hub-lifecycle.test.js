import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { describe, expect, it, afterEach } from 'vitest';
import { createHubSdk, mintMockTicket, memoryKeyValue, HubSdkError } from '@metaverse/hub-sdk';
import { HUB_GAME_ID } from '../src/hub/config.js';
import {
  HubLink, connectHub, decideHubReturn, hubChipHtml, hubExitUrl, trustedHubUrl, watchProfileGet,
} from '../src/hub/link.js';
import {
  cloudBody, loadProfile, migrateProfile, resolveCloudConflict, saveProfile,
} from '../src/save/profile.js';

const PLAYER_KEY = 'sproto-shooter:hub-player';
const BALANCE_KEY = 'sproto-shooter:hub-balance';
const OUTBOX_KEY = 'sproto-shooter:hub-cloud-outbox';
const PROFILE_KEY = 'sproto-campaign-profile';

afterEach(() => {
  delete globalThis.localStorage;
  delete globalThis.window;
});

function memoryStorage() {
  const mem = new Map();
  return {
    getItem: (key) => (mem.has(key) ? mem.get(key) : null),
    setItem: (key, value) => mem.set(key, String(value)),
    removeItem: (key) => mem.delete(key),
  };
}

function useLocalStorage() {
  globalThis.localStorage = memoryStorage();
}

function jwt({ uid, usn = '', sid = 'sid-1', exp, game = HUB_GAME_ID }) {
  const payload = {
    uid,
    usn,
    exp: exp ?? Math.floor(Date.now() / 1000) + 3600,
    vrs: { sid, ranked: '0', scope: 'game', game },
  };
  return `e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;
}

function mockVisit(session = memoryKeyValue(), now = Date.now()) {
  const box = { hash: '', now };
  const assigned = [];
  const sdk = createHubSdk({
    useMock: true,
    session,
    local: memoryKeyValue(),
    now: () => box.now,
    readHash: () => box.hash,
    writeHash: (next) => { box.hash = next; },
    hubUrl: 'https://hub.example/hub/',
    assign: (url) => assigned.push(url),
  });
  return { sdk, assigned, box, session };
}

function cachedSession(token, playerId = 'user-a', sid = 'sid-a') {
  return {
    game: HUB_GAME_ID,
    playerId,
    ranked: false,
    sid,
    token,
    effects: {},
    relics: [],
    ticketsCapLeft: 0,
  };
}

function liveVisit({ rpc, auth, hash = '', session = memoryKeyValue() }) {
  const calls = [];
  const client = {
    async authenticateDevice() { throw new Error('device auth is not a game session'); },
    async authenticateCustom(id, create, vars) {
      calls.push({ id: 'authenticateCustom', body: id, create, vars });
      return auth(id);
    },
    async rpc(id, body, opts) {
      calls.push({ id, body, token: opts?.token });
      return rpc(id, body, opts);
    },
  };
  const watched = watchProfileGet(client);
  const assigned = [];
  const sdk = createHubSdk({
    client: watched.client,
    session,
    local: memoryKeyValue(),
    hubUrl: 'https://hub.example/hub/',
    readHash: () => hash,
    writeHash() {},
    assign: (url) => assigned.push(url),
    now: () => Date.now(),
  });
  sdk.profileGetError = watched.profileGetError;
  return { sdk, calls, assigned, session };
}

describe('fragment init', () => {
  it('redeems one ticket, strips it, and rejects a replay', async () => {
    const session = memoryKeyValue();
    const first = mockVisit(session);
    const ticket = await mintMockTicket({
      game: HUB_GAME_ID, playerId: 'player-1', now: first.box.now, jti: 'once',
    });
    first.box.hash = `#t=${ticket}`;
    const opened = await connectHub(first.sdk);
    expect(opened.bankable).toBe(true);
    expect(opened.status).toBe('guest');
    expect(first.box.hash).not.toMatch(/(?:^|#|&)t=/);

    const again = mockVisit(session);
    again.box.hash = `#t=${ticket}`;
    const replayed = await connectHub(again.sdk);
    expect(replayed.bankable).toBe(false);
    expect(replayed.connected).toBe(false);
    expect(replayed.code).toBe('ticket_used');
  });

  it('rejects an expired ticket and a ticket for another game, and still returns a link', async () => {
    const expiredEnv = mockVisit();
    expiredEnv.box.hash = `#t=${await mintMockTicket({
      game: HUB_GAME_ID, playerId: 'player-1', now: expiredEnv.box.now, ttlSeconds: -30, jti: 'old',
    })}`;
    const expired = await connectHub(expiredEnv.sdk);
    expect(expired.code).toBe('ticket_expired');
    expect(expired.connected).toBe(false);

    const wrong = mockVisit();
    wrong.box.hash = `#t=${await mintMockTicket({
      game: 'sproto', playerId: 'player-1', now: wrong.box.now, jti: 'other-game',
    })}`;
    const scoped = await connectHub(wrong.sdk);
    expect(scoped.code).toBe('ticket_game');
    expect(scoped.status).toBe('error');
  });

  it('treats a standalone profile as offline, including a failed init', async () => {
    const env = mockVisit();
    let reads = 0;
    const balance = env.sdk.getTicketBalance.bind(env.sdk);
    env.sdk.getTicketBalance = async () => { reads += 1; return balance(); };
    const link = await connectHub(env.sdk);
    expect(link.status).toBe('offline');
    expect(link.bankable).toBe(false);
    expect(link.connected).toBe(false);
    expect(await link.refreshBalance()).toBeNull();
    expect(reads).toBe(0);

    const dead = await connectHub({
      async init() { throw new Error('auth_failed'); },
      getSession: () => null,
      async getTicketBalance() { throw new Error('should not read'); },
      exit() {},
    });
    expect(dead.status).toBe('error');
    expect(dead.error).toBe('auth_failed');
    expect(dead.bankable).toBe(false);
  });
});

describe('session identity', () => {
  it('shows a profile.get failure instead of a connected chip', async () => {
    const session = memoryKeyValue();
    const token = jwt({ uid: 'user-a', usn: 'ken', sid: 'sid-a' });
    session.setItem(`hub:${HUB_GAME_ID}:session`, JSON.stringify(cachedSession(token)));
    const { sdk, calls } = liveVisit({
      session,
      auth() { throw new Error('no ticket'); },
      rpc(id) {
        if (id === 'profile.get') throw new Error('profile.get failed');
        throw new Error(`unexpected ${id}`);
      },
    });
    const link = await connectHub(sdk);
    expect(link.connected).toBe(false);
    expect(link.bankable).toBe(false);
    expect(link.status).toBe('error');
    expect(link.error).toBe('profile.get failed');
    expect(hubChipHtml(link)).toContain('data-hub="error"');
    expect(hubChipHtml(link)).toContain('profile.get failed');
    expect(hubChipHtml(link)).not.toContain('data-hub="connected"');
    expect(calls.map((call) => call.id)).not.toContain('tickets.balance');
    expect(calls.map((call) => call.id)).not.toContain('tickets.earn');
  });

  it('dedups the balance read and drops another account\'s cache and cloud retry', async () => {
    useLocalStorage();
    const balances = { 'user-a': 40, 'user-b': 5 };
    let reads = 0;
    const session = memoryKeyValue();
    const tokenA = jwt({ uid: 'user-a', usn: 'ann', sid: 'sid-a' });
    session.setItem(`hub:${HUB_GAME_ID}:session`, JSON.stringify(cachedSession(tokenA, 'user-a', 'sid-a')));
    const writes = [];
    const first = liveVisit({
      session,
      auth() { throw new Error('no ticket'); },
      async rpc(id, body) {
        if (id === 'profile.get') return { playerId: 'user-a', relics: [], ticketsCapLeft: 0, serverTime: 1 };
        if (id === 'tickets.balance') { reads += 1; return { balance: balances['user-a'], sessionCapLeft: 1, dailyCapLeft: 1, serverTime: 1 }; }
        if (id === 'save.put') { writes.push(body); throw new Error('offline'); }
        throw new Error(`unexpected ${id}`);
      },
    });
    const linkA = await connectHub(first.sdk);
    expect(linkA.status).toBe('connected');
    expect(linkA.accountLabel).toBe('ann');
    expect(await linkA.refreshBalance()).toBe(40);
    expect(await linkA.refreshBalance()).toBe(40);
    expect(reads).toBe(1);
    await linkA.saveCloud({ v: 2, unlocked: ['L01'], settings: { sensitivity: 1 }, tickets: 99999, balance: 40 });
    const queued = JSON.parse(localStorage.getItem(OUTBOX_KEY));
    expect(queued.playerId).toBe('user-a');
    expect(queued.data.tickets).toBeUndefined();
    expect(queued.data.balance).toBeUndefined();
    expect(JSON.parse(localStorage.getItem(BALANCE_KEY)).balance).toBe(40);

    const sessionB = memoryKeyValue();
    const tokenB = jwt({ uid: 'user-b', usn: '', sid: 'sid-b' });
    sessionB.setItem(`hub:${HUB_GAME_ID}:session`, JSON.stringify(cachedSession(tokenB, 'user-b', 'sid-b')));
    const writesB = [];
    const second = liveVisit({
      session: sessionB,
      auth() { throw new Error('no ticket'); },
      async rpc(id, body) {
        if (id === 'profile.get') return { playerId: 'user-b', relics: [], ticketsCapLeft: 0, serverTime: 2 };
        if (id === 'tickets.balance') return { balance: balances['user-b'], sessionCapLeft: 1, dailyCapLeft: 1, serverTime: 2 };
        if (id === 'save.put') { writesB.push(body); return { data: body.data, updatedAt: 2 }; }
        throw new Error(`unexpected ${id}`);
      },
    });
    const linkB = await connectHub(second.sdk);
    expect(linkB.status).toBe('guest');
    expect(linkB.playerId).toBe('user-b');
    expect(linkB.balance).toBeNull();
    expect(localStorage.getItem(OUTBOX_KEY)).toBeNull();
    expect(writesB).toEqual([]);
    expect(localStorage.getItem(PLAYER_KEY)).toBe(JSON.stringify('user-b'));
    expect(JSON.parse(localStorage.getItem(BALANCE_KEY))).toBeNull();
    expect(hubChipHtml(linkB)).toContain('data-hub="guest"');
  });

  it('clears the chip on expiry, sign-out, and tab takeover', async () => {
    const expiredSession = memoryKeyValue();
    const expiredToken = jwt({ uid: 'user-a', usn: 'ann', sid: 'sid-a', exp: 10 });
    expiredSession.setItem(`hub:${HUB_GAME_ID}:session`, JSON.stringify(cachedSession(expiredToken)));
    const expired = liveVisit({
      session: expiredSession,
      auth() { throw new Error('no ticket'); },
      rpc(id) {
        if (id === 'profile.get') return { playerId: 'user-a', relics: [] };
        throw new Error(id);
      },
    });
    const stale = await connectHub(expired.sdk);
    expect(stale.code).toBe('session_expired');
    expect(stale.connected).toBe(false);
    expect(hubChipHtml(stale)).toContain('data-hub="error"');

    const signedOut = await connectHub({
      async init() { return { playerId: 'device', ranked: false, relics: [], effects: {}, ticketsCapLeft: 0, serverTime: 0 }; },
      getSession: () => null,
      async getTicketBalance() { throw new Error('balance'); },
      exit() {},
    });
    expect(signedOut.status).toBe('offline');
    expect(hubChipHtml(signedOut)).toContain('data-hub="offline"');

    useLocalStorage();
    const link = new HubLink({
      async getTicketBalance() { throw new HubSdkError('session_closed', 'taken over'); },
      exit() {},
    });
    link.adopt({ playerId: 'user-a', game: HUB_GAME_ID, token: jwt({ uid: 'user-a', usn: 'ann' }) }, 'ann');
    link.rememberBalance(9);
    expect(await link.refreshBalance()).toBeNull();
    expect(link.status).toBe('error');
    expect(link.balance).toBeNull();
    expect(localStorage.getItem(BALANCE_KEY)).toBeNull();
    expect(await link.refreshBalance()).toBeNull();
  });
});

describe('return and cloud save', () => {
  it('asks exactly once while a run is live and leaves immediately from the title', () => {
    let playing = false;
    let armed = false;
    const click = () => {
      if (decideHubReturn({ playing, armed }) === 'confirm') { armed = true; return 'confirm'; }
      return 'leave';
    };
    expect(click()).toBe('leave');
    playing = true;
    expect(click()).toBe('confirm');
    expect(click()).toBe('leave');
    expect(click()).toBe('leave');
  });

  it('uses only the configured hub origin', () => {
    expect(trustedHubUrl('')).toBe('/hub/');
    expect(trustedHubUrl('https://hub.example/play/')).toBe('https://hub.example/play/');
    expect(trustedHubUrl('http://127.0.0.1:5173/hub')).toBe('http://127.0.0.1:5173/hub/');
    expect(() => trustedHubUrl('http://play.example/hub/')).toThrow(/hub_origin/);
    expect(() => trustedHubUrl('javascript:alert(1)')).toThrow(/hub_url|hub_origin/);
    expect(() => trustedHubUrl('https://hub.example/hub/?token=abc')).toThrow(/hub_url_token/);
    expect(() => trustedHubUrl('/hub/?ticket=abc')).toThrow(/hub_url_token/);
    expect(hubExitUrl()).toMatch(/#from=sproto-shooter$/);
    expect(hubExitUrl()).not.toMatch(/token=/);
    const gone = [];
    globalThis.window = { location: { assign: (url) => gone.push(url) } };
    new HubLink({ exit() { throw new Error('down'); } }).exitHub();
    expect(gone).toEqual([hubExitUrl()]);
    expect(gone[0]).not.toMatch(/\?/);
  });

  it('migrates an old profile without keeping Run Cash, and records a cloud lost update', () => {
    const migrated = migrateProfile({ unlocked: ['L02'], tickets: 99999, runCash: 40, guns: [{ id: 'x' }], modifiers: ['hot'] });
    expect(migrated.v).toBe(2);
    expect(migrated.unlocked).toEqual(['L01', 'L02']);
    expect(migrated.tickets).toBeUndefined();
    expect(JSON.stringify(cloudBody(migrated))).not.toMatch(/ticket|runCash|guns/i);

    const remote = resolveCloudConflict(
      { ...migrated, updatedAt: 10, settings: { sensitivity: 2, hitstop: true, shake: 1 } },
      { data: { unlocked: ['L01'], modifiers: [], settings: { sensitivity: 1, hitstop: false, shake: 0 }, updatedAt: 20, tickets: 50 }, updatedAt: 20 },
    );
    expect(remote.conflict).toBe('remote');
    expect(remote.lostUpdate).toBe(true);
    expect(remote.profile.settings.sensitivity).toBe(1);
    expect(remote.profile.tickets).toBeUndefined();

    const local = resolveCloudConflict(
      { unlocked: ['L01', 'L03'], modifiers: [], settings: { sensitivity: 1.5, hitstop: true, shake: 1 }, updatedAt: 30 },
      { data: { unlocked: ['L01'], modifiers: [], settings: { sensitivity: 1, hitstop: true, shake: 1 }, updatedAt: 20, balance: 80 }, updatedAt: 20 },
    );
    expect(local.conflict).toBe('local');
    expect(local.profile.unlocked).toContain('L03');
    expect(local.lostUpdate).toBe(false);
  });

  it('stores the migrated profile locally and does not upload Run Cash', () => {
    useLocalStorage();
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ unlocked: ['L01', 'L04'], tickets: 99999 }));
    const loaded = loadProfile();
    expect(loaded.unlocked).toEqual(['L01', 'L04']);
    expect(loaded.tickets).toBeUndefined();
    saveProfile({ ...loaded, settings: { sensitivity: 2, hitstop: false, shake: 0.5 } });
    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY));
    expect(stored.v).toBe(2);
    expect(stored.tickets).toBeUndefined();
    expect(stored.settings.sensitivity).toBe(2);
  });
});

describe('provenance and ledger boundary', () => {
  it('pins the vendored IIFE and does not ship the old hub patch', () => {
    const iife = readFileSync(new URL('../vendor/hub-sdk/dist/hub-sdk.iife.js', import.meta.url));
    const hash = createHash('sha256').update(iife).digest('hex');
    const pin = JSON.parse(readFileSync(new URL('../vendor/hub-sdk/SOURCE.pin.json', import.meta.url), 'utf8'));
    expect(hash).toBe('770e8e1b41ad1abef33eb0d04ef9c7eec8fda723336e5149a7809d902042013c');
    expect(pin.iifeSha256).toBe(hash);
    expect(pin.version).toBe('0.7.2');
    expect(pin.global).toBe('HubSDK');
    const vendor = readFileSync(new URL('../vendor/hub-sdk/VENDOR.md', import.meta.url), 'utf8');
    expect(vendor).toMatch(/5099cb5/);
    expect(vendor).not.toMatch(/94f10af/);
    expect(vendor).not.toMatch(/metaverse-hub\.patch/);
    expect(existsSync(new URL('../vendor/hub-sdk/metaverse-hub.patch', import.meta.url))).toBe(false);
    expect(iife.toString('utf8')).toContain('sproto-shooter');
    expect(iife.toString('utf8')).not.toMatch(/defaulthttpkey|http_key/i);
  });

  it('does not call a hub ledger write from the game, and keeps one init before the title', () => {
    const hubFiles = readdirSync(new URL('../src/hub/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => `src/hub/${f}`);
    expect(hubFiles).toEqual(expect.arrayContaining(['src/hub/config.js', 'src/hub/link.js', 'src/hub/serverKey.js', 'src/hub/waveRelic.js']));
    const files = [...hubFiles, 'src/main.js', 'src/game/Game.js', 'src/ui/ui.js', 'src/save/profile.js'];
    const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    const src = files.map(read).join('\n');
    expect(src).not.toMatch(/earnTickets|tickets\.earn|submitScore|spendTickets|tickets\.spend|tickets\.sell|tickets\.exchange|earnVerse|verse\.earn/i);

    // The one hub event the client reports is the Dragon Scale Relic (`shooter.wave_clear`, no Tickets).
    // Only HubLink calls the SDK's reportEvent, behind an allowlist holding that id alone, and only
    // waveRelic.js calls HubLink's, with WAVE_CLEAR_EVENT.
    const link = read('src/hub/link.js');
    expect(link).toMatch(/export const WAVE_CLEAR_EVENT = 'shooter\.wave_clear';/);
    expect(link).toMatch(/const CLIENT_EVENTS = new Set\(\[WAVE_CLEAR_EVENT\]\);/);
    expect(link).toMatch(/if \(!this\.bankable \|\| !CLIENT_EVENTS\.has\(eventId\)/);
    const calls = [];
    for (const file of files) {
      for (const m of read(file).matchAll(/[\w.]*reportEvent\s*\([^)]*\)?/g)) calls.push(`${file}: ${m[0]}`);
    }
    expect(calls.sort()).toEqual([
      'src/hub/link.js: reportEvent(eventId, data, key)',
      'src/hub/link.js: this.api.reportEvent(eventId, data, key)',
      'src/hub/waveRelic.js: hub.reportEvent(WAVE_CLEAR_EVENT, data, key)',
    ]);
    const eventIds = new Set([...src.matchAll(/'((?:shooter|coop|fighter|arcade|sproto|hpos10i|tickets|verse)\.[a-z_]+)'/g)].map((m) => m[1]));
    expect([...eventIds]).toEqual(['shooter.wave_clear']);
    const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
    expect(main.indexOf('await connectHub()')).toBeGreaterThan(-1);
    expect(main.indexOf('await connectHub()')).toBeLessThan(main.indexOf('new Game'));

    if (existsSync('dist')) {
      const chunks = walkJs('dist');
      expect(chunks.length).toBeGreaterThan(0);
      for (const file of chunks) expect(readFileSync(file, 'utf8')).not.toMatch(/defaulthttpkey|http_key\s*[:=]/i);
    }
  });
});

function walkJs(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walkJs(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}
