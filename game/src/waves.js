// waves.js — wave compositions and the spawn director. Each wave is a list
// of foe kinds; the director trickles them in from the arena rim so the
// fight builds instead of arriving all at once. Every fifth wave is a boss.

import { rng } from './rng.js';
import { makeFoe, ELITES } from './enemies.js';
import { makeBoss } from './boss.js';

export function isBossWave(wave) { return wave % 5 === 0; }
export const FINAL_WAVE = 15;

function compFor(wave) {
  const list = [];
  const add = (kind, n) => { for (let i = 0; i < n; i++) list.push(kind); };
  add('chaser', 3 + Math.floor(wave * 1.2));
  if (wave >= 2) add('dasher', 1 + Math.floor(wave * 0.7));
  if (wave >= 3) add('spitter', 1 + Math.floor(wave * 0.55));
  if (wave >= 4) add('splitter', 1 + Math.floor(wave * 0.5));
  if (wave >= 6) add('brute', Math.floor((wave - 4) * 0.55));
  if (wave >= 11) add('chaser', 4);
  return list;
}

export function eliteChance(wave) {
  if (wave < 4) return 0;
  return Math.min(0.22, 0.05 + wave * 0.012);
}

export function startWave(world, wave) {
  world.wave = wave;
  world.waveState = 'fighting';
  if (isBossWave(wave)) {
    const boss = makeBoss(wave);
    boss.x = world.w / 2; boss.y = 130;
    world.enemies.push(boss);
    world.bossActive = true;
    world.spawnQueue = compFor(wave).slice(0, 6); // a small honour guard
    world.banner = { text: boss.name, t: 2.2 };
  } else {
    world.spawnQueue = compFor(wave);
    world.banner = { text: `WAVE ${wave}`, t: 1.6 };
  }
  world.spawnT = 0.4;
}

function spawnPoint(world) {
  // On the arena rim, biased away from the player so nothing lands on them.
  const p = world.player;
  for (let tries = 0; tries < 8; tries++) {
    const a = rng.angle();
    const x = world.w / 2 + Math.cos(a) * (world.w / 2 - 46);
    const y = world.h / 2 + Math.sin(a) * (world.h / 2 - 46);
    if (Math.hypot(x - p.x, y - p.y) > 210) return { x, y };
  }
  return { x: 60, y: 60 };
}

export function updateWaves(world, dt) {
  if (world.spawnQueue.length === 0) return;
  world.spawnT -= dt;
  if (world.spawnT > 0) return;
  world.spawnT = Math.max(0.32, 0.85 - world.wave * 0.03);
  const kind = world.spawnQueue.shift();
  const { x, y } = spawnPoint(world);
  const elite = rng.chance(eliteChance(world.wave)) ? rng.pick(ELITES) : null;
  world.enemies.push(makeFoe(kind, x, y, world.wave, elite));
  world.spawnFx.push({ x, y, t: 0.3 });
}

export function waveCleared(world) {
  return world.waveState === 'fighting' && world.spawnQueue.length === 0 && world.enemies.length === 0;
}
