// input.js — keyboard and mouse state for the arena. main.js polls this each
// frame; nothing here knows about the game itself.

export const keys = new Set();
export const pressed = new Set(); // keys that went down this frame
export const mouse = { x: 0, y: 0, down: false, clicked: false };

let attached = null;

export function attachInput(canvas) {
  attached = canvas;
  addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); mouse.down = false; });

  const toGame = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * canvas.width;
    mouse.y = ((e.clientY - r.top) / r.height) * canvas.height;
  };
  canvas.addEventListener('mousemove', toGame);
  canvas.addEventListener('mousedown', (e) => { toGame(e); mouse.down = true; mouse.clicked = true; });
  addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function endFrame() {
  pressed.clear();
  mouse.clicked = false;
}

export function moveVector() {
  let x = 0, y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) { const s = Math.SQRT1_2; x *= s; y *= s; }
  return { x, y };
}

export function detachInput() { attached = null; }
