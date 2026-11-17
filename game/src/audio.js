// audio.js — every sound in Emberwake is synthesised with WebAudio: short
// oscillator/noise blips for casts, hits, bursts and pickups, plus a slow
// adaptive music loop whose mode follows the wave tier. No audio files.

let ctx = null;
let master = null;
let musicTimer = 0;
let musicStep = 0;
let intensity = 0; // 0 calm .. 1 boss

function ensure() {
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch { return false; }
  return true;
}

export function unlockAudio() {
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume();
}

function tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
  if (!ensure()) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain); gain.connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

function noise(dur, vol = 0.2, freq = 1200, delay = 0) {
  if (!ensure()) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buffer;
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = freq;
  const gain = ctx.createGain(); gain.gain.value = vol;
  src.connect(filter); filter.connect(gain); gain.connect(master);
  src.start(t0);
}

export const sfx = {
  cast(element) {
    if (element === 'ember') { tone(520, 0.09, 'sawtooth', 0.06, 180); noise(0.06, 0.05, 2400); }
    else if (element === 'frost') { tone(1180, 0.1, 'sine', 0.08, 1900); tone(1760, 0.07, 'sine', 0.04, 2300, 0.02); }
    else { tone(240, 0.08, 'square', 0.05, 1400); noise(0.05, 0.06, 3600); }
  },
  hit() { noise(0.05, 0.08, 1800); },
  explosion() { noise(0.35, 0.3, 500); tone(120, 0.3, 'sine', 0.25, 40); },
  steam() { noise(0.3, 0.16, 900); tone(300, 0.25, 'sine', 0.05, 620); },
  chain() { tone(1500, 0.07, 'square', 0.06, 700); tone(1900, 0.06, 'square', 0.05, 900, 0.04); },
  dash() { noise(0.12, 0.1, 2600); },
  hurt() { tone(160, 0.16, 'sawtooth', 0.16, 70); },
  pickup() { tone(880, 0.07, 'sine', 0.08); tone(1320, 0.09, 'sine', 0.07, null, 0.05); },
  buy() { tone(660, 0.08, 'triangle', 0.12); tone(990, 0.1, 'triangle', 0.12, null, 0.07); },
  denied() { tone(140, 0.12, 'square', 0.08); },
  wave() { tone(392, 0.14, 'triangle', 0.12); tone(587, 0.18, 'triangle', 0.12, null, 0.1); },
  boss() { tone(98, 0.5, 'sawtooth', 0.16, 65); tone(147, 0.5, 'sawtooth', 0.1, 98, 0.08); },
  victory() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, null, i * 0.11)); },
  defeat() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.26, 'triangle', 0.1, null, i * 0.13)); },
  click() { tone(740, 0.05, 'sine', 0.07); },
};

// A slow two-bar loop: a low root pulse and a sparse pentatonic figure.
// The scale darkens and the tempo tightens as intensity rises.
const SCALES = {
  calm: [0, 3, 5, 7, 10],
  tense: [0, 2, 3, 7, 8],
};
const ROOT = 110; // A2

export function updateMusic(dt, wave, bossActive) {
  intensity = bossActive ? 1 : Math.min(0.7, wave / 20);
  if (!ctx || ctx.state !== 'running') return;
  musicTimer -= dt;
  if (musicTimer > 0) return;
  const beat = intensity > 0.8 ? 0.21 : 0.27;
  musicTimer = beat;
  const scale = intensity > 0.45 ? SCALES.tense : SCALES.calm;
  const step = musicStep++;
  if (step % 8 === 0) tone(ROOT, 0.5, 'sine', 0.10);
  if (step % 8 === 4) tone(ROOT * 1.5, 0.4, 'sine', 0.06);
  if (step % 2 === 0 && Math.random() < 0.75) {
    const deg = scale[(step / 2 + (step % 3)) % scale.length];
    tone(ROOT * 2 * Math.pow(2, deg / 12), 0.24, 'triangle', 0.045);
  }
  if (intensity > 0.8 && step % 4 === 2) noise(0.05, 0.03, 4000);
}
