// In-game feedback (N twice, or "Send feedback" on the pause screen). The window, the screenshot and
// the upload live in the hub SDK; this file only tells it how this game pauses, what "right now"
// looks like and how the window should be dressed. See metaverse-hub docs/feedback.md.
//
// Pause is a hold on the Game (`feedbackHold`): the sim stops advancing, the gamepad is not read and
// losing the mouse does not raise the game's own pause screen. Whatever screen was up stays up, so
// closing the window lands exactly where it opened. Free 1v1 and wager matches never pause.
import { feedbackTransportFromSdk, installFeedback } from '@metaverse/hub-sdk';
import { crashGuard } from '../core/crashGuard.js';

/* global __BUILD_ID__ */
export const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

/** Matches src/styles/game.css (--night, --panel, --sun, --ink, Bungee and Baloo 2). */
export const FEEDBACK_THEME = Object.freeze({
  font: "'Baloo 2', 'Trebuchet MS', system-ui, sans-serif",
  titleFont: "'Bungee', 'Impact', 'Arial Black', system-ui, sans-serif",
  background: 'rgba(10, 5, 25, 0.78)',
  panel: '#1a1030',
  text: '#fff7ec',
  muted: '#cdbfe6',
  accent: '#ffd166',
  accentText: '#2a1440',
  border: 'rgba(255, 255, 255, 0.14)',
  radius: '12px',
});

const ERROR_KEEP = 10;
const RELOCK_WAIT_MS = 1500;
const round = (n, k = 100) => (Number.isFinite(n) ? Math.round(n * k) / k : null);

/** The sim events worth a breadcrumb, and the few fields of each that say what happened. */
const BREADCRUMBS = {
  modeStart: (ev) => ({ mode: ev.mode, tier: ev.tier, level: ev.level }),
  waveStart: (ev) => ({ wave: ev.waveIndex + 1 }),
  waveCleared: (ev) => ({ wave: ev.waveIndex + 1 }),
  bossIntro: (ev) => ({ bosses: ev.types }),
  bossPhase: (ev) => ({ boss: ev.bossType, phase: ev.phaseIdx }),
  bossDefeated: (ev) => ({ boss: ev.bossType }),
  bossFightOver: (ev) => ({ won: !!ev.won }),
  playerDied: () => ({}),
  levelClear: () => ({}),
  levelLost: () => ({}),
  victory: () => ({}),
  defeat: () => ({}),
};

function levelOf(s) {
  if (s.mode === 'campaign' && s.level) return String(s.level.id);
  if (s.wave) return `wave-${s.wave.index + 1}`;
  if (s.bossFight) return `boss-${s.bossFight.type}`;
  return String(s.mode || '');
}

function screenKind(game) {
  const screen = game.screen;
  if (!screen || screen.hidden) return null;
  const first = screen.firstElementChild;
  return first ? String(first.className || first.tagName || 'screen').slice(0, 40) : 'screen';
}

function pvpContext(game) {
  const wager = !!game._wagerPlaying;
  const client = game._wagerClient;
  const phase = (client && client.phase) || game.screen?.querySelector?.('[data-pvp-phase]')?.dataset?.pvpPhase || 'lobby';
  return {
    level: wager ? 'pvp-wager' : 'pvp-free',
    mode: 'pvp',
    extra: {
      phase,
      seat: client && Number.isFinite(client.seat) ? client.seat : null,
      link: (client && client.link) || null,
      online: game.hub?.status || 'offline',
      device: game.input?.device,
    },
  };
}

/** What the game knows about this moment. Reads plain state only; the SDK also guards it. */
export function feedbackContext(game) {
  try {
    if (game.pvpActive) return pvpContext(game);
    const s = game.state;
    const p = s.players[s.localPlayerId];
    const gun = p.guns ? p.guns[p.activeSlot] : null;
    const lv = s.mode === 'campaign' ? s.level : null;
    const bosses = [];
    for (const e of s.enemies || []) {
      if (e.boss && !e.dead) bosses.push({ type: e.boss.bossType, phase: e.boss.phaseIdx, hp: Math.round(e.hp), maxHp: Math.round(e.maxHp) });
    }
    return {
      level: levelOf(s),
      mode: String(s.mode || ''),
      position: { x: round(p.pos.x), y: round(p.pos.y), z: round(p.pos.z) },
      gameTime: lv && Number.isFinite(lv.time) ? lv.time : s.time,
      player: {
        hp: Math.round(p.hp), maxHp: p.maxHp, shield: Math.round(p.shield), mana: Math.round(p.mana),
        dead: !!p.dead, downed: !!p.downed,
        weapon: gun ? gun.name : null, weaponType: gun ? gun.type : null, slot: p.activeSlot,
        ammoInMag: gun ? gun.ammoInMag : null,
        ammoReserve: gun && p.ammo ? p.ammo[gun.ammoType] ?? null : null,
        medkits: p.medkits, runCash: p.tickets,
        kills: s.run ? s.run.kills : null,
        move: p.move ? p.move.mode : null,
        yaw: round(p.yaw), pitch: round(p.pitch),
        godMode: !!(s.tuning && s.tuning.godMode),
      },
      extra: {
        seed: s.seed, tick: s.tick, tier: s.tier, simTime: round(s.time),
        screen: screenKind(game), playing: !!game.playing,
        section: lv ? lv.section : null, objective: lv ? lv.objective : null,
        wavePhase: s.wave ? s.wave.phase : null,
        bosses: bosses.length ? bosses : null,
        enemies: s.enemies ? s.enemies.length : 0,
        online: game.hub?.status || 'offline',
        device: game.input?.device,
        graphics: game.settings?.graphicsPreset ?? null,
        character: game.character?.id ?? null,
      },
    };
  } catch (err) {
    return { extra: { contextError: String(err && err.message ? err.message : err).slice(0, 200) } };
  }
}

