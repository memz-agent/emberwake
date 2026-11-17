// boss.js — the Wake Tyrant, arriving every fifth wave. A huge brute with
// three phases that unlock as its health falls:
//   Phase 1: charges at the player and spits radial bursts
//   Phase 2: adds summoning — it calls chasers and dashers to its side
//   Phase 3: enrages — faster charges, denser bursts, constant pressure

import { rng } from './rng.js';
import { KINDS, makeFoe, enemyShots } from './enemies.js';
import { burst, ring } from './particles.js';
import { sfx } from './audio.js';

export function makeBoss(wave) {
  const hp = 620 * (1 + (wave / 5 - 1) * 0.55);
  return {
    kind: 'brute', boss: true, x: 0, y: 0, vx: 0, vy: 0,
    hp, maxHp: hp, speed: 52, r: 46, damage: 26, score: 300, essence: 30,
    color: '#b03a5b', elite: null, armour: 0,
    frozenUntil: -9, chilledAt: -99, burningUntil: -9, burnAt: -99,
    flash: 0, state: 'stalk', stateT: 2, shootT: 1.2, wobble: 0, touchCd: 0,
    phase: 1, name: wave >= 15 ? 'THE WAKE TYRANT, UNBOUND' : 'THE WAKE TYRANT',
  };
}

export function bossPhase(boss) {
  const k = boss.hp / boss.maxHp;
  return k > 0.66 ? 1 : k > 0.33 ? 2 : 3;
}

function radialBurst(boss, count, speed) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rng.range(0, 0.3);
    enemyShots.push({ x: boss.x, y: boss.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 7, life: 3, damage: 12 });
  }
  burst(boss.x, boss.y, '#b03a5b', 10, 160, 0.3, 3);
  sfx.explosion();
}

export function updateBoss(world, boss, dt) {
  const p = world.player;
  boss.flash = Math.max(0, boss.flash - dt);
  boss.touchCd = Math.max(0, boss.touchCd - dt);
  boss.wobble += dt * 2;
  const phase = bossPhase(boss);
  if (phase !== boss.phase) {
    boss.phase = phase;
    ring(boss.x, boss.y, '#ffd23c', 130, 0.45);
    world.shake = Math.max(world.shake, 9);
    world.banner = { text: phase === 2 ? 'THE TYRANT CALLS ITS WAKE' : 'THE TYRANT RAGES', t: 1.6 };
    sfx.boss();
  }
  if (world.time < boss.burningUntil) {
    boss.hp -= 3.2 * dt;
    if (boss.hp <= 0) { world.killFoe(boss, 'ember'); return; }
  }
  if (world.time < boss.frozenUntil) return;

  const dx = p.x - boss.x, dy = p.y - boss.y;
  const dist = Math.hypot(dx, dy) || 1;
  boss.stateT -= dt;

  if (boss.state === 'stalk') {
    const speedMul = phase === 3 ? 1.35 : 1;
    boss.x += (dx / dist) * boss.speed * speedMul * dt;
    boss.y += (dy / dist) * boss.speed * speedMul * dt;
    boss.shootT -= dt;
    if (boss.shootT <= 0) {
      boss.shootT = phase === 3 ? 1.5 : 2.2;
      radialBurst(boss, phase === 1 ? 10 : 14, 205);
    }
    if (boss.stateT <= 0) {
      boss.state = 'windup'; boss.stateT = 0.55;
      boss.aimX = p.x; boss.aimY = p.y;
    }
  } else if (boss.state === 'windup') {
    if (boss.stateT <= 0) {
      boss.state = 'charge'; boss.stateT = 0.62;
      const a = Math.atan2(boss.aimY - boss.y, boss.aimX - boss.x);
      boss.vx = Math.cos(a) * (phase === 3 ? 560 : 470);
      boss.vy = Math.sin(a) * (phase === 3 ? 560 : 470);
      sfx.dash();
    }
  } else if (boss.state === 'charge') {
    boss.x += boss.vx * dt; boss.y += boss.vy * dt;
    if (boss.stateT <= 0) {
      boss.state = 'stalk';
      boss.stateT = phase === 1 ? 2.6 : phase === 2 ? 2 : 1.5;
      if (phase >= 2 && world.enemies.length < 9) {
        for (let i = 0; i < 2; i++) {
          const kind = rng.chance(0.5) ? 'chaser' : 'dasher';
          const foe = makeFoe(kind, boss.x + rng.range(-70, 70), boss.y + rng.range(-70, 70), world.wave);
          world.enemies.push(foe);
          burst(foe.x, foe.y, KINDS[kind].color, 8, 130, 0.3, 3);
        }
      }
    }
  }

  boss.x = Math.max(boss.r, Math.min(world.w - boss.r, boss.x));
  boss.y = Math.max(boss.r, Math.min(world.h - boss.r, boss.y));
  if (boss.touchCd <= 0 && Math.hypot(p.x - boss.x, p.y - boss.y) <= boss.r + p.r - 2) {
    boss.touchCd = 0.9;
    world.hurtPlayer(boss.damage, boss.x, boss.y);
  }
}
