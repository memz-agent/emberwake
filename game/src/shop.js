// shop.js — between waves the storm-caller spends Essence (dropped by every
// foe) on permanent upgrades for the run. Six wares, each with five ranks
// and a rising price. The shop is drawn by hud.js; this file owns the
// catalogue, prices and buying.

import { sfx } from './audio.js';

export const WARES = [
  { id: 'damage',  name: 'Keen Sigils',    desc: '+18% spell damage per rank',        base: 14 },
  { id: 'rate',    name: 'Rapid Weaving',  desc: '+14% cast rate per rank',           base: 14 },
  { id: 'dash',    name: 'Second Wind',    desc: '+1 dash charge per rank (max +2)',  base: 22 },
  { id: 'vitality',name: 'Ember Heart',    desc: '+25 max health and heal 25',        base: 16 },
  { id: 'combo',   name: 'Primal Flux',    desc: '+30% combo damage and burn per rank', base: 18 },
  { id: 'magnet',  name: 'Wake Magnet',    desc: '+45% essence pull radius per rank', base: 10 },
];

export const MAX_RANK = 5;

export function freshUpgrades() {
  return { damage: 0, rate: 0, dash: 0, vitality: 0, combo: 0, magnet: 0 };
}

// Derived multipliers the rest of the game reads, computed from ranks.
export function derive(up) {
  return {
    damageMul: 1 + up.damage * 0.18,
    castInterval: 0.19 / (1 + up.rate * 0.14),
    dashCharges: 1 + Math.min(2, up.dash),
    maxHpBonus: up.vitality * 25,
    comboMul: 1 + up.combo * 0.3,
    magnetR: 74 * (1 + up.magnet * 0.45),
  };
}

export function priceOf(ware, rank) {
  return Math.round(ware.base * Math.pow(1.65, rank));
}

export function buy(world, wareId) {
  const ware = WARES.find((w) => w.id === wareId);
  const rank = world.upgradeRanks[wareId];
  if (!ware || rank >= MAX_RANK) { sfx.denied(); return false; }
  const price = priceOf(ware, rank);
  if (world.player.essence < price) { sfx.denied(); return false; }
  world.player.essence -= price;
  world.upgradeRanks[wareId]++;
  if (wareId === 'vitality') world.healPlayer(25);
  world.recalc();
  sfx.buy();
  return true;
}

export function shopOpen(world) {
  return world.mode === 'shop';
}
