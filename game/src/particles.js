// particles.js — the juice layer: sparks, embers, frost shards, steam puffs,
// shockwave rings, floating damage numbers and the lightning arcs left by
// Storm chains. One pooled array, updated and drawn by the world renderer.

import { rng } from './rng.js';

const MAX = 900;
const pool = [];
const arcs = [];
const texts = [];

function spawn(p) {
  if (pool.length >= MAX) pool.shift();
  pool.push(p);
}

export function burst(x, y, color, count, speed = 190, life = 0.5, size = 3, gravity = 0) {
  for (let i = 0; i < count; i++) {
    const a = rng.angle();
    const v = speed * (0.3 + rng.next() * 0.9);
    spawn({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: life * (0.5 + rng.next() * 0.8), maxLife: life,
      size: size * (0.5 + rng.next()), color, gravity, drag: 2.2, shape: 'spark',
    });
  }
}

export function embers(x, y, count = 6) {
  for (let i = 0; i < count; i++) {
    spawn({
      x: x + rng.range(-8, 8), y: y + rng.range(-8, 8),
      vx: rng.range(-24, 24), vy: rng.range(-70, -25),
      life: rng.range(0.5, 1.1), maxLife: 1.1, size: rng.range(1.5, 3.5),
      color: rng.chance(0.5) ? '#ff9a3c' : '#ffd23c', gravity: -30, drag: 0.4, shape: 'dot',
    });
  }
}

export function shards(x, y, count = 8) {
  for (let i = 0; i < count; i++) {
    const a = rng.angle();
    const v = rng.range(90, 260);
    spawn({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: rng.range(0.3, 0.6), maxLife: 0.6, size: rng.range(2, 5),
      color: rng.chance(0.5) ? '#7ce7ff' : '#e8fbff', gravity: 260, drag: 0.6, shape: 'shard',
    });
  }
}

export function steam(x, y, count = 10, radius = 46) {
  for (let i = 0; i < count; i++) {
    const a = rng.angle();
    const d = rng.next() * radius;
    spawn({
      x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      vx: rng.range(-16, 16), vy: rng.range(-46, -14),
      life: rng.range(0.5, 0.95), maxLife: 0.95, size: rng.range(9, 20),
      color: 'rgba(232, 244, 255, 0.16)', gravity: -12, drag: 0.8, shape: 'puff',
    });
  }
}

export function ring(x, y, color, maxR = 60, life = 0.32) {
  spawn({ x, y, vx: 0, vy: 0, life, maxLife: life, size: maxR, color, gravity: 0, drag: 0, shape: 'ring' });
}

export function arc(points, color = '#c792ff') {
  arcs.push({ points, color, life: 0.16, maxLife: 0.16 });
  if (arcs.length > 24) arcs.shift();
}

export function damageText(x, y, amount, color = '#f4ead8', big = false) {
  texts.push({
    x: x + rng.range(-6, 6), y: y - 6, vy: -56,
    life: 0.8, maxLife: 0.8, text: String(Math.round(amount)), color, big,
  });
  if (texts.length > 40) texts.shift();
}

export function updateParticles(dt) {
  for (let i = pool.length - 1; i >= 0; i--) {
    const p = pool[i];
    p.life -= dt;
    if (p.life <= 0) { pool.splice(i, 1); continue; }
    p.vy += p.gravity * dt;
    const dragK = Math.max(0, 1 - p.drag * dt);
    p.vx *= dragK; p.vy *= dragK;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for (let i = arcs.length - 1; i >= 0; i--) { arcs[i].life -= dt; if (arcs[i].life <= 0) arcs.splice(i, 1); }
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life -= dt; t.y += t.vy * dt; t.vy *= 0.92;
    if (t.life <= 0) texts.splice(i, 1);
  }
}

export function drawParticles(ctx) {
  for (const p of pool) {
    const k = p.life / p.maxLife;
    ctx.globalAlpha = Math.min(1, k * 1.6);
    if (p.shape === 'ring') {
      const r = p.size * (1 - k) + 6;
      ctx.strokeStyle = p.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
    } else if (p.shape === 'puff') {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.4 - k * 0.4), 0, Math.PI * 2); ctx.fill();
    } else if (p.shape === 'shard') {
      ctx.fillStyle = p.color;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.x * 0.05 + p.y * 0.03);
      ctx.fillRect(-p.size / 2, -1, p.size, 2);
      ctx.restore();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.4, p.size * k), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  for (const a of arcs) {
    ctx.globalAlpha = (a.life / a.maxLife) * 0.9;
    ctx.strokeStyle = a.color; ctx.lineWidth = 2;
    ctx.beginPath();
    a.points.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const t of texts) {
    ctx.globalAlpha = Math.min(1, (t.life / t.maxLife) * 2);
    ctx.font = t.big ? 'bold 20px system-ui, sans-serif' : 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

export function clearParticles() { pool.length = 0; arcs.length = 0; texts.length = 0; }
export function particleCount() { return pool.length; }
