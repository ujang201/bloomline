// The world: the whole simulation in one place, stepped at a fixed 60 Hz.
// Pure logic — no DOM, no canvas, no audio here — so the same code runs in the
// browser and in a headless Node check.
import {
  FIELD, HEART, PLOTS, POOL, STEP, TOTAL_WAVES, TOWERS, TOWER_ORDER,
  WAVE_CLEAR_BONUS, waveComp,
} from './config.js';
import { createState, makeTower, towerAtPlot } from './state.js';
import { makeRng, range } from './random.js';
import { makeEnemy, spawnEnemy, stepEnemy } from './enemies.js';
import { makeProjectile, sellValue, stepProjectile, stepTower, towerStats, upgradeCost } from './towers.js';

export const EVENT_WIN = 1;
export const EVENT_LOSE = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_LEAK = 8;

export class World {
  constructor(seed = 1) {
    this.rng = makeRng(seed);
    this.state = createState(seed);
    this.state.enemies = Array.from({ length: POOL.enemies }, () => makeEnemy());
    this.state.projectiles = Array.from({ length: POOL.projectiles }, () => makeProjectile());
    this.state.particles = Array.from({ length: POOL.particles }, () => makeParticle());
    this.seedDecor();
  }

  /** Pre-scatter the garden's static decoration once, from the seed. */
  seedDecor() {
    this.decor = [];
    for (let i = 0; i < 90; i += 1) {
      this.decor.push({
        x: range(this.rng, 20, FIELD.width - 20),
        y: range(this.rng, FIELD.hudHeight + 20, FIELD.height - 20),
        r: range(this.rng, 1.5, 3.5),
        kind: this.rng() < 0.6 ? 'tuft' : 'flower',
        hue: this.rng(),
      });
    }
    this.fireflies = [];
    for (let i = 0; i < 24; i += 1) {
      this.fireflies.push({
        x: range(this.rng, 40, FIELD.width - 40),
        y: range(this.rng, 100, FIELD.height - 40),
        phase: range(this.rng, 0, Math.PI * 2),
        speed: range(this.rng, 0.3, 0.9),
      });
    }
  }

  reset(seed = 1) {
    this.rng = makeRng(seed);
    const best = this.state.best;
    const muted = this.state.muted;
    this.state = createState(seed);
    this.state.best = best;
    this.state.muted = muted;
    this.state.enemies = Array.from({ length: POOL.enemies }, () => makeEnemy());
    this.state.projectiles = Array.from({ length: POOL.projectiles }, () => makeProjectile());
    this.state.particles = Array.from({ length: POOL.particles }, () => makeParticle());
    this.seedDecor();
  }

  /** Start the next wave: build its spawn queue from the wave table. */
  startWave() {
    const s = this.state;
    if (s.phase !== 'build' && s.phase !== 'title') return false;
    if (s.wave >= TOTAL_WAVES) return false;
    const wave = s.wave + 1;
    const queue = [];
    let at = 0.8;
    for (const [type, count, gap] of waveComp(wave)) {
      for (let i = 0; i < count; i += 1) {
        queue.push({ type, at });
        at += gap;
      }
      at += 1.2;
    }
    s.spawnQueue = queue;
    s.toSpawn = queue.length;
    s.enemiesLeft = queue.length;
    s.waveTime = 0;
    s.waveActive = true;
    s.phase = 'wave';
    s.message = `Wave ${wave} — hold the garden!`;
    s.messageTime = 2.5;
    s.sounds.push('horn');
    return true;
  }

  /** Plant a tower on an empty plot. Returns false with a message when it cannot. */
  build(plotIndex, type) {
    const s = this.state;
    if (s.phase !== 'build' && s.phase !== 'wave') return false;
    if (plotIndex < 0 || plotIndex >= PLOTS.length) return false;
    if (towerAtPlot(s, plotIndex)) return this.fail('Plot already planted');
    const def = TOWERS[type];
    if (!def) return false;
    if (s.nectar < def.cost) return this.fail('Not enough nectar');
    s.nectar -= def.cost;
    s.towers.push(makeTower(plotIndex, type, def.cost));
    s.sounds.push('build');
    this.burst(PLOTS[plotIndex].x, PLOTS[plotIndex].y, def.color, 14);
    return true;
  }

  upgradeSelected() {
    const s = this.state;
    const tower = towerAtPlot(s, s.selectedPlot);
    if (!tower) return false;
    const cost = upgradeCost(tower);
    if (cost === null) return this.fail('Already fully grown');
    if (s.nectar < cost) return this.fail('Not enough nectar');
    s.nectar -= cost;
    tower.invested += cost;
    tower.level += 1;
    s.sounds.push('upgrade');
    const plot = PLOTS[tower.plot];
    this.burst(plot.x, plot.y - 10, TOWERS[tower.type].color, 18);
    return true;
  }

  sellSelected() {
    const s = this.state;
    const tower = towerAtPlot(s, s.selectedPlot);
    if (!tower) return false;
    const value = sellValue(tower);
    s.nectar += value;
    s.towers.splice(s.towers.indexOf(tower), 1);
    s.selectedPlot = -1;
    s.sounds.push('coin');
    return true;
  }

  fail(message) {
    const s = this.state;
    s.message = message;
    s.messageTime = 1.6;
    s.sounds.push('deny');
    return false;
  }

