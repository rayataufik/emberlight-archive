// Emberlight Archive — keyboard state.
// WASD or arrows to move, Shift to sneak, M to mute, R to restart a level,
// Enter / Space to start. Mouse: click the on-screen buttons on the title
// and end screens (the canvas reports clicks by region in game.js).
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.click = null;
    this.onFirstInput = null;
    this._down = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!this.keys.has(e.key)) this.pressed.add(e.key);
      this.keys.add(e.key);
      if (this.onFirstInput) { const f = this.onFirstInput; this.onFirstInput = null; f(); }
    };
    this._up = (e) => this.keys.delete(e.key);
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
  }

  attachClick(canvas, toGameCoords) {
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (canvas.height / rect.height);
      this.click = { x, y };
      if (this.onFirstInput) { const f = this.onFirstInput; this.onFirstInput = null; f(); }
      if (toGameCoords) toGameCoords(x, y);
    });
  }

  endFrame() {
    this.pressed.clear();
    this.click = null;
  }

  held(...names) {
    return names.some((n) => this.keys.has(n));
  }

  wasPressed(...names) {
    return names.some((n) => this.pressed.has(n));
  }

  moveVector() {
    let x = 0;
    let y = 0;
    if (this.held('a', 'A', 'ArrowLeft')) x -= 1;
    if (this.held('d', 'D', 'ArrowRight')) x += 1;
    if (this.held('w', 'W', 'ArrowUp')) y -= 1;
    if (this.held('s', 'S', 'ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  get sneaking() {
    return this.held('Shift');
  }
}
