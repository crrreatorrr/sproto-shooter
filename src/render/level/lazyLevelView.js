// The campaign level renderer (levelView.js and its dressing tables) is its own chunk: the title
// sandbox and Wave Mode never draw a level. This stand-in has the same `group` and `sync`; the
// first campaign frame fetches the real view, which draws from the next frame after it arrives.
import * as THREE from 'three';

export function createLazyLevelView(load = () => import('./levelView.js')) {
  const group = new THREE.Group();
  let view = null;
  let loading = null;
  let shown = false;
  return {
    group,
    /** Campaign frames. */
    sync(state) {
      if (view) { shown = true; view.sync(state); return; }
      loading ??= load().then(({ createLevelView }) => {
        view = createLevelView();
        group.add(view.group);
      }, (err) => {
        loading = null; // try again on a later frame
        console.warn('[level] could not load the level renderer:', err);
      });
    },
    /** Frames outside the campaign: drop the last level once, so its props can be evicted. */
    idle() {
      if (!view || !shown) return;
      shown = false;
      view.clear();
    },
    ready: () => !!view,
  };
}
