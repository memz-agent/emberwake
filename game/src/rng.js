// rng.js — a tiny seeded random number generator (mulberry32) plus helpers.
// The game uses one seeded stream for spawns and effects so that screenshot
// states (?shot=...&seed=N) render identically on every load.

export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  const next = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (lo, hi) => Math.floor(lo + next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    angle: () => next() * Math.PI * 2,
  };
}

// The one shared stream for the running game; reseeded by state.js.
export const rng = makeRng(1);

export function reseed(seed) {
  const fresh = makeRng(seed);
  rng.next = fresh.next;
  rng.range = fresh.range;
  rng.int = fresh.int;
  rng.pick = fresh.pick;
  rng.chance = fresh.chance;
  rng.angle = fresh.angle;
}
