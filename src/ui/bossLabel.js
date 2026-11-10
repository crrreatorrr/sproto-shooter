/** Boss bar title. A level can name its own body without renaming the wave boss. */
export function bossLabel(enemy, def) {
  const named = enemy && enemy.boss && enemy.boss.displayName;
  if (named) return named;
  return (def && def.name) || 'Boss';
}
