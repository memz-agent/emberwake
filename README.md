[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/memz-agent/emberwake/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/memz-agent/emberwake/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# Emberwake

A 2D arena survival game in the browser. You are a storm-caller holding a
summoning circle against the Wake — fifteen waves of creatures climbing out
of the deep, with a boss every fifth wave. Your weapon is not any single
element but what happens when the elements collide.

## The combo system

You cast three elements and switch between them freely. Statuses prime
foes for collisions:

- **Steam Burst** — chill a foe with Frost, then hit it with Ember: it
  detonates in a steam explosion that damages everything around it.
- **Chain Lightning** — cast Storm at a frozen foe: the bolt leaps to up
  to three neighbours.
- **Wildfire** — Ember leaves burning ground behind; land another Ember
  on a burning patch and the fire flares, grows, and spreads to a new
  patch.

## What is in the arena

- Five foe kinds with distinct behaviour — chasers, telegraph-and-lunge
  dashers, kiting spitters, splitters that burst into mites, and brute
  tanks — plus elite variants (swift, armoured, volatile).
- **The Wake Tyrant** every 5 waves: a phased boss that charges, fires
  radial bursts, summons allies, and enrages as it weakens.
- A between-wave shop: foes drop Essence; spend it on six upgrade lines
  (damage, cast rate, dash charges, vitality, combo potency, magnet).
- Survive to wave 15 to break the Wake, then keep going in endless mode.
- Juice throughout: particles, hit-stop, screen shake, damage numbers,
  knockback, and a fully procedural WebAudio soundtrack and effects —
  no audio files, no libraries, no network requests.

## Controls

| Action | Input |
| --- | --- |
| Move | WASD or arrow keys |
| Aim / cast | Mouse, hold to keep casting |
| Dash (invulnerable) | Space or Shift |
| Switch element | 1 Ember · 2 Frost · 3 Storm, or Q to cycle |
| Pause | P or Esc |

## Run it

The game is plain static files under `game/` — serve that folder with any
static file server and open `index.html`:

```sh
node serve.ts          # serves game/ at http://localhost:8080
```

To hand the entry in the way the competition harness does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `game/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored `vendor/makefun-game.ts` library.

The screenshots are real renders of the game's own code, captured from its
deterministic screenshot states (`game/index.html?shot=title|play|shop|boss&seed=1`).

## Layout

```
game/index.html        the page
game/src/main.js       boot + frame loop
game/src/world.js      the simulation step
game/src/player.js     the storm-caller
game/src/spells.js     projectiles, burning ground, combos
game/src/enemies.js    the five foe kinds and elites
game/src/boss.js       the Wake Tyrant
game/src/waves.js      wave compositions and spawning
game/src/shop.js       the between-wave market
game/src/hud.js        HUD and every screen
game/src/render.js     arena and world drawing
game/src/particles.js  sparks, steam, shards, damage numbers
game/src/audio.js      procedural WebAudio SFX and music
game/src/palette.js    element colours and wave-tier palettes
game/src/input.js      keyboard and mouse
game/src/rng.js        seeded randomness
game/src/storage.js    best score in localStorage
game/src/state.js      deterministic screenshot scenes
game/src/shots.js      the screenshot-ready handshake
```

MIT licensed — see `LICENSE`.
