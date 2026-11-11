// When the aim toggle lets go by itself.

/**
 * True on the frame the player's active weapon slot changes. Aim is a toggle, so without this a
 * zoom set for one gun carries over to the next one drawn. `memo` is any object kept between frames.
 */
export function swappedWeapon(memo, player) {
  const slot = player ? player.activeSlot : null;
  const changed = memo.slot != null && slot != null && slot !== memo.slot;
  memo.slot = slot;
  return changed;
}
