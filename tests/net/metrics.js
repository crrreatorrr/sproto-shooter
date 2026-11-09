// Netcode metrics for the harness. Everything is derived from what the real director returns
// and what the real clients receive; the director and sim are only observed, never edited.
import { decodeInput } from '../../src/net/inputCodec.js';
import { OP } from '../../src/net/protocol.js';
import { hashState } from '../../src/sim/pvp/sim.js';

const OP_NAMES = Object.fromEntries(Object.entries(OP).map(([name, code]) => [code, name]));

export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[rank];
}

function round(n, places = 4) {
  if (n == null || !Number.isFinite(n)) return n;
  const k = 10 ** places;
  return Math.round(n * k) / k;
}

function summary(values) {
  return {
    count: values.length,
    p50: round(percentile(values, 50), 2),
    p95: round(percentile(values, 95), 2),
    p99: round(percentile(values, 99), 2),
    max: values.length ? round(Math.max(...values), 2) : null,
  };
}

function blankPeer() {
  return {
    inputsSent: 0,
    inputsDroppedWhileDown: 0,
    inputsAccepted: 0,
    acceptedFrames: new Set(),
    firstInputCursor: null,
    rejects: {},
    rejectsByOp: {},
    lateRejects: 0,
    lateDiscards: 0,
    snapshotArrivals: [],
    renderFrames: 0,
    heldFrames: 0,
    lateFrames: 0,
    starvedFrames: 0,
    extrapolatedFrames: 0,
    clientHeldFrames: 0,
    net: null,
    leadTrace: [],
    aheadSamples: [],
    lastViewKey: null,
    disconnects: [],
    rejoins: [],
    joinRefusals: [],
    acceptedAfterRejoin: 0,
    rejectsAfterRejoin: {},
  };
}

