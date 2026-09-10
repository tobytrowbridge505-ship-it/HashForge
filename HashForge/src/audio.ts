// ─────────────────────────────────────────────────────────────
//  synth sfx — everything generated with the Web Audio API
// ─────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let ambientOn = false;
let ambientNodes: { src: AudioBufferSourceNode; gain: GainNode; lfo: OscillatorNode } | null = null;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.42;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

export function initAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') void c.resume();
}

export function setMuted(m: boolean) {
  muted = m;
  if (master && ctx) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.linearRampToValueAtTime(m ? 0 : 0.42, ctx.currentTime + 0.08);
  }
}

export const isMuted = () => muted;

// tiny helper: schedule an oscillator blip
function blip(opts: {
  type: OscillatorType;
  f0: number;
  f1?: number;
  t?: number;
  dur: number;
  vol: number;
  curve?: 'exp' | 'lin';
}) {
  if (!ctx || !master || muted) return;
  const { type, f0, f1, t = 0, dur, vol, curve = 'exp' } = opts;
  try {
    const now = ctx.currentTime + t;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, now);
    if (f1 !== undefined) {
      if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + dur);
      else osc.frequency.linearRampToValueAtTime(f1, now + dur);
    }
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  } catch {
    /* audio glitched — ignore */
  }
}

export const sfx = {
  click() {
    blip({ type: 'square', f0: 620, f1: 220, dur: 0.06, vol: 0.11 });
    blip({ type: 'sine', f0: 1400, f1: 900, dur: 0.03, vol: 0.05 });
  },
  block() {
    blip({ type: 'triangle', f0: 523, dur: 0.1, vol: 0.16, t: 0 });
    blip({ type: 'triangle', f0: 659, dur: 0.1, vol: 0.16, t: 0.07 });
    blip({ type: 'triangle', f0: 784, dur: 0.16, vol: 0.18, t: 0.14 });
    blip({ type: 'sine', f0: 1568, f1: 1245, dur: 0.2, vol: 0.07, t: 0.16 });
  },
  crit() {
    blip({ type: 'sawtooth', f0: 300, f1: 1600, dur: 0.16, vol: 0.12 });
    blip({ type: 'triangle', f0: 880, dur: 0.09, vol: 0.16, t: 0.1 });
    blip({ type: 'triangle', f0: 1175, dur: 0.14, vol: 0.16, t: 0.17 });
    blip({ type: 'triangle', f0: 1760, dur: 0.2, vol: 0.14, t: 0.24 });
  },
  buy() {
    blip({ type: 'sine', f0: 880, dur: 0.08, vol: 0.15 });
    blip({ type: 'sine', f0: 1318, dur: 0.14, vol: 0.15, t: 0.07 });
  },
  sell() {
    blip({ type: 'sawtooth', f0: 660, f1: 330, dur: 0.12, vol: 0.09 });
    blip({ type: 'sine', f0: 1046, dur: 0.09, vol: 0.12, t: 0.1 });
    blip({ type: 'sine', f0: 1568, dur: 0.12, vol: 0.1, t: 0.16 });
  },
  deny() {
    blip({ type: 'square', f0: 150, f1: 90, dur: 0.16, vol: 0.12 });
    blip({ type: 'square', f0: 96, dur: 0.12, vol: 0.09, t: 0.1 });
  },
  warn() {
    blip({ type: 'square', f0: 392, dur: 0.09, vol: 0.1 });
    blip({ type: 'square', f0: 311, dur: 0.14, vol: 0.1, t: 0.11 });
  },
  boot() {
    blip({ type: 'sawtooth', f0: 80, f1: 480, dur: 0.5, vol: 0.1, curve: 'exp' });
    blip({ type: 'sine', f0: 523, dur: 0.12, vol: 0.14, t: 0.5 });
    blip({ type: 'sine', f0: 784, dur: 0.16, vol: 0.14, t: 0.62 });
    blip({ type: 'sine', f0: 1046, dur: 0.3, vol: 0.15, t: 0.74 });
  },
};

// ── ambient fan hum ────────────────────────────────────────────
export function startAmbient() {
  const c = ensure();
  if (!c || !master || ambientOn) return;
  ambientOn = true;
  try {
    const len = 2 * c.sampleRate;
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.7;

    const src = c.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const low = c.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 160;
    low.Q.value = 0.8;

    const gain = c.createGain();
    gain.gain.value = 0.035;

    // slow breathing LFO on the hum
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.14;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain).connect(gain.gain);

    src.connect(low).connect(gain).connect(master);
    src.start();
    lfo.start();
    ambientNodes = { src, gain, lfo };
  } catch {
    ambientOn = false;
  }
}

export function stopAmbient() {
  if (!ambientNodes) return;
  try {
    ambientNodes.src.stop();
    ambientNodes.lfo.stop();
  } catch {
    /* already stopped */
  }
  ambientNodes = null;
  ambientOn = false;
}
