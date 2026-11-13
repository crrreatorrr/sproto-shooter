// Boot: URL params ?seed=123&mode=waves|sandbox|test|boss|campaign&level=L01&boss=monster&debug=1&stats=1
// A hub visit arrives as /#t=<ticket>. connectHub redeems it before the title screen.
// The entry chunk paints the title, then loads the hub SDK and the renderer.
// Crash safety net: uncaught errors and rejections feed the crash guard; when it halts the game
// (a streak of failing frames) or boot fails (a stale chunk after a deploy, a failed load), the
// "Something broke" panel offers RELOAD / RETRY instead of "Loading…" forever.
// crashGuard.onCrash(fn) is where an opt-in crash reporter can attach later. Nothing is sent.
import { crashGuard } from './core/crashGuard.js';
import { CrashPanel } from './ui/crashPanel.js';

const crashPanel = new CrashPanel(document, () => location.reload());
crashGuard.installGlobal(window);
// Errors while the tab was hidden (no frames ran) must not count toward a halt once it is back.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') crashGuard.resetStreak();
});
crashGuard.onHalt((info) => {
  if (document.pointerLockElement) document.exitPointerLock?.();
  crashPanel.show(info.source === 'boot' ? 'retry' : 'reload', info, window.__game?.state);
});

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
    debug: q.get('debug') === '1',
    boss: q.get('boss'),
    level: q.get('level'),
    stats: q.get('stats') === '1',
    hub,
  });
}
crashGuard.guardBoot(boot);
