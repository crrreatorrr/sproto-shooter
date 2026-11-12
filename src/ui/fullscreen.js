// Full screen toggle and the standard options every menu carries (Main menu, Hub, Controller settings,
// Full screen). The page already fills the window (src/styles/game.css); this adds the browser's own
// full screen through the Fullscreen API. Requests must come from the click / key / button handler
// itself, because the browser only allows them from a user gesture.

/** True when the browser lets this page go full screen (the toggle is hidden otherwise). */
export function fullscreenSupported(doc = globalThis.document) {
  return !!(doc && doc.fullscreenEnabled && doc.documentElement && typeof doc.documentElement.requestFullscreen === 'function');
}

export function isFullscreen(doc = globalThis.document) {
  return !!(doc && doc.fullscreenElement);
}

export function fullscreenLabel(on) {
  return `⛶ Full screen: ${on ? 'On' : 'Off'}`;
}

/**
 * Enter or leave full screen. Returns a promise that resolves to true when the request went through
 * and false when the browser refused it (a gamepad press is not a user gesture in most browsers).
 */
export function toggleFullscreen(doc = globalThis.document) {
  try {
    const p = doc.fullscreenElement ? doc.exitFullscreen() : doc.documentElement.requestFullscreen({ navigationUI: 'hide' });
    return Promise.resolve(p).then(() => true, () => false);
  } catch {
    return Promise.resolve(false);
  }
}

/** Options in the order every menu shows them. */
export const STD_OPTIONS = ['title', 'hub', 'controls', 'fullscreen'];

/**
 * The standard row. `main` false on the main menu itself, `controls` false on the Controller settings
 * screen, `fullscreen` null when the browser has no Fullscreen API. Buttons carry data-std, which one
 * delegated listener in Game handles, so each screen's own click handler ignores them.
 */
export function stdMenuHtml({ main = true, hub = true, controls = true, mainLabel = 'Main menu', hubLabel = '⌂ Return to Hub', fullscreen = null } = {}) {
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const b = (id, label, extra = '') => `<button class="btn alt" data-std="${id}"${extra}>${esc(label)}</button>`;
  return `<div class="menu minor std-menu" data-std-menu>${[
    main ? b('title', mainLabel) : '',
    hub ? b('hub', hubLabel) : '',
    controls ? b('controls', '🎮 Controller settings') : '',
    fullscreen ? b('fullscreen', fullscreenLabel(fullscreen.on), ` aria-pressed="${fullscreen.on ? 'true' : 'false'}"`) : '',
  ].join('')}</div>`;
}

/**
 * Keeps every Full screen label in step with the real state (F11 / Esc / the toggle), and makes the
 * Esc that leaves browser full screen do only that. Browsers normally keep that Esc from the page;
 * if one passes it on, the game would also close a panel, resume, or go back, so it is swallowed
 * (a capture listener on window runs before the game's own key listeners). Pointer lock still
 * raises the pause screen through its own lockchange event.
 */
export function installFullscreen({ doc = globalThis.document, win = globalThis.window, now = () => performance.now(), onChange = null } = {}) {
  let exitedAt = -Infinity;
  const paint = () => {
    const on = isFullscreen(doc);
    for (const el of doc.querySelectorAll('[data-std="fullscreen"]')) {
      el.textContent = fullscreenLabel(on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  };
  doc.addEventListener('fullscreenchange', () => {
    if (!isFullscreen(doc)) exitedAt = now();
    paint();
    if (onChange) onChange(isFullscreen(doc));
  });
  win.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    if (isFullscreen(doc) || now() - exitedAt < 300) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
  return { paint };
}
