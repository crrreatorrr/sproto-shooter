// Nakama's client server key. Ticket redeem sends it as Basic auth. It is not the
// runtime HTTP key and not a secret. A production build takes VITE_NAKAMA_SERVER_KEY,
// or every redeem is refused and the game runs without a hub session.
// `vite dev` falls back to Nakama's stock key, and so does a page opened on loopback.

export const LOCAL_SERVER_KEY = 'defaultkey';

const LOOPBACK_HOST = /^(localhost|[\w-]+\.localhost|127(?:\.\d{1,3}){3}|\[::1\]|::1)$/i;

export function nakamaServerKey({ envKey, dev, hostname } = {}) {
  if (envKey) return envKey;
  if (dev) return LOCAL_SERVER_KEY;
  return LOOPBACK_HOST.test(String(hostname ?? '')) ? LOCAL_SERVER_KEY : '';
}

/** The key for this page. */
export function pageServerKey() {
  return nakamaServerKey({
    envKey: import.meta.env.VITE_NAKAMA_SERVER_KEY,
    dev: import.meta.env.DEV,
    hostname: typeof location !== 'undefined' ? location.hostname : '',
  });
}
