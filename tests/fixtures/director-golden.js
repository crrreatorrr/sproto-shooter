// SHOOTER-S2a director golden: a scripted two-client session against the real director, with a
// lead-in, jittered and stalled uplinks (late frames), a resent frame, a frame past the window,
// a disconnect and a rejoin on a new session id, pings, and a stall forfeit at the end.
//
// Plain script, no imports: Node (vm), goja and Chromium load it after the PvP bundle and call
// directorGolden(SprotoShooterPvp, opts). Vitest imports it for its side effect. The script
// uses only exactly rounded arithmetic (no Math.sin and friends), so it cannot drift between
// runtimes by itself; only the bundle can.
//
// opts.thaw: freeze and thaw the director (exportState -> JSON -> restoreDirector) after every
// call, the way the hub runs it per Nakama callback. opts.record: include the replay record.
(function install(root) {
  function directorGolden(api, opts) {
    var options = opts || {};
    var STEP = 1000 / 30;
    var OP = api.OP;
    var director = api.createDirector({ seed: 4242, matchId: 'golden' });
    var counts = {};
    var rejects = {};
    var late = 0;

    function thaw() {
      if (options.thaw) director = api.restoreDirector(JSON.parse(JSON.stringify(director.exportState())));
    }

    function note(out) {
      if (out && out.late) late += 1;
      var messages = (out && out.messages) || [];
      for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];
        var key = msg.op + ':' + (msg.to ? msg.to.userId : '*');
        counts[key] = (counts[key] || 0) + 1;
        if (msg.op === OP.REJECT) rejects[msg.body.reason] = (rejects[msg.body.reason] || 0) + 1;
      }
      return out;
    }

    function handle(userId, sessionId, op, data, now) {
      var out = director.handle({ userId: userId, sessionId: sessionId }, op, data, now);
      thaw();
      return note(out);
    }

    function advance(now) {
      var out = director.advance(now);
      thaw();
      return note(out);
    }

    function hello(id) {
      return JSON.stringify({
        accountId: id,
        protocol: api.PVP_PROTOCOL_VERSION,
        sim: api.PVP_SIM_VERSION,
        content: api.CONTENT_FINGERPRINT,
      });
    }

    // Two clients. Inputs travel a FIFO uplink: arrival loop = max(previous arrival, send + delay).
    var seats = [
      { id: 'ada', session: 'sa', seq: 0, lead: 3, delay: 2, queue: [], last: 0, silent: false, down: false },
      { id: 'bea', session: 'sb', seq: 0, lead: 2, delay: 1, queue: [], last: 0, silent: false, down: false },
    ];

    function push(seat, k, delay, op, data) {
      var at = Math.max(seat.last, k + delay);
      seat.last = at;
      seat.queue.push({ at: at, op: op, data: data, session: seat.session });
    }

    function wishFor(index, k, frame) {
      var sim = director.sim;
      var me = sim ? sim.players[index] : null;
      var strafe = ((k >> 4) & 1) === 1 ? 1 : -1;
      if (index === 0) {
        return {
          seq: 0, frame: frame,
          yaw: me ? me.yaw : 0, pitch: (k % 20) * 0.01,
          moveX: strafe, moveZ: 0.5,
          fire: true, zoom: k % 60 < 40, sprint: false,
          jump: k % 45 === 0, dash: k % 97 === 0, reload: k % 150 === 0, slide: false,
          slot: k === 400 ? 2 : -1,
        };
      }
      return {
        seq: 0, frame: frame,
        yaw: me ? me.yaw : 0, pitch: 0,
        moveX: -strafe, moveZ: 1,
        fire: k % 3 === 0, zoom: false, sprint: k % 50 < 25,
        jump: k % 61 === 0, dash: false, reload: false, slide: false,
        slot: k === 150 ? 1 : -1,
      };
    }

    function sendInput(index, k, frame, delay) {
      var seat = seats[index];
      seat.seq += 1;
      var wish = wishFor(index, k, frame);
      wish.seq = seat.seq;
      if (seat.down) return;
      push(seat, k, delay, OP.INPUT, api.encodeInput(wish));
    }

    var t0 = 20;
    handle('ada', 'sa', OP.HELLO, hello('ada'), 0);
    handle('bea', 'sb', OP.HELLO, hello('bea'), 5);
    handle('ada', 'sa', OP.READY, '{}', 10);
    handle('bea', 'sb', OP.READY, '{}', t0);
    var lead = director.leadInTicks;

    for (var k = 1; k <= 1500 && director.phase !== 'done'; k++) {
      var now = t0 + k * STEP;
      // Client side for loop k: the server clock reads k - lead ticks.
      var clock = k - lead;
      for (var i = 0; i < 2; i++) {
        var seat = seats[i];
        if (seat.silent) continue;
        var frame = clock + seat.lead;
        if (frame < 0) continue;
        var delay = seat.delay;
        if (i === 0 && k % 37 === 0) delay += 4;
        if (i === 1 && k >= 100 && k < 112) delay = 112 - k;
        sendInput(i, k, frame, delay);
      }
      if (k === 50 || k === 400) push(seats[0], k, 2, OP.PING, JSON.stringify({ t: k }));
      if (k === 300) {
        // A resent frame: higher seq, same frame. The newer one replaces the queued one.
        seats[0].seq += 1;
        var again = wishFor(0, k, clock + seats[0].lead);
        again.seq = seats[0].seq;
        again.moveZ = -1;
        push(seats[0], k, 2, OP.INPUT, api.encodeInput(again));
      }
      if (k === 320) {
        seats[1].seq += 1;
        var far = wishFor(1, k, clock + 40);
        far.seq = seats[1].seq;
        push(seats[1], k, 1, OP.INPUT, api.encodeInput(far));
      }
      if (k === 200) {
        // bea's socket resets: in-flight data is lost, the server sees the leave.
        seats[1].down = true;
        seats[1].queue = [];
        seats[1].last = k;
        director.disconnect('bea', 'sb');
        thaw();
      }
      if (k === 245) {
        seats[1].down = false;
        seats[1].session = 'sb2';
        handle('bea', 'sb', OP.RESYNC, '{}', now);
        push(seats[1], k, 1, OP.HELLO, hello('bea'));
      }
      if (k === 600) seats[1].silent = true;

      // Server loop k: deliver what has arrived, in order, then advance.
      for (var s = 0; s < 2; s++) {
        var q = seats[s].queue;
        while (q.length && q[0].at <= k) {
          var msg = q.shift();
          handle(seats[s].id, msg.session, msg.op, msg.data, now);
        }
      }
      advance(now);
    }

    var record = director.replayRecord();
    var replay = JSON.parse(api.replayJSON(JSON.stringify(record)));
    var result = director.result || {};
    var out = {
      phase: director.phase,
      tick: result.tick,
      stateHash: result.stateHash,
      outcome: result.outcome,
      winner: result.winner,
      reason: result.reason,
      counts: counts,
      rejects: rejects,
      late: late,
      seats: [director.seatStats(0), director.seatStats(1)],
      replay: { verified: replay.verified, tick: replay.tick, stateHash: replay.stateHash },
    };
    if (options.record) out.record = record;
    return out;
  }

  root.directorGolden = directorGolden;
}(globalThis));
