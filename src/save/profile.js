// Campaign meta. Game layer only. The sim never reads this.
const KEY = 'sproto-campaign-profile';

function blank() { return { unlocked: ['L01'], modifiers: [] }; }

function store() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function loadProfile() {
  const ls = store();
  if (!ls) return blank();
  try {
    const raw = ls.getItem(KEY);
    if (!raw) return blank();
    const p = JSON.parse(raw);
    const unlocked = Array.isArray(p.unlocked) ? p.unlocked : ['L01'];
    if (!unlocked.includes('L01')) unlocked.unshift('L01');
    return { unlocked, modifiers: Array.isArray(p.modifiers) ? p.modifiers : [] };
  } catch {
    return blank();
  }
}

export function saveProfile(p) {
  const ls = store();
  if (!ls) return;
  ls.setItem(KEY, JSON.stringify({ unlocked: p.unlocked, modifiers: p.modifiers }));
}

export function unlockLevel(id) {
  const p = loadProfile();
  if (id && !p.unlocked.includes(id)) p.unlocked.push(id);
  saveProfile(p);
  return p;
}

export function rememberModifier(id) {
  const p = loadProfile();
  if (id && !p.modifiers.includes(id)) p.modifiers.push(id);
  saveProfile(p);
  return p;
}
