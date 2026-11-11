// The arena Find free match shows after the hub pairs two free tickets.
import { createArenaView } from './view.js';
import { convergeAim } from './aim.js';
import { createPvpClient } from '../../net/client.js';

export function mountFreeArena({
  root, match, accountId, input, onLeave, views,
  panelHtml, paint, playSounds, createPvpSfx, getGraphicsPreset = null,
}) {
  root.onclick = null;
  root.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column">${panelHtml('Free match')}<button class="btn alt" data-pvp-go="back" data-nav-back style="position:absolute;top:12px;right:12px">Leave match</button></div>`;
  const canvas = root.querySelector('canvas');
  const view = createArenaView(canvas, { getGraphicsPreset });
  views.push(view);
  const client = createPvpClient({ accountId, match });
  const panel = root.querySelector('[data-seat-panel]');
  panel.querySelector('[data-pvp-ready]').onclick = () => client.ready();
  root.querySelector('[data-pvp-go="back"]').onclick = onLeave;
  if (input && input.setLockElement) input.setLockElement(canvas);
  const sfx = createPvpSfx();
  const heard = { hits: 0 };
  canvas.addEventListener('mousedown', () => {
    if (input) input.lock();
    sfx.ensure();
  });
  let faced = false;
  return {
    wantsLock: true,
    frame(_dt, cmd) {
      const now = performance.now();
      const state = client.viewState(now);
      const sample = state.sample;
      let look = client.look;
      if (client.phase === 'live' && sample && sample.players && cmd) {
        const seat = Math.max(0, client.seat);
        if (!faced && input && input.setLook && sample.players[seat]) {
          faced = true;
          input.setLook(sample.players[seat].yaw, 0);
          if (cmd) { cmd.yaw = sample.players[seat].yaw; cmd.pitch = 0; }
        }
        const me = sample.players[seat];
        const aim = me ? convergeAim(me, { yaw: cmd.yaw, pitch: cmd.pitch }, sample.players[1 - seat]) : cmd;
        client.updateCommand(now, { ...cmd, yaw: aim.yaw, pitch: aim.pitch });
        look = { yaw: aim.yaw, pitch: aim.pitch };
      } else {
        client.updateCommand(now, cmd || { yaw: 0, pitch: 0, moveX: 0, moveZ: 0, held: {}, pressed: {} });
      }
      playSounds(sfx, client, heard);
      const drawn = client.viewState(now);
      view.render(drawn.sample, Math.max(0, client.seat), client.phase === 'live' ? look : null, { shots: client.shots, now });
      paint(panel, drawn, 'Free match — no stake');
      const tick = drawn.sample && Number.isFinite(drawn.sample.tick) ? drawn.sample.tick : 0;
      panel.dataset.pvpTick = String(Math.floor(tick));
    },
  };
}
