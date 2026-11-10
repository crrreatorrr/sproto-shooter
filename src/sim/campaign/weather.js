// Section weather. A whiteout caps sight and tells the view to pull the fog in.
import { emit } from '../events.js';

function clearWeather(lv) {
  if (lv.whiteout) delete lv.whiteout;
  if (lv.whiteoutWarn != null) delete lv.whiteoutWarn;
  if (lv.sightCap) delete lv.sightCap;
  if (lv.viewCap) delete lv.viewCap;
  if (lv._wx) delete lv._wx;
  if (lv._weatherT != null) delete lv._weatherT;
  if (lv._weatherSec) delete lv._weatherSec;
}

function nextWindow(weather, t) {
  const dur = weather.whiteout || 20;
  const period = weather.period || 90;
  const listed = weather.windows || [];
  let on = false;
  let next = Infinity;
  for (let i = 0; i < listed.length; i++) {
    const start = listed[i][0];
    const end = listed[i][1];
    if (t >= start && t < end) on = true;
    if (start > t && start < next) next = start;
  }
  const origin = listed.length ? listed[0][0] : 0;
  if (period > 0) {
    const n = Math.floor((t - origin) / period);
    for (let k = Math.max(0, n); k <= n + 2; k++) {
      const start = origin + k * period;
      if (t >= start && t < start + dur) on = true;
      if (start > t && start < next) next = start;
    }
  }
  return { on, next };
}

/** Advances the section clock and sets level.whiteout only while a weather mechanism is active. */
export function tickWeather(state, sec, dt) {
  const lv = state.level;
  if (!lv) return;
  const list = (sec && sec.mechanisms) || [];
  let weather = null;
  for (let i = 0; i < list.length; i++) if (list[i].kind === 'weather') { weather = list[i]; break; }
  if (!weather) { clearWeather(lv); return; }
  if (lv._weatherSec !== sec.id) {
    lv._weatherSec = sec.id;
    lv._weatherT = 0;
    if (lv._wx) delete lv._wx;
  }
  lv._weatherT += dt;
  const { on, next } = nextWindow(weather, lv._weatherT);
  const warnFor = weather.warning || 0;
  const soon = !on && next < Infinity && next - lv._weatherT <= warnFor && next - lv._weatherT > 0;
  const phase = on ? 'on' : soon ? 'warn' : 'off';
  if (on) {
    lv.whiteout = true;
    lv.sightCap = weather.sightCap || 40;
    lv.viewCap = weather.viewCap || 40;
    if (lv.whiteoutWarn != null) delete lv.whiteoutWarn;
  } else {
    if (lv.whiteout) delete lv.whiteout;
    if (lv.sightCap) delete lv.sightCap;
    if (lv.viewCap) delete lv.viewCap;
    if (soon) lv.whiteoutWarn = next - lv._weatherT;
    else if (lv.whiteoutWarn != null) delete lv.whiteoutWarn;
  }
  if (lv._wx !== phase) {
    const prev = lv._wx;
    lv._wx = phase;
    if (phase === 'warn') emit(state, 'whiteoutWarn', { id: weather.id, in: next - lv._weatherT });
    else if (phase === 'on') emit(state, 'whiteout', { id: weather.id });
    else if (prev === 'on') emit(state, 'whiteoutLift', { id: weather.id });
  }
}
