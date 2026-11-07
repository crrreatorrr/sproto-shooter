// Stable state hash for the campaign baseline. FNV-1a of canonical JSON, events omitted.

/** Canonical JSON: object keys sorted, undefined dropped, non-finite numbers become null. */
export function stableStringify(value) {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  if (t === 'string' || t === 'boolean') return JSON.stringify(value);
  if (t !== 'object') return 'null';
  if (Array.isArray(value)) {
    let s = '[';
    for (let i = 0; i < value.length; i++) {
      if (i) s += ',';
      s += stableStringify(value[i]);
    }
    return s + ']';
  }
  const keys = Object.keys(value).sort();
  let s = '{';
  let n = 0;
  for (const k of keys) {
    const v = value[k];
    if (v === undefined) continue;
    if (n++) s += ',';
    s += JSON.stringify(k) + ':' + stableStringify(v);
  }
  return s + '}';
}

/** 32-bit FNV-1a, returned as 8 hex chars. */
export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Hash of `state` minus `events` (and any extra `omit` keys).
 * Static level runtime data is not on `state`, so it never enters the hash.
 * @param {object} state
 * @param {{ omit?: string[] }} [opt]
 */
export function stateHash(state, opt = {}) {
  const omit = opt.omit || ['events'];
  const copy = { ...state };
  for (const k of omit) delete copy[k];
  if (!omit.includes('events')) delete copy.events;
  return fnv1a(stableStringify(copy));
}
