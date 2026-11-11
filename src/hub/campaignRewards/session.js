import { UUID } from './clientProtocol.js';
import { recorderError } from './storage.js';

// Local binding hint only. Backend authentication/session SQL remains authority.
export function campaignSessionBinding(session) {
  if (!session || session.game !== 'sproto-shooter' || !UUID.test(session.playerId)
    || typeof session.token !== 'string' || session.token.length > 32768) throw recorderError('not_game_session');
  let claims;
  try {
    const payload = session.token.split('.')[1];
    claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch { throw recorderError('not_game_session'); }
  if (claims.uid !== session.playerId || claims.vrs?.scope !== 'game' || claims.vrs?.game !== 'sproto-shooter'
    || !UUID.test(claims.vrs?.sid)) throw recorderError('not_game_session');
  return Object.freeze({ accountId: session.playerId, sessionId: claims.vrs.sid });
}

// Opt-in build configuration only. No URL/query/localStorage switch and no
// production settings changed here. Server cohort/readiness still decides.
export const REWARDED_CAMPAIGN_ENABLED = import.meta.env.VITE_SHOOTER_REWARDED === 'true';
