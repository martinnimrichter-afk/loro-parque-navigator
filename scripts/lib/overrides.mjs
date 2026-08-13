export function applyOverrides(pois, overrides) {
  const removed = new Set(overrides.remove ?? []);
  const updates = new Map((overrides.update ?? []).map((u) => [u.id, u.set]));
  const kept = pois
    .filter((p) => !removed.has(p.id))
    .map((p) => (updates.has(p.id) ? { ...p, ...updates.get(p.id) } : p));
  return [...kept, ...(overrides.add ?? [])];
}
