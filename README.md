# bloomline

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/ujang201/bloomline/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/ujang201/bloomline/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

BLOOMLINE — an original garden tower defense: defend the golden Heartseed through 10 waves. Plant Briar Thorns, Frostblooms and Sunspores on 12 soil plots, upgrade them, and stop the Blight Queen.

## Run it

```sh
node serve.ts # serves game/ at http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=wfjv7kgb&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

## How to play (locally)

Open http://localhost:8080 in desktop Chrome, click **Click to play**, then:

- Mouse: hover a plot to see a tower's range, click to plant the selected tower,
  click a planted tower to select it
- `1` / `2` / `3` pick Briar Thorn / Frostbloom / Sunspore
- `U` upgrade the selected tower · `X` sell it (70% back)
- `Space` / `Enter` send the next wave · `F` toggle 1×/2× speed · `P` pause
- `M` mute · `R` restart

Win: clear wave 10 · Kill: +10 score and nectar bounty · Wave clear: +25 + 5/wave
nectar, +50 × wave score · Victory bonus: +50 score per Heartseed health left.

## What is in the game

- **Complete:** a goal (defend the Heartseed), rules, a way to win, lose and
  score, a title screen, a restart, and a HUD (nectar, Heartseed health, wave,
  score, kills, enemies left, best score).
- **Depth:** 3 tower types with distinct roles (fast single-target, slowing,
  splash), 3 upgrade levels each, 4 enemy types plus a boss, 10 hand-tuned
  waves, an economy where every kill pays and every wave clear pays more.
- **Feel:** fixed 60 Hz simulation separate from rendering, pooled enemies /
  projectiles / particles (no per-frame allocation in the hot loop), hit flashes,
  slow rings, screen shake on leaks, WebAudio-synthesised sounds, 1×/2× speed.
- **Look:** all art drawn in canvas — checkerboard garden, winding dirt path,
  wildflowers, fireflies, a glowing Heartseed with a health ring — one coherent
  green-and-gold palette, no copied game, art or names.
- **Code:** one module per job (`config`, `state`, `enemies`, `towers`, `world`,
  `render`, `audio`, `input`, `shots`, `main`), a single state store, a seeded
  RNG so every screenshot scene replays exactly.

## Build the submission

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to the
output dir and writes `dossier.json` with `vendor/makefun-game.ts`.
It is deterministic: two runs write byte-identical output.

## Screenshots

`1-start.jpg` (cover) — title screen over the planted garden;
`2-play.jpg` — mid-wave 5, towers firing; `3-boss.jpg` — wave 10, the Blight
Queen on the path; `4-end.jpg` — victory screen. All are real renders of this
game's code in headless Chromium (`?shot=…&seed=1`), unedited.

Referral noted by the entrant: https://make.fun/r/wfjv7kgb (code `wfjv7kgb`).
