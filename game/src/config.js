// BLOOMLINE — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720, hudHeight: 64 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The winding dirt path the blight walks, from the west gate to the Heartseed. */
export const PATH = [
  { x: -30, y: 170 },
  { x: 1150, y: 170 },
  { x: 1150, y: 350 },
  { x: 130, y: 350 },
  { x: 130, y: 530 },
  { x: 1150, y: 530 },
  { x: 1200, y: 530 },
];

/** Where the Heartseed — the thing you defend — sits, at the end of the path. */
export const HEART = { x: 1200, y: 530, radius: 30, hp: 20 };

/** Buildable soil plots. Twelve of them, tucked between the path's lanes. */
export const PLOTS = [
  { x: 220, y: 260 }, { x: 420, y: 260 }, { x: 620, y: 260 }, { x: 820, y: 260 }, { x: 1020, y: 260 },
  { x: 260, y: 440 }, { x: 460, y: 440 }, { x: 660, y: 440 }, { x: 860, y: 440 }, { x: 1060, y: 440 },
  { x: 80, y: 620 }, { x: 1180, y: 80 },
];
export const PLOT_RADIUS = 34;

export const START_NECTAR = 170;
export const TOTAL_WAVES = 10;
export const SELL_RATE = 0.7;
export const WAVE_CLEAR_BONUS = 25;

/** Towers: id, name, cost, range, shots per second, damage, special, upgrade costs. */
export const TOWERS = {
  thorn: {
    name: 'Briar Thorn',
    key: '1',
    cost: 50,
    range: 135,
    rate: 2.0,
    damage: 12,
    projectileSpeed: 520,
    color: '#7ed957',
    dark: '#3e7d2c',
    blurb: 'Fast thorns',
    levels: [
      { damage: 12, rate: 2.0, range: 135, cost: 50 },
      { damage: 21, rate: 2.4, range: 145, cost: 45 },
      { damage: 36, rate: 3.0, range: 155, cost: 90 },
    ],
  },
  frost: {
    name: 'Frostbloom',
    key: '2',
    cost: 70,
    range: 125,
    rate: 0.8,
    damage: 4,
    slowFactor: 0.55,
    slowTime: 1.6,
    projectileSpeed: 420,
    color: '#7dd7f0',
    dark: '#2b6f8e',
    blurb: 'Slows packs',
    levels: [
      { damage: 4, rate: 0.8, range: 125, slowFactor: 0.55, cost: 70 },
      { damage: 8, rate: 0.9, range: 135, slowFactor: 0.45, cost: 60 },
      { damage: 14, rate: 1.1, range: 150, slowFactor: 0.35, cost: 100 },
    ],
  },
  sun: {
    name: 'Sunspore',
    key: '3',
    cost: 100,
    range: 115,
    rate: 0.6,
    damage: 30,
    splash: 70,
    projectileSpeed: 340,
    color: '#ffc93c',
    dark: '#a86f00',
    blurb: 'Splash damage',
    levels: [
      { damage: 30, rate: 0.6, range: 115, splash: 70, cost: 100 },
      { damage: 52, rate: 0.65, range: 125, splash: 82, cost: 95 },
      { damage: 88, rate: 0.75, range: 140, splash: 98, cost: 150 },
    ],
  },
};
export const TOWER_ORDER = ['thorn', 'frost', 'sun'];

/** Enemies: hit points, speed (px/s), nectar bounty, Heartseed damage on leak. */
export const ENEMIES = {
  aphid: { name: 'Aphid', hp: 30, speed: 56, bounty: 6, leak: 1, radius: 11, color: '#8a5a2b', dark: '#5d3a17' },
  moth: { name: 'Dusk Moth', hp: 55, speed: 88, bounty: 9, leak: 1, radius: 12, color: '#b678d8', dark: '#7a3f9e' },
  beetle: { name: 'Bark Beetle', hp: 130, speed: 33, bounty: 11, leak: 2, radius: 15, color: '#4a6b8a', dark: '#2e4a63' },
  spitter: { name: 'Spitter', hp: 75, speed: 46, bounty: 13, leak: 1, radius: 12, color: '#c94f6d', dark: '#8e2f49' },
  queen: { name: 'Blight Queen', hp: 2600, speed: 26, bounty: 150, leak: 10, radius: 26, color: '#3d2b4f', dark: '#241732' },
};

/** How much a wave's hit points grow: hp *= 1 + HP_GROWTH * (wave - 1). */
export const HP_GROWTH = 0.16;

/** Wave composition: [enemy id, count, gap in seconds between spawns]. */
export function waveComp(wave) {
  switch (wave) {
    case 1: return [['aphid', 8, 1.1]];
    case 2: return [['aphid', 12, 0.9], ['moth', 3, 1.4]];
    case 3: return [['aphid', 10, 0.7], ['moth', 6, 1.0], ['beetle', 2, 2.0]];
    case 4: return [['moth', 10, 0.8], ['beetle', 4, 1.6], ['aphid', 8, 0.6]];
    case 5: return [['beetle', 6, 1.3], ['spitter', 6, 1.1], ['aphid', 12, 0.5]];
    case 6: return [['moth', 14, 0.6], ['spitter', 8, 0.9], ['beetle', 4, 1.4]];
    case 7: return [['beetle', 9, 1.0], ['spitter', 10, 0.8], ['aphid', 16, 0.4]];
    case 8: return [['moth', 18, 0.5], ['beetle', 8, 1.0], ['spitter', 10, 0.7]];
    case 9: return [['beetle', 12, 0.8], ['spitter', 14, 0.6], ['moth', 16, 0.45], ['aphid', 20, 0.35]];
    case 10: return [['queen', 1, 0.1], ['spitter', 8, 1.2], ['moth', 10, 0.8], ['beetle', 6, 1.5]];
    default: return [['aphid', 6, 1.0]];
  }
}

/** Pools are allocated once at boot; nothing is allocated in the hot loop. */
export const POOL = { enemies: 96, projectiles: 128, particles: 256 };

export const PALETTE = {
  backdrop: '#0e1a12',
  grassLight: '#2c5a34',
  grassDark: '#24492b',
  grassTuft: '#3a7040',
  path: '#8a6a44',
  pathEdge: '#6e5334',
  plot: '#4a3520',
  plotRing: '#7a5a34',
  heart: '#ffd166',
  heartGlow: '#ffe9a8',
  panel: '#16241a',
  panelEdge: '#2c4632',
  text: '#f2f5e9',
  muted: '#9db3a0',
  nectar: '#ffc93c',
  danger: '#e5534b',
  waveButton: '#7ed957',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'bloomline.best';
