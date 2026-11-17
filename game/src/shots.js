// shots.js — the screenshot handshake. When the page is opened with
// ?shot=<scene>, main.js renders one deterministic scene and calls ready()
// after a few frames; the maker's renderer waits for window.__shotReady
// before capturing, so no screenshot is ever taken mid-load.

let frames = 0;

export function frameRendered(isShot) {
  if (!isShot || window.__shotReady) return;
  frames++;
  if (frames >= 3) window.__shotReady = true;
}

export function ready() {
  window.__shotReady = true;
}
