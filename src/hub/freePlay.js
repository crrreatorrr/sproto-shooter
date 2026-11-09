// Find free match. The hub's H3-S handler creates the authoritative match and
// sends matchmaker matched. This module only decides which socket to join.
// A wager label is refused. Nothing here moves Tickets.

function readLabel(label) {
  if (!label) return null;
  if (typeof label === 'object') return label;
  try {
    const body = JSON.parse(label);
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

/** Join target from a matchmaker matched payload. matchId wins over a token. */
export function freeJoinTarget(matched) {
  if (!matched || typeof matched !== 'object') return null;
  if (typeof matched.matchId === 'string' && matched.matchId) return { matchId: matched.matchId };
  if (typeof matched.token === 'string' && matched.token) return { token: matched.token };
  return null;
}

/** True only for the free 1v1 label (mode free, stake 0). A wager label is not free play. */
export function labelIsFreePlay(label) {
  const body = readLabel(label);
  if (!body || body.mode !== 'free') return false;
  const stake = Number(body.stake);
  return body.stake == null || stake === 0;
}
