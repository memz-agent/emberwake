// render.js — draws the whole frame: the arena (whose palette drifts with
// the wave tier), spells, foes, the caller, particles, then the HUD or the
// current screen on top. Screen shake is applied to the world layer only.

import { tierForWave } from './palette.js';
import { drawSpells } from './spells.js';
import { drawFoe, drawEnemyShots } from './enemies.js';
import { drawPlayer } from './player.js';
import { drawParticles } from './particles.js';
import { drawHud, drawTitle, drawHelp, drawShop, drawPaused, drawOver, drawVictory, beginButtons } from './hud.js';
import { rng } from './rng.js';

function drawArena(ctx, world) {
  const tier = tierForWave(world.wave || 1);
  const grad = ctx.createLinearGradient(0, 0, 0, world.h);
  grad.addColorStop(0, tier.top);
  grad.addColorStop(0.55, tier.mid);
  grad.addColorStop(1, tier.floor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, world.w, world.h);

  // Stone rings etched in the floor: three concentric summoning circles.
  ctx.strokeStyle = tier.ring;
  ctx.globalAlpha = 0.5;
  for (const r of [120, 210, 300]) {
    ctx.lineWidth = r === 210 ? 2.5 : 1.5;
    ctx.beginPath(); ctx.arc(world.w / 2, world.h / 2, r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Rim glow in the tier's accent colour.
  ctx.strokeStyle = tier.glow;
  ctx.globalAlpha = 0.24 + Math.sin(world.time * 1.4) * 0.05;
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, world.w - 12, world.h - 12);
  ctx.globalAlpha = 1;
  // Scattered floor runes (seeded positions, stable per wave).
  ctx.fillStyle = tier.ring;
  for (let i = 0; i < 14; i++) {
    const x = ((i * 173 + world.wave * 37) % (world.w - 80)) + 40;
    const y = ((i * 241 + world.wave * 91) % (world.h - 80)) + 40;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x, y, 3, 3);
  }
  ctx.globalAlpha = 1;

  for (const fx of world.spawnFx) {
    ctx.strokeStyle = '#ffd23c';
    ctx.globalAlpha = Math.max(0, fx.t / 0.3) * 0.8;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, 20 * (1 - fx.t / 0.3) + 4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawPickups(ctx, world) {
  for (const pk of world.pickups) {
    const bob = Math.sin(pk.t * 3) * 2;
    ctx.fillStyle = '#ffd23c';
    ctx.save();
    ctx.translate(pk.x, pk.y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3.4, -3.4, 6.8, 6.8);
    ctx.restore();
  }
}

export function render(ctx, world, best) {
  beginButtons();
  ctx.save();
  if (world.shake > 0.2) {
    ctx.translate(rng.range(-world.shake, world.shake) * 0.5, rng.range(-world.shake, world.shake) * 0.5);
  }
  drawArena(ctx, world);
  drawSpells(ctx);
  drawPickups(ctx, world);
  for (const foe of world.enemies) drawFoe(ctx, foe, world.time);
  drawEnemyShots(ctx);
  if (world.mode !== 'over') drawPlayer(ctx, world);
  drawParticles(ctx);
  ctx.restore();

  if (world.mode === 'playing' || world.mode === 'paused' || world.mode === 'shop') drawHud(ctx, world, best);
  if (world.mode === 'title') { drawHud(ctx, world, best); drawTitle(ctx, world, best); }
  if (world.mode === 'help') drawHelp(ctx, world);
  if (world.mode === 'shop') drawShop(ctx, world);
  if (world.mode === 'paused') drawPaused(ctx, world);
  if (world.mode === 'over') drawOver(ctx, world, best);
  if (world.mode === 'victory') drawVictory(ctx, world, best);
}
