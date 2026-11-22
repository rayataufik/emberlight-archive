// Emberlight Archive — game state and the update loop.
// States: title → playing → caught / level-clear → next level → win.
// The player walks or sneaks through the archive; guards patrol, grow
// suspicious, then give chase. Taking every seal opens the green exit.
// ?shot=cover|alert|exit|title stages a frozen moment for screenshots:
// real renders of this same code, with the game paused on one frame.
import {
  TILE, VIEW_W, VIEW_H, PLAYER_WALK_SPEED, PLAYER_SNEAK_SPEED,
  COLORS,
} from './config.js';
import { LEVELS, blocksMovement, isShadow } from './levels.js';
import { Guard, GUARD_ALERT } from './guards.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';

export const STATE_TITLE = 'title';
export const STATE_PLAYING = 'playing';
export const STATE_CAUGHT = 'caught';
export const STATE_LEVEL_CLEAR = 'level-clear';
export const STATE_WIN = 'win';

const RUGS = [
  [[8, 7, 4, 2], [16, 12, 4, 2]],
  [[8, 9, 3, 2], [19, 9, 3, 2]],
  [[13, 8, 4, 2], [2, 12, 3, 2]],
];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new Input();
    this.sounds = new SoundBank();
    this.input.onFirstInput = () => this.sounds.ensure();
    this.input.attachClick(canvas);
    this.levelIndex = 0;
    this.score = 0;
    this.state = STATE_TITLE;
    this.paused = false;
    this.time = 0;
    this.elapsed = 0;
    this.stateTimer = 0;
    this.titleButton = null;
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.grid = this.level.build();
    this.rugs = RUGS[index] || [];
    this.player = {
      x: (this.level.playerStart[0] + 0.5) * TILE,
      y: (this.level.playerStart[1] + 0.5) * TILE,
      sneaking: false,
    };
    this.exit = {
      x: (this.level.exit[0] + 0.5) * TILE,
      y: (this.level.exit[1] + 0.5) * TILE,
    };
    this.seals = this.level.seals.map(([c, r]) => ({
      x: (c + 0.5) * TILE,
      y: (r + 0.5) * TILE,
      taken: false,
    }));
    this.sealsTaken = 0;
    this.guards = this.level.guards.map((spec) => new Guard(spec));
    this.elapsed = 0;
  }

  startGame() {
    this.score = 0;
    this.loadLevel(0);
    this.state = STATE_PLAYING;
    this.sounds.ensure();
  }

  // Frozen staged moments for screenshots (?shot=...). The world is a
  // real state of the running game; only the clock is stopped.
  applyShot(shot) {
    if (shot === 'title') {
      this.state = STATE_TITLE;
      this.paused = true;
      return;
    }
    this.state = STATE_PLAYING;
    if (shot === 'cover') {
      this.loadLevel(0);
      this.player.x = 10.5 * TILE;
      this.player.y = 10.5 * TILE;
      this.player.sneaking = true;
      this.seals[0].taken = true;
      this.sealsTaken = 1;
      const g = this.guards[0];
      g.x = 9.5 * TILE;
      g.y = 6.5 * TILE;
      g.facing = Math.PI / 2;
      g.detection = 38;
      g.state = 'suspicious';
      const g2 = this.guards[1];
      g2.x = 21.5 * TILE;
      g2.y = 5.5 * TILE;
      g2.facing = Math.PI;
    } else if (shot === 'alert') {
      this.loadLevel(1);
      this.player.x = 15.5 * TILE;
      this.player.y = 10.5 * TILE;
      this.player.sneaking = false;
      this.seals[0].taken = true;
      this.sealsTaken = 1;
      const g = this.guards[1];
      g.x = 18.5 * TILE;
      g.y = 8.5 * TILE;
      g.facing = Math.atan2(this.player.y - g.y, this.player.x - g.x);
      g.detection = 100;
      g.state = GUARD_ALERT;
      const g2 = this.guards[2];
      g2.x = 9.5 * TILE;
      g2.y = 13.5 * TILE;
      g2.facing = 0;
      g2.detection = 62;
      g2.state = 'suspicious';
    } else if (shot === 'exit') {
      this.loadLevel(2);
      for (const s of this.seals) s.taken = true;
      this.sealsTaken = this.seals.length;
      this.player.x = 15.5 * TILE;
      this.player.y = 5.5 * TILE;
      this.player.sneaking = true;
      const g = this.guards[4];
      g.x = 14.5 * TILE;
      g.y = 8.5 * TILE;
      g.facing = -Math.PI / 2;
      g.detection = 20;
      const g2 = this.guards[0];
      g2.x = 7.5 * TILE;
      g2.y = 7.5 * TILE;
      g2.facing = Math.PI / 4;
    }
    this.paused = true;
  }

  movePlayer(dt) {
    const mv = this.input.moveVector();
    const sneaking = this.input.sneaking;
    this.player.sneaking = sneaking;
    if (mv.x === 0 && mv.y === 0) return;
    const speed = sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
    const r = 11;
    const stepX = mv.x * speed * dt;
    const stepY = mv.y * speed * dt;
    const nx = this.player.x + stepX;
    const ny = this.player.y + stepY;
    const clearAt = (x, y) => {
      const col = Math.floor(x / TILE);
      const row = Math.floor(y / TILE);
      return !blocksMovement(this.grid, col, row);
    };
    if (clearAt(nx + Math.sign(stepX) * r, this.player.y - r + 2)
      && clearAt(nx + Math.sign(stepX) * r, this.player.y + r - 2)) this.player.x = nx;
    if (clearAt(this.player.x - r + 2, ny + Math.sign(stepY) * r)
      && clearAt(this.player.x + r - 2, ny + Math.sign(stepY) * r)) this.player.y = ny;
    this._stepTimer = (this._stepTimer || 0) + dt;
    const interval = sneaking ? 0.55 : 0.34;
    if (this._stepTimer > interval) {
      this._stepTimer = 0;
      this.sounds.footstep(sneaking);
    }
  }

  update(dt) {
    if (this.paused) return;
    this.time += dt;
    if (this.state === STATE_TITLE) {
      if (this.input.wasPressed('Enter', ' ')) this.startGame();
      const click = this.input.click;
      if (click && this.titleButton
        && click.x >= this.titleButton.x && click.x <= this.titleButton.x + this.titleButton.w
        && click.y >= this.titleButton.y && click.y <= this.titleButton.y + this.titleButton.h) {
        this.startGame();
      }
      return;
    }
    if (this.state === STATE_CAUGHT || this.state === STATE_WIN) {
      this.stateTimer += dt;
      if (this.stateTimer > 0.6 && this.input.wasPressed('Enter', ' ', 'r', 'R')) {
        if (this.state === STATE_CAUGHT) {
          this.loadLevel(this.levelIndex);
          this.state = STATE_PLAYING;
        } else {
          this.startGame();
        }
      }
      return;
    }
    if (this.state === STATE_LEVEL_CLEAR) {
      this.stateTimer += dt;
      if (this.stateTimer > 1.1) {
        if (this.levelIndex + 1 < LEVELS.length) {
          this.loadLevel(this.levelIndex + 1);
          this.state = STATE_PLAYING;
        } else {
          this.state = STATE_WIN;
          this.stateTimer = 0;
          this.sounds.win();
        }
      }
      return;
    }
    if (this.input.wasPressed('m', 'M')) this.sounds.toggleMute();
    if (this.input.wasPressed('r', 'R')) {
      this.loadLevel(this.levelIndex);
      return;
    }
    this.elapsed += dt;
    this.movePlayer(dt);

    for (const guard of this.guards) {
      guard.update(dt, this.grid, this.player, this.level.lanterns);
      if (guard.justSpotted) this.sounds.spotted();
      if (guard.state === GUARD_ALERT
        && Math.hypot(guard.x - this.player.x, guard.y - this.player.y) < 24) {
        this.state = STATE_CAUGHT;
        this.stateTimer = 0;
        this.sounds.caught();
        return;
      }
    }

    for (const seal of this.seals) {
      if (!seal.taken && Math.hypot(seal.x - this.player.x, seal.y - this.player.y) < 24) {
        seal.taken = true;
        this.sealsTaken += 1;
        this.score += 150;
        this.sounds.pickup();
      }
    }

    if (this.sealsTaken >= this.level.seals.length
      && Math.hypot(this.exit.x - this.player.x, this.exit.y - this.player.y) < 26) {
      this.score += 500;
      this.state = STATE_LEVEL_CLEAR;
      this.stateTimer = 0;
      this.sounds.levelClear();
    }
  }

  draw() {
    const r = this.renderer;
    if (this.state === STATE_TITLE) {
      this.titleButton = r.drawTitle(this, this.time);
      return;
    }
    r.drawWorld(this, this.time);
    r.drawHud(this);
    if (this.state === STATE_CAUGHT) {
      r.drawCenteredPanel('CAUGHT!', [
        'A guard laid hands on you in the dark.',
        `You reached ${this.level.name} with ${this.sealsTaken} seal${this.sealsTaken === 1 ? '' : 's'} taken.`,
        'Shadows hide you. Crates and shelves break their sight.',
        'Sneak with Shift — running is loud.',
      ], COLORS.danger, '↻  Try this level again  (Enter)');
    } else if (this.state === STATE_LEVEL_CLEAR) {
      r.drawCenteredPanel('LEVEL CLEAR', [
        `${this.level.name} — every seal taken, exit reached unseen.`,
        `Score: ${this.score}`,
        this.levelIndex + 1 < LEVELS.length ? `Next: ${LEVELS[this.levelIndex + 1].name}` : 'That was the last level…',
      ], COLORS.exit, null);
    } else if (this.state === STATE_WIN) {
      const mins = Math.floor(this.elapsed / 60);
      const secs = Math.floor(this.elapsed % 60).toString().padStart(2, '0');
      r.drawCenteredPanel('THE VAULT IS YOURS', [
        'Every seal stolen. Every guard fooled. The archive never knew you were there.',
        `Final score: ${this.score}   ·   Time: ${mins}:${secs}`,
        'Thank you for playing Emberlight Archive.',
      ], COLORS.seal, '↻  Play again  (Enter)');
    } else if (this.state === STATE_PLAYING && this.elapsed < 4) {
      // Brief objective banner at the start of each level.
      const { ctx } = r;
      ctx.fillStyle = 'rgba(10, 12, 18, 0.78)';
      ctx.fillRect(0, 44, VIEW_W, 30);
      ctx.fillStyle = COLORS.text;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.level.intro, VIEW_W / 2, 59);
      ctx.textAlign = 'left';
    }
  }

  frame(dt) {
    this.update(dt);
    this.draw();
    this.input.endFrame();
  }
}
