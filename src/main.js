// Boot: URL params ?seed=123&mode=waves|sandbox|test|boss|campaign&level=L01&boss=monster&tier=3&debug=1&stats=1
import { Game } from './game/Game.js';

const q = new URLSearchParams(location.search);
new Game({
  seed: Number(q.get('seed')) || (Date.now() % 1e9),
  mode: q.get('mode') || 'title',
  tier: Math.max(1, Math.min(10, Number(q.get('tier')) || 1)),
  debug: q.get('debug') === '1',
  boss: q.get('boss'),
  level: q.get('level'),
  stats: q.get('stats') === '1',
});
