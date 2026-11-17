// enemies.js — the five foe kinds of the Wake, their elite modifiers, their
// movement brains and their shapes. The boss lives in boss.js but is built
// from the same foe object shape.
//   chaser   — relentless, medium everything
//   dasher   — pauses, telegraphs, lunges
//   spitter  — keeps its distance and lobs globs at the player
//   splitter — bursts into three mites when killed
//   brute    — slow, huge, heavy contact damage
// Elites carry one modifier: swift (fast), armoured (damage cut), or
// volatile (explodes on death).

import { rng } from './rng.js';
import { burst, embers, ring } from './particles.js';
import { sfx } from './audio.js';

export const KINDS = {
  chaser:   { hp: 26, speed: 92,  r: 15, damage: 10, score: 10, essence: 1, color: '#e2543e' },
  dasher:   { hp: 20, speed: 74,  r: 13, damage: 12, score: 15, essence: 1, color: '#e8a13a' },
  spitter:  { hp: 22, speed: 62,  r: 14, damage: 8,  score: 15, essence: 2, color: '#7fb069' },
  splitter: { hp: 30, speed: 66,  r: 17, damage: 8,  score: 12, essence: 1, color: '#c65d8f' },
  mite:     { hp: 8,  speed: 128, r: 8,  damage: 5,  score: 4,  essence: 0, color: '#e08bb0' },
  brute:    { hp: 95, speed: 44,  r: 26, damage: 20, score: 30, essence: 4, color: '#8d5a97' },
};

export const ELITES = ['swift', 'armoured', 'volatile'];

export function makeFoe(kind, x, y, wave, elite = null) {
  const base = KINDS[kind];
  const scale = 1 + (wave - 1) * 0.16;
  const foe = {
    kind, x, y, vx: 0, vy: 0,
    hp: base.hp * scale, maxHp: base.hp * scale,
    speed: base.speed * (0.92 + rng.next() * 0.16),
    r: base.r, damage: base.damage, score: base.score, essence: base.essence,
    color: base.color, elite, armour: elite === 'armoured' ? 1 : 0,
    frozenUntil: -9, chilledAt: -99, burningUntil: -9, burnAt: -99,
    flash: 0, state: 'chase', stateT: rng.range(0.4, 1.2), shootT: rng.range(0.8, 1.8),
    wobble: rng.angle(), boss: false, touchCd: 0,
  };
  if (elite === 'swift') { foe.speed *= 1.45; foe.hp *= 1.2; foe.score *= 2; foe.essence += 1; }
  if (elite === 'armoured') { foe.hp *= 1.5; foe.score *= 2; foe.essence += 1; }
  if (elite === 'volatile') { foe.hp *= 1.15; foe.score *= 2; foe.essence += 2; }
  return foe;
}

export const enemyShots = [];
export function clearEnemyShots() { enemyShots.length = 0; }

function steer(foe, tx, ty, dt, speedMul = 1) {
  const dx = tx - foe.x, dy = ty - foe.y;
  const d = Math.hypot(dx, dy) || 1;
  foe.x += (dx / d) * foe.speed * speedMul * dt;
  foe.y += (dy / d) * foe.speed * speedMul * dt;
  return d;
}

export function updateFoe(world, foe, dt) {
  const p = world.player;
  const frozen = world.time < foe.frozenUntil;
  foe.flash = Math.max(0, foe.flash - dt);
  foe.touchCd = Math.max(0, foe.touchCd - dt);
  foe.wobble += dt * 3;

  // Burning foes smoulder and take a trickle of damage.
  if (world.time < foe.burningUntil) {
    foe.hp -= 3.2 * dt;
    if (rng.chance(0.25)) embers(foe.x, foe.y - foe.r * 0.4, 1);
    if (foe.hp <= 0) { world.killFoe(foe, 'ember'); return; }
  }
  if (frozen) return; // held fast by frost; combos can still land

  switch (foe.kind) {
    case 'chaser':
    case 'mite':
      steer(foe, p.x + Math.sin(foe.wobble) * 14, p.y + Math.cos(foe.wobble * 0.8) * 14, dt);
      break;
    case 'splitter':
    case 'brute':
      steer(foe, p.x, p.y, dt);
      break;
    case 'dasher': {
      foe.stateT -= dt;
      if (foe.state === 'chase') {
        steer(foe, p.x, p.y, dt, 0.75);
        if (foe.stateT <= 0) { foe.state = 'aim'; foe.stateT = 0.45; foe.aimX = p.x; foe.aimY = p.y; }
      } else if (foe.state === 'aim') {
        if (foe.stateT <= 0) {
          foe.state = 'lunge'; foe.stateT = 0.34;
          const a = Math.atan2(foe.aimY - foe.y, foe.aimX - foe.x);
          foe.vx = Math.cos(a) * 460; foe.vy = Math.sin(a) * 460;
        }
      } else {
        foe.x += foe.vx * dt; foe.y += foe.vy * dt;
        if (foe.stateT <= 0) { foe.state = 'chase'; foe.stateT = rng.range(0.7, 1.3); }
      }
      break;
    }
    case 'spitter': {
      const d = Math.hypot(p.x - foe.x, p.y - foe.y);
      if (d > 300) steer(foe, p.x, p.y, dt);
      else if (d < 210) steer(foe, foe.x * 2 - p.x, foe.y * 2 - p.y, dt, 0.7);
      else { foe.x += Math.cos(foe.wobble) * 22 * dt; foe.y += Math.sin(foe.wobble) * 22 * dt; }
      foe.shootT -= dt;
      if (foe.shootT <= 0 && d < 430) {
        foe.shootT = rng.range(1.5, 2.3);
        const a = Math.atan2(p.y - foe.y, p.x - foe.x);
        enemyShots.push({ x: foe.x, y: foe.y, vx: Math.cos(a) * 265, vy: Math.sin(a) * 265, r: 6, life: 2.4, damage: foe.damage });
        burst(foe.x, foe.y, '#7fb069', 3, 70, 0.2, 2.4);
      }
      break;
    }
  }

  foe.x = Math.max(foe.r, Math.min(world.w - foe.r, foe.x));
  foe.y = Math.max(foe.r, Math.min(world.h - foe.r, foe.y));

  // Contact damage, throttled per foe so standing in a crowd is survivable-ish.
  if (foe.touchCd <= 0 && Math.hypot(p.x - foe.x, p.y - foe.y) <= foe.r + p.r - 2) {
    foe.touchCd = 0.8;
    world.hurtPlayer(foe.damage, foe.x, foe.y);
  }
}

