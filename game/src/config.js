// Emberlight Archive — shared tuning constants.
// One tile is 32px; the playfield is 30 x 20 tiles (960 x 640 canvas).
export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;
export const VIEW_W = COLS * TILE;
export const VIEW_H = ROWS * TILE;

// Tile kinds in the level grid.
export const T_FLOOR = 0;
export const T_WALL = 1;
export const T_CRATE = 2;
export const T_SHELF = 3;
export const T_SHADOW = 4;

// Movement speeds in pixels per second.
export const PLAYER_WALK_SPEED = 118;
export const PLAYER_SNEAK_SPEED = 62;
export const GUARD_PATROL_SPEED = 56;
export const GUARD_SUSPICIOUS_SPEED = 78;
export const GUARD_ALERT_SPEED = 108;

// Vision: cone range in px, half-angle in radians, detection fill rate.
export const GUARD_VIEW_RANGE = 185;
export const GUARD_VIEW_HALF_ANGLE = 0.62;
export const DETECTION_BASE_RATE = 55;
export const DETECTION_DECAY_RATE = 26;

// Noise: walking is heard this far (px); sneaking is silent.
export const WALK_NOISE_RADIUS = 46;

// Detection multipliers.
export const SNEAK_DETECTION_MULT = 0.45;
export const SHADOW_DETECTION_MULT = 0.45;
export const LANTERN_DETECTION_MULT = 1.35;

// Palette: a night archive lit by warm lanterns.
export const COLORS = {
  floorA: '#20242e',
  floorB: '#1b1f29',
  floorEdge: '#262b38',
  shadowFloor: '#141824',
  wallTop: '#3a3f52',
  wallFace: '#232637',
  crate: '#6b4a2a',
  crateEdge: '#8a6136',
  shelf: '#4a3220',
  shelfEdge: '#6e4c2e',
  rug: '#3d2b33',
  lanternGlow: 'rgba(255, 176, 66, 0.20)',
  lanternCore: '#ffb042',
  coneCalm: 'rgba(255, 214, 90, 0.30)',
  coneSuspicious: 'rgba(255, 158, 44, 0.42)',
  coneAlert: 'rgba(255, 64, 54, 0.48)',
  player: '#7fd4ff',
  playerCloak: '#2f6f8f',
  guard: '#ff5a4e',
  guardArmor: '#7a2a26',
  seal: '#ffd94a',
  exit: '#54e0a0',
  exitGlow: 'rgba(84, 224, 160, 0.25)',
  text: '#e8e2d2',
  textDim: '#9a937f',
  danger: '#ff5a4e',
};
