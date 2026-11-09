import { describe, expect, it } from 'vitest';
import { freeJoinTarget, labelIsFreePlay } from '../src/hub/freePlay.js';
import { freeMatchmakerRequest } from '../src/net/client.js';

describe('find free match', () => {
  it('joins the authoritative match id the hub returns', () => {
    expect(freeJoinTarget(null)).toBeNull();
    expect(freeJoinTarget({})).toBeNull();
    expect(freeJoinTarget({ token: 'relay-token' })).toEqual({ token: 'relay-token' });
    expect(freeJoinTarget({ matchId: 'match-1', token: 'relay-token' })).toEqual({ matchId: 'match-1' });
  });

  it('accepts only a free label with no stake', () => {
    const free = JSON.stringify({
      kind: 'sproto_shooter_free', game: 'sproto-shooter', mode: 'free', stake: 0, protocol: 2, sim: 2,
    });
    expect(labelIsFreePlay(free)).toBe(true);
    expect(labelIsFreePlay({ mode: 'free', stake: 0 })).toBe(true);
    expect(labelIsFreePlay({ mode: 'wager', stake: 10 })).toBe(false);
    expect(labelIsFreePlay({ mode: 'free', stake: 10 })).toBe(false);
    expect(labelIsFreePlay(null)).toBe(false);
    expect(labelIsFreePlay('not-json')).toBe(false);
  });

  it('queues protocol 2 sim 2 free play and not a wager', () => {
    const ticket = freeMatchmakerRequest();
    expect(ticket.minCount).toBe(2);
    expect(ticket.maxCount).toBe(2);
    expect(ticket.stringProperties).toMatchObject({
      game: 'sproto-shooter', mode: 'free', protocol: '2', sim: '2',
    });
    expect(ticket.stringProperties.stake).toBeUndefined();
    expect(ticket.query).toContain('+properties.mode:free');
    expect(ticket.query).not.toContain('mode:wager');
  });
});