export function updateEnemyShots(world, dt) {
  const p = world.player;
  for (let i = enemyShots.length - 1; i >= 0; i--) {
    const s = enemyShots[i];
    s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    let dead = s.life <= 0 || s.x < 4 || s.x > world.w - 4 || s.y < 4 || s.y > world.h - 4;
    if (!dead && Math.hypot(p.x - s.x, p.y - s.y) <= p.r + s.r) {
      world.hurtPlayer(s.damage, s.x, s.y);
      dead = true;
    }
    if (dead) enemyShots.splice(i, 1);
  }
}

export function foeDeathEffects(world, foe) {
  burst(foe.x, foe.y, foe.color, foe.boss ? 42 : 14, 240, 0.5, 3.4);
  if (foe.elite === 'volatile') {
    ring(foe.x, foe.y, '#ffd23c', 74, 0.3);
    sfx.explosion();
    world.shake = Math.max(world.shake, 6);
    if (Math.hypot(world.player.x - foe.x, world.player.y - foe.y) < 84) world.hurtPlayer(14, foe.x, foe.y);
    for (const other of [...world.enemies]) {
      if (other !== foe && Math.hypot(other.x - foe.x, other.y - foe.y) < 80) {
        other.hp -= 22;
        if (other.hp <= 0) world.killFoe(other, 'volatile');
      }
    }
  }
  if (foe.kind === 'splitter') {
    for (let i = 0; i < 3; i++) {
      const a = rng.angle();
      const mite = makeFoe('mite', foe.x + Math.cos(a) * 14, foe.y + Math.sin(a) * 14, world.wave);
      world.enemies.push(mite);
    }
  }
}

export function drawFoe(ctx, foe, time) {
  const frozen = time < foe.frozenUntil;
  const body = foe.flash > 0 ? '#ffffff' : foe.color;
  ctx.save();
  ctx.translate(foe.x, foe.y);
  if (foe.elite) {
    ctx.strokeStyle = foe.elite === 'swift' ? '#ffe9a3' : foe.elite === 'armoured' ? '#cfd8e3' : '#ffd23c';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(0, 0, foe.r + 4 + Math.sin(time * 5 + foe.wobble) * 1.2, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = body;
  const wob = 1 + Math.sin(foe.wobble * 2) * 0.05;
  ctx.beginPath();
  if (foe.kind === 'brute' || foe.boss) {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + foe.wobble * 0.2;
      const rr = foe.r * (i % 2 ? 0.82 : 1) * wob;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (foe.kind === 'dasher') {
    ctx.moveTo(foe.r * 1.25, 0); ctx.lineTo(-foe.r * 0.8, foe.r * 0.8); ctx.lineTo(-foe.r * 0.35, 0); ctx.lineTo(-foe.r * 0.8, -foe.r * 0.8); ctx.closePath();
  } else if (foe.kind === 'spitter') {
    ctx.arc(0, 0, foe.r * wob, 0, Math.PI * 2);
    ctx.moveTo(foe.r * 0.4, -foe.r * 0.4); ctx.arc(0, 0, foe.r * 0.45, 0, Math.PI * 2);
  } else {
    ctx.arc(0, 0, foe.r * wob, 0, Math.PI * 2);
  }
  ctx.fill();
  // Eyes: two dark beads that read at any size.
  ctx.fillStyle = '#17090f';
  const look = Math.sin(foe.wobble) * 2;
  ctx.beginPath(); ctx.arc(-foe.r * 0.32 + look, -foe.r * 0.12, foe.r * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(foe.r * 0.32 + look, -foe.r * 0.12, foe.r * 0.13, 0, Math.PI * 2); ctx.fill();
  if (foe.state === 'aim' && foe.kind === 'dasher') {
    ctx.strokeStyle = 'rgba(255, 210, 60, 0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, foe.r + 7, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  if (frozen) {
    ctx.fillStyle = 'rgba(124, 231, 255, 0.4)';
    ctx.beginPath(); ctx.arc(foe.x, foe.y, foe.r * 1.05, 0, Math.PI * 2); ctx.fill();
  }
  if (foe.hp < foe.maxHp && !foe.boss) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(foe.x - foe.r, foe.y - foe.r - 9, foe.r * 2, 4);
    ctx.fillStyle = '#e2543e';
    ctx.fillRect(foe.x - foe.r, foe.y - foe.r - 9, foe.r * 2 * Math.max(0, foe.hp / foe.maxHp), 4);
  }
}

export function drawEnemyShots(ctx) {
  for (const s of enemyShots) {
    ctx.fillStyle = '#a8e063';
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 1.9, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#d9ffb0';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
}
