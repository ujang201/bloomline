// The screenshot scenes behind ?shot=start|play|boss|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot that plants towers, upgrades them and sends waves, so every frame is
// what a real game looks like — and the same seed always gives the same frame.
import { STEP, TOTAL_WAVES } from './config.js';
import { upgradeCost } from './towers.js';

/** Plots in the order the autopilot fills them: the middle of the garden first. */
const PLOT_PRIORITY = [2, 7, 1, 6, 3, 8, 0, 5, 4, 9, 10, 11];
/** Which tower type the autopilot plants on its nth build. */
const BUILD_ORDER = ['thorn', 'thorn', 'frost', 'sun', 'thorn', 'frost', 'sun', 'thorn', 'sun', 'frost', 'thorn', 'sun'];

const START_SECONDS = 5;
const PLAY_WAVES = 4;
const BOSS_WAVES = 9;
const END_LIMIT_SECONDS = 900;
const SAMPLE = STEP;

/** One build-phase decision: spend nectar, then send the next wave. */
function autopilotBuild(world) {
  const s = world.state;
  if (s.phase !== 'build') return;
  // Plant on the next empty priority plot while the build order allows it.
  let built = 0;
  for (const plot of PLOT_PRIORITY) {
    if (s.towers.some((t) => t.plot === plot)) continue;
    const type = BUILD_ORDER[Math.min(s.towers.length, BUILD_ORDER.length - 1)];
    if (!world.build(plot, type)) break;
    built += 1;
    if (built >= 2) break; // at most two new towers per build phase
  }
  // Then upgrade the cheapest tower that still has room to grow.
  let cheapest = null;
  let cheapestCost = Infinity;
  for (const tower of s.towers) {
    const cost = upgradeCost(tower);
    if (cost !== null && cost < cheapestCost) {
      cheapestCost = cost;
      cheapest = tower;
    }
  }
  if (cheapest && s.nectar >= cheapestCost) {
    s.selectedPlot = cheapest.plot;
    world.upgradeSelected();
    s.selectedPlot = -1;
  }
  world.startWave();
}

/** Step the world with the autopilot steering, until `until` says stop. */
function runUntil(world, until, limitSeconds) {
  for (let i = 0; i < limitSeconds / SAMPLE; i += 1) {
    autopilotBuild(world);
    const events = world.step(SAMPLE);
    if (until(world, events)) return true;
  }
  return false;
}

/**
 * Set `world` to the named scene (start, play, boss or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset(1);
  const s = world.state;
  if (name !== 'play' && name !== 'boss' && name !== 'end') {
    // Title scene: a few towers already planted, the garden idling.
    s.phase = 'build';
    s.nectar = 400;
    world.build(2, 'thorn');
    world.build(6, 'frost');
    world.build(3, 'sun');
    s.nectar = 170;
    s.phase = 'title';
    s.selectedPlot = -1;
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP);
    return { screen: 'title', best: 0 };
  }
  // Play, boss and end scenes start from the build phase so the autopilot
  // can plant towers and send waves; the title scene sets its own phase above.
  s.phase = 'build';
  if (name === 'play') {
    runUntil(world, (w) => w.state.wave >= PLAY_WAVES && w.state.phase === 'build', 600);
    world.startWave();
    runUntil(world, (w) => w.state.waveTime > 12, 60);
    return { screen: 'play', best: world.state.score };
  }
  if (name === 'boss') {
    runUntil(world, (w) => w.state.wave >= BOSS_WAVES && w.state.phase === 'build', 900);
    world.startWave();
    runUntil(world, (w) => w.state.waveTime > 9, 60);
    return { screen: 'play', best: world.state.score };
  }
  // End scene: play the whole game out; a well-played garden wins.
  runUntil(world, (w) => w.state.phase === 'won' || w.state.phase === 'lost', END_LIMIT_SECONDS);
  const over = world.state.phase === 'won' || world.state.phase === 'lost';
  return { screen: world.state.phase === 'won' ? 'won' : over ? 'lost' : 'play', best: world.state.score };
}

export { TOTAL_WAVES };
