// world.js — the simulation: the world object every module shares, the
// fixed-step update (player, foes, boss, spells, pickups, waves), damage to
// the player, kills and scoring, and essence pickups that drift home.

import { makePlayer } from './player.js';
import { updatePlayer } from './player.js';
import { updateFoe, updateEnemyShots, foeDeathEffects } from './enemies.js';
import { updateBoss } from './boss.js';
import { updateSpells, clearSpells } from './spells.js';
import { updateWaves, startWave, waveCleared, FINAL_WAVE } from './waves.js';
import { freshUpgrades, derive } from './shop.js';
import { burst, embers } from './particles.js';
import { sfx } from './audio.js';
import { rng } from './rng.js';

export function makeWorld(w, h) {
  const world = {
    w, h, time: 0,
    mode: 'title', // title | help | playing | shop | paused | over | victory
    player: makePlayer(w, h),
    enemies: [], pickups: [], spawnFx: [],
    spawnQueue: [], spawnT: 0,
    wave: 0, waveState: 'idle', bossActive: false,
    score: 0, kills: 0, essenceEarned: 0,
    upgradeRanks: freshUpgrades(), upgrades: null,
    shake: 0, hitStop: 0, banner: null, interT: 0,
    stats: { casts: 0, combos: 0, dashes: 0 },
    recalc() {
      const d = derive(this.upgradeRanks);
      const oldMax = this.player.maxHp;
      this.upgrades = d;
      this.player.maxHp = 100 + d.maxHpBonus;
      if (this.player.maxHp > oldMax) this.player.hp += this.player.maxHp - oldMax;
      this.player.charges = Math.min(this.player.charges, d.dashCharges);
    },
    healPlayer(n) { this.player.hp = Math.min(this.player.maxHp, this.player.hp + n); },
    hurtPlayer(dmg, fromX, fromY) {
      const p = this.player;
      if (p.iframes > 0 || this.mode !== 'playing') return;
      p.hp -= dmg; p.flash = 0.12; p.iframes = 0.55;
      this.shake = Math.max(this.shake, 6);
      const a = Math.atan2(p.y - fromY, p.x - fromX);
      p.x += Math.cos(a) * 16; p.y += Math.sin(a) * 16;
      burst(p.x, p.y, '#ff5d5d', 10, 180, 0.35, 3);
      sfx.hurt();
      if (p.hp <= 0) { p.hp = 0; this.gameOver(); }
    },
    killFoe(foe, byElement) {
      const i = this.enemies.indexOf(foe);
      if (i === -1) return;
      this.enemies.splice(i, 1);
      this.kills++;
      this.score += foe.score;
      if (byElement === 'steam' || byElement === 'storm') this.stats.combos++;
      foeDeathEffects(this, foe);
      const n = foe.essence + (rng.chance(0.3) ? 1 : 0);
      for (let k = 0; k < n; k++) {
        this.pickups.push({ x: foe.x + rng.range(-14, 14), y: foe.y + rng.range(-14, 14), vx: rng.range(-40, 40), vy: rng.range(-40, 40), t: rng.range(0, 6) });
      }
      if (foe.boss) {
        this.bossActive = false;
        this.shake = Math.max(this.shake, 12);
        this.hitStop = Math.max(this.hitStop, 0.12);
        sfx.explosion();
      } else {
        this.hitStop = Math.max(this.hitStop, 0.018);
      }
    },
    gameOver() {
      this.mode = 'over';
      burst(this.player.x, this.player.y, '#f4ead8', 40, 280, 0.8, 3.4);
      sfx.defeat();
    },
    startRun() {
      this.player = makePlayer(this.w, this.h);
      this.enemies = []; this.pickups = []; this.spawnFx = [];
      this.upgradeRanks = freshUpgrades();
      this.score = 0; this.kills = 0; this.essenceEarned = 0;
      this.stats = { casts: 0, combos: 0, dashes: 0 };
      this.bossActive = false;
      clearSpells();
      this.recalc();
      this.mode = 'playing';
      startWave(this, 1);
      sfx.wave();
    },
  };
  world.recalc();
  return world;
}

export function stepWorld(world, dt) {
  world.time += dt;
  if (world.banner) { world.banner.t -= dt; if (world.banner.t <= 0) world.banner = null; }
  world.shake = Math.max(0, world.shake - dt * 26);
  for (let i = world.spawnFx.length - 1; i >= 0; i--) {
    world.spawnFx[i].t -= dt;
    if (world.spawnFx[i].t <= 0) world.spawnFx.splice(i, 1);
  }
  if (world.mode !== 'playing') return;

  if (world.hitStop > 0) { world.hitStop -= dt; return; } // the frozen beat after a kill

  updatePlayer(world, dt);
  updateSpells(world, dt);
  updateWaves(world, dt);
  for (const foe of [...world.enemies]) {
    if (foe.boss) updateBoss(world, foe, dt); else updateFoe(world, foe, dt);
  }
  updateEnemyShots(world, dt);

  // Essence drifts to the caller inside the magnet radius, then is banked.
  const p = world.player;
  for (let i = world.pickups.length - 1; i >= 0; i--) {
    const pk = world.pickups[i];
    pk.t += dt * 2;
    const d = Math.hypot(p.x - pk.x, p.y - pk.y);
    if (d < world.upgrades.magnetR) {
      const pull = 340 * dt;
      pk.x += ((p.x - pk.x) / (d || 1)) * pull;
      pk.y += ((p.y - pk.y) / (d || 1)) * pull;
    } else {
      pk.x += pk.vx * dt; pk.y += pk.vy * dt;
      pk.vx *= 0.9; pk.vy *= 0.9;
    }
    if (d < p.r + 9) {
      world.pickups.splice(i, 1);
      p.essence++; world.essenceEarned++;
      if (world.essenceEarned % 6 === 0) embers(p.x, p.y - 10, 2);
      sfx.pickup();
    }
  }

  if (waveCleared(world)) {
    world.waveState = 'cleared';
    world.score += 25 * world.wave;
    if (world.wave >= FINAL_WAVE) {
      world.mode = 'victory';
      sfx.victory();
    } else {
      world.mode = 'shop';
      world.interT = 0;
      sfx.wave();
    }
  }
}

export function nextWave(world) {
  world.mode = 'playing';
  startWave(world, world.wave + 1);
  sfx.wave();
}
