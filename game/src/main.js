// BLOOMLINE — boot and the render loop. Fixed 60 Hz simulation, separate from
// rendering; the loop runs the sim 1x or 2x per frame and draws once per frame.
// With ?shot=start|play|boss|end the game stages that scene synchronously and
// draws one frame, so a headless screenshot is a real render of the real rules.
// NOTE: always read world.state live — World.reset() replaces the state object,
// so a captured reference would go stale after a restart.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { World } from './world.js';
import { draw, SCREEN_LOST, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';
import { drainSounds, ensureAudio } from './audio.js';
import { handleClick, handleKey, handleMove } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const world = new World(seed);
try {
  world.state.best = Number(window.localStorage.getItem(BEST_KEY) || '0') || 0;
} catch {
  world.state.best = 0;
}

function toLogical(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
    y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
  };
}

function screenFor() {
  const phase = world.state.phase;
  if (phase === 'title') return SCREEN_TITLE;
  if (phase === 'won') return SCREEN_WON;
  if (phase === 'lost') return SCREEN_LOST;
  return SCREEN_PLAY;
}

function announce() {
  if (!status) return;
  const s = world.state;
  status.textContent = s.phase === 'title'
    ? 'BLOOMLINE, a garden tower defense. Click to play.'
    : `Wave ${Math.min(s.wave + 1, s.totalWaves)} of ${s.totalWaves}. `
      + `Nectar ${s.nectar}. Heart ${s.heartHp} of ${s.heartMax}. Score ${s.score}.`;
}

if (shot) {
  // Screenshot mode: stage the scene, draw it once, and stop.
  const staged = stageShot(shot, world);
  world.state.best = staged.best;
  draw(ctx, world, screenFor());
  document.title = `BLOOMLINE — ${shot}`;
} else {
  canvas.addEventListener('pointermove', (event) => {
    const p = toLogical(event);
    handleMove(world, p.x, p.y);
  });
  canvas.addEventListener('pointerdown', (event) => {
    ensureAudio();
    const p = toLogical(event);
    handleClick(world, p.x, p.y);
    announce();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === ' ') event.preventDefault();
    ensureAudio();
    handleKey(world, event.key);
    announce();
  });

  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    const stepsPerFrame = world.state.speed;
    let steps = 0;
    while (accumulator >= STEP && steps < 12) {
      for (let i = 0; i < stepsPerFrame; i += 1) world.step(STEP);
      accumulator -= STEP;
      steps += 1;
    }
    if (steps === 12) accumulator = 0;
    drainSounds(world.state);
    draw(ctx, world, screenFor());
    if (world.state.phase === 'won' || world.state.phase === 'lost') {
      try {
        if (world.state.score > Number(window.localStorage.getItem(BEST_KEY) || '0')) {
          window.localStorage.setItem(BEST_KEY, String(world.state.score));
        }
      } catch {
        // Best score is a nicety; a browser that blocks storage still plays.
      }
    }
    requestAnimationFrame(frame);
  }
  announce();
  requestAnimationFrame(frame);
}
