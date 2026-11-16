// The renderer: every pixel the game shows, drawn on one 2D canvas in the fixed
// 1280x720 logical field. No images, no fonts from the network — all art is drawn.
import { ENEMIES, FIELD, HEART, PALETTE, PATH, PLOT_RADIUS, PLOTS, TOWER_ORDER, TOWERS } from './config.js';
import { towerStats, upgradeCost, sellValue } from './towers.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WON = 'won';
export const SCREEN_LOST = 'lost';

const TOOLBAR_Y = 644;
const CARD_W = 190;
const CARD_H = 58;

/** The clickable buttons on screen right now, for input.js. */
export function clickTargets(state) {
  const targets = [];
  if (state.phase === 'title' || state.phase === 'won' || state.phase === 'lost') {
    targets.push({ id: 'start', x: 0, y: 0, w: FIELD.width, h: FIELD.height });
    return targets;
  }
  TOWER_ORDER.forEach((type, i) => {
    targets.push({ id: `pick-${type}`, x: 16 + i * (CARD_W + 10), y: TOOLBAR_Y + 8, w: CARD_W, h: CARD_H });
  });
  targets.push({ id: 'wave', x: 1000, y: TOOLBAR_Y + 8, w: 264, h: CARD_H });
  targets.push({ id: 'speed', x: 1130, y: 10, w: 64, h: 44 });
  targets.push({ id: 'pause', x: 1060, y: 10, w: 64, h: 44 });
  targets.push({ id: 'mute', x: 1200, y: 10, w: 64, h: 44 });
  const selected = state.selectedPlot >= 0
    ? state.towers.find((t) => t.plot === state.selectedPlot) : null;
  if (selected) {
    targets.push({ id: 'upgrade', x: 630, y: TOOLBAR_Y + 8, w: 180, h: CARD_H });
    targets.push({ id: 'sell', x: 820, y: TOOLBAR_Y + 8, w: 120, h: CARD_H });
  }
  return targets;
}

export function draw(ctx, world, screen) {
  const s = world.state;
  ctx.save();
  if (s.shake > 0) {
    ctx.translate((Math.random() - 0.5) * s.shake * 10, (Math.random() - 0.5) * s.shake * 10);
  }
  drawGarden(ctx, world);
  drawPlots(ctx, s);
  drawHeart(ctx, s);
  for (const tower of s.towers) drawTower(ctx, tower, s);
  for (const e of s.enemies) if (e.active) drawEnemy(ctx, e, s.time);
  for (const p of s.projectiles) if (p.active) drawProjectile(ctx, p);
  drawParticles(ctx, s);
  drawFireflies(ctx, world);
  drawHud(ctx, s);
  drawToolbar(ctx, s);
  if (s.messageTime > 0 && s.message) drawMessage(ctx, s);
  if (screen === SCREEN_TITLE) drawTitle(ctx, s);
  if (screen === SCREEN_WON) drawEnd(ctx, s, true);
  if (screen === SCREEN_LOST) drawEnd(ctx, s, false);
  if (s.paused && screen === SCREEN_PLAY) drawPaused(ctx);
  ctx.restore();
}

function drawGarden(ctx, world) {
  const s = world.state;
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Grass checkerboard.
  const cell = 80;
  for (let y = FIELD.hudHeight; y < FIELD.height; y += cell) {
    for (let x = 0; x < FIELD.width; x += cell) {
      const even = ((x / cell) + (y / cell)) % 2 === 0;
      ctx.fillStyle = even ? PALETTE.grassLight : PALETTE.grassDark;
      ctx.fillRect(x, y, cell, cell);
    }
  }
  // The dirt path.
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = PALETTE.pathEdge;
  ctx.lineWidth = 52;
  tracePath(ctx);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.path;
  ctx.lineWidth = 44;
  tracePath(ctx);
  ctx.stroke();
  // Dashes down the middle of the path.
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 22]);
  tracePath(ctx);
  ctx.stroke();
  ctx.setLineDash([]);
  // Scattered tufts and wildflowers.
  for (const d of world.decor) {
    if (d.kind === 'tuft') {
      ctx.strokeStyle = PALETTE.grassTuft;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(d.x - 4, d.y);
      ctx.lineTo(d.x - 5, d.y - 7);
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x, d.y - 9);
      ctx.moveTo(d.x + 4, d.y);
      ctx.lineTo(d.x + 5, d.y - 7);
      ctx.stroke();
    } else {
      ctx.fillStyle = d.hue < 0.33 ? '#ff8fb3' : d.hue < 0.66 ? '#ffd166' : '#c9a7ff';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff7d6';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function tracePath(ctx) {
  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i += 1) ctx.lineTo(PATH[i].x, PATH[i].y);
}

