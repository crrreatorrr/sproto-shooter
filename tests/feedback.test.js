import { describe, it, expect, vi } from 'vitest';
import { createGameState } from '../src/sim/state.js';
import { BUILD_ID, createFeedbackPause, feedbackContext } from '../src/hub/feedback.js';

function fakeGame(over = {}) {
  let enabled = true;
  const game = {
    state: createGameState({ seed: 7, mode: 'sandbox' }),
    paused: false,
    feedbackHold: false,
    pvpActive: false,
    debugOpen: false,
    playing: true,
    hub: { status: 'offline' },
    settings: { graphicsPreset: 'balanced' },
    screen: { hidden: true, firstElementChild: null, querySelector: () => null },
    ui: { menuOpen: false },
    showPause: vi.fn(),
    input: {
      locked: false, device: 'kbm',
      get enabled() { return enabled; },
      setEnabled(v) { enabled = v; },
      lock: vi.fn(),
    },
    ...over,
  };
  return game;
}

describe('feedback adapter', () => {
  it('reports level, mode, position, time and player state', () => {
    const game = fakeGame();
    const p = game.state.players[game.state.localPlayerId];
    p.pos = { x: 1.234, y: 0, z: -5.5 };
    game.state.time = 12.5;
    const ctx = feedbackContext(game);
    expect(ctx.level).toBe('sandbox');
    expect(ctx.mode).toBe('sandbox');
    expect(ctx.position).toEqual({ x: 1.23, y: 0, z: -5.5 });
    expect(ctx.gameTime).toBe(12.5);
    expect(ctx.player.hp).toBe(p.hp);
    expect(ctx.player.weapon).toBe(p.guns[0].name);
    expect(ctx.extra.seed).toBe(7);
    expect(() => JSON.stringify(ctx)).not.toThrow();
  });

  it('names the wave and the campaign level, and never throws', () => {
    const game = fakeGame();
    game.state.wave = { index: 1, phase: 'fight' };
    expect(feedbackContext(game).level).toBe('wave-2');
    game.state.wave = null;
    game.state.mode = 'campaign';
    game.state.level = { id: 'L03', section: 's2', objective: 'Move up', time: 44 };
    const ctx = feedbackContext(game);
    expect(ctx.level).toBe('L03');
    expect(ctx.gameTime).toBe(44);
    expect(ctx.extra.section).toBe('s2');
    expect(feedbackContext({}).extra.contextError).toBeTypeOf('string');
    expect(feedbackContext(fakeGame({ pvpActive: true })).mode).toBe('pvp');
  });

  it('holds running play and takes the mouse back on resume', () => {
    const game = fakeGame();
    game.input.locked = true;
    const hold = createFeedbackPause(game, null);
    hold.noteLock();
    game.input.locked = false; // the SDK released the mouse
    const token = hold.pause();
    expect(token).toMatchObject({ paused: false, locked: true, inputEnabled: true });
    expect(game.feedbackHold).toBe(true);
    expect(game.paused).toBe(true);
    expect(game.input.enabled).toBe(false);
    game.input.lock = vi.fn(() => { game.input.locked = true; });
    vi.useFakeTimers();
    hold.resume(token);
    expect(game.input.lock).toHaveBeenCalledOnce();
    expect(game.paused).toBe(false);
    expect(game.input.enabled).toBe(true);
    vi.runAllTimers();
    vi.useRealTimers();
    expect(game.feedbackHold).toBe(false);
    expect(game.showPause).not.toHaveBeenCalled();
  });

  it('falls back to the pause screen when the browser keeps the mouse', () => {
    const game = fakeGame();
    game.input.locked = true;
    const hold = createFeedbackPause(game, null);
    hold.noteLock();
    game.input.locked = false;
    const token = hold.pause();
    vi.useFakeTimers();
    hold.resume(token);
    expect(game.feedbackHold).toBe(true);
    vi.runAllTimers();
    vi.useRealTimers();
    expect(game.feedbackHold).toBe(false);
    expect(game.showPause).toHaveBeenCalledOnce();
  });

  it('leaves a paused game or a menu as it was, and never pauses a match', () => {
    const game = fakeGame({ paused: true });
    game.screen.hidden = false;
    const hold = createFeedbackPause(game, null);
    const token = hold.pause();
    expect(token.locked).toBe(false);
    hold.resume(token);
    expect(game.paused).toBe(true);
    expect(game.feedbackHold).toBe(false);
    expect(game.input.lock).not.toHaveBeenCalled();
    expect(game.showPause).not.toHaveBeenCalled();

    const match = fakeGame({ pvpActive: true });
    expect(createFeedbackPause(match, null).pause()).toBe(false);
    expect(match.feedbackHold).toBe(false);
    expect(match.input.enabled).toBe(true);
  });

  it('has a build id', () => {
    expect(BUILD_ID).toMatch(/^\d+\.\d+\.\d+\+([0-9a-f]{7,}|dev)$/);
  });
});
