// Boot: URL params ?seed=123&mode=waves|sandbox|test&tier=3&debug=1
import { Game } from './game/Game.js';

const q = new URLSearchParams(location.search);
new Game({
  seed: Number(q.get('seed')) || (Date.now() % 1e9),
  mode: q.get('mode') || 'title',
  tier: Math.max(1, Math.min(10, Number(q.get('tier')) || 1)),
  debug: q.get('debug') === '1',
});