/**
 * pause / resume for the feedback window, as plain functions over the Game (tests drive them with
 * a stand-in). `doc` is the document that owns pointer lock.
 */
export function createFeedbackPause(game, doc = typeof document !== 'undefined' ? document : null) {
  let lockedAtCapture = false;
  let relock = null; // a re-lock still in flight from the previous close

  const dropHeldKeys = () => {
    // The window swallows key-up, so keys held when it opens would stay down.
    const was = game.input.enabled;
    game.input.setEnabled(false);
    return was;
  };

  function finishRelock(ok) {
    if (!relock) return;
    const r = relock;
    relock = null;
    clearTimeout(r.timer);
    doc?.removeEventListener('pointerlockchange', r.onChange);
    doc?.removeEventListener('pointerlockerror', r.onError);
    game.feedbackHold = false;
    // The browser kept the mouse: fall back to the game's own pause screen (Resume re-locks on a click).
    if (!ok && !game.input.locked && game.screen.hidden && !game.pvpActive && !game.ui.menuOpen && !game.debugOpen) game.showPause();
  }

  return {
    /** Before the screenshot, and before the SDK releases the mouse: remember whether it was captured. */
    noteLock() { lockedAtCapture = !!game.input.locked; },
    pause() {
      const locked = lockedAtCapture || !!game.input.locked || !!relock;
      lockedAtCapture = false;
      if (relock) { const r = relock; relock = null; clearTimeout(r.timer); doc?.removeEventListener('pointerlockchange', r.onChange); doc?.removeEventListener('pointerlockerror', r.onError); }
      if (game.pvpActive) {
        game.input.setEnabled(dropHeldKeys());
        return false; // a match has no pause: the window says the game keeps running
      }
      const token = { paused: !!game.paused, locked, inputEnabled: dropHeldKeys() };
      game.feedbackHold = true;
      game.paused = true;
      return token;
    },
    resume(token) {
      if (!token || typeof token !== 'object') { game.feedbackHold = false; return; }
      game.input.setEnabled(token.inputEnabled);
      game.paused = token.paused;
      const play = game.screen.hidden && !game.ui.menuOpen && !game.debugOpen && !game.pvpActive;
      if (!token.locked || !play) { game.feedbackHold = false; return; }
      // Play had the mouse: take it back, and stay frozen until the browser answers. Releasing the
      // mouse is asynchronous: if the window closed before that landed, ask again once it has.
      const releasing = !!game.input.locked;
      relock = {
        onChange: () => { if (game.input.locked) finishRelock(true); else game.input.lock(); },
        onError: () => finishRelock(false),
        timer: setTimeout(() => finishRelock(!!game.input.locked), RELOCK_WAIT_MS),
      };
      doc?.addEventListener('pointerlockchange', relock.onChange);
      doc?.addEventListener('pointerlockerror', relock.onError);
      if (!releasing) game.input.lock();
    },
  };
}

/**
 * The canvases the SDK copies directly, bottom first: the game view, then in Free 1v1 / wager the
 * arena canvases on the screen above it. Since hub-sdk 0.7.2 every canvas not named here is drawn
 * as part of the page's HTML, which goes over these; the game view stays in the list during a match
 * so its frame is not laid over the arena.
 */
export function feedbackCanvases(game) {
  const main = game.renderer && game.renderer.canvas;
  const list = main ? [main] : [];
  if (game.pvpActive && game.screen && !game.screen.hidden) {
    for (const canvas of game.screen.querySelectorAll('canvas')) if (canvas !== main) list.push(canvas);
  }
  return list;
}

/** Install the feedback window for this Game. Returns the SDK handle (a no-op outside a browser). */
export function installGameFeedback(game) {
  const errors = [];
  crashGuard.onCrash((info) => {
    errors.push({ message: `[${info.source}] ${info.message}`, stack: info.stack, at: Math.round(performance.now()) });
    if (errors.length > ERROR_KEEP) errors.shift();
  });
  const hold = createFeedbackPause(game);
  const handle = installFeedback({
    title: 'Sproto Shooter',
    version: BUILD_ID,
    // Standalone play has no hub session: the SDK answers with a one-line toast.
    transport: feedbackTransportFromSdk(game.hub && game.hub.api ? game.hub.api : {}),
    pause: () => hold.pause(),
    resume: (token) => hold.resume(token),
    context: () => feedbackContext(game),
    beforeCapture: () => {
      hold.noteLock();
      // The view has no preserveDrawingBuffer; draw now so the capture never reads a cleared buffer.
      if (!game.pvpActive) game.renderNow();
    },
    canvases: () => feedbackCanvases(game),
    errors: () => errors.slice(),
    theme: FEEDBACK_THEME,
  });
  for (const [type, pick] of Object.entries(BREADCRUMBS)) {
    game.bus.on(type, (ev) => {
      try { handle.breadcrumb(type, pick(ev)); } catch { /* a breadcrumb never breaks a frame */ }
    });
  }
  return handle;
}
