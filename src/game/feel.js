// @ts-check
// Presentation-only hitstop. It never writes sim state. presentScale slows the clock without changing a tick's contents.

const HITSTOP_CAP = 200;

export function createFeel() {
  return {
    hitstopMs: 0,
    presentScale: 1,
    /** @param {number} ms */
    stop(ms) { this.hitstopMs = Math.max(this.hitstopMs, Math.min(ms, HITSTOP_CAP)); },
    /**
     * Shrink this frame's step while hitstop is running. Returns the step to add to the accumulator.
     * @param {number} ft seconds
     * @param {boolean} enabled
     */
    scaleFrame(ft, enabled) {
      if (enabled && this.hitstopMs > 0) {
        this.hitstopMs -= ft * 1000;
        return 0;
      }
      return ft * this.presentScale;
    },
  };
}

/** @param {{ bus: { on: Function }, feel: ReturnType<typeof createFeel>, settings: { hitstop: boolean } }} game */
export function wireHitstop(game) {
  const stop = (ms) => { if (game.settings.hitstop) game.feel.stop(ms); };
  game.bus.on('damage', (ev) => {
    if (ev.isWeak && ev.sourceKind === 'gun' && ev.amount > 40) stop(45);
    if (ev.killed && ev.isWeak) stop(60);
  });
  game.bus.on('bossDefeated', () => stop(200));
  game.bus.on('bossPhase', () => stop(120));
  game.bus.on('bossMeleeHit', () => stop(110));
  game.bus.on('meteorImpact', () => stop(90));
}
