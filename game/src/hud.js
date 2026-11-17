// hud.js — everything drawn over the arena: the in-fight HUD (health,
// essence, wave, score, element pips, boss bar), the wave banner, and every
// screen — title, how-to-play, shop, pause, game over and victory. Buttons
// are plain rectangles registered per frame; main.js routes clicks to them.

import { ELEMENTS, ELEMENT_ORDER, INK, INK_DIM, PANEL, PANEL_EDGE } from './palette.js';
import { WARES, MAX_RANK, priceOf } from './shop.js';
import { mouse } from './input.js';
import { FINAL_WAVE } from './waves.js';

export const buttons = [];

export function beginButtons() { buttons.length = 0; }

function button(ctx, x, y, w, h, label, opts = {}) {
  const hot = mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
  ctx.fillStyle = opts.disabled ? 'rgba(60,50,60,0.6)' : hot ? 'rgba(255, 210, 60, 0.9)' : 'rgba(30, 20, 38, 0.92)';
  ctx.strokeStyle = opts.disabled ? 'rgba(244,234,216,0.15)' : '#ffd23c';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = opts.disabled ? INK_DIM : hot ? '#1c1020' : INK;
  ctx.font = `bold ${opts.size || 17}px system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  if (!opts.disabled) buttons.push({ x, y, w, h, id: opts.id });
  return hot;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PANEL;
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 14); ctx.fill(); ctx.stroke();
}

function titleText(ctx, text, x, y, size, color = INK) {
  ctx.font = `bold ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function drawHud(ctx, world, best) {
  const p = world.player;
  const W = world.w;
  // Health bar, top left.
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, 18, 16, 264, 22, 6); ctx.fill();
  const hpK = Math.max(0, p.hp / p.maxHp);
  ctx.fillStyle = hpK > 0.3 ? '#7fb069' : '#e2543e';
  if (hpK > 0) { roundRect(ctx, 20, 18, 260 * hpK, 18, 5); ctx.fill(); }
  ctx.fillStyle = INK; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 28, 32);
  // Essence + dash hint under the bar.
  ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillStyle = '#ffd23c';
  ctx.fillText(`◆ ${p.essence} essence`, 20, 60);
  ctx.fillStyle = INK_DIM; ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`best ${best.score}`, 20, 78);

  // Wave + score, top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = INK; ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.wave} / ${FINAL_WAVE}`, W - 20, 36);
  ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillStyle = '#ffd23c';
  ctx.fillText(`score ${world.score}`, W - 20, 58);
  ctx.fillStyle = INK_DIM; ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(`foes left ${world.enemies.length + world.spawnQueue.length}`, W - 20, 76);

  // Element pips, bottom centre.
  const bw = 52, gap = 8, total = bw * 3 + gap * 2;
  let x = (W - total) / 2;
  for (const el of ELEMENT_ORDER) {
    const active = p.element === el;
    ctx.fillStyle = active ? ELEMENTS[el].color : 'rgba(20,14,26,0.75)';
    ctx.strokeStyle = ELEMENTS[el].color; ctx.lineWidth = active ? 2.5 : 1;
    roundRect(ctx, x, world.h - 44, bw, 30, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = active ? '#140b16' : ELEMENTS[el].color;
    ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${ELEMENTS[el].key} ${ELEMENTS[el].name.toUpperCase()}`, x + bw / 2, world.h - 24);
    x += bw + gap;
  }

  // Boss health, top centre.
  const boss = world.enemies.find((e) => e.boss);
  if (boss) {
    const bw2 = Math.min(520, W * 0.5);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(ctx, (W - bw2) / 2, 14, bw2, 16, 6); ctx.fill();
    ctx.fillStyle = '#b03a5b';
    const k = Math.max(0, boss.hp / boss.maxHp);
    if (k > 0) { roundRect(ctx, (W - bw2) / 2 + 2, 16, (bw2 - 4) * k, 12, 5); ctx.fill(); }
    ctx.fillStyle = INK; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(boss.name, W / 2, 44);
  }

  if (world.banner) {
    ctx.globalAlpha = Math.min(1, world.banner.t);
    titleText(ctx, world.banner.text, W / 2, 120, 34, '#ffd23c');
    ctx.globalAlpha = 1;
  }
}

export function drawTitle(ctx, world, best) {
  const W = world.w, H = world.h;
  ctx.fillStyle = 'rgba(10, 6, 14, 0.45)';
  ctx.fillRect(0, 0, W, H);
  titleText(ctx, 'EMBERWAKE', W / 2, 168, 74, '#ffd23c');
  ctx.font = '17px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = INK;
  ctx.fillText('A storm-caller holds the arena against the waking deep.', W / 2, 204);
  ctx.fillText('Weave Ember, Frost and Storm — and make the elements collide.', W / 2, 228);
  button(ctx, W / 2 - 110, 268, 220, 52, '▶  ENTER THE WAKE', { id: 'start', size: 19 });
  button(ctx, W / 2 - 110, 334, 220, 44, 'HOW TO PLAY', { id: 'help' });
  ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = INK_DIM;
  ctx.fillText(`Best score ${best.score} · Best wave ${best.wave}`, W / 2, 424);
  ctx.fillText('Survive to wave 15 to break the Wake. The deep keeps what it catches.', W / 2, H - 58);
}

export function drawHelp(ctx, world) {
  const W = world.w, H = world.h;
  ctx.fillStyle = 'rgba(10, 6, 14, 0.72)'; ctx.fillRect(0, 0, W, H);
  const pw = 620, ph = 430, px = (W - pw) / 2, py = (H - ph) / 2;
  panel(ctx, px, py, pw, ph);
  titleText(ctx, 'HOW TO PLAY', W / 2, py + 46, 28, '#ffd23c');
  ctx.textAlign = 'left'; ctx.fillStyle = INK; ctx.font = '15px system-ui, sans-serif';
  const lines = [
    ['Move', 'WASD or arrow keys'],
    ['Aim & cast', 'Mouse — hold to keep casting'],
    ['Dash', 'Space or Shift — a blink with invulnerable frames'],
    ['Elements', '1 Ember · 2 Frost · 3 Storm (or Q to cycle)'],
    ['', ''],
    ['COMBOS — the elements collide:', ''],
    ['Steam Burst', 'Frost a foe, then burn it with Ember'],
    ['Chain Lightning', 'Cast Storm at a frozen foe'],
    ['Wildfire', 'Land Ember on burning ground to spread the fire'],
    ['', ''],
    ['Between waves', 'Spend Essence in the shop. Bosses wake every 5 waves.'],
    ['Goal', 'Survive to wave 15. After that, the deep is endless.'],
  ];
  let y = py + 84;
  for (const [a, b] of lines) {
    if (a && !b) { ctx.fillStyle = '#ffd23c'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillText(a, px + 36, y); ctx.fillStyle = INK; ctx.font = '15px system-ui, sans-serif'; }
    else if (a) {
      ctx.fillStyle = '#ffd23c'; ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(a, px + 36, y);
      ctx.fillStyle = INK; ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(b, px + 190, y);
    }
    y += 26;
  }
  button(ctx, W / 2 - 80, py + ph - 58, 160, 40, 'BACK', { id: 'back' });
}

export function drawShop(ctx, world) {
  const W = world.w, H = world.h;
  ctx.fillStyle = 'rgba(10, 6, 14, 0.55)'; ctx.fillRect(0, 0, W, H);
  const pw = 760, ph = 452, px = (W - pw) / 2, py = (H - ph) / 2 - 8;
  panel(ctx, px, py, pw, ph);
  titleText(ctx, `WAVE ${world.wave} CLEARED`, W / 2, py + 44, 30, '#7fb069');
  ctx.font = '15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = INK;
  ctx.fillText(`The deep stirs again soon. You hold ◆ ${world.player.essence} essence.`, W / 2, py + 72);

  const cols = 3, cw = 228, ch = 118, gx = 16, gy = 14;
  WARES.forEach((ware, i) => {
    const cx = px + 24 + (i % cols) * (cw + gx);
    const cy = py + 92 + Math.floor(i / cols) * (ch + gy);
    const rank = world.upgradeRanks[ware.id];
    const maxed = rank >= MAX_RANK;
    const price = maxed ? null : priceOf(ware, rank);
    const afford = !maxed && world.player.essence >= price;
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    ctx.strokeStyle = PANEL_EDGE; ctx.lineWidth = 1;
    roundRect(ctx, cx, cy, cw, ch, 10); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = INK; ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(ware.name, cx + 12, cy + 24);
    ctx.fillStyle = INK_DIM; ctx.font = '12px system-ui, sans-serif';
    wrapText(ctx, ware.desc, cx + 12, cy + 44, cw - 24, 15);
    // Rank pips.
    for (let r = 0; r < MAX_RANK; r++) {
      ctx.fillStyle = r < rank ? '#ffd23c' : 'rgba(244,234,216,0.2)';
      ctx.beginPath(); ctx.arc(cx + 16 + r * 14, cy + 82, 4, 0, Math.PI * 2); ctx.fill();
    }
    if (maxed) {
      ctx.fillStyle = INK_DIM; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('MAXED', cx + cw - 12, cy + 86);
    } else {
      button(ctx, cx + cw - 92, cy + 68, 80, 34, `◆ ${price}`, { id: 'buy:' + ware.id, size: 14, disabled: !afford });
    }
  });

  const bossNext = (world.wave + 1) % 5 === 0;
  button(ctx, W / 2 - 130, py + ph - 56, 260, 44, bossNext ? `FACE WAVE ${world.wave + 1} — A BOSS WAKES` : `BEGIN WAVE ${world.wave + 1}`, { id: 'next', size: 16 });
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const word of words) {
    const trial = line ? line + ' ' + word : word;
    if (ctx.measureText(trial).width > maxW && line) { ctx.fillText(line, x, yy); line = word; yy += lineH; }
    else line = trial;
  }
  if (line) ctx.fillText(line, x, yy);
}

export function drawPaused(ctx, world) {
  const W = world.w, H = world.h;
  ctx.fillStyle = 'rgba(10, 6, 14, 0.6)'; ctx.fillRect(0, 0, W, H);
  titleText(ctx, 'PAUSED', W / 2, H / 2 - 60, 44, INK);
  button(ctx, W / 2 - 100, H / 2 - 20, 200, 46, 'RESUME', { id: 'resume' });
  button(ctx, W / 2 - 100, H / 2 + 40, 200, 46, 'RESTART RUN', { id: 'restart' });
}

export function drawOver(ctx, world, best) {
  const W = world.w, H = world.h;
  ctx.fillStyle = 'rgba(14, 4, 8, 0.66)'; ctx.fillRect(0, 0, W, H);
  titleText(ctx, 'THE DEEP TAKES YOU', W / 2, 190, 46, '#e2543e');
  drawStats(ctx, world, best, 250);
  button(ctx, W / 2 - 110, 470, 220, 50, '↻  CAST AGAIN', { id: 'restart', size: 18 });
}

export function drawVictory(ctx, world, best) {
  const W = world.w, H = world.h;
  ctx.fillStyle = 'rgba(8, 12, 6, 0.6)'; ctx.fillRect(0, 0, W, H);
  titleText(ctx, 'THE WAKE BREAKS', W / 2, 180, 50, '#ffd23c');
  ctx.font = '16px Georgia, serif'; ctx.textAlign = 'center'; ctx.fillStyle = INK;
  ctx.fillText('Fifteen waves held. The storm is yours — keep it as long as you can.', W / 2, 214);
  drawStats(ctx, world, best, 246);
  button(ctx, W / 2 - 190, 462, 180, 50, '↻  NEW RUN', { id: 'restart', size: 16 });
  button(ctx, W / 2 + 10, 462, 180, 50, 'ENDLESS DEEP →', { id: 'endless', size: 16 });
}

function drawStats(ctx, world, best, y) {
  const rows = [
    ['Score', world.score], ['Best score', best.score],
    ['Wave reached', world.wave], ['Foes felled', world.kills],
    ['Essence gathered', world.essenceEarned], ['Combos triggered', world.stats.combos],
  ];
  ctx.font = '16px system-ui, sans-serif';
  rows.forEach(([label, value], i) => {
    const yy = y + i * 30;
    ctx.textAlign = 'right'; ctx.fillStyle = INK_DIM;
    ctx.fillText(label, world.w / 2 - 14, yy);
    ctx.textAlign = 'left'; ctx.fillStyle = INK; ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(String(value), world.w / 2 + 14, yy);
    ctx.font = '16px system-ui, sans-serif';
  });
}

export function handleButton(id, world, actions) {
  if (id === 'start') actions.start();
  else if (id === 'help') world.mode = 'help';
  else if (id === 'back') world.mode = 'title';
  else if (id === 'resume') world.mode = 'playing';
  else if (id === 'restart') actions.start();
  else if (id === 'next') actions.next();
  else if (id === 'endless') actions.endless();
  else if (id.startsWith('buy:')) actions.buy(id.slice(4));
}
