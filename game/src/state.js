// The single state store: every module reads and writes this one object; world.js
// owns the transitions, no module keeps a second copy of the truth.
// Phases: 'title' -> 'build' -> 'wave' -> 'build' ... -> 'won' | 'lost'.
import { HEART, PLOTS, START_NECTAR, TOTAL_WAVES } from './config.js';

export function createState(seed) {
  return {
    seed,
    phase: 'title', // title | build | wave | won | lost
    wave: 0, // waves cleared so far; the wave in progress is wave + 1
    totalWaves: TOTAL_WAVES,
    nectar: START_NECTAR,
    heartHp: HEART.hp,
    heartMax: HEART.hp,
    score: 0,
    kills: 0,
    leaked: 0,
    earned: START_NECTAR,
    time: 0,
    speed: 1, // 1x or 2x
    paused: false,
    muted: false,
    selectedTower: 'thorn', // which tower type a click on a plot builds
    selectedPlot: -1, // index into PLOTS, or -1 when nothing is selected
    hoverPlot: -1,
    mouse: { x: -1, y: -1, inside: false },
    message: '', // one-line feedback, e.g. "Not enough nectar"
    messageTime: 0,
    waveActive: false,
    spawnQueue: [], // { type, at } times, seconds since the wave started
    waveTime: 0,
    toSpawn: 0,
    enemiesLeft: 0, // alive + still to spawn, in the current wave
    towers: [], // { plot, type, level, invested, cooldown, angle }
    enemies: [], // pooled at boot in world.js
    projectiles: [],
    particles: [],
    shake: 0,
    heartPulse: 0,
    best: 0,
    sounds: [], // sound names queued this step; main.js drains them for audio
  };
}

/** A fresh plot's tower record. */
export function makeTower(plot, type, cost) {
  return { plot, type, level: 0, invested: cost, cooldown: 0, angle: -Math.PI / 2, flash: 0 };
}

export function plotsTaken(state) {
  const taken = new Set();
  for (const tower of state.towers) taken.add(tower.plot);
  return taken;
}

export function towerAtPlot(state, plotIndex) {
  for (const tower of state.towers) if (tower.plot === plotIndex) return tower;
  return null;
}