  /** One fixed simulation step. Returns an event bitmask. */
  step(dt) {
    const s = this.state;
    s.time += dt;
    if (s.messageTime > 0) s.messageTime -= dt;
    if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 3);
    s.heartPulse += dt;
    let events = 0;

    // Ambient fireflies drift even on the title screen.
    for (const f of this.fireflies) {
      f.phase += f.speed * dt;
      f.x += Math.sin(f.phase * 0.7) * 6 * dt;
      f.y += Math.cos(f.phase * 0.5) * 4 * dt;
    }
    this.stepParticles(dt);

    if (s.phase === 'title' || s.phase === 'won' || s.phase === 'lost') return events;
    if (s.paused) return events;

    // Spawn the wave's queue on its clock.
    if (s.waveActive) {
      s.waveTime += dt;
      while (s.spawnQueue.length > 0 && s.spawnQueue[0].at <= s.waveTime) {
        const next = s.spawnQueue.shift();
        spawnEnemy(s.enemies, next.type, s.wave + 1, this.rng);
      }
    }

    // Towers shoot.
    for (const tower of s.towers) {
      const p = stepTower(tower, s.enemies, s.projectiles, dt);
      if (p) s.sounds.push('shoot');
    }

    // Projectiles fly and land.
    for (const p of s.projectiles) {
      if (!p.active) continue;
      const hit = stepProjectile(p, dt);
      if (hit) this.applyHit(p, hit);
      else if (!p.active) this.burst(p.x, p.y, p.color, 3);
    }

    // Enemies walk; a leak hurts the Heartseed.
    let alive = 0;
    for (const e of s.enemies) {
      if (!e.active) continue;
      const result = stepEnemy(e, dt, s.time);
      if (result === 'leaked') {
        e.active = false;
        s.heartHp -= e.leak;
        s.leaked += 1;
        s.shake = 0.6;
        s.sounds.push('leak');
        this.burst(HEART.x, HEART.y, '#e5534b', 22);
        events |= EVENT_LEAK;
        if (s.heartHp <= 0) {
          s.heartHp = 0;
          s.phase = 'lost';
          s.sounds.push('lose');
          return events | EVENT_LOSE;
        }
      } else {
        alive += 1;
      }
    }

    // Wave cleared: bonus nectar, next build phase — or victory on wave 10.
    if (s.waveActive && s.spawnQueue.length === 0 && alive === 0) {
      s.waveActive = false;
      const wave = s.wave + 1;
      const bonus = WAVE_CLEAR_BONUS + 5 * wave;
      s.nectar += bonus;
      s.score += 50 * wave;
      s.wave = wave;
      s.sounds.push('clear');
      events |= EVENT_WAVE_CLEAR;
      if (wave >= TOTAL_WAVES) {
        s.phase = 'won';
        s.score += s.heartHp * 50;
        if (s.score > s.best) s.best = s.score;
        s.sounds.push('win');
        return events | EVENT_WIN;
      }
      s.phase = 'build';
      s.message = `Wave ${wave} cleared! +${bonus} nectar`;
      s.messageTime = 2.5;
    }
    s.enemiesLeft = alive + s.spawnQueue.length;
    return events;
  }

  /** A projectile landed: damage its target, splash or slow as its kind dictates. */
  applyHit(p, hit) {
    const s = this.state;
    const victims = [];
    if (p.splash > 0) {
      for (const e of s.enemies) {
        if (!e.active) continue;
        const dx = e.x - hit.x;
        const dy = e.y - hit.y;
        if (dx * dx + dy * dy <= p.splash * p.splash) victims.push(e);
      }
    } else {
      victims.push(hit);
    }
    for (const e of victims) {
      e.hp -= p.damage;
      e.hitFlash = 0.09;
      if (p.slowTime > 0) {
        e.slowUntil = s.time + p.slowTime;
        e.slowFactor = p.slowFactor;
      }
      this.burst(e.x, e.y, p.color, p.splash > 0 ? 5 : 3);
      if (e.hp <= 0 && e.active) {
        e.active = false;
        s.kills += 1;
        s.score += 10;
        s.nectar += e.bounty;
        s.earned += e.bounty;
        s.sounds.push('pop');
        this.burst(e.x, e.y, '#ffd166', 12);
      }
    }
  }

  burst(x, y, color, count) {
    const s = this.state;
    let made = 0;
    for (const pt of s.particles) {
      if (pt.active) continue;
      const angle = this.rng() * Math.PI * 2;
      const speed = 30 + this.rng() * 90;
      pt.active = true;
      pt.x = x;
      pt.y = y;
      pt.vx = Math.cos(angle) * speed;
      pt.vy = Math.sin(angle) * speed - 20;
      pt.life = 0.4 + this.rng() * 0.4;
      pt.maxLife = pt.life;
      pt.size = 2 + this.rng() * 3;
      pt.color = color;
      made += 1;
      if (made >= count) break;
    }
  }

  stepParticles(dt) {
    for (const pt of this.state.particles) {
      if (!pt.active) continue;
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.active = false;
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 60 * dt;
    }
  }
}

function makeParticle() {
  return { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff' };
}

// Re-exported so main.js needs only this module for the loop.
export { STEP };
