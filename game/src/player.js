// player.js — the storm-caller: movement, the dash with its invulnerable
// frames, casting toward the mouse, and the figure itself.

import { pressed, mouse, moveVector } from './input.js';
import { ELEMENTS, ELEMENT_ORDER } from './palette.js';
import { castSpell } from './spells.js';
import { burst } from './particles.js';
import { sfx } from './audio.js';

export function makePlayer(w, h) {
  return {
    x: w / 2, y: h / 2 + 60, r: 15,
    hp: 100, maxHp: 100, essence: 0,
    element: 'ember', castT: 0,
    dashT: 0, dashCd: 0, charges: 1, chargeT: 0,
    iframes: 0, flash: 0, aim: 0, moving: false,
  };
}

export function switchElement(world, element) {
  if (world.player.element === element) return;
  world.player.element = element;
  burst(world.player.x, world.player.y, ELEMENTS[element].color, 8, 120, 0.3, 2.6);
  sfx.click();
}

export function updatePlayer(world, dt) {
  const p = world.player;
  const up = world.upgrades;
  p.castT -= dt; p.dashCd -= dt; p.iframes -= dt; p.flash = Math.max(0, p.flash - dt);
  p.aim = Math.atan2(mouse.y - p.y, mouse.x - p.x);

  for (const el of ELEMENT_ORDER) {
    if (pressed.has('Digit' + ELEMENTS[el].key)) switchElement(world, el);
  }
  if (pressed.has('KeyQ')) {
    const i = ELEMENT_ORDER.indexOf(p.element);
    switchElement(world, ELEMENT_ORDER[(i + 1) % ELEMENT_ORDER.length]);
  }

  // Dash charges refill one at a time.
  if (p.charges < up.dashCharges) {
    p.chargeT += dt;
    if (p.chargeT >= 1.6) { p.chargeT = 0; p.charges++; }
  } else p.chargeT = 0;

  const dashing = p.dashT > 0;
  if ((pressed.has('Space') || pressed.has('ShiftLeft') || pressed.has('ShiftRight')) && p.charges > 0 && !dashing) {
    const mv = moveVector();
    const a = mv.x === 0 && mv.y === 0 ? p.aim : Math.atan2(mv.y, mv.x);
    p.dashA = a; p.dashT = 0.16; p.charges--; p.iframes = Math.max(p.iframes, 0.26);
    world.stats.dashes++;
    burst(p.x, p.y, '#f4ead8', 10, 150, 0.3, 2.6);
    sfx.dash();
  }

  if (dashing) {
    p.dashT -= dt;
    p.x += Math.cos(p.dashA) * 880 * dt;
    p.y += Math.sin(p.dashA) * 880 * dt;
    burst(p.x, p.y, ELEMENTS[p.element].color, 1, 40, 0.25, 3);
  } else {
    const mv = moveVector();
    p.moving = mv.x !== 0 || mv.y !== 0;
    p.x += mv.x * 268 * dt;
    p.y += mv.y * 268 * dt;
  }
  p.x = Math.max(p.r, Math.min(world.w - p.r, p.x));
  p.y = Math.max(p.r, Math.min(world.h - p.r, p.y));

  if (mouse.down && p.castT <= 0) {
    p.castT = up.castInterval;
    world.stats.casts++;
    castSpell(world, p, p.aim, p.element);
  }
}

export function drawPlayer(ctx, world) {
  const p = world.player;
  const el = ELEMENTS[p.element];
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.iframes > 0 && Math.floor(world.time * 18) % 2 === 0) ctx.globalAlpha = 0.45;
  // Cloak: a teardrop that leans toward the aim.
  ctx.rotate(p.aim + Math.PI / 2);
  const grad = ctx.createLinearGradient(0, -18, 0, 18);
  grad.addColorStop(0, p.flash > 0 ? '#ffffff' : '#3d2b52');
  grad.addColorStop(1, '#1c1229');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.quadraticCurveTo(13, 6, 8, 17);
  ctx.quadraticCurveTo(0, 12, -8, 17);
  ctx.quadraticCurveTo(-13, 6, 0, -17);
  ctx.fill();
  ctx.rotate(-(p.aim + Math.PI / 2));
  // Head and the elemental orb held toward the mouse.
  ctx.fillStyle = '#f0d9b5';
  ctx.beginPath(); ctx.arc(0, -3, 7.5, 0, Math.PI * 2); ctx.fill();
  const ox = Math.cos(p.aim) * 19, oy = Math.sin(p.aim) * 19 - 2;
  ctx.fillStyle = el.color;
  ctx.globalAlpha *= 0.35;
  ctx.beginPath(); ctx.arc(ox, oy, 10, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = p.iframes > 0 && Math.floor(world.time * 18) % 2 === 0 ? 0.45 : 1;
  ctx.fillStyle = el.hot;
  ctx.beginPath(); ctx.arc(ox, oy, 4.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Dash charge pips under the caller.
  const up = world.upgrades;
  for (let i = 0; i < up.dashCharges; i++) {
    ctx.fillStyle = i < p.charges ? '#f4ead8' : 'rgba(244,234,216,0.22)';
    ctx.beginPath(); ctx.arc(p.x - (up.dashCharges - 1) * 7 + i * 14, p.y + p.r + 9, 3, 0, Math.PI * 2); ctx.fill();
  }
}
