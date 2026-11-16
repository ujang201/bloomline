// Towers: what the player plants on the soil plots. Firing, upgrades and selling
// live here; the targeting rule (furthest along the path) lives in enemies.js.
import { PLOTS, TOWERS } from './config.js';
import { furthestInRange } from './enemies.js';

export function makeProjectile() {
  return { active: false, x: 0, y: 0, tx: 0, ty: 0, target: null, speed: 0, damage: 0, kind: 'thorn', splash: 0, slowFactor: 1, slowTime: 0, color: '#fff' };
}

/** Stats of a tower at its current level. */
export function towerStats(tower) {
  return TOWERS[tower.type].levels[tower.level];
}

/** What the next upgrade costs, or null when the tower is already maxed. */
export function upgradeCost(tower) {
  const def = TOWERS[tower.type];
  if (tower.level >= def.levels.length - 1) return null;
  return def.levels[tower.level + 1].cost;
}

/** Nectar back for selling a tower: 70% of everything invested in it. */
export function sellValue(tower) {
  return Math.floor(tower.invested * 0.7);
}

/** Fire one tower for dt: cooldown, aim, and launch a pooled projectile. */
export function stepTower(tower, pool, projectiles, dt) {
  const stats = towerStats(tower);
  const plot = PLOTS[tower.plot];
  if (tower.cooldown > 0) tower.cooldown -= dt;
  if (tower.flash > 0) tower.flash -= dt;
  const target = furthestInRange(pool, plot.x, plot.y, stats.range);
  if (!target) return null;
  tower.angle = Math.atan2(target.y - plot.y, target.x - plot.x);
  if (tower.cooldown > 0) return null;
  tower.cooldown = 1 / stats.rate;
  tower.flash = 0.12;
  for (let i = 0; i < projectiles.length; i += 1) {
    const p = projectiles[i];
    if (p.active) continue;
    const def = TOWERS[tower.type];
    p.active = true;
    p.x = plot.x + Math.cos(tower.angle) * 22;
    p.y = plot.y - 14 + Math.sin(tower.angle) * 22;
    p.target = target;
    p.tx = target.x;
    p.ty = target.y;
    p.speed = def.projectileSpeed;
    p.damage = stats.damage;
    p.kind = tower.type;
    p.splash = stats.splash || 0;
    p.slowFactor = stats.slowFactor || 1;
    p.slowTime = stats.slowTime || 0;
    p.color = def.color;
    return p;
  }
  return null;
}

/** Fly a projectile toward its target; returns the enemy it hit, or null. */
export function stepProjectile(p, dt) {
  if (!p.active) return null;
  const target = p.target && p.target.active ? p.target : null;
  const tx = target ? target.x : p.tx;
  const ty = target ? target.y : p.ty;
  const dx = tx - p.x;
  const dy = ty - p.y;
  const len = Math.hypot(dx, dy);
  const move = p.speed * dt;
  if (len <= move + (target ? target.radius : 4)) {
    p.active = false;
    return target;
  }
  if (len < 1) {
    p.active = false;
    return target;
  }
  p.x += (dx / len) * move;
  p.y += (dy / len) * move;
  return null;
}
