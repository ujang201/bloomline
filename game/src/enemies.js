// Enemies: what walks the path. Each one is a pooled record; world.js allocates the
// pool once at boot and reuses it, so the hot loop allocates nothing.
import { ENEMIES, HP_GROWTH, PATH } from './config.js';

/** The pooled enemy record, dead until spawned. */
export function makeEnemy() {
  return {
    active: false, type: 'aphid', x: 0, y: 0, hp: 1, maxHp: 1, speed: 0,
    bounty: 0, leak: 1, radius: 10, slowUntil: 0, slowFactor: 1,
    waypoint: 0, dist: 0, wobble: 0, wobbleSpeed: 0, hitFlash: 0, dead: false,
  };
}

/** Wake one pooled enemy at the path's start for the given wave. */
export function spawnEnemy(pool, type, wave, rng) {
  for (let i = 0; i < pool.length; i += 1) {
    const e = pool[i];
    if (e.active) continue;
    const def = ENEMIES[type];
    const hpScale = 1 + HP_GROWTH * (wave - 1);
    e.active = true;
    e.type = type;
    e.x = PATH[0].x;
    e.y = PATH[0].y;
    e.maxHp = Math.round(def.hp * hpScale);
    e.hp = e.maxHp;
    e.speed = def.speed * (0.95 + rng() * 0.1);
    e.bounty = def.bounty;
    e.leak = def.leak;
    e.radius = def.radius;
    e.slowUntil = 0;
    e.slowFactor = 1;
    e.waypoint = 1;
    e.dist = 0;
    e.wobble = rng() * Math.PI * 2;
    e.wobbleSpeed = 2 + rng() * 2;
    e.hitFlash = 0;
    e.dead = false;
    return e;
  }
  return null;
}

/** Advance one enemy along the path for dt seconds. Returns 'leaked' at the Heartseed. */
export function stepEnemy(e, dt, time) {
  if (!e.active) return null;
  if (e.hitFlash > 0) e.hitFlash -= dt;
  const slow = time < e.slowUntil ? e.slowFactor : 1;
  let move = e.speed * slow * dt;
  while (move > 0) {
    const target = PATH[e.waypoint];
    if (!target) return 'leaked';
    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const len = Math.hypot(dx, dy);
    if (len <= move) {
      e.x = target.x;
      e.y = target.y;
      move -= len;
      e.waypoint += 1;
      if (e.waypoint >= PATH.length) return 'leaked';
    } else {
      e.x += (dx / len) * move;
      e.y += (dy / len) * move;
      e.dist += move;
      move = 0;
    }
  }
  e.wobble += e.wobbleSpeed * dt;
  return null;
}

/** The enemy furthest along the path inside a circle — the towers' target. */
export function furthestInRange(pool, x, y, range) {
  let best = null;
  let bestDist = -1;
  for (let i = 0; i < pool.length; i += 1) {
    const e = pool[i];
    if (!e.active) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    if (dx * dx + dy * dy > range * range) continue;
    if (e.dist > bestDist) {
      bestDist = e.dist;
      best = e;
    }
  }
  return best;
}
