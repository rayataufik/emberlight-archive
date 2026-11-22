// Emberlight Archive — the three levels.
// Each level is built from a floor plan: border walls, shelf rows, crate
// clusters (cover that blocks a guard's line of sight), shadow corners
// where detection grows slowly, and lanterns whose light makes you easier
// to spot. Guards patrol waypoint loops; seals must all be taken before
// the exit opens.
import {
  COLS, ROWS, T_FLOOR, T_WALL, T_CRATE, T_SHELF, T_SHADOW,
} from './config.js';

function blankGrid() {
  const grid = [];
  for (let y = 0; y < ROWS; y++) {
    const row = new Array(COLS).fill(T_FLOOR);
    grid.push(row);
  }
  return grid;
}

function borderWalls(grid) {
  for (let x = 0; x < COLS; x++) {
    grid[0][x] = T_WALL;
    grid[ROWS - 1][x] = T_WALL;
  }
  for (let y = 0; y < ROWS; y++) {
    grid[y][0] = T_WALL;
    grid[y][COLS - 1] = T_WALL;
  }
}

function rect(grid, x0, y0, x1, y1, kind) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) grid[y][x] = kind;
  }
}

// Waypoints are tile centres: [col, row] pairs a guard walks in a loop.
function guard(waypoints, pauseSeconds = 1.2) {
  return { waypoints, pauseSeconds };
}

export const LEVELS = [
  {
    name: 'I — The Reading Room',
    intro: 'Slip past the night watch. Take both archive seals, then reach the green exit unseen.',
    playerStart: [2, 17],
    exit: [27, 2],
    seals: [[14, 9], [24, 15]],
    lanterns: [[7, 4], [15, 15], [22, 6], [26, 12]],
    guards: [
      guard([[6, 5], [13, 5], [13, 11], [6, 11]]),
      guard([[18, 3], [24, 3], [24, 10], [18, 10]]),
      guard([[10, 15], [20, 15], [20, 18], [10, 18]], 2.0),
    ],
    build() {
      const g = blankGrid();
      borderWalls(g);
      rect(g, 8, 7, 11, 8, T_CRATE);   // reading tables as cover
      rect(g, 16, 12, 19, 13, T_CRATE);
      rect(g, 22, 8, 23, 10, T_SHELF); // tall shelves
      rect(g, 4, 12, 5, 14, T_SHELF);
      rect(g, 25, 14, 27, 14, T_CRATE);
      rect(g, 12, 3, 12, 4, T_CRATE);
      rect(g, 2, 2, 4, 3, T_SHADOW);   // dark corner by the door
      rect(g, 25, 16, 28, 18, T_SHADOW);
      rect(g, 14, 16, 16, 17, T_SHADOW);
      return g;
    },
  },
  {
    name: 'II — The Stacks',
    intro: 'Shelf rows break every sightline — use them. Three seals, four guards, no second chances.',
    playerStart: [2, 10],
    exit: [27, 17],
    seals: [[8, 3], [19, 6], [15, 16]],
    lanterns: [[5, 5], [12, 10], [20, 14], [25, 4]],
    guards: [
      guard([[5, 2], [12, 2], [12, 8], [5, 8]]),
      guard([[17, 3], [25, 3], [25, 11], [17, 9]], 0.8),
      guard([[4, 12], [13, 11], [12, 17], [4, 17]]),
      guard([[18, 12], [25, 11], [26, 17], [18, 17]], 1.6),
    ],
    build() {
      const g = blankGrid();
      borderWalls(g);
      rect(g, 7, 4, 7, 7, T_SHELF);
      rect(g, 10, 4, 10, 7, T_SHELF);
      rect(g, 14, 4, 14, 7, T_SHELF);
      rect(g, 20, 4, 20, 7, T_SHELF);
      rect(g, 24, 4, 24, 7, T_SHELF);
      rect(g, 7, 12, 7, 15, T_SHELF);
      rect(g, 12, 12, 12, 15, T_SHELF);
      rect(g, 17, 12, 17, 15, T_SHELF);
      rect(g, 22, 12, 22, 15, T_SHELF);
      rect(g, 26, 12, 26, 15, T_SHELF);
      rect(g, 3, 5, 4, 5, T_CRATE);
      rect(g, 15, 9, 16, 10, T_CRATE);
      rect(g, 25, 9, 26, 10, T_CRATE);
      rect(g, 2, 16, 3, 18, T_SHADOW);
      rect(g, 27, 2, 28, 3, T_SHADOW);
      rect(g, 14, 17, 16, 18, T_SHADOW);
      return g;
    },
  },
  {
    name: 'III — The Vault',
    intro: 'The vault keeper never sleeps. Five guards, three seals, one way out.',
    playerStart: [15, 18],
    exit: [15, 2],
    seals: [[3, 3], [26, 3], [15, 10]],
    lanterns: [[8, 6], [21, 6], [8, 14], [21, 14], [15, 10]],
    guards: [
      guard([[4, 5], [11, 5], [11, 9], [4, 9]]),
      guard([[18, 5], [25, 5], [25, 9], [18, 9]], 0.8),
      guard([[4, 12], [10, 12], [10, 16], [4, 16]]),
      guard([[19, 12], [25, 12], [25, 16], [19, 16]], 1.6),
      guard([[13, 4], [16, 4], [16, 15], [13, 15]], 0.5),
    ],
    build() {
      const g = blankGrid();
      borderWalls(g);
      rect(g, 6, 7, 9, 7, T_SHELF);
      rect(g, 20, 7, 23, 7, T_SHELF);
      rect(g, 6, 12, 9, 12, T_SHELF);
      rect(g, 20, 12, 23, 12, T_SHELF);
      rect(g, 13, 7, 16, 7, T_CRATE);
      rect(g, 13, 12, 16, 12, T_CRATE);
      rect(g, 2, 8, 3, 10, T_CRATE);
      rect(g, 26, 8, 27, 10, T_CRATE);
      rect(g, 11, 3, 11, 4, T_SHELF);
      rect(g, 18, 3, 18, 4, T_SHELF);
      rect(g, 11, 15, 11, 16, T_SHELF);
      rect(g, 18, 15, 18, 16, T_SHELF);
      rect(g, 2, 2, 4, 3, T_SHADOW);
      rect(g, 25, 2, 27, 3, T_SHADOW);
      rect(g, 2, 16, 3, 17, T_SHADOW);
      rect(g, 26, 16, 27, 17, T_SHADOW);
      return g;
    },
  },
];

// Tile at (col,row); anything outside the grid is a wall.
export function tileAt(grid, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return T_WALL;
  return grid[row][col];
}

export function blocksMovement(grid, col, row) {
  const t = tileAt(grid, col, row);
  return t === T_WALL || t === T_CRATE || t === T_SHELF;
}

export function blocksSight(grid, col, row) {
  return blocksMovement(grid, col, row);
}

export function isShadow(grid, col, row) {
  return tileAt(grid, col, row) === T_SHADOW;
}
