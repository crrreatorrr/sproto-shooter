// The "Something broke" panel: a small card over the game, shown when the crash guard halts the
// game or boot fails. One button: RELOAD (a halted game) or RETRY (boot, e.g. a stale chunk after
// a deploy). Styles: .crash-panel in styles/game.css. It sits on <body>, outside #screen, so
// screen changes never wipe it. Part of the entry chunk, so it works when the game chunk fails.

export const CRASH_PANEL_ID = 'crash-panel';

export class CrashPanel {
  constructor(doc, reload) {
    this.doc = doc;
    this.reload = reload;
    this.shown = false;
  }

  /** Shows the panel ('reload' | 'retry'), once; later calls do nothing. */
  show(kind) {
    if (this.shown) return;
    this.shown = true;
    const doc = this.doc;
    const root = doc.createElement('div');
    root.id = CRASH_PANEL_ID;
    root.className = 'crash-panel';
    root.setAttribute('role', 'alertdialog');
    root.setAttribute('aria-label', 'Something broke');
    const card = doc.createElement('div');
    card.className = 'crash-card';
    const title = doc.createElement('h2');
    title.textContent = 'Something broke';
    const detail = doc.createElement('p');
    detail.textContent = kind === 'retry'
      ? 'Sproto Shooter could not load. Check your connection and try again.'
      : 'The game hit an error and paused. Reloading usually fixes it.';
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'btn big';
    button.textContent = kind === 'retry' ? 'RETRY' : 'RELOAD';
    button.addEventListener('click', () => this.reload());
    card.appendChild(title);
    card.appendChild(detail);
    card.appendChild(button);
    root.appendChild(card);
    doc.body.appendChild(root);
    button.focus();
  }
}
