// spells.js — projectiles, burning ground, and the elemental combo rules,
// the heart of Emberwake:
//   Frost then Ember on the same foe  -> Steam Burst (AoE damage + steam)
//   Storm cast at a frozen foe        -> Chain Lightning (leaps to neighbours)
//   Ember landing on burning ground   -> Wildfire (the fire spreads + flares)
// Damage numbers, particles and hit-stop all fire from here via the world.

import { rng } from './rng.js';
import { ELEMENTS } from './palette.js';
import { burst, shards, steam, ring, arc, damageText } from './particles.js';
import { sfx } from './audio.js';

export const projectiles = [];
export const zones = []; // burning ground patches

const COMBO_WINDOW = 2.5; // seconds a status stays "primed" for a combo

export function clearSpells() { projectiles.length = 0; zones.length = 0; }

export function castSpell(world, from, angle, element) {
  const up = world.upgrades;
  const spread = element === 'storm' ? 0.05 : 0.03;
  projectiles.push({
    x: from.x + Math.cos(angle) * 20, y: from.y + Math.sin(angle) * 20,
    vx: Math.cos(angle + rng.range(-spread, spread)) * 620,
    vy: Math.sin(angle + rng.range(-spread, spread)) * 620,
    r: element === 'ember' ? 6 : 5,
    element,
    damage: 11 * up.damageMul,
    life: 0.85,
    pierce: element === 'storm' ? 1 : 0,
  });
  burst(from.x + Math.cos(angle) * 22, from.y + Math.sin(angle) * 22, ELEMENTS[element].color, 3, 90, 0.22, 2.4);
  sfx.cast(element);
}

export function addBurnZone(world, x, y) {
  const existing = zones.find((z) => Math.hypot(z.x - x, z.y - y) < z.r * 0.7);
  if (existing) { existing.life = Math.min(existing.maxLife, existing.life + 0.8); return existing; }
  const zone = { x, y, r: 40 + world.upgrades.comboMul * 6, life: 3.2, maxLife: 3.2, tick: 0 };
  zones.push(zone);
  return zone;
}

// Apply one hit to a foe, resolving statuses and combos. Returns true if the
// foe died from this hit.
export function hitFoe(world, foe, element, damage, angle) {
  const now = world.time;
  let dealt = damage * (foe.armour > 0 ? 0.55 : 1);
  let combo = null;

  if (element === 'frost') {
    foe.frozenUntil = Math.max(foe.frozenUntil, now + 0.55);
    foe.chilledAt = now;
    shards(foe.x, foe.y, 5);
  } else if (element === 'ember') {
    if (now - (foe.chilledAt ?? -99) <= COMBO_WINDOW && foe.hp - dealt > 0) combo = 'steam';
    foe.burningUntil = Math.max(foe.burningUntil, now + 2.2);
    foe.burnAt = now;
  } else if (element === 'storm') {
    if (now < foe.frozenUntil) combo = 'chain';
  }

  foe.hp -= dealt;
  foe.flash = 0.09;
  foe.x += Math.cos(angle) * (foe.kind === 'brute' || foe.boss ? 1.5 : 5);
  foe.y += Math.sin(angle) * (foe.kind === 'brute' || foe.boss ? 1.5 : 5);
  damageText(foe.x, foe.y - foe.r, dealt, ELEMENTS[element].hot);
  burst(foe.x, foe.y, ELEMENTS[element].color, 4, 150, 0.3, 2.6);
  sfx.hit();

  if (combo === 'steam') steamBurst(world, foe);
  if (combo === 'chain') chainLightning(world, foe);
  return foe.hp <= 0;
}

function steamBurst(world, foe) {
  const dmg = 26 * world.upgrades.comboMul;
  const R = 86;
  steam(foe.x, foe.y, 16, R * 0.6);
  ring(foe.x, foe.y, '#e8f4ff', R, 0.3);
  sfx.steam();
  world.hitStop = Math.max(world.hitStop, 0.045);
  damageText(foe.x, foe.y - foe.r - 16, 'STEAM BURST', '#e8f4ff', true);
  for (const other of [...world.enemies]) {
    if (other === foe) continue;
    if (Math.hypot(other.x - foe.x, other.y - foe.y) <= R + other.r) {
      other.hp -= dmg;
      damageText(other.x, other.y - other.r, dmg, '#e8f4ff');
      if (other.hp <= 0) world.killFoe(other, 'steam');
    }
  }
}

