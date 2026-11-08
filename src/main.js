// Boot: URL params ?seed=123&mode=waves|sandbox|test|boss|campaign&level=L01&boss=monster&tier=3&debug=1&stats=1
// A hub visit arrives as /#t=<ticket>. connectHub redeems it before the title screen.
// The entry chunk paints the title, then loads the hub SDK and the renderer.

async function boot() {
  const q = new URLSearchParams(location.search);
  const screen = document.getElementById('screen');
  if (screen) {
    screen.hidden = false;
    screen.innerHTML = '<div class="title"><h1>SPROTO<br><span>SHOOTER</span></h1><p class="loading">Loading…</p></div>';
  }
  const [{ connectHub }, { Game }] = await Promise.all([
    import('./hub/link.js'),
    import('./game/Game.js'),
  ]);
  const hub = await connectHub();
  new Game({
    seed: Number(q.get('seed')) || (Date.now() % 1e9),
    mode: q.get('mode') || 'title',
    tier: Math.max(1, Math.min(10, Number(q.get('tier')) || 1)),
    debug: q.get('debug') === '1',
    boss: q.get('boss'),
    level: q.get('level'),
    stats: q.get('stats') === '1',
    hub,
  });
}
boot();
