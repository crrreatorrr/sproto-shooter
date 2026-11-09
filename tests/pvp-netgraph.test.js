// SHOOTER-S3 dev net graph: shown in dev builds or with ?netgraph=1, fed by client.netGraph().
import { describe, expect, it } from 'vitest';
import { formatNetGraph, netGraphEnabled } from '../src/render/pvp/netgraph.js';
import { createLoopbackTable, createPvpClient } from '../src/net/client.js';
import { createDirector } from '../src/sim/pvp/director.js';
import { STEP_MS } from '../src/sim/pvp/rules.js';

describe('net graph (SHOOTER-S3)', () => {
  it('is on in dev builds or with ?netgraph=1 only', () => {
    expect(netGraphEnabled(false, '')).toBe(false);
    expect(netGraphEnabled(false, '?pvpMock=1')).toBe(false);
    expect(netGraphEnabled(false, '?netgraph=1')).toBe(true);
    expect(netGraphEnabled(true, '')).toBe(true);
    expect(netGraphEnabled(true, '?netgraph=0')).toBe(false);
  });

  it('shows RTT, jitter, buffer, late %, correction p50/p99, interp D, rewind and starved %', () => {
    const director = createDirector({ spawnSeed: 7, matchId: 'graph' });
    let now = 0;
    const table = createLoopbackTable(director, () => now);
    const ada = createPvpClient({ accountId: 'ada', match: table.open('ada', 'a'), clock: () => now });
    const bea = createPvpClient({ accountId: 'bea', match: table.open('bea', 'b'), clock: () => now });
    ada.ready();
    bea.ready();
    for (let i = 0; i < 240; i++) {
      now += STEP_MS / 2;
      table.advance(now);
      ada.sample(now);
      ada.update(now, () => ({ yaw: 0, moveZ: 1, fire: true }));
      bea.update(now, () => ({ yaw: 0 }));
    }
    const graph = ada.netGraph(now);
    for (const key of ['rttMs', 'jitterMs', 'buffer', 'latePct', 'correctionP50Cm', 'correctionP99Cm', 'interpMs', 'rewindMs', 'rewindCapMs', 'starvedPct']) {
      expect(graph[key], key).not.toBeNull();
      expect(Number.isFinite(graph[key]), key).toBe(true);
    }
    const text = formatNetGraph(graph).join('\n');
    for (const word of ['RTT', 'jitter', 'buffer', 'late', 'correction p50', 'p99', 'interp D', 'rewind', 'starved']) expect(text).toContain(word);
    // Predicted shots are cosmetic and immediate: the client saw its own shots before any hit event.
    expect(ada.shots.length).toBeGreaterThan(0);
    expect(formatNetGraph(null)).toEqual(['net —']);
  });
});
