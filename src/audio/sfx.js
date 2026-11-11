// Synthesized placeholder SFX via WebAudio. Presentation-side randomness is fine here.
export function createAudio(bus) {
  let ctx = null, master = null, comp = null;
  const recent = new Map();
  let muted = false;
  const volumes = { master: 1, music: 1, sfx: 1 };
  function applyGain() {
    if (master) master.gain.value = 0.35 * volumes.master * volumes.sfx;
  }

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      const AC = window.AudioContext || /** @type {typeof AudioContext} */ (/** @type {any} */ (window).webkitAudioContext);
      ctx = new AC();
      comp = ctx.createDynamicsCompressor();
      master = ctx.createGain();
      applyGain();
      master.connect(comp); comp.connect(ctx.destination);
      return true;
    } catch { return false; }
  }

  function throttle(name, max = 4, win = 50) {
    const now = performance.now();
    const arr = (recent.get(name) || []).filter((t) => now - t < win);
    if (arr.length >= max) return false;
    arr.push(now); recent.set(name, arr);
    return true;
  }

  function tone({ freq = 440, end = freq, dur = 0.1, type = 'square', vol = 0.3, delay = 0 }) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  let noiseBuf = null;
  function noise({ dur = 0.15, vol = 0.3, freq = 1200, q = 1, type = 'lowpass', end = null, delay = 0 }) {
    if (!ctx || muted) return;
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (end) f.frequency.exponentialRampToValueAtTime(end, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  const j = (x, amt = 0.08) => x * (1 + (Math.random() * 2 - 1) * amt);

  const SFX = {
    shot(ev) {
      if (!throttle('shot', 3)) return;
      const zip = ev.manufacturer === 'zippity' ? 1.3 : ev.manufacturer === 'blastco' ? 0.8 : 1;
      if (ev.mega) { tone({ freq: 200, end: 40, dur: 0.4, type: 'sawtooth', vol: 0.5 }); noise({ dur: 0.4, vol: 0.5, freq: 900 }); return; }
      switch (ev.gunType) {
        case 'mg': noise({ dur: 0.06, vol: 0.25, freq: j(2600 * zip) }); tone({ freq: j(220 * zip), end: 90, dur: 0.06, vol: 0.12 }); break;
        case 'shotgun': noise({ dur: 0.25, vol: 0.5, freq: j(1400 * zip), end: 200 }); tone({ freq: 110, end: 40, dur: 0.2, type: 'sine', vol: 0.4 }); break;
        case 'sniper': noise({ dur: 0.35, vol: 0.45, freq: j(3200), end: 300 }); tone({ freq: 900, end: 60, dur: 0.3, type: 'sawtooth', vol: 0.2 }); break;
        case 'bazooka': noise({ dur: 0.3, vol: 0.4, freq: 600, end: 150 }); tone({ freq: 160, end: 60, dur: 0.3, type: 'triangle', vol: 0.3 }); break;
        // ray gun: a falling sci-fi "pew" with a bright overtone
        case 'raygun': tone({ freq: j(1800), end: 420, dur: 0.12, type: 'sawtooth', vol: 0.16 }); tone({ freq: j(3600), end: 900, dur: 0.08, type: 'sine', vol: 0.1 }); break;
        // big bullets: a deep cannon thump
        case 'bigbullets': noise({ dur: 0.45, vol: 0.55, freq: 700, end: 90 }); tone({ freq: 90, end: 30, dur: 0.45, type: 'sine', vol: 0.55 }); break;
        // duck gun: a rubbery "thwonk" with a quack on top
        case 'duckgun': tone({ freq: j(240), end: 120, dur: 0.16, type: 'triangle', vol: 0.4 }); tone({ freq: j(820), end: 560, dur: 0.12, type: 'square', vol: 0.14, delay: 0.03 }); noise({ dur: 0.12, vol: 0.2, freq: 1200, end: 300 }); break;
      }
    },
    damage(ev) {
      if (ev.isWeak && throttle('bonk', 2, 60)) { tone({ freq: j(1100), end: 500, dur: 0.12, type: 'triangle', vol: 0.35 }); tone({ freq: 1650, end: 900, dur: 0.08, type: 'sine', vol: 0.2, delay: 0.02 }); }
      else if (ev.zone === 'shield' && throttle('tink', 2)) tone({ freq: 2400, end: 1800, dur: 0.05, type: 'square', vol: 0.12 });
      else if (throttle('hit', 3)) tone({ freq: j(500), end: 300, dur: 0.04, type: 'square', vol: 0.08 });
    },
    kill(ev) {
      if (ev.isDummy || !throttle('kill', 3)) return;
      tone({ freq: j(600), end: 1400, dur: 0.12, type: 'square', vol: 0.18 });
      noise({ dur: 0.18, vol: 0.2, freq: 5000, type: 'highpass' });
      if (ev.elite) tone({ freq: 880, end: 1760, dur: 0.25, type: 'triangle', vol: 0.25, delay: 0.08 });
    },
    explosion(ev) { if (!throttle('boom', 3, 80)) return; const big = ev.radius > 3; noise({ dur: big ? 0.7 : 0.4, vol: big ? 0.7 : 0.4, freq: 1500, end: 80 }); tone({ freq: 90, end: 30, dur: 0.5, type: 'sine', vol: 0.5 }); },
    playerDamaged(ev) { if (!throttle('hurt', 2, 120)) return; tone({ freq: ev.toHealth > 0 ? 180 : 320, end: 90, dur: 0.15, type: 'sawtooth', vol: 0.25 }); },
    shieldBroken() { tone({ freq: 900, end: 120, dur: 0.35, type: 'sawtooth', vol: 0.3 }); noise({ dur: 0.3, vol: 0.3, freq: 4000, type: 'highpass' }); },
    shieldRegenStart() { tone({ freq: 300, end: 900, dur: 0.4, type: 'sine', vol: 0.15 }); },
    jump() { tone({ freq: 300, end: 520, dur: 0.1, type: 'sine', vol: 0.12 }); },
    doubleJump() { tone({ freq: 500, end: 900, dur: 0.12, type: 'sine', vol: 0.15 }); },
    dash() { noise({ dur: 0.18, vol: 0.25, freq: 3000, end: 600, type: 'bandpass', q: 2 }); },
    slide() { noise({ dur: 0.4, vol: 0.15, freq: 900, type: 'bandpass', q: 1 }); },
    land(ev) { tone({ freq: 120, end: 50, dur: 0.1, type: 'sine', vol: Math.min(0.4, ev.speed / 40) }); },
    reloadStart() { tone({ freq: 700, end: 500, dur: 0.05, vol: 0.12 }); tone({ freq: 500, end: 700, dur: 0.05, vol: 0.12, delay: 0.15 }); },
    reloadEnd() { tone({ freq: 900, end: 1200, dur: 0.06, vol: 0.15 }); },
    swap() { tone({ freq: 400, end: 650, dur: 0.06, type: 'triangle', vol: 0.12 }); },
    ammoEmpty() { if (throttle('empty', 1, 300)) tone({ freq: 1800, end: 1700, dur: 0.03, vol: 0.12 }); },
    pickup(ev) {
      if (!throttle('pickup', 4, 40)) return;
      const f = { health: 660, bigHealth: 520, mana: 880, ammo: 440, resource: 1000, tickets: 1320, medkit: 600 }[ev.kind] || 700;
      tone({ freq: j(f, 0.03), end: f * 1.5, dur: 0.07, type: 'triangle', vol: 0.12 });
    },
    gunPickedUp(ev) { const leg = ev.quality === 'legendary'; tone({ freq: 500, end: 1000, dur: 0.15, type: 'square', vol: 0.15 }); if (leg) [0, 0.1, 0.2].forEach((d, i) => tone({ freq: 660 * (1 + i * 0.25), dur: 0.2, type: 'triangle', vol: 0.2, delay: d })); },
    cast(ev) {
      if (ev.spellId === 'gooBolt') { tone({ freq: 300, end: 120, dur: 0.2, type: 'sine', vol: 0.3 }); noise({ dur: 0.15, vol: 0.15, freq: 600 }); }
      if (ev.spellId === 'chainZap') { noise({ dur: 0.35, vol: 0.35, freq: 5000, type: 'highpass' }); tone({ freq: 1800, end: 200, dur: 0.3, type: 'sawtooth', vol: 0.18 }); }
      if (ev.spellId === 'swarm') [0, 0.06, 0.12, 0.18, 0.24].forEach((d) => tone({ freq: j(900, 0.2), end: 1400, dur: 0.08, type: 'square', vol: 0.12, delay: d }));
      if (ev.spellId === 'manaShield') tone({ freq: 200, end: 600, dur: 0.4, type: 'sine', vol: 0.25 });
      if (ev.spellId === 'meteor') tone({ freq: 2000, end: 100, dur: 1.0, type: 'sawtooth', vol: 0.3 });
    },
    meteorImpact() { noise({ dur: 1.2, vol: 0.9, freq: 1200, end: 50 }); tone({ freq: 60, end: 25, dur: 1, type: 'sine', vol: 0.7 }); },
    noMana() { if (throttle('nomana', 1, 400)) tone({ freq: 200, end: 150, dur: 0.15, type: 'square', vol: 0.12 }); },
    spellLocked() { if (throttle('locked', 1, 400)) tone({ freq: 150, end: 140, dur: 0.12, type: 'square', vol: 0.1 }); },
    levelUp() { [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'square', vol: 0.15, delay: i * 0.08 })); },
    perkUnlocked() { [784, 988, 1175].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.18, delay: 0.35 + i * 0.09 })); },
    craftComplete() { [440, 660, 880].forEach((f, i) => tone({ freq: f, dur: 0.1, type: 'square', vol: 0.12, delay: i * 0.05 })); },
    craftStart() { noise({ dur: 0.5, vol: 0.12, freq: 2500, type: 'bandpass', q: 4 }); },
    actionFailed() { tone({ freq: 220, end: 180, dur: 0.15, type: 'square', vol: 0.12 }); },
    purchase() { tone({ freq: 1200, end: 1800, dur: 0.08, type: 'triangle', vol: 0.15 }); tone({ freq: 1800, dur: 0.12, type: 'triangle', vol: 0.15, delay: 0.08 }); },
    sold() { tone({ freq: 1500, end: 900, dur: 0.12, type: 'triangle', vol: 0.15 }); },
    vend(ev) {
      for (let i = 0; i < 6; i++) tone({ freq: 400 + i * 120, dur: 0.05, vol: 0.1, delay: i * 0.05 });
      if (ev.outcome === 'chicken') tone({ freq: 1200, end: 2400, dur: 0.3, type: 'square', vol: 0.2, delay: 0.35 });
      else if (ev.outcome === 'jackpot') [0, 1, 2, 3].forEach((i) => tone({ freq: 1000 + i * 200, dur: 0.12, type: 'triangle', vol: 0.2, delay: 0.35 + i * 0.08 }));
    },
    enemyAttack(ev) { if (throttle('tele', 2, 100)) tone({ freq: ev.enemyType === 'bigObama' ? 90 : 260, end: ev.enemyType === 'bigObama' ? 60 : 380, dur: 0.18, type: 'sawtooth', vol: 0.08 }); },
    stomp() { if (throttle('stomp', 2, 80)) tone({ freq: 140, end: 50, dur: 0.15, type: 'sine', vol: 0.25 }); },
    pound() { noise({ dur: 0.4, vol: 0.4, freq: 600, end: 60 }); },
    splat() { if (throttle('splat', 2, 80)) noise({ dur: 0.2, vol: 0.2, freq: 500, end: 150 }); },
    playerDowned() { tone({ freq: 400, end: 80, dur: 0.8, type: 'sawtooth', vol: 0.3 }); },
    // Kamikaze Midget: a rising beep for as long as the fuse burns, so you hear it behind you.
    fuseLit(ev) { const n = Math.max(3, Math.round((ev.delay || 0.5) / 0.1)); for (let i = 0; i < n; i++) tone({ freq: 880 + i * 140, dur: 0.06, type: 'square', vol: 0.18, delay: i * 0.1 }); },
    playerRevived() { [392, 523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.15, type: 'triangle', vol: 0.25, delay: i * 0.07 })); },
    unkillableTriggered() { tone({ freq: 100, end: 1500, dur: 0.6, type: 'sawtooth', vol: 0.3 }); },
    waveStart() { [330, 330, 440].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'square', vol: 0.18, delay: i * 0.2 })); },
    waveCleared() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 0.15, type: 'triangle', vol: 0.2, delay: i * 0.07 })); },
    bossSpawn() { tone({ freq: 55, end: 40, dur: 1.5, type: 'sawtooth', vol: 0.4 }); noise({ dur: 1.5, vol: 0.3, freq: 300 }); },
    bossRoar() { tone({ freq: 120, end: 60, dur: 1.0, type: 'sawtooth', vol: 0.4 }); },
    bossPhase() { tone({ freq: 80, end: 300, dur: 0.8, type: 'sawtooth', vol: 0.35 }); },
    bossDefeated() { noise({ dur: 1.5, vol: 0.6, freq: 2000, end: 60 }); [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.3, type: 'square', vol: 0.2, delay: 0.3 + i * 0.12 })); },
    bossCast() { if (throttle('bcast', 1, 200)) tone({ freq: 700, end: 300, dur: 0.25, type: 'triangle', vol: 0.15 }); },
    bossTeleport() { tone({ freq: 1500, end: 200, dur: 0.3, type: 'sine', vol: 0.2 }); },
    bossTelegraph() { tone({ freq: 200, end: 400, dur: 0.6, type: 'sawtooth', vol: 0.2 }); },
    bossStunned() { [0, 0.1, 0.2].forEach((d) => tone({ freq: 1800, end: 1200, dur: 0.08, type: 'sine', vol: 0.15, delay: d })); noise({ dur: 0.5, vol: 0.5, freq: 400, end: 60 }); },
    victory() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 0.2, type: 'square', vol: 0.2, delay: i * 0.12 })); },
    defeat() { [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, dur: 0.35, type: 'triangle', vol: 0.25, delay: i * 0.25 })); },
    duckBounce() { if (throttle('quack', 2, 80)) { tone({ freq: j(700, 0.15), end: 500, dur: 0.08, type: 'square', vol: 0.12 }); } },
    allyShot() { if (throttle('ally', 2, 60)) tone({ freq: j(1200, 0.2), end: 1600, dur: 0.04, type: 'square', vol: 0.06 }); },
    // Campaign: one short sound per event, so a lockdown, an alarm and a rewind can be told apart by ear.
    levelCard() { tone({ freq: 110, end: 82, dur: 0.9, type: 'sawtooth', vol: 0.22 }); tone({ freq: 165, end: 123, dur: 0.9, type: 'triangle', vol: 0.16, delay: 0.05 }); },
    checkpoint() { [784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.14, type: 'triangle', vol: 0.18, delay: i * 0.09 })); },
    lockdown(ev) {
      if (ev.sealed) { noise({ dur: 0.35, vol: 0.5, freq: 500, end: 70 }); tone({ freq: 90, end: 45, dur: 0.4, type: 'square', vol: 0.3 }); }
      else [523, 784].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.18, delay: i * 0.1 }));
    },
    lockdownReset() { tone({ freq: 1400, end: 180, dur: 0.7, type: 'sine', vol: 0.28 }); noise({ dur: 0.6, vol: 0.18, freq: 3000, end: 300 }); },
    alarm(ev) {
      if (ev.cut) { tone({ freq: 600, end: 200, dur: 0.25, type: 'square', vol: 0.15 }); return; }
      if (throttle('alarm', 1, 1500)) for (let i = 0; i < 4; i++) tone({ freq: i % 2 ? 620 : 880, dur: 0.22, type: 'square', vol: 0.2, delay: i * 0.24 });
    },
    secret() { [659, 880, 1175].forEach((f, i) => tone({ freq: f, dur: 0.12, type: 'triangle', vol: 0.18, delay: i * 0.07 })); },
    modifier() { tone({ freq: 300, end: 1200, dur: 0.5, type: 'triangle', vol: 0.2, delay: 0.25 }); },
    shrine() { [392, 523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.2, type: 'sine', vol: 0.2, delay: i * 0.08 })); },
    worldGun() { tone({ freq: 500, end: 1000, dur: 0.15, type: 'square', vol: 0.15 }); },
    door() { noise({ dur: 0.3, vol: 0.25, freq: 300, end: 120 }); },
    switch() { tone({ freq: 900, end: 1300, dur: 0.06, type: 'square', vol: 0.15 }); },
    jumpPad() { tone({ freq: 200, end: 900, dur: 0.25, type: 'sine', vol: 0.25 }); },
    portal() { tone({ freq: 1200, end: 300, dur: 0.35, type: 'sine', vol: 0.2 }); },
    barrel() { tone({ freq: 160, end: 60, dur: 0.12, type: 'square', vol: 0.2 }); },
    sectionExit() { tone({ freq: 440, end: 660, dur: 0.2, type: 'triangle', vol: 0.15 }); },
    encounterClear() { [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.14, type: 'triangle', vol: 0.18, delay: i * 0.08 })); },
    levelClear() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 0.2, type: 'square', vol: 0.2, delay: i * 0.12 })); },
    levelLost() { [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, dur: 0.35, type: 'triangle', vol: 0.25, delay: i * 0.25 })); },
    voidRescue() { tone({ freq: 150, end: 700, dur: 0.35, type: 'sine', vol: 0.25 }); },
    playerFell() { tone({ freq: 700, end: 60, dur: 0.9, type: 'sine', vol: 0.3 }); },
    partDestroyed() { noise({ dur: 0.5, vol: 0.45, freq: 1500, end: 100 }); tone({ freq: 880, end: 1320, dur: 0.2, type: 'square', vol: 0.18, delay: 0.1 }); },
    whiteoutWarn() { tone({ freq: 500, end: 350, dur: 0.6, type: 'sine', vol: 0.18 }); },
    grapple() { noise({ dur: 0.18, vol: 0.2, freq: 2500, type: 'bandpass', q: 3 }); tone({ freq: 300, end: 900, dur: 0.18, type: 'sawtooth', vol: 0.12 }); },
    grappleRelease() { tone({ freq: 700, end: 400, dur: 0.07, type: 'triangle', vol: 0.1 }); },
    jetpack() { [330, 494, 659].forEach((f, i) => tone({ freq: f, dur: 0.14, type: 'square', vol: 0.15, delay: i * 0.07 })); },
    geyser() { if (throttle('geyser', 2, 150)) noise({ dur: 0.5, vol: 0.25, freq: 1800, end: 400 }); },
    droneStrike() { tone({ freq: 1600, end: 300, dur: 0.6, type: 'sawtooth', vol: 0.2 }); },
    plateBreak() { noise({ dur: 0.25, vol: 0.4, freq: 3000, end: 500 }); },
    bossMeleeHit() { tone({ freq: 90, end: 40, dur: 0.2, type: 'sine', vol: 0.4 }); noise({ dur: 0.15, vol: 0.3, freq: 800, end: 100 }); },
    bossEscape() { tone({ freq: 300, end: 1600, dur: 0.6, type: 'sine', vol: 0.2 }); },
    whiteout() { noise({ dur: 1.4, vol: 0.3, freq: 4000, end: 1200, type: 'highpass' }); },
    spellUnlocked() { [523, 659, 880, 1175].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'sine', vol: 0.2, delay: i * 0.08 })); },
    stagger() { if (throttle('stag', 2, 100)) tone({ freq: 300, end: 150, dur: 0.1, type: 'triangle', vol: 0.12 }); },
  };

  bus.on('*', (ev) => { const f = SFX[ev.type]; if (f && ctx) f(ev); });

  return {
    ensure,
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    setVolumes(v) {
      if (v.master != null) volumes.master = v.master;
      if (v.music != null) volumes.music = v.music;
      if (v.sfx != null) volumes.sfx = v.sfx;
      applyGain();
    },
  };
}
