import { describe, it, expect } from 'vitest';
import { createGameState, run, cmd } from './helpers.js';
import { createCampaignFlow, campaignFlowStep, INTRO_CARD_TIME } from '../src/game/campaignFlow.js';
import { getLevelRuntime } from '../src/sim/level/runtime.js';

const base = (o = {}) => ({ mode: 'campaign', tick: 10, time: 5, level: { transition: null, intro: null, won: false, lost: false }, ...o });

describe('campaign flow: when the client sends transitionDone', () => {
  it('sends nothing outside a campaign or with nothing pending', () => {
    const flow = createCampaignFlow();
    expect(campaignFlowStep(flow, { mode: 'waves', tick: 1, time: 0, level: null })).toBe(false);
    expect(campaignFlowStep(flow, base())).toBe(false);
  });

  it('sends at once for a section exit, and only once per sim tick', () => {
    const flow = createCampaignFlow();
    const s = base(); s.level.transition = { to: 'S2' };
    expect(campaignFlowStep(flow, s)).toBe(true);
    expect(campaignFlowStep(flow, s)).toBe(false); // a frame with no tick in between
    s.tick++;
    expect(campaignFlowStep(flow, s)).toBe(true);
  });

  it('keeps a section card up for its time, or until fire is pressed', () => {
    const flow = createCampaignFlow();
    const s = base(); s.level.intro = { title: 'A', lines: [] };
    expect(campaignFlowStep(flow, s)).toBe(false);
    s.tick++; s.time += INTRO_CARD_TIME - 0.1;
    expect(campaignFlowStep(flow, s)).toBe(false);
    s.tick++; s.time += 0.2;
    expect(campaignFlowStep(flow, s)).toBe(true);
    const t = base(); t.level.intro = { title: 'B', lines: [] };
    expect(campaignFlowStep(flow, t)).toBe(false);
    t.tick++;
    expect(campaignFlowStep(flow, t, true)).toBe(true);
  });

  it('does nothing once the level is won or lost', () => {
    const flow = createCampaignFlow();
    const s = base(); s.level.transition = { to: 'S2' }; s.level.won = true;
    expect(campaignFlowStep(flow, s)).toBe(false);
  });

  // The test bots in tests/levels send transitionDone themselves. This one never does: the only
  // sender is the helper the client uses, so a level that needs it cannot be won without it.
  it('carries a bot through every section of a level', () => {
    const play = (useFlow) => {
      const s = createGameState({ seed: 4 });
      run(s, 1, () => cmd({ actions: [
        { type: 'startMode', mode: 'campaign', level: 'L07' },
        { type: 'debug', op: 'setTuning', args: { key: 'godMode', value: true } },
        { type: 'debug', op: 'setTuning', args: { key: 'enemyHpMult', value: 0.08 } },
      ] }));
      const flow = createCampaignFlow();
      const seen = new Set();
      for (let i = 0; i < 60 * 240 && !s.level.won; i++) {
        seen.add(s.level.section);
        const c = bot(s);
        if (useFlow && campaignFlowStep(flow, s, c.held.fire)) c.actions.push({ type: 'transitionDone' });
        run(s, 1, () => c);
      }
      return { won: s.level.won, sections: seen.size };
    };
    const stuck = play(false);
    expect(stuck.won).toBe(false);
    expect(stuck.sections).toBe(1);
    const through = play(true);
    expect(through.won).toBe(true);
    expect(through.sections).toBe(getLevelRuntime('L07').sections.length);
  }, 120000);
});

function bot(st) {
  const pl = st.players[st.localPlayerId];
  const lv = st.level;
  const sec = getLevelRuntime(lv.id).sectionById[lv.section];
  let best = null, bd = 1e9;
  for (const e of st.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.pos.x - pl.pos.x, e.pos.z - pl.pos.z);
    if (d < bd) { bd = d; best = e; }
  }
  let tx, tz;
  if (best) { tx = best.pos.x; tz = best.pos.z; }
  else {
    const enc = (sec.encounters || []).find((e) => !lv.cleared[e.id]);
    const box = enc ? enc.activate : sec.exit;
    if (box) { tx = (box.min[0] + box.max[0]) / 2; tz = (box.min[2] + box.max[2]) / 2; }
    else { tx = pl.pos.x; tz = pl.pos.z; }
  }
  const dx = tx - pl.pos.x, dz = tz - pl.pos.z;
  const dist = Math.hypot(dx, dz) || 1;
  const pitch = best ? Math.atan2(best.pos.y + (best.height || 1.6) * 0.55 - (pl.pos.y + 1.6), bd) - pl.recoil.pitch : 0;
  return cmd({ yaw: Math.atan2(-dx, -dz), pitch, moveZ: dist > (best ? 6 : 0.8) ? 1 : 0, held: { fire: !!best, sprint: true } });
}
