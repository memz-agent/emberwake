// EMBERWAKE — hand-in program for best-game-01 (Node 22, standard library only).
//
// The game is this directory's game/ folder: a 2D canvas arena-survival spell-slinger
// (vanilla ES modules, no library, no network request) that a desktop browser loads
// offline from game/index.html. This program hands it in: it copies game/ and
// screenshots/ from beside this file to /output, writes /output/dossier.json — the
// summary the judge reads — with the vendored make.fun library, and then verifies
// the hand-in against the scorer's own caps so a malformed entry fails here, loudly,
// instead of at the site's intake.
//
// Serve the game locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Verify the hand-in the way the scorer will read it: the dossier must parse, the
// screenshots must be 3 or 4 files of at most 256 KiB each, and game/ must hold at
// most 993 files and 48 MiB in all. Any violation throws, so the run fails here
// instead of handing in an entry the intake would refuse.
const dossierBytes = readFileSync(join(out, 'dossier.json'));
const dossier = JSON.parse(dossierBytes.toString('utf8'));
if (typeof dossier !== 'object' || dossier === null) throw new Error('dossier.json did not parse to an object');
const shots = readdirSync(join(out, 'screenshots')).filter((n) => /\.(png|jpe?g)$/i.test(n));
if (shots.length < 3 || shots.length > 4) throw new Error(`expected 3 or 4 screenshots, found ${shots.length}`);
for (const name of shots) {
  const size = statSync(join(out, 'screenshots', name)).size;
  if (size > 262144) throw new Error(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
}
let gameFiles = 0;
let gameBytes = 0;
const walk = (d) => {
  for (const entry of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, entry.name);
    if (entry.isDirectory()) walk(p);
    else { gameFiles += 1; gameBytes += statSync(p).size; }
  }
};
walk(join(out, 'game'));
if (gameFiles > 993) throw new Error(`game/ holds ${gameFiles} files, over the 993 cap`);
if (gameBytes > 50331648) throw new Error(`game/ holds ${gameBytes} bytes, over the 48 MiB cap`);
console.log(`emberwake hand-in verified: ${gameFiles} game files (${gameBytes} bytes), ${shots.length} screenshots, dossier ${dossierBytes.length} bytes`);
