import { createHubSdk, createNakamaClient } from '@metaverse/hub-sdk';
import { HUB_GAME_ID } from './config.js';
import { pageServerKey } from './serverKey.js';

/** Identity for the cached Ticket balance and the non-economic cloud-save retry. */
const PLAYER_KEY = 'sproto-shooter:hub-player';
const BALANCE_KEY = 'sproto-shooter:hub-balance';
const OUTBOX_KEY = 'sproto-shooter:hub-cloud-outbox';

const LOOPBACK_HOST = /^(localhost|[\w-]+\.localhost|127(?:\.\d{1,3}){3}|\[::1\]|::1)$/i;
const TOKEN_QUERY = /(?:^|[?&])(?:t|token|ticket|access_token|refresh_token|refresh)=/i;
const ECONOMIC_KEY = /^(tickets|runCash|cash|guns|resources|godTickets|godMode|inventory|balance)$/;
const DEAD_SESSION = new Set(['session_closed', 'unauthorized', 'not_game_session', 'session_expired']);

/**
 * Nakama RPCs the wager screen may call. There is no settle, winner, refund, or earn RPC.
 * Anything else is refused on the client before a socket sees it.
 */
const SHOOTER_RPC = 'shooter.';
export const WAGER_RPC = Object.freeze({
  version: `${SHOOTER_RPC}version`,
  roomCreate: `${SHOOTER_RPC}room_create`,
  roomJoin: `${SHOOTER_RPC}room_join`,
  queueCancel: `${SHOOTER_RPC}queue_cancel`,
  resume: `${SHOOTER_RPC}resume`,
  metrics: `${SHOOTER_RPC}metrics`,
});
export const WAGER_RPCS = Object.freeze(Object.values(WAGER_RPC));

export function assertWagerRpc(id) {
  if (typeof id !== 'string' || !WAGER_RPCS.includes(id)) {
    const err = new Error('rpc_refused');
    err.code = 'rpc_refused';
    throw err;
  }
}

/**
 * The one hub event this client reports: clearing wave 1 of Wave Mode, which grants the Dragon Scale
 * Relic (hub-sdk 0.6.4, migration 0042). It pays no Tickets. Every other event, and every Ticket or
 * Verse earn, stays off the client.
 */
export const WAVE_CLEAR_EVENT = 'shooter.wave_clear';
const CLIENT_EVENTS = new Set([WAVE_CLEAR_EVENT]);

/**
 * Build-time hub page. Relative `/hub/` stays on this origin. An absolute URL
 * must be https, or http on loopback (and in dev). Query tokens are refused.
 * Callers never pass a player-supplied returnUrl.
 */
export function trustedHubUrl(configured, { dev = false } = {}) {
  const raw = String(configured ?? '').trim();
  if (!raw) return '/hub/';
  if (TOKEN_QUERY.test(raw)) throw new Error('hub_url_token');
  if (raw.startsWith('/')) {
    if (raw.startsWith('//')) throw new Error('hub_url');
    const path = raw.split('#')[0].split('?')[0];
    if (!path.startsWith('/') || path.split('/').includes('..')) throw new Error('hub_url');
    return path.endsWith('/') ? path : `${path}/`;
  }
  let url;
  try { url = new URL(raw); } catch { throw new Error('hub_url'); }
  if (url.username || url.password) throw new Error('hub_url');
  if (url.search && TOKEN_QUERY.test(`?${url.search.slice(1)}`)) throw new Error('hub_url_token');
  const loopback = LOOPBACK_HOST.test(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && (loopback || dev))) throw new Error('hub_origin');
  const path = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  return `${url.origin}${path}`;
}

/** Configured hub page, without a hash or a token query. */
export function hubPageUrl() {
  const configured = import.meta.env.VITE_HUB_URL;
  return trustedHubUrl(configured, { dev: import.meta.env.DEV === true });
}

/** Trusted hub page plus `#from=sproto-shooter`. */
export function hubExitUrl() {
  return `${hubPageUrl().replace(/\/$/, '')}/#from=${HUB_GAME_ID}`;
}

/** Nakama puts the username in the JWT `usn` claim. A blank name is a guest. */
export function usernameFromToken(token) {
  if (typeof token !== 'string') return '';
  const part = token.split('.')[1];
  if (!part) return '';
  try {
    const pad = part.length % 4 === 0 ? '' : '='.repeat(4 - (part.length % 4));
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/') + pad));
    return typeof json.usn === 'string' ? json.usn.trim() : '';
  } catch {
    return '';
  }
}

/**
 * The live SDK still marks a cached session active when `profile.get` throws.
 * Record that failure so the chip can show it instead of a connected account.
 */
export function watchProfileGet(client) {
  const seen = { error: null };
  return {
    client: {
      ...client,
      async rpc(id, body, opts) {
        try {
          return await client.rpc(id, body, opts);
        } catch (err) {
          if (id === 'profile.get') seen.error = err instanceof Error ? err : new Error(String(err));
          throw err;
        }
      },
    },
    profileGetError: () => seen.error,
  };
}

