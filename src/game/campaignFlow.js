// Campaign section flow for the client. The sim raises `level.transition` when the player walks into a
// cleared section's exit and `level.intro` while a section card is up; only the `transitionDone` action
// moves on from either. This decides when the client sends it. Pure: no DOM, no clock of its own.

/** How long a section card stays up before the client dismisses it (seconds of sim time). */
export const INTRO_CARD_TIME = 2.5;

export function createCampaignFlow() {
  return { intro: null, introAt: 0, sentTick: -1 };
}

/**
 * True when the client should queue one `transitionDone` now.
 * @param flow  memo from createCampaignFlow()
 * @param state the game state (reads mode, level, tick, time)
 * @param firePressed the player pressed fire this frame (dismisses a card early)
 */
export function campaignFlowStep(flow, state, firePressed = false) {
  const lv = state && state.mode === 'campaign' ? state.level : null;
  if (!lv || lv.won || lv.lost) { flow.intro = null; return false; }
  // One action per sim tick: a frame with no tick must not queue a second one, which would
  // dismiss the next section's card the moment it appears.
  if (flow.sentTick === state.tick) return false;
  if (lv.transition) { flow.intro = null; flow.sentTick = state.tick; return true; }
  if (!lv.intro) { flow.intro = null; return false; }
  if (flow.intro !== lv.intro) { flow.intro = lv.intro; flow.introAt = state.time; return false; }
  if (firePressed || state.time - flow.introAt >= INTRO_CARD_TIME) {
    flow.intro = null; flow.sentTick = state.tick;
    return true;
  }
  return false;
}
