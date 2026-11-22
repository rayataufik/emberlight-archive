// Emberlight Archive — entry point.
// Boots the game on the canvas, runs the frame loop, and honours
// ?shot=cover|alert|exit|title, which stages a frozen moment of the real
// game for screenshots (the game is paused on that one frame).
import { Game } from './game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) game.applyShot(shot);

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.frame(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
