import { createHubSdk } from '@metaverse/hub-sdk';
import { HUB_GAME_ID } from './config.js';
import { pageServerKey } from './serverKey.js';

/** Written by the SDK when a portal ticket or a cached visit is live. */
const HUB_SESSION_KEY = `hub:${HUB_GAME_ID}:session`;

/**
 * One hub visit. Standalone play (no portal ticket, no saved session) stays offline:
 * the game still runs, and it does not read or write Tickets.
 */
export class HubLink {
  constructor(api) {
    this.api = api;
    this.connected = false;
    this.balance = null;
    this.error = null;
    this.balanceJob = null;
    this.balanceAt = -Infinity;
  }

  attach(session) {
    this.connected = session !== null;
    this.error = null;
  }

  fail(err) {
    this.connected = false;
    this.balance = null;
    this.error = err instanceof Error ? err.message : String(err);
  }

  /**
   * Ticket balance for the title chip. Standalone visits do nothing.
   * At most one read in flight and one per `minGapMs`.
   */
  refreshBalance(minGapMs = 30_000) {
    if (!this.connected) return Promise.resolve(null);
    if (this.balanceJob) return this.balanceJob;
    if (this.balance !== null && performance.now() - this.balanceAt < minGapMs) return Promise.resolve(this.balance);
    this.balanceJob = this.api.getTicketBalance()
      .then((r) => {
        if (Number.isFinite(r.balance)) this.balance = r.balance;
        return this.balance;
      })
      .catch(() => this.balance)
      .finally(() => {
        this.balanceAt = performance.now();
        this.balanceJob = null;
      });
    return this.balanceJob;
  }

  /**
   * Leave for the hub. A live session is closed first. Standalone play still navigates,
   * because the SDK's exit only leaves when a session is open.
   */
  exitHub() {
    const sdkNavigates = this.connected;
    try { this.api.exit('return'); } catch { /* still leave */ }
    if (!sdkNavigates) redirectToHub();
  }
}

/** Redeem `#t=` when the fragment has one, or resume a cached session. Never throws. */
export async function connectHub(api) {
  const sdk = api ?? createBrowserSdk();
  const link = new HubLink(sdk);
  try {
    const profile = await sdk.init(HUB_GAME_ID);
    link.attach(hubSessionPresent() ? profile : null);
  } catch (err) {
    link.fail(err);
  }
  return link;
}

function nakamaUrl() {
  return (import.meta.env.VITE_NAKAMA_URL || 'http://127.0.0.1:7350').replace(/\/$/, '');
}

function createBrowserSdk() {
  return createHubSdk({
    serverUrl: nakamaUrl(),
    serverKey: pageServerKey(),
    hubUrl: hubPageUrl(),
    assign: () => redirectToHub(),
  });
}

/** Build-time hub page, without a hash. Dev default is same-origin `/hub/`. */
export function hubPageUrl() {
  const configured = import.meta.env.VITE_HUB_URL?.trim();
  return configured ? configured.split('#')[0] : '/hub/';
}

/** `/hub/#from=sproto-shooter`, or the configured hub page plus that hash. */
export function hubExitUrl() {
  return `${hubPageUrl().replace(/\/$/, '')}/#from=${HUB_GAME_ID}`;
}

function redirectToHub() {
  if (typeof window === 'undefined') return;
  window.location.assign(hubExitUrl());
}

function hubSessionPresent() {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(HUB_SESSION_KEY) !== null;
  } catch {
    return false;
  }
}