function chainLightning(world, source) {
  const dmg = 15 * world.upgrades.comboMul;
  let from = source;
  const struck = new Set([source]);
  const points = [{ x: source.x, y: source.y }];
  for (let hop = 0; hop < 3; hop++) {
    let best = null, bestD = 170;
    for (const e of world.enemies) {
      if (struck.has(e)) continue;
      const d = Math.hypot(e.x - from.x, e.y - from.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (!best) break;
    struck.add(best);
    const mid = { x: (from.x + best.x) / 2 + rng.range(-14, 14), y: (from.y + best.y) / 2 + rng.range(-14, 14) };
    points.push(mid, { x: best.x, y: best.y });
    best.hp -= dmg;
    best.flash = 0.09;
    damageText(best.x, best.y - best.r, dmg, ELEMENTS.storm.hot);
    if (best.hp <= 0) world.killFoe(best, 'storm');
    from = best;
  }
  if (points.length > 1) { arc(points); sfx.chain(); }
}

export function updateSpells(world, dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.life -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    let dead = p.life <= 0 || p.x < 8 || p.x > world.w - 8 || p.y < 8 || p.y > world.h - 8;

    if (!dead && p.element === 'ember') {
      for (const z of zones) {
        if (Math.hypot(z.x - p.x, z.y - p.y) < z.r) { wildfire(world, z); dead = true; break; }
      }
    }
    if (!dead) {
      for (const foe of [...world.enemies]) {
        if (Math.hypot(foe.x - p.x, foe.y - p.y) <= foe.r + p.r) {
          const ang = Math.atan2(p.vy, p.vx);
          if (p.element === 'ember') addBurnZone(world, p.x, p.y);
          if (hitFoe(world, foe, p.element, p.damage, ang)) world.killFoe(foe, p.element);
          if (p.pierce > 0) { p.pierce--; } else { dead = true; }
          break;
        }
      }
    }
    if (dead) projectiles.splice(i, 1);
  }

  for (let i = zones.length - 1; i >= 0; i--) {
    const z = zones[i];
    z.life -= dt; z.tick -= dt;
    if (z.life <= 0) { zones.splice(i, 1); continue; }
    if (rng.chance(0.3)) burst(z.x + rng.range(-z.r, z.r) * 0.6, z.y + rng.range(-z.r, z.r) * 0.6, '#ff9a3c', 1, 30, 0.5, 2.6);
    if (z.tick <= 0) {
      z.tick = 0.5;
      for (const foe of [...world.enemies]) {
        if (Math.hypot(foe.x - z.x, foe.y - z.y) <= z.r + foe.r) {
          foe.hp -= 4.5 * world.upgrades.comboMul;
          foe.burningUntil = Math.max(foe.burningUntil, world.time + 0.6);
          if (foe.hp <= 0) world.killFoe(foe, 'ember');
        }
      }
    }
  }
}

function wildfire(world, zone) {
  zone.r = Math.min(120, zone.r + 26);
  zone.life = Math.min(zone.maxLife + 1, zone.life + 1.2);
  ring(zone.x, zone.y, '#ff9a3c', zone.r, 0.3);
  burst(zone.x, zone.y, '#ffd23c', 14, 210, 0.4, 3);
  sfx.explosion();
  world.shake = Math.max(world.shake, 4);
  const dmg = 18 * world.upgrades.comboMul;
  for (const foe of [...world.enemies]) {
    if (Math.hypot(foe.x - zone.x, foe.y - zone.y) <= zone.r + foe.r) {
      foe.hp -= dmg;
      damageText(foe.x, foe.y - foe.r, dmg, '#ffd23c');
      if (foe.hp <= 0) world.killFoe(foe, 'ember');
    }
  }
  // The fire spreads: a fresh patch blooms at the edge of the old one.
  const a = rng.angle();
  addBurnZone(world, zone.x + Math.cos(a) * zone.r * 0.8, zone.y + Math.sin(a) * zone.r * 0.8);
}

export function drawSpells(ctx) {
  for (const z of zones) {
    const k = Math.min(1, z.life / z.maxLife + 0.25);
    const grad = ctx.createRadialGradient(z.x, z.y, 2, z.x, z.y, z.r);
    grad.addColorStop(0, `rgba(255, 122, 40, ${0.34 * k})`);
    grad.addColorStop(0.7, `rgba(193, 68, 14, ${0.22 * k})`);
    grad.addColorStop(1, 'rgba(193, 68, 14, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.fill();
  }
  for (const p of projectiles) {
    const c = ELEMENTS[p.element];
    ctx.fillStyle = c.color;
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.1, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = c.hot;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.62, 0, Math.PI * 2); ctx.fill();
  }
}
