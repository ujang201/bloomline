// Sound: every effect is synthesised with WebAudio — no audio files, no network.
// The context is created on the first user gesture; in screenshot mode it stays silent.
let ctx = null;
let master = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.14;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
}

function tone(freqFrom, freqTo, duration, type, when = 0) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), t0 + duration);
  gain.gain.setValueAtTime(0.9, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playSound(name) {
  if (!ctx) return;
  switch (name) {
    case 'shoot': tone(620, 280, 0.07, 'square'); break;
    case 'pop': tone(320, 70, 0.14, 'triangle'); break;
    case 'coin': tone(880, 1320, 0.1, 'sine'); break;
    case 'build': tone(180, 90, 0.16, 'sine'); break;
    case 'upgrade': tone(520, 520, 0.09, 'sine'); tone(660, 660, 0.09, 'sine', 0.08); tone(880, 880, 0.12, 'sine', 0.16); break;
    case 'horn': tone(220, 330, 0.4, 'sawtooth'); break;
    case 'clear': tone(660, 660, 0.1, 'sine'); tone(880, 880, 0.14, 'sine', 0.1); break;
    case 'leak': tone(160, 60, 0.35, 'sawtooth'); break;
    case 'deny': tone(140, 110, 0.12, 'square'); break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.16, 'sine', i * 0.13));
      break;
    case 'lose':
      [392, 330, 262, 196].forEach((f, i) => tone(f, f, 0.22, 'triangle', i * 0.16));
      break;
    default: break;
  }
}

/** Drain the world's queued sound names into the synth. */
export function drainSounds(state) {
  if (state.muted) {
    state.sounds.length = 0;
    return;
  }
  ensureAudio();
  for (const name of state.sounds) playSound(name);
  state.sounds.length = 0;
}
