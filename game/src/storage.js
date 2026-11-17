// storage.js — the only file that touches localStorage: the best score and
// the best wave ever reached, kept between visits.

const BEST_KEY = 'emberwake.best.v1';

export function loadBest() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return { score: 0, wave: 0 };
    const parsed = JSON.parse(raw);
    return { score: Number(parsed.score) || 0, wave: Number(parsed.wave) || 0 };
  } catch {
    return { score: 0, wave: 0 };
  }
}

export function saveBest(score, wave) {
  const best = loadBest();
  const next = { score: Math.max(best.score, score), wave: Math.max(best.wave, wave) };
  try { localStorage.setItem(BEST_KEY, JSON.stringify(next)); } catch { /* private mode: play on */ }
  return next;
}
