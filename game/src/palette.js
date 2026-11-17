// palette.js — the arena's colour story. The backdrop hue drifts as waves
// climb through tiers (ember dusk -> frost night -> storm void), and every
// element owns a fixed colour used by spells, particles and the HUD.

export const ELEMENTS = {
  ember: { name: 'Ember', key: '1', color: '#ff9a3c', hot: '#ffd23c', deep: '#c1440e' },
  frost: { name: 'Frost', key: '2', color: '#7ce7ff', hot: '#e8fbff', deep: '#1d6fb8' },
  storm: { name: 'Storm', key: '3', color: '#c792ff', hot: '#f3e8ff', deep: '#6a2fb8' },
};

export const ELEMENT_ORDER = ['ember', 'frost', 'storm'];

// Wave tiers: background gradient stops + arena ring colour per tier.
const TIERS = [
  { top: '#2b1626', mid: '#1c1020', floor: '#140b16', ring: '#5a2d3f', glow: '#ff9a3c' }, // waves 1-3 ember dusk
  { top: '#14202e', mid: '#101a26', floor: '#0b121c', ring: '#2d4a5a', glow: '#7ce7ff' }, // waves 4-6 frost night
  { top: '#1d1430', mid: '#150f26', floor: '#0d0919', ring: '#45306b', glow: '#c792ff' }, // waves 7-9 storm void
  { top: '#26121a', mid: '#1a0d16', floor: '#110810', ring: '#6b3040', glow: '#ff5d5d' }, // waves 10-12 blood dusk
  { top: '#101826', mid: '#0c1220', floor: '#080c14', ring: '#33506e', glow: '#ffe9a3' }, // waves 13+ the pale deep
];

export function tierForWave(wave) {
  if (wave <= 3) return TIERS[0];
  if (wave <= 6) return TIERS[1];
  if (wave <= 9) return TIERS[2];
  if (wave <= 12) return TIERS[3];
  return TIERS[4];
}

export const INK = '#f4ead8';       // warm parchment text
export const INK_DIM = '#a89a83';   // secondary text
export const PANEL = 'rgba(16, 10, 20, 0.82)';
export const PANEL_EDGE = 'rgba(244, 234, 216, 0.25)';
