// Input: mouse and keyboard, translated into world actions. Coordinates arrive in
// the canvas's logical 1280x720 field; main.js converts client pixels for us.
import { FIELD, PLOTS, PLOT_RADIUS, TOWER_ORDER, TOWERS } from './config.js';
import { clickTargets } from './render.js';
import { towerAtPlot } from './state.js';

/** Which soil plot, if any, a logical point is over. */
export function plotAt(x, y) {
  for (let i = 0; i < PLOTS.length; i += 1) {
    const dx = x - PLOTS[i].x;
    const dy = y - PLOTS[i].y;
    if (dx * dx + dy * dy <= PLOT_RADIUS * PLOT_RADIUS) return i;
  }
  return -1;
}

function inHudToolbar(x, y) {
  return y < FIELD.hudHeight || y >= 644;
}

/** Handle a click at logical (x, y). Returns true when the click did something. */
export function handleClick(world, x, y) {
  const s = world.state;
  if (s.phase === 'title') {
    s.phase = 'build';
    s.message = 'Plant towers, then send Wave 1!';
    s.messageTime = 3;
    return true;
  }
  if (s.phase === 'won' || s.phase === 'lost') {
    world.reset(s.seed);
    return true;
  }
  for (const t of clickTargets(s)) {
    if (x >= t.x && x < t.x + t.w && y >= t.y && y < t.y + t.h) {
      return handleButton(world, t.id);
    }
  }
  if (inHudToolbar(x, y)) return false;
  const plot = plotAt(x, y);
  if (plot >= 0) {
    const tower = towerAtPlot(s, plot);
    if (tower) {
      s.selectedPlot = plot;
      s.sounds.push('coin');
      return true;
    }
    if (world.build(plot, s.selectedTower)) {
      s.selectedPlot = plot;
      return true;
    }
    return true;
  }
  s.selectedPlot = -1;
  return false;
}

function handleButton(world, id) {
  const s = world.state;
  if (id === 'start') return true;
  if (id.startsWith('pick-')) {
    s.selectedTower = id.slice(5);
    s.selectedPlot = -1;
    return true;
  }
  if (id === 'wave') {
    world.startWave();
    return true;
  }
  if (id === 'speed') {
    s.speed = s.speed === 1 ? 2 : 1;
    return true;
  }
  if (id === 'pause') {
    s.paused = !s.paused;
    return true;
  }
  if (id === 'mute') {
    s.muted = !s.muted;
    return true;
  }
  if (id === 'upgrade') {
    world.upgradeSelected();
    return true;
  }
  if (id === 'sell') {
    world.sellSelected();
    return true;
  }
  return false;
}

/** Handle a key press. */
export function handleKey(world, key) {
  const s = world.state;
  const k = key.toLowerCase();
  if (k === 'm') {
    s.muted = !s.muted;
    return;
  }
  if (s.phase === 'title' && (k === ' ' || k === 'enter')) {
    s.phase = 'build';
    return;
  }
  if ((s.phase === 'won' || s.phase === 'lost') && (k === 'r' || k === ' ' || k === 'enter')) {
    world.reset(s.seed);
    return;
  }
  if (k === 'r') {
    world.reset(s.seed);
    return;
  }
  if (k === 'p' || k === 'escape') {
    if (k === 'escape') s.selectedPlot = -1;
    else s.paused = !s.paused;
    return;
  }
  if (k === 'f') {
    s.speed = s.speed === 1 ? 2 : 1;
    return;
  }
  if (k === ' ') {
    if (s.phase === 'build') world.startWave();
    return;
  }
  if (k === 'enter') {
    if (s.phase === 'build') world.startWave();
    return;
  }
  if (k === 'u') {
    world.upgradeSelected();
    return;
  }
  if (k === 'x') {
    world.sellSelected();
    return;
  }
  for (const type of TOWER_ORDER) {
    if (k === TOWERS[type].key) {
      s.selectedTower = type;
      s.selectedPlot = -1;
    }
  }
}

/** Track the mouse for hover highlights. */
export function handleMove(world, x, y) {
  const s = world.state;
  s.mouse.x = x;
  s.mouse.y = y;
  s.mouse.inside = x >= 0 && x < FIELD.width && y >= 0 && y < FIELD.height;
  s.hoverPlot = inHudToolbar(x, y) ? -1 : plotAt(x, y);
}