export function createMetrics({ accounts = ['ada', 'bea'], starveMs = 150 } = {}) {
  // Keyed by peer (account order), not by director seat: seats go to whoever says HELLO first.
  const stats = accounts.map(() => blankPeer());
  const loops = [];
  let liveAt = null;
  // Stubs for S3. Prediction corrections are in metres; rewind checks are per confirmed shot.
  const corrections = [[], []];
  const rewindChecks = { checks: 0, agree: 0 };
  // S2b detail: what the client claimed, what the director applied, and agreement at the claim.
  const rewindClaims = { claims: [], applied: [], clamped: 0, unclampedChecks: 0, unclampedAgree: 0 };

  function bump(map, key) {
    map[key] = (map[key] || 0) + 1;
  }

  return {
    /** Wrap the director's handle so every server verdict is recorded. */
    watchDirector(director) {
      const handle = director.handle;
      director.handle = (sender, op, data, now) => {
        const cursor = director.sim ? director.sim.tick : null;
        const out = handle(sender, op, data, now);
        const index = sender ? accounts.indexOf(sender.userId) : -1;
        if (index < 0) return out;
        const seat = stats[index];
        const rejoined = seat.rejoins.length > 0;
        let frame = null;
        if (op === OP.INPUT && data instanceof Uint8Array) {
          try { frame = decodeInput(data).frame; } catch { frame = null; }
          if (seat.firstInputCursor == null && cursor != null) seat.firstInputCursor = cursor;
        }
        if (out && out.ok === false) {
          bump(seat.rejects, out.reason);
          bump(seat.rejectsByOp, `${OP_NAMES[op] || op}:${out.reason}`);
          if (rejoined) bump(seat.rejectsAfterRejoin, out.reason);
          if (op === OP.INPUT && out.reason === 'frame' && frame != null && cursor != null && frame < cursor) {
            seat.lateRejects += 1;
          }
        } else if (out && out.ok && op === OP.INPUT) {
          seat.inputsAccepted += 1;
          // Protocol 2: a late frame is accepted and discarded. It never reaches the sim.
          if (out.late) seat.lateDiscards += 1;
          else if (frame != null) seat.acceptedFrames.add(frame);
          // How far ahead of the server's cursor this input arrived: the real input buffer.
          if (frame != null && cursor != null && liveAt != null) seat.aheadSamples.push([round(now - liveAt, 1), frame - cursor]);
          if (rejoined) seat.acceptedAfterRejoin += 1;
        }
        return out;
      };
    },
    live(at) { liveAt = at; },
    loopRan(at) { loops.push(at); },
    inputSent(index) { stats[index].inputsSent += 1; },
    sendWhileDown(index) { stats[index].inputsDroppedWhileDown += 1; },
    snapshotArrived(index, at) { stats[index].snapshotArrivals.push(at); },
    /**
     * One client render frame. `viewKey` identifies what the client would draw (sample tick and
     * player positions). A frame is starved when the view did not move on since the last frame
     * (held), or when the newest snapshot is older than `starveMs` (it would have to extrapolate).
     */
    renderFrame(index, at, viewKey, mode = null) {
      const seat = stats[index];
      seat.renderFrames += 1;
      // What the client itself reports (S1 clock interpolation): past the newest snapshot.
      if (mode === 'extrap') seat.extrapolatedFrames += 1;
      if (mode === 'hold') seat.clientHeldFrames += 1;
      const last = seat.snapshotArrivals[seat.snapshotArrivals.length - 1];
      const since = last == null ? at - (liveAt ?? at) : at - last;
      const held = viewKey != null && viewKey === seat.lastViewKey;
      seat.lastViewKey = viewKey;
      if (held) seat.heldFrames += 1;
      if (since > starveMs) seat.lateFrames += 1;
      if (held || since > starveMs) seat.starvedFrames += 1;
    },
    /** The client's own timing state (lead, RTT, clock), last value wins. */
    clientNet(index, net, at = null) {
      const seat = stats[index];
      seat.net = net ? { ...net } : null;
      // Lead changes over time ([ms since live start, lead]), for the RTT-spike test.
      const last = seat.leadTrace[seat.leadTrace.length - 1];
      if (net && at != null && liveAt != null && (!last || last[1] !== net.lead)) {
        seat.leadTrace.push([round(at - liveAt, 1), net.lead]);
      }
    },
    disconnected(index, at, sessionId) { stats[index].disconnects.push({ at, sessionId }); },
    rejoined(index, at, sessionId) { stats[index].rejoins.push({ at, sessionId }); },
    joinRefused(index, reason) { stats[index].joinRefusals.push(reason); },
    /** S3 hook: record one prediction correction, in metres. */
    correction(index, metres) { corrections[index].push(metres); },
    /**
     * S2b/S3 hook: did the server's rewound hit test agree with what the shooter saw? How much
     * this measures depends on the check that feeds it: a check that casts both rays from the
     * same (server) eye only compares target positions, so it mostly measures whether the
     * shooter's rewind claim survived the director's clamp.
     */
    rewindCheck(agree) {
      rewindChecks.checks += 1;
      if (agree) rewindChecks.agree += 1;
    },
    /** S2b detail for one check: claimed and applied rewind (ticks), and agreement had the claim not been clamped. */
    rewindClaim(claim, applied, agreeUnclamped) {
      rewindClaims.claims.push(claim);
      rewindClaims.applied.push(applied);
      if (applied < claim) rewindClaims.clamped += 1;
      if (agreeUnclamped != null) {
        rewindClaims.unclampedChecks += 1;
        if (agreeUnclamped) rewindClaims.unclampedAgree += 1;
      }
    },

    report({ director, links = [], endedAt = null, clocks = [], server = null, options = {} } = {}) {
      const ticks = director.sim ? director.sim.tick : 0;
      const result = director.result;
      const loopGaps = loops.slice(1).map((t, i) => t - loops[i]);
      return {
        options,
        liveAt,
        endedAt,
        ticks,
        stateHash: director.sim ? hashState(director.sim) : null,
        result: result
          ? { outcome: result.outcome, winner: result.winner, reason: result.reason, tick: result.tick }
          : null,
        stallForfeits: result && result.reason === 'stall' ? 1 : 0,
        bothStalled: result && result.reason === 'both_stall' ? 1 : 0,
        loopGap: summary(loopGaps),
        links,
        clocks,
        server,
        peers: stats.map((seat, index) => {
          // Queued: frames the director accepted into its input queue for a tick it has since
          // stepped. Director v1 applies exactly what it queued, so this is the input it applied.
          // Director v2 can queue a frame and still not apply it (a resent frame replaces it, a
          // frame queued past the final tick never runs): directorApplied is what it applied.
          const queued = [...seat.acceptedFrames].filter((frame) => frame < ticks).length;
          // Ticks before this peer's first input reached the server can never carry its input:
          // the match goes live before any client hears about it. Steady state starts there.
          const reach = seat.firstInputCursor == null ? ticks : seat.firstInputCursor;
          const steady = [...seat.acceptedFrames].filter((frame) => frame >= reach && frame < ticks).length;
          const arrivals = seat.snapshotArrivals.filter((at) => liveAt == null || at >= liveAt);
          const gaps = arrivals.slice(1).map((t, i) => t - arrivals[i]);
          const rejectTotal = Object.values(seat.rejects).reduce((a, b) => a + b, 0);
          const seatNo = director.seatOf(accounts[index]);
          const used = seatNo >= 0 && director.seatStats ? director.seatStats(seatNo) : null;
          return {
            accountId: accounts[index],
            seat: seatNo,
            // What the director itself applied: real input, held repeats, neutral ticks.
            directorApplied: used ? used.applied : null,
            directorAppliedFraction: used && ticks ? round(used.applied / ticks) : null,
            directorHeld: used ? used.held : null,
            directorNeutral: used ? used.neutral : null,
            // S2b: inputs whose view claim broke continuity (went back, or moved > 2 ticks).
            directorViewClamped: used && used.viewClamped != null ? used.viewClamped : null,
            inputsSent: seat.inputsSent,
            inputsDroppedWhileDown: seat.inputsDroppedWhileDown,
            inputsAccepted: seat.inputsAccepted,
            queuedTicks: queued,
            queuedFraction: ticks ? round(queued / ticks) : 0,
            firstInputCursor: seat.firstInputCursor,
            steadyQueuedFraction: ticks > reach ? round(steady / (ticks - reach)) : 0,
            rejects: { ...seat.rejects },
            rejectsByOp: { ...seat.rejectsByOp },
            rejectTotal,
            lateRejects: seat.lateRejects,
            lateDiscards: seat.lateDiscards,
            // Late = arrived below the cursor: rejected (protocol 1) or accepted-and-discarded (2).
            lateFraction: seat.inputsSent ? round((seat.lateRejects + seat.lateDiscards) / seat.inputsSent) : 0,
            rejectFraction: seat.inputsSent ? round(rejectTotal / seat.inputsSent) : 0,
            snapshotInterArrivalMs: summary(gaps),
            renderFrames: seat.renderFrames,
            heldFrames: seat.heldFrames,
            snapshotLateFrames: seat.lateFrames,
            starvedFrames: seat.starvedFrames,
            starvedFraction: seat.renderFrames ? round(seat.starvedFrames / seat.renderFrames) : 0,
            extrapolatedFrames: seat.extrapolatedFrames,
            clientHeldFrames: seat.clientHeldFrames,
            // Client-reported starvation: frames drawn past the newest snapshot (extrapolated or held).
            clientStarvedFraction: seat.renderFrames
              ? round((seat.extrapolatedFrames + seat.clientHeldFrames) / seat.renderFrames)
              : 0,
            net: seat.net,
            leadTrace: seat.leadTrace,
            aheadSamples: seat.aheadSamples,
            disconnects: seat.disconnects.length,
            rejoins: seat.rejoins.length,
            joinRefusals: [...seat.joinRefusals],
            acceptedAfterRejoin: seat.acceptedAfterRejoin,
            rejectsAfterRejoin: { ...seat.rejectsAfterRejoin },
            // Stub until S3 adds client prediction: no samples today.
            correctionP99Cm: corrections[index].length
              ? round(percentile(corrections[index], 99) * 100, 2)
              : null,
          };
        }),
        // S2b: the harness checks each applied firing input (tests/net/netsim.js rewindCheck).
        rewind: {
          checks: rewindChecks.checks,
          agreement: rewindChecks.checks ? round(rewindChecks.agree / rewindChecks.checks) : null,
          claimTicks: summary(rewindClaims.claims),
          appliedTicks: summary(rewindClaims.applied),
          clampedFraction: rewindClaims.claims.length ? round(rewindClaims.clamped / rewindClaims.claims.length) : null,
          unclampedAgreement: rewindClaims.unclampedChecks
            ? round(rewindClaims.unclampedAgree / rewindClaims.unclampedChecks)
            : null,
        },
      };
    },
  };
}
