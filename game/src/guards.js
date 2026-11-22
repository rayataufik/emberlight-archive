// Emberlight Archive — guard brains.
// A guard patrols a waypoint loop, pauses at each point, and watches a
// vision cone. Seeing the player fills its detection meter; a full meter
// turns it suspicious, then alerted: it chases the last seen position,
// and catching the player ends the run. Losing the player makes it search
// the last seen spot, then return to patrol. Cover (crates, shelves,
// walls) blocks sight; running and lantern light make you easier to spot.
import {
  TILE, GUARD_PATROL_SPEED, GUARD_SUSPICIOUS_SPEED, GUARD_ALERT_SPEED,
  GUARD_VIEW_RANGE, GUARD_VIEW_HALF_ANGLE, DETECTION_BASE_RATE,
  DETECTION_DECAY_RATE, SNEAK_DETECTION_MULT, SHADOW_DETECTION_MULT,
  LANTERN_DETECTION_MULT, WALK_NOISE_RADIUS,
} from './config.js';
import { blocksSight, isShadow } from './levels.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_ALERT = 'alert';
export const GUARD_SEARCH = 'search';

// Distance along a ray from (x,y) in direction (dx,dy) until sight is
// blocked, capped at maxDist. Steps in small increments through the grid.
export function sightDistance(grid, x, y, dx, dy, maxDist) {
  const step = 4;
  for (let d = step; d <= maxDist; d += step) {
    const col = Math.floor((x + dx * d) / TILE);
    const row = Math.floor((y + dy * d) / TILE);
    if (blocksSight(grid, col, row)) return d;
  }
  return maxDist;
}

export function hasLineOfSight(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = 4;
  for (let d = step; d < dist; d += step) {
    const col = Math.floor((x0 + (dx * d) / dist) / TILE);
    const row = Math.floor((y0 + (dy * d) / dist) / TILE);
    if (blocksSight(grid, col, row)) return false;
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Guard {
  constructor(spec) {
    this.waypoints = spec.waypoints.map(([c, r]) => ({
      x: (c + 0.5) * TILE,
      y: (r + 0.5) * TILE,
    }));
    this.pauseSeconds = spec.pauseSeconds || 1.2;
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.wpIndex = 1 % this.waypoints.length;
    this.facing = 0;
    this.state = GUARD_PATROL;
    this.detection = 0;
    this.pauseTimer = 0;
    this.searchTimer = 0;
    this.lastSeen = null;
    this.seesPlayer = false;
    this.justSpotted = false;
  }

  // The fan of rays that draws this guard's vision cone, each ray cut
  // short by the first wall or crate it hits, so cover visibly eats the cone.
  conePolygon(grid) {
    const rays = 26;
    const pts = [{ x: this.x, y: this.y }];
    for (let i = 0; i <= rays; i++) {
      const a = this.facing - GUARD_VIEW_HALF_ANGLE
        + (2 * GUARD_VIEW_HALF_ANGLE * i) / rays;
      const d = sightDistance(grid, this.x, this.y, Math.cos(a), Math.sin(a), GUARD_VIEW_RANGE);
      pts.push({ x: this.x + Math.cos(a) * d, y: this.y + Math.sin(a) * d });
    }
    return pts;
  }

  canSeePlayer(grid, player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD_VIEW_RANGE) return false;
    const ang = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(ang, this.facing)) > GUARD_VIEW_HALF_ANGLE) return false;
    return hasLineOfSight(grid, this.x, this.y, player.x, player.y);
  }

  moveToward(tx, ty, speed, dt, grid) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return true;
    const step = Math.min(dist, speed * dt);
    this.facing = Math.atan2(dy, dx);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    // Slide along one axis at a time so guards hug walls instead of sticking.
    if (!blocksSight(grid, Math.floor(nx / TILE), Math.floor(this.y / TILE))) this.x = nx;
    if (!blocksSight(grid, Math.floor(this.x / TILE), Math.floor(ny / TILE))) this.y = ny;
    return dist - step < 2;
  }

  update(dt, grid, player, lanterns) {
    this.justSpotted = false;
    this.seesPlayer = this.canSeePlayer(grid, player);
    const dist = Math.hypot(player.x - this.x, player.y - this.y);

    if (this.seesPlayer) {
      let rate = DETECTION_BASE_RATE * (1.25 - dist / GUARD_VIEW_RANGE);
      if (player.sneaking) rate *= SNEAK_DETECTION_MULT;
      const col = Math.floor(player.x / TILE);
      const row = Math.floor(player.y / TILE);
      if (isShadow(grid, col, row)) rate *= SHADOW_DETECTION_MULT;
      const inLantern = lanterns.some(([c, r]) =>
        Math.hypot(player.x - (c + 0.5) * TILE, player.y - (r + 0.5) * TILE) < 70);
      if (inLantern) rate *= LANTERN_DETECTION_MULT;
      const before = this.detection;
      this.detection = Math.min(100, this.detection + rate * dt);
      if (before < 100 && this.detection >= 100) this.justSpotted = true;
      this.lastSeen = { x: player.x, y: player.y };
    } else {
      this.detection = Math.max(0, this.detection - DETECTION_DECAY_RATE * dt);
    }

    // A loud walker nearby draws a glance even out of the cone.
    if (!this.seesPlayer && !player.sneaking && dist < WALK_NOISE_RADIUS
      && this.state === GUARD_PATROL) {
      this.state = GUARD_SUSPICIOUS;
      this.lastSeen = { x: player.x, y: player.y };
      this.searchTimer = 2.5;
    }

    if (this.detection >= 100) {
      if (this.state !== GUARD_ALERT) this.state = GUARD_ALERT;
      this.searchTimer = 3;
    } else if (this.detection >= 55 && this.state === GUARD_PATROL) {
      this.state = GUARD_SUSPICIOUS;
      this.searchTimer = 2.5;
    }

    if (this.state === GUARD_PATROL) {
      if (this.pauseTimer > 0) {
        this.pauseTimer -= dt;
      } else {
        const target = this.waypoints[this.wpIndex];
        if (this.moveToward(target.x, target.y, GUARD_PATROL_SPEED, dt, grid)) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
          this.pauseTimer = this.pauseSeconds;
        }
      }
    } else if (this.state === GUARD_SUSPICIOUS) {
      if (this.lastSeen && this.moveToward(this.lastSeen.x, this.lastSeen.y, GUARD_SUSPICIOUS_SPEED, dt, grid)) {
        this.searchTimer -= dt;
        this.facing += dt * 1.6;
        if (this.searchTimer <= 0) {
          this.state = GUARD_PATROL;
          this.detection = Math.max(0, this.detection - 30);
        }
      }
    } else if (this.state === GUARD_ALERT) {
      const target = this.seesPlayer ? { x: player.x, y: player.y } : this.lastSeen;
      if (target) this.moveToward(target.x, target.y, GUARD_ALERT_SPEED, dt, grid);
      if (!this.seesPlayer) {
        this.searchTimer -= dt;
        if (this.searchTimer <= 0) {
          this.state = GUARD_SEARCH;
          this.searchTimer = 3;
        }
      } else {
        this.searchTimer = 3;
      }
    } else if (this.state === GUARD_SEARCH) {
      this.searchTimer -= dt;
      this.facing += dt * 2.2;
      if (this.searchTimer <= 0) {
        this.state = GUARD_PATROL;
        this.detection = 0;
      }
    }
  }
}
