// main.js — boot and the frame loop. Owns the canvas, the world, the fixed
// simulation step (120 Hz, hit-stop aware), click routing to HUD buttons,
// pause, and the deterministic ?shot= mode used for screenshots.

import { attachInput, endFrame, pressed, mouse } from './input.js';
import { makeWorld, stepWorld, nextWave } from './world.js';
import { render } from './render.js';
import { buttons, handleButton } from './hud.js';
import { buy } from './shop.js';
import { buildShotWorld, shotParam } from './state.js';
import { frameRendered } from './shots.js';
import { updateParticles, clearParticles } from './particles.js';
import { updateMusic, unlockAudio, sfx } from './audio.js';
import { loadBest, saveBest } from './storage.js';
import { reseed } from './rng.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

let best = loadBest();
const shot = shotParam();
let world;

const actions = {
  start() {
    unlockAudio();
    clearParticles();
    world.startRun();
  },
  next() { nextWave(world); },
  endless() { nextWave(world); },
  buy(id) { buy(world, id); },
};

function routeClick() {
  if (!mouse.clicked) return;
  unlockAudio();
  for (const b of buttons) {
    if (mouse.x >= b.x && mouse.x <= b.x + b.w && mouse.y >= b.y && mouse.y <= b.y + b.h) {
      sfx.click();
      handleButton(b.id, world, actions);
      return;
    }
  }
}

function ambientTitle(dt) {
  // Behind the title the arena idles: foes drift, embers rise.
  world.time += dt;
  for (const foe of world.enemies) {
    foe.wobble += dt * 2;
    foe.x += Math.cos(foe.wobble * 0.6) * 9 * dt;
    foe.y += Math.sin(foe.wobble * 0.45) * 9 * dt;
  }
}

if (shot) {
  world = buildShotWorld(shot.name, shot.seed, W, H) || makeWorld(W, H);
} else {
  reseed((Date.now() % 2147483646) + 1);
  world = makeWorld(W, H);
  world.mode = 'title';
  // A living backdrop for the title screen: foes idling around a burn patch.
  const backdrop = buildShotWorld('title', 3, W, H);
  world.enemies = backdrop.enemies;
  world.wave = 3;
  reseed((Date.now() % 2147483646) + 1);
}

attachInput(canvas);

let last = performance.now();
let acc = 0;
const STEP = 1 / 120;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  if (!shot) {
    if (pressed.has('KeyP') || pressed.has('Escape')) {
      if (world.mode === 'playing') world.mode = 'paused';
      else if (world.mode === 'paused') world.mode = 'playing';
      else if (world.mode === 'help') world.mode = 'title';
    }
    if (pressed.has('Enter')) {
      if (world.mode === 'title' || world.mode === 'over') actions.start();
      else if (world.mode === 'shop') actions.next();
      else if (world.mode === 'victory') actions.endless();
    }

    if (world.mode === 'playing' || world.mode === 'shop') {
      acc += dt;
      while (acc >= STEP) { stepWorld(world, STEP); acc -= STEP; }
    } else if (world.mode === 'title' || world.mode === 'help') {
      ambientTitle(dt);
    } else {
      world.time += dt;
    }
    updateParticles(dt);
    if (world.mode === 'over' || world.mode === 'victory') {
      const saved = saveBest(world.score, world.wave);
      best = saved;
    }
    updateMusic(dt, world.wave, world.bossActive);
  }

  render(ctx, world, best);
  routeClick();
  endFrame();
  frameRendered(!!shot);
}
requestAnimationFrame(frame);
