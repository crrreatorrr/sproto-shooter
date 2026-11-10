export const PLAYER_CHARACTERS = Object.freeze([
  { id: 'sproto', name: 'Sproto Soldier', model: 'models/characters/sproto_player.glb' },
  { id: 'pepe', name: 'Pepe', model: 'models/characters/pepe.glb', portrait: 'ui/characters/pepe.webp' },
  { id: 'pepe-general', name: 'Pepe General', model: 'models/characters/pepe-general.glb', portrait: 'ui/characters/pepe-general.webp' },
  { id: 'pepe-tux', name: 'Pepe Tux', model: 'models/characters/pepe-tux.glb', portrait: 'ui/characters/pepe-tux.webp' },
]);

const STORAGE_KEY = 'shooter:character';
export const playerCharacter = (id) => PLAYER_CHARACTERS.find((entry) => entry.id === id) ?? PLAYER_CHARACTERS[0];

export function selectedCharacter() {
  try { return playerCharacter(localStorage.getItem(STORAGE_KEY)); }
  catch { return PLAYER_CHARACTERS[0]; }
}

export function saveCharacter(id) {
  const entry = playerCharacter(id);
  try { localStorage.setItem(STORAGE_KEY, entry.id); } catch { /* Works for the current visit. */ }
  return entry;
}