function drawPlots(ctx, s) {
  for (let i = 0; i < PLOTS.length; i += 1) {
    const plot = PLOTS[i];
    const taken = s.towers.some((t) => t.plot === i);
    const hovered = s.hoverPlot === i || s.selectedPlot === i;
    ctx.fillStyle = PALETTE.plot;
    ctx.beginPath();
    ctx.arc(plot.x, plot.y, PLOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hovered ? '#ffd166' : PALETTE.plotRing;
    ctx.lineWidth = hovered ? 3 : 2;
    ctx.setLineDash(taken ? [] : [6, 6]);
    ctx.beginPath();
    ctx.arc(plot.x, plot.y, PLOT_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!taken) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', plot.x, plot.y + 1);
    }
  }
  // Range ring for the hovered / selected tower.
  const selected = s.selectedPlot >= 0 ? s.towers.find((t) => t.plot === s.selectedPlot) : null;
  if (selected) {
    const stats = towerStats(selected);
    const plot = PLOTS[selected.plot];
    ctx.fillStyle = 'rgba(255,209,102,0.08)';
    ctx.strokeStyle = 'rgba(255,209,102,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(plot.x, plot.y, stats.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (s.hoverPlot >= 0 && !s.towers.some((t) => t.plot === s.hoverPlot)) {
    const def = TOWERS[s.selectedTower];
    const plot = PLOTS[s.hoverPlot];
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(plot.x, plot.y, def.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawHeart(ctx, s) {
  const pulse = 1 + Math.sin(s.heartPulse * 3) * 0.06;
  const glow = ctx.createRadialGradient(HEART.x, HEART.y, 4, HEART.x, HEART.y, 70 * pulse);
  glow.addColorStop(0, 'rgba(255,233,168,0.55)');
  glow.addColorStop(1, 'rgba(255,233,168,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(HEART.x, HEART.y, 70 * pulse, 0, Math.PI * 2);
  ctx.fill();
  // Petals around the seed.
  ctx.fillStyle = '#ff8fb3';
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + s.heartPulse * 0.2;
    const px = HEART.x + Math.cos(a) * 26;
    const py = HEART.y + Math.sin(a) * 26;
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.heart;
  ctx.beginPath();
  ctx.arc(HEART.x, HEART.y, HEART.radius * 0.8 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff7d6';
  ctx.beginPath();
  ctx.arc(HEART.x - 6, HEART.y - 7, 7, 0, Math.PI * 2);
  ctx.fill();
  // Health ring.
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(HEART.x, HEART.y, HEART.radius + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = s.heartHp <= 5 ? PALETTE.danger : '#7ed957';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(HEART.x, HEART.y, HEART.radius + 8, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * s.heartHp) / s.heartMax);
  ctx.stroke();
}

function drawTower(ctx, tower, s) {
  const def = TOWERS[tower.type];
  const stats = towerStats(tower);
  const plot = PLOTS[tower.plot];
  const size = 16 + tower.level * 3;
  // Stem.
  ctx.strokeStyle = '#2f6b2f';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(plot.x, plot.y + 6);
  ctx.lineTo(plot.x, plot.y - 8);
  ctx.stroke();
  // Bloom by type.
  if (tower.type === 'thorn') {
    ctx.fillStyle = tower.flash > 0 ? '#d6ffb0' : def.color;
    ctx.beginPath();
    ctx.arc(plot.x, plot.y - 14, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = def.dark;
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + tower.angle * 0.1;
      ctx.beginPath();
      ctx.moveTo(plot.x + Math.cos(a) * size * 0.7, plot.y - 14 + Math.sin(a) * size * 0.7);
      ctx.lineTo(plot.x + Math.cos(a) * (size + 8), plot.y - 14 + Math.sin(a) * (size + 8));
      ctx.stroke();
    }
    ctx.fillStyle = '#1d4d1d';
    ctx.beginPath();
    ctx.arc(plot.x - 5, plot.y - 17, 2.5, 0, Math.PI * 2);
    ctx.arc(plot.x + 5, plot.y - 17, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (tower.type === 'frost') {
    ctx.fillStyle = def.color;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + s.time * 0.3;
      ctx.beginPath();
      ctx.ellipse(
        plot.x + Math.cos(a) * size * 0.75, plot.y - 14 + Math.sin(a) * size * 0.75,
        size * 0.55, size * 0.32, a, 0, Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = tower.flash > 0 ? '#ffffff' : '#eafcff';
    ctx.beginPath();
    ctx.arc(plot.x, plot.y - 14, size * 0.55, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = def.color;
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(
        plot.x + Math.cos(a) * size * 0.8, plot.y - 14 + Math.sin(a) * size * 0.8,
        size * 0.5, size * 0.28, a, 0, Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = '#7a4a00';
    ctx.beginPath();
    ctx.arc(plot.x, plot.y - 14, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d2600';
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.arc(plot.x + Math.cos(a) * size * 0.3, plot.y - 14 + Math.sin(a) * size * 0.3, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Level pips.
  ctx.fillStyle = '#ffd166';
  for (let i = 0; i <= tower.level; i += 1) {
    ctx.beginPath();
    ctx.arc(plot.x - 10 + i * 10, plot.y + 16, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Aim line while firing.
  if (tower.flash > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(plot.x, plot.y - 14);
    ctx.lineTo(plot.x + Math.cos(tower.angle) * 30, plot.y - 14 + Math.sin(tower.angle) * 30);
    ctx.stroke();
  }
}

function drawEnemy(ctx, e, time) {
  const def = ENEMIES[e.type];
  const wob = Math.sin(e.wobble) * 3;
  const x = e.x;
  const y = e.y + wob;
  const slowed = time < e.slowUntil;
  ctx.save();
  if (slowed) {
    ctx.strokeStyle = 'rgba(125,215,240,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, e.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (e.type === 'moth') {
    const flap = Math.sin(e.wobble * 3) * 0.5;
    ctx.fillStyle = 'rgba(182,120,216,0.75)';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.5 - flap);
    ctx.beginPath();
    ctx.ellipse(-e.radius, -4, e.radius * 0.9, e.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(1.0 + flap * 2);
    ctx.beginPath();
    ctx.ellipse(-e.radius, -4, e.radius * 0.9, e.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Body.
  ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : def.color;
  ctx.beginPath();
  ctx.ellipse(x, y, e.radius, e.radius * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = def.dark;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, e.radius, e.radius * 0.8, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (e.type === 'beetle') {
    ctx.beginPath();
    ctx.moveTo(x, y - e.radius * 0.8);
    ctx.lineTo(x, y + e.radius * 0.8);
    ctx.stroke();
  }
  if (e.type === 'queen') {
    ctx.fillStyle = '#ffd166';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + i * 9 - 5, y - e.radius + 4);
      ctx.lineTo(x + i * 9, y - e.radius - 10);
      ctx.lineTo(x + i * 9 + 5, y - e.radius + 4);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Eyes, facing the walk direction (east).
  ctx.fillStyle = '#14100a';
  ctx.beginPath();
  ctx.arc(x + e.radius * 0.45, y - 3, 2.5, 0, Math.PI * 2);
  ctx.arc(x + e.radius * 0.45, y + 3, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Legs.
  ctx.strokeStyle = def.dark;
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i += 1) {
    const lx = x + i * e.radius * 0.5;
    ctx.beginPath();
    ctx.moveTo(lx, y + e.radius * 0.6);
    ctx.lineTo(lx + 3, y + e.radius + 4);
    ctx.stroke();
  }
  ctx.restore();
  // Health bar when hurt.
  if (e.hp < e.maxHp) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - w / 2, y - e.radius - 12, w, 5);
    ctx.fillStyle = e.hp / e.maxHp > 0.5 ? '#7ed957' : e.hp / e.maxHp > 0.25 ? '#ffc93c' : '#e5534b';
    ctx.fillRect(x - w / 2, y - e.radius - 12, w * (e.hp / e.maxHp), 5);
  }
}

function drawProjectile(ctx, p) {
  ctx.fillStyle = p.color;
  if (p.kind === 'sun') {
    const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 12);
    glow.addColorStop(0, 'rgba(255,201,60,0.9)');
    glow.addColorStop(1, 'rgba(255,201,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.kind === 'frost') {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.x * 0.05);
    ctx.strokeStyle = '#d6f4ff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i += 1) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(p.ty - p.y, p.tx - p.x));
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -4);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawParticles(ctx, s) {
  for (const pt of s.particles) {
    if (!pt.active) continue;
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFireflies(ctx, world) {
  for (const f of world.fireflies) {
    const a = 0.25 + 0.55 * Math.abs(Math.sin(f.phase));
    ctx.fillStyle = `rgba(255,240,170,${a.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, s) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, FIELD.width, FIELD.hudHeight);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, FIELD.hudHeight - 2, FIELD.width, 2);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#7ed957';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('BLOOMLINE', 16, 32);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`🌼 ${s.nectar}`, 180, 32);
  ctx.fillStyle = s.heartHp <= 5 ? PALETTE.danger : PALETTE.text;
  ctx.fillText(`💛 ${s.heartHp}/${s.heartMax}`, 280, 32);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`Wave ${Math.min(s.wave + 1, s.totalWaves)}/${s.totalWaves}`, 400, 32);
  ctx.fillText(`Score ${s.score}`, 520, 32);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`Kills ${s.kills}`, 640, 32);
  if (s.waveActive) ctx.fillText(`Enemies left ${s.enemiesLeft}`, 740, 32);
  if (s.best > 0) ctx.fillText(`Best ${s.best}`, 900, 32);
  // Small buttons top-right.
  drawMiniButton(ctx, 1060, 10, 64, 44, s.paused ? '▶' : '⏸');
  drawMiniButton(ctx, 1130, 10, 64, 44, s.speed === 2 ? '2×' : '1×');
  drawMiniButton(ctx, 1200, 10, 64, 44, s.muted ? '🔇' : '🔊');
}

function drawMiniButton(ctx, x, y, w, h, label) {
  ctx.fillStyle = '#24382a';
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
}

function drawToolbar(ctx, s) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, TOOLBAR_Y, FIELD.width, FIELD.height - TOOLBAR_Y);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, TOOLBAR_Y, FIELD.width, 2);
  TOWER_ORDER.forEach((type, i) => {
    const def = TOWERS[type];
    const x = 16 + i * (CARD_W + 10);
    const y = TOOLBAR_Y + 8;
    const selected = s.selectedTower === type;
    ctx.fillStyle = selected ? '#2c4a2c' : '#1d2f21';
    ctx.strokeStyle = selected ? '#ffd166' : PALETTE.panelEdge;
    ctx.lineWidth = selected ? 3 : 1;
    ctx.beginPath();
    ctx.roundRect(x, y, CARD_W, CARD_H, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(x + 24, y + CARD_H / 2, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${def.key} · ${def.name}`, x + 44, y + 18);
    ctx.fillStyle = s.nectar >= def.cost ? PALETTE.nectar : PALETTE.danger;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`🌼 ${def.cost} — ${def.blurb}`, x + 44, y + 40);
  });
  // Selected tower: upgrade / sell.
  const selected = s.selectedPlot >= 0 ? s.towers.find((t) => t.plot === s.selectedPlot) : null;
  if (selected) {
    const def = TOWERS[selected.type];
    const cost = upgradeCost(selected);
    ctx.fillStyle = '#1d2f21';
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.beginPath();
    ctx.roundRect(630, TOOLBAR_Y + 8, 180, CARD_H, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = cost === null ? PALETTE.muted : PALETTE.text;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cost === null ? '★ MAX LEVEL ★' : `⬆ Upgrade 🌼 ${cost}`, 720, TOOLBAR_Y + 37);
    ctx.fillStyle = '#1d2f21';
    ctx.beginPath();
    ctx.roundRect(820, TOOLBAR_Y + 8, 120, CARD_H, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`Sell +${sellValue(selected)}`, 880, TOOLBAR_Y + 37);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${def.name} · Lv ${selected.level + 1} · dmg ${towerStats(selected).damage}`, 630, TOOLBAR_Y - 4);
  }
  // Wave button.
  const waveX = 1000;
  const waveY = TOOLBAR_Y + 8;
  const running = s.waveActive;
  ctx.fillStyle = running ? '#3a3f2a' : '#3e7d2c';
  ctx.strokeStyle = running ? PALETTE.panelEdge : '#7ed957';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(waveX, waveY, 264, CARD_H, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    running ? `Wave ${s.wave + 1} in progress…` : s.wave >= s.totalWaves ? 'Garden saved!' : `▶ Send Wave ${s.wave + 1}  (Space)`,
    waveX + 132, waveY + CARD_H / 2 + 1,
  );
}

function drawMessage(ctx, s) {
  ctx.font = 'bold 18px system-ui, sans-serif';
  const w = ctx.measureText(s.message).width + 32;
  ctx.fillStyle = 'rgba(10,20,12,0.85)';
  ctx.beginPath();
  ctx.roundRect((FIELD.width - w) / 2, 76, w, 36, 18);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s.message, FIELD.width / 2, 95);
}

function panel(ctx) {
  ctx.fillStyle = 'rgba(8,16,10,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function drawTitle(ctx, s) {
  panel(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7ed957';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.fillText('BLOOMLINE', FIELD.width / 2, 210);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '26px system-ui, sans-serif';
  ctx.fillText('A garden tower defense — keep the Heartseed alive', FIELD.width / 2, 262);
  ctx.fillStyle = '#ffd166';
  ctx.font = '19px system-ui, sans-serif';
  ctx.fillText('Plant Briar Thorns, Frostblooms and Sunspores on the soil plots.', FIELD.width / 2, 310);
  ctx.fillText('Stop 10 waves of blight before they reach the golden Heartseed.', FIELD.width / 2, 340);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 24px system-ui, sans-serif';
  const blink = Math.sin(s.time * 4) > -0.2;
  if (blink) ctx.fillText('▶  Click to play', FIELD.width / 2, 420);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Mouse: build · 1/2/3: pick tower · U: upgrade · X: sell · Space: send wave · F: speed · P: pause · M: mute', FIELD.width / 2, 480);
  if (s.best > 0) {
    ctx.fillStyle = PALETTE.nectar;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`Best score: ${s.best}`, FIELD.width / 2, 520);
  }
}

function drawEnd(ctx, s, won) {
  panel(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#7ed957' : '#e5534b';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText(won ? 'THE GARDEN BLOOMS!' : 'THE GARDEN FELL', FIELD.width / 2, 230);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '24px system-ui, sans-serif';
  ctx.fillText(
    won
      ? `All 10 waves turned back — the Heartseed shines with ${s.heartHp} health to spare.`
      : `The blight reached the Heartseed on wave ${s.wave + 1}.`,
    FIELD.width / 2, 290,
  );
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.nectar;
  ctx.fillText(`Score ${s.score}   ·   Kills ${s.kills}   ·   Nectar earned ${s.earned}`, FIELD.width / 2, 350);
  if (s.score >= s.best && s.score > 0) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('★ New best score! ★', FIELD.width / 2, 395);
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('Click or press R to play again', FIELD.width / 2, 460);
}

function drawPaused(ctx) {
  panel(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 48px system-ui, sans-serif';
  ctx.fillText('PAUSED', FIELD.width / 2, 340);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Press P to resume', FIELD.width / 2, 390);
}