/** Title with no player run leaves immediately. A live run asks once, then leaves. */
export function decideHubReturn({ playing, armed }) {
  if (!playing || armed) return 'leave';
  return 'confirm';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

/** Account chip. An error wins over a cached session that still looks connected. */
export function hubChipHtml(hub) {
  const status = hub?.error ? 'error' : (hub?.status || (hub?.connected ? 'connected' : 'offline'));
  if (status === 'error') {
    return `<div class="hub-chip error" data-hub="error">Hub <b>${escapeHtml(hub.error || 'error')}</b></div>`;
  }
  if (status === 'guest') {
    const n = hub.balance === null || hub.balance === undefined ? '…' : String(hub.balance);
    return `<div class="hub-chip guest" data-hub="guest">Guest · Tickets <b>${escapeHtml(n)}</b></div>`;
  }
  if (status === 'connected') {
    const n = hub.balance === null || hub.balance === undefined ? '…' : String(hub.balance);
    const who = hub.accountLabel ? `${escapeHtml(hub.accountLabel)} · ` : '';
    return `<div class="hub-chip connected" data-hub="connected">${who}Tickets <b>${escapeHtml(n)}</b></div>`;
  }
  return `<div class="hub-chip offline" data-hub="offline">Offline</div>`;
}

/** Drop Run Cash and every other economic field before a cloud write. */
export function nonEconomicSave(data) {
  const src = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const out = {};
  for (const [key, value] of Object.entries(src)) {
    if (!ECONOMIC_KEY.test(key)) out[key] = value;
  }
  return out;
}

function localStore() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

function readJson(key) {
  const ls = localStore();
  if (!ls) return null;
  try {
    const raw = ls.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  const ls = localStore();
  if (!ls) return;
  if (value == null) ls.removeItem(key);
  else ls.setItem(key, JSON.stringify(value));
}

function errorCode(err) {
  if (!err) return '';
  if (typeof err.code === 'string' && err.code) return err.code;
  return err instanceof Error ? err.message : String(err);
}

/**
 * One hub visit. A standalone device profile is offline: the game still runs,
 * and it does not read or write the hub ledger.
 */
export class HubLink {
  constructor(api) {
    this.api = api;
    this.status = 'offline';
    this.connected = false;
    this.bankable = false;
    this.playerId = null;
    this.accountLabel = '';
    this.balance = null;
    this.error = null;
    this.code = null;
    this.balanceJob = null;
    this.balanceAt = -Infinity;
    this.rewardIdentityListener = null;
  }

  watchRewardIdentity(listener) {
    this.rewardIdentityListener = typeof listener === 'function' ? listener : null;
    return () => { if (this.rewardIdentityListener === listener) this.rewardIdentityListener = null; };
  }

  notifyRewardIdentity() {
    try { this.rewardIdentityListener?.(); } catch { /* identity changes must still complete */ }
  }

  markOffline() {
    this.notifyRewardIdentity();
    this.status = 'offline';
    this.connected = false;
    this.bankable = false;
    this.playerId = null;
    this.accountLabel = '';
    this.balance = null;
    this.error = null;
    this.code = null;
  }

  fail(err) {
    this.notifyRewardIdentity();
    this.status = 'error';
    this.connected = false;
    this.bankable = false;
    this.balance = null;
    this.code = errorCode(err);
    this.error = err instanceof Error ? err.message : String(err);
  }

  /** Keep the balance and the cloud retry only for this player. */
  adopt(session, username) {
    const nextId = session.playerId;
    if (this.playerId && this.playerId !== nextId) this.notifyRewardIdentity();
    const previous = readJson(PLAYER_KEY);
    if (previous && previous !== nextId) this.dropIdentity();
    writeJson(PLAYER_KEY, nextId);
    const cached = readJson(BALANCE_KEY);
    this.playerId = nextId;
    this.balance = cached && cached.playerId === nextId && Number.isFinite(cached.balance) ? cached.balance : null;
    if (!cached || cached.playerId !== nextId) writeJson(BALANCE_KEY, null);
    this.error = null;
    this.code = null;
    this.bankable = true;
    this.connected = true;
    if (username) {
      this.status = 'connected';
      this.accountLabel = username;
    } else {
      this.status = 'guest';
      this.accountLabel = 'Guest';
    }
  }

  dropIdentity() {
    this.notifyRewardIdentity();
    this.balance = null;
    this.balanceJob = null;
    this.balanceAt = -Infinity;
    writeJson(BALANCE_KEY, null);
    writeJson(OUTBOX_KEY, null);
  }

  rememberBalance(balance) {
    if (!this.bankable || !this.playerId || !Number.isFinite(balance)) return;
    this.balance = balance;
    writeJson(BALANCE_KEY, { playerId: this.playerId, balance });
  }

  /**
   * Ticket balance for the chip. Offline and failed sessions do nothing.
   * At most one read in flight and one per `minGapMs`.
   */
  refreshBalance(minGapMs = 30_000) {
    if (!this.bankable) return Promise.resolve(null);
    if (this.balanceJob) return this.balanceJob;
    if (this.balance !== null && performance.now() - this.balanceAt < minGapMs) return Promise.resolve(this.balance);
    const playerId = this.playerId;
    this.balanceJob = this.api.getTicketBalance()
      .then((result) => {
        if (this.playerId !== playerId || !this.bankable) return null;
        if (Number.isFinite(result.balance)) this.rememberBalance(result.balance);
        return this.balance;
      })
      .catch((err) => {
        if (this.noteSessionError(err)) return null;
        return this.bankable && this.playerId === playerId ? this.balance : null;
      })
      .finally(() => {
        this.balanceAt = performance.now();
        this.balanceJob = null;
      });
    return this.balanceJob;
  }

  noteSessionError(err) {
    if (!DEAD_SESSION.has(errorCode(err))) return false;
    this.fail(err instanceof Error ? err : new Error(errorCode(err)));
    this.dropIdentity();
    return true;
  }

  async loadCloud() {
    if (!this.bankable || typeof this.api.loadSave !== 'function') return null;
    try {
      return await this.api.loadSave();
    } catch (err) {
      this.noteSessionError(err);
      return null;
    }
  }

  async saveCloud(data) {
    if (!this.bankable || typeof this.api.writeSave !== 'function') return { queued: false };
    const body = nonEconomicSave(data);
    const playerId = this.playerId;
    try {
      const result = await this.api.writeSave(body);
      if (this.playerId === playerId) writeJson(OUTBOX_KEY, null);
      return { queued: false, result };
    } catch (err) {
      if (this.noteSessionError(err)) return { queued: false };
      writeJson(OUTBOX_KEY, { playerId, data: body });
      return { queued: true };
    }
  }

  /** Retry this player's cloud save. Another account's queued body is dropped. */
  async flushCloud() {
    const queued = readJson(OUTBOX_KEY);
    if (!queued) return;
    if (!this.bankable || queued.playerId !== this.playerId) {
      writeJson(OUTBOX_KEY, null);
      return;
    }
    await this.saveCloud(queued.data);
  }

  /**
   * Report a Relic event to the hub. Only `shooter.wave_clear` is sent, and only with a hub session;
   * standalone play and any other event id do nothing. Resolves `{ granted }` when the hub granted a
   * Relic, `{}` otherwise. Never throws into the game: a failure is logged and resolves `{}`.
   */
  async reportEvent(eventId, data, key) {
    if (!this.bankable || !CLIENT_EVENTS.has(eventId) || typeof this.api.reportEvent !== 'function') return {};
    const playerId = this.playerId;
    try {
      const result = await this.api.reportEvent(eventId, data, key);
      if (this.playerId !== playerId) return {};
      return result && typeof result.granted === 'string' ? { granted: result.granted } : {};
    } catch (err) {
      this.noteSessionError(err);
      console.warn(`[hub] ${eventId} report failed: ${errorCode(err)}`);
      return {};
    }
  }

  /**
   * Leave for the hub. A live session is closed first. Standalone play still
   * navigates, because the SDK's exit only leaves when a session is open.
   */
  exitHub() {
    let delegated = false;
    try {
      if (this.bankable) {
        this.api.exit('return');
        delegated = true;
      }
    } catch { /* still leave */ }
    this.dropIdentity();
    this.markOffline();
    if (!delegated) redirectToHub();
  }
}

/** Redeem `#t=` once, or resume a cached session. Never throws. */
export async function connectHub(api) {
  let sdk = api;
  try {
    if (!sdk) sdk = createBrowserSdk();
  } catch (err) {
    const link = new HubLink({ exit() {}, getTicketBalance: async () => null });
    link.fail(err);
    return link;
  }
  const link = new HubLink(sdk);
  try {
    await sdk.init(HUB_GAME_ID);
    const profileError = typeof sdk.profileGetError === 'function' ? sdk.profileGetError() : null;
    if (profileError) {
      link.fail(profileError);
      return link;
    }
    const session = typeof sdk.getSession === 'function' ? sdk.getSession() : null;
    if (!session || !session.playerId || session.game !== HUB_GAME_ID) {
      link.markOffline();
      return link;
    }
    const expiresAt = Number(session.expiresAt) || 0;
    if (expiresAt && expiresAt <= Date.now()) {
      link.fail(new Error('session_expired'));
      link.dropIdentity();
      return link;
    }
    link.adopt(session, usernameFromToken(session.token));
    await link.flushCloud();
  } catch (err) {
    link.fail(err);
  }
  return link;
}

export function nakamaUrl() {
  return (import.meta.env.VITE_NAKAMA_URL || 'http://127.0.0.1:7350').replace(/\/$/, '');
}

function createBrowserSdk() {
  const nakama = createNakamaClient({
    serverUrl: nakamaUrl(),
    serverKey: pageServerKey(),
  });
  const watched = watchProfileGet(nakama);
  const sdk = createHubSdk({
    client: watched.client,
    serverUrl: nakamaUrl(),
    serverKey: pageServerKey(),
    hubUrl: hubPageUrl(),
    assign: () => redirectToHub(),
  });
  sdk.profileGetError = watched.profileGetError;
  return sdk;
}

function redirectToHub() {
  if (typeof window === 'undefined') return;
  window.location.assign(hubExitUrl());
}
