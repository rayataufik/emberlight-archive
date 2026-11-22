// Emberlight Archive — everything the player sees.
// Top-down night archive: checkerboard stone floor, warm lantern pools,
// soft vision cones that cover visibly cuts, crates and shelves you can
// read at a glance, and a HUD that shows seals, detection and the exit.
import {
  TILE, COLS, ROWS, VIEW_W, VIEW_H, COLORS,
  T_FLOOR, T_WALL, T_CRATE, T_SHELF, T_SHADOW,
} from './config.js';
import { GUARD_PATROL, GUARD_SUSPICIOUS, GUARD_ALERT } from './guards.js';

// Deterministic per-tile variation so the floor never looks flat.
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  drawWorld(game, time) {
    const { ctx } = this;
    const grid = game.grid;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    // Floor.
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = grid[y][x];
        const px = x * TILE;
        const py = y * TILE;
        const v = hash2(x, y);
        if (t === T_SHADOW) {
          ctx.fillStyle = COLORS.shadowFloor;
        } else {
          ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floorA : COLORS.floorB;
        }
        ctx.fillRect(px, py, TILE, TILE);
        if (t === T_FLOOR || t === T_SHADOW) {
          ctx.fillStyle = `rgba(255,255,255,${0.015 + v * 0.02})`;
          ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
          ctx.strokeStyle = COLORS.floorEdge;
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        }
      }
    }

    // Rugs under the reading tables: warm red rectangles that read as decor.
    ctx.fillStyle = COLORS.rug;
    ctx.globalAlpha = 0.35;
    for (const [cx, cy, w, h] of game.rugs) {
      roundRect(ctx, cx * TILE, cy * TILE, w * TILE, h * TILE, 6);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Lantern light pools on the floor.
    for (const [c, r] of game.level.lanterns) {
      const x = (c + 0.5) * TILE;
      const y = (r + 0.5) * TILE;
      const flicker = 0.85 + Math.sin(time * 3 + c * 1.7 + r) * 0.06;
      const grad = ctx.createRadialGradient(x, y, 4, x, y, 78 * flicker);
      grad.addColorStop(0, 'rgba(255, 176, 66, 0.30)');
      grad.addColorStop(1, 'rgba(255, 176, 66, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 78 * flicker, 0, Math.PI * 2);
      ctx.fill();
    }

    // Exit: a green doorway that glows once every seal is taken.
    const ex = game.exit;
    const exitOpen = game.sealsTaken >= game.level.seals.length;
    ctx.save();
    ctx.globalAlpha = exitOpen ? 1 : 0.45;
    const eg = ctx.createRadialGradient(ex.x, ex.y, 4, ex.x, ex.y, 54);
    eg.addColorStop(0, COLORS.exitGlow);
    eg.addColorStop(1, 'rgba(84, 224, 160, 0)');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = exitOpen ? COLORS.exit : '#3a7a5c';
    roundRect(ctx, ex.x - 13, ex.y - 13, 26, 26, 5);
    ctx.fill();
    ctx.strokeStyle = '#d8ffe9';
    ctx.lineWidth = 2;
    ctx.strokeRect(ex.x - 13, ex.y - 13, 26, 26);
    ctx.fillStyle = '#0c2b1c';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(exitOpen ? 'EXIT' : 'LOCK', ex.x, ex.y + 1);
    ctx.restore();

    // Seals: golden archive seals that spin gently.
    for (const seal of game.seals) {
      if (seal.taken) continue;
      const bob = Math.sin(time * 2.4 + seal.x) * 2;
      const grad = ctx.createRadialGradient(seal.x, seal.y + bob, 2, seal.x, seal.y + bob, 26);
      grad.addColorStop(0, 'rgba(255, 217, 74, 0.5)');
      grad.addColorStop(1, 'rgba(255, 217, 74, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(seal.x, seal.y + bob, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.seal;
      ctx.beginPath();
      ctx.arc(seal.x, seal.y + bob, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5b00';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('✦', seal.x, seal.y + bob + 0.5);
    }

    // Walls, crates and shelves.
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = grid[y][x];
        if (t !== T_WALL && t !== T_CRATE && t !== T_SHELF) continue;
        const px = x * TILE;
        const py = y * TILE;
        if (t === T_WALL) {
          ctx.fillStyle = COLORS.wallFace;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = COLORS.wallTop;
          ctx.fillRect(px, py, TILE, 7);
          ctx.strokeStyle = '#12141d';
          ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        } else if (t === T_CRATE) {
          ctx.fillStyle = COLORS.crate;
          roundRect(ctx, px + 3, py + 3, TILE - 6, TILE - 6, 3);
          ctx.fill();
          ctx.strokeStyle = COLORS.crateEdge;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px + 3, py + 3);
          ctx.lineTo(px + TILE - 3, py + TILE - 3);
          ctx.moveTo(px + TILE - 3, py + 3);
          ctx.lineTo(px + 3, py + TILE - 3);
          ctx.stroke();
        } else {
          ctx.fillStyle = COLORS.shelf;
          roundRect(ctx, px + 2, py + 2, TILE - 4, TILE - 4, 3);
          ctx.fill();
          ctx.strokeStyle = COLORS.shelfEdge;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px + 4, py + TILE / 2);
          ctx.lineTo(px + TILE - 4, py + TILE / 2);
          ctx.stroke();
          ctx.fillStyle = '#c9a86a';
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(px + 7 + i * 8, py + 7, 4, 8);
            ctx.fillRect(px + 7 + i * 8, py + 18, 4, 8);
          }
        }
      }
    }

    // Lantern posts.
    for (const [c, r] of game.level.lanterns) {
      const x = (c + 0.5) * TILE;
      const y = (r + 0.5) * TILE;
      ctx.fillStyle = '#2a2e3d';
      ctx.fillRect(x - 2, y - 6, 4, 12);
      ctx.fillStyle = COLORS.lanternCore;
      ctx.beginPath();
      ctx.arc(x, y - 4, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vision cones, drawn before the guards so the guard sits on top.
    for (const guard of game.guards) {
      const poly = guard.conePolygon(grid);
      const color = guard.state === GUARD_ALERT
        ? COLORS.coneAlert
        : guard.state === GUARD_SUSPICIOUS ? COLORS.coneSuspicious : COLORS.coneCalm;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
      ctx.closePath();
      ctx.fill();
    }

    // Guards: crimson watchmen with a facing tick and a detection ring.
    for (const guard of game.guards) {
      ctx.fillStyle = guard.state === GUARD_ALERT ? '#ff2e1f' : COLORS.guard;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.guardArmor;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd9d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(guard.x, guard.y);
      ctx.lineTo(guard.x + Math.cos(guard.facing) * 15, guard.y + Math.sin(guard.facing) * 15);
      ctx.stroke();
      if (guard.detection > 4) {
        const alerted = guard.detection >= 100;
        ctx.strokeStyle = alerted ? '#ff2e1f' : '#ffd65a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(guard.x, guard.y, 17, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * guard.detection) / 100);
        ctx.stroke();
        ctx.fillStyle = alerted ? '#ff2e1f' : '#ffd65a';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(alerted ? '!' : '?', guard.x, guard.y - 20);
      }
    }

    // The player: a hooded figure in a blue cloak with a small lantern glow.
    const p = game.player;
    const pGlow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 30);
    pGlow.addColorStop(0, 'rgba(127, 212, 255, 0.25)');
    pGlow.addColorStop(1, 'rgba(127, 212, 255, 0)');
    ctx.fillStyle = pGlow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.playerCloak;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2);
    ctx.fill();
    // Sneak = crouched ring; walking = soft footstep ripple.
    if (p.sneaking) {
      ctx.strokeStyle = 'rgba(127, 212, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Darkness vignette: the room is night, the lanterns are the light.
    const vig = ctx.createRadialGradient(
      VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85,
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  drawHud(game) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(10, 12, 18, 0.82)';
    roundRect(ctx, 0, 0, VIEW_W, 34, 0);
    ctx.fill();
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Emberlight Archive  ·  ${game.level.name}`, 12, 18);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.seal;
    ctx.fillText(`✦ Seals  ${game.sealsTaken} / ${game.level.seals.length}`, VIEW_W / 2, 18);
    const anyAlert = game.guards.some((g) => g.state === GUARD_ALERT);
    const anySuspicious = game.guards.some((g) => g.state === GUARD_SUSPICIOUS);
    ctx.fillStyle = anyAlert ? COLORS.danger : anySuspicious ? '#ff9e2c' : COLORS.exit;
    ctx.textAlign = 'right';
    ctx.fillText(anyAlert ? '● ALARM — HIDE!' : anySuspicious ? '● Suspicious…' : '○ Unseen', VIEW_W - 12, 18);
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '12px sans-serif';
    ctx.fillText('WASD move · Shift sneak · M mute · R restart', 12, VIEW_H - 12);
    const mins = Math.floor(game.elapsed / 60);
    const secs = Math.floor(game.elapsed % 60).toString().padStart(2, '0');
    ctx.textAlign = 'right';
    ctx.fillText(`${mins}:${secs}`, VIEW_W - 12, VIEW_H - 12);
    ctx.textAlign = 'left';
  }

  drawCenteredPanel(title, lines, accent, buttonLabel) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(8, 10, 16, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(20, 24, 36, 0.96)';
    roundRect(ctx, VIEW_W / 2 - 300, VIEW_H / 2 - 150, 600, 300, 14);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    roundRect(ctx, VIEW_W / 2 - 300, VIEW_H / 2 - 150, 600, 300, 14);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 96);
    ctx.fillStyle = COLORS.text;
    ctx.font = '16px sans-serif';
    let y = VIEW_H / 2 - 48;
    for (const line of lines) {
      ctx.fillText(line, VIEW_W / 2, y);
      y += 26;
    }
    if (buttonLabel) {
      ctx.fillStyle = accent;
      roundRect(ctx, VIEW_W / 2 - 130, y + 8, 260, 44, 8);
      ctx.fill();
      ctx.fillStyle = '#10131c';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText(buttonLabel, VIEW_W / 2, y + 31);
      return { x: VIEW_W / 2 - 130, y: y + 8, w: 260, h: 44 };
    }
    return null;
  }

  drawTitle(game, time) {
    this.drawWorld(game, time);
    const lines = [
      'A top-down stealth game in a lantern-lit archive.',
      'Take every golden seal, then slip out the green exit — unseen.',
      'Guards watch yellow cones. Crates and shelves block their sight.',
      'Shadows hide you. Lantern light and running give you away.',
      'Shift to sneak. The eye above a guard shows how close you are.',
    ];
    return this.drawCenteredPanel('EMBERLIGHT ARCHIVE', lines, COLORS.lanternCore, '▶  Begin the heist  (Enter)');
  }
}
