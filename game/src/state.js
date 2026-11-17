// state.js — deterministic screenshot scenes. With ?shot=<name>&seed=<n> the
// game builds one frozen, representative scene instead of starting live
// play, so screenshots are real renders of the game's own code, identical
// on every load: title (the menu over a living arena), play (a mid-fight
// wave), shop (the between-wave market) and boss (the Wave 5 Tyrant fight).

import { reseed, rng } from './rng.js';
import { makeWorld } from './world.js';
import { startWave } from './waves.js';
import { makeFoe } from './enemies.js';
import { makeBoss } from './boss.js';
import { addBurnZone } from './spells.js';
import { burst, embers, steam } from './particles.js';
import { mouse } from './input.js';

function scatterFoes(world, specs) {
  for (const [kind, fx, fy, elite] of specs) {
    const foe = makeFoe(kind, world.w * fx, world.h * fy, world.wave, elite || null);
    world.enemies.push(foe);
  }
}

function primeFight(world) {
  // A lived-in battlefield: a burn patch, mid-flight spells and particles.
  addBurnZone(world, world.w * 0.62, world.h * 0.58);
  embers(world.w * 0.3, world.h * 0.4, 10);
  burst(world.w * 0.7, world.h * 0.35, '#7ce7ff', 12, 180, 0.6, 3);
  steam(world.w * 0.55, world.h * 0.45, 8, 40);
  world.player.element = 'frost';
  mouse.x = world.w * 0.72; mouse.y = world.h * 0.3;
  world.player.aim = Math.atan2(mouse.y - world.player.y, mouse.x - world.player.x);
}

export function buildShotWorld(name, seed, w, h) {
  reseed(seed * 7919 + 13);
  const world = makeWorld(w, h);
  world.player.hp = 78;
  world.player.essence = 23;
  world.score = 1240;

  if (name === 'title') {
    world.wave = 3;
    scatterFoes(world, [
      ['chaser', 0.22, 0.3], ['dasher', 0.8, 0.26], ['spitter', 0.68, 0.72],
      ['splitter', 0.3, 0.74], ['chaser', 0.52, 0.2, 'swift'],
    ]);
    primeFight(world);
    world.mode = 'title';
  } else if (name === 'play') {
    world.wave = 6;
    world.mode = 'playing';
    world.waveState = 'fighting';
    scatterFoes(world, [
      ['chaser', 0.24, 0.34], ['chaser', 0.3, 0.62], ['dasher', 0.78, 0.3, 'swift'],
      ['spitter', 0.82, 0.66], ['splitter', 0.6, 0.78], ['brute', 0.16, 0.78, 'armoured'],
      ['mite', 0.56, 0.72], ['mite', 0.63, 0.68],
    ]);
    const chilled = world.enemies[0];
    chilled.chilledAt = 0; chilled.frozenUntil = 999;
    primeFight(world);
    world.time = 12;
  } else if (name === 'shop') {
    world.wave = 4;
    world.mode = 'shop';
    world.waveState = 'cleared';
    world.player.essence = 47;
    world.player.hp = 64;
    world.upgradeRanks.damage = 2;
    world.upgradeRanks.magnet = 1;
    world.recalc();
    world.score = 2680;
    embers(world.w * 0.5, world.h * 0.5, 8);
  } else if (name === 'boss') {
    world.wave = 5;
    world.mode = 'playing';
    world.waveState = 'fighting';
    const boss = makeBoss(5);
    boss.x = world.w * 0.62; boss.y = world.h * 0.34;
    boss.hp = boss.maxHp * 0.58; boss.phase = 2;
    world.enemies.push(boss);
    world.bossActive = true;
    scatterFoes(world, [['chaser', 0.2, 0.7], ['dasher', 0.85, 0.72]]);
    world.banner = { text: 'THE WAKE TYRANT', t: 99 };
    primeFight(world);
    world.time = 30;
    world.score = 3950;
  } else {
    return null;
  }
  // Let the seeded rng settle the particle field identically each load.
  for (let i = 0; i < 6; i++) rng.next();
  return world;
}

export function shotParam() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return null;
  return { name: shot, seed: Number(q.get('seed') || 1) || 1 };
}
