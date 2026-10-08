import { CADENCES, midiToFreq, type Scale } from '../music/theory';

export type Voice = 'square' | 'triangle' | 'sawtooth';

interface ToneOpts {
  midi: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
}

// A small chiptune synth on Web Audio. Everything is scheduled on the
// audio clock; UI highlights are mirrored with setTimeout.
class Engine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timers: number[] = [];
  voice: Voice = 'square';

  ensure(): AudioContext | null {
    if (!this.ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      this.ctx = new C();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  get now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  tone({ midi, at, dur, type, gain = 0.07 }: ToneOpts): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    osc.type = type ?? this.voice;
    osc.frequency.value = midiToFreq(midi);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.012);
    g.gain.setValueAtTime(gain, at + Math.max(0.02, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(lp).connect(g).connect(this.master);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  // Immediate feedback when a key is tapped.
  tap(midi: number, dur = 0.35): void {
    const ctx = this.ensure();
    if (!ctx) return;
    this.tone({ midi, at: ctx.currentTime + 0.005, dur });
  }

  // A four-chord cadence in the phrase's own mode (see CADENCES), with the
  // chord roots in the bass. Returns its length in seconds.
  cadence(tonicMidi: number, scale: Scale, bpm: number): number {
    const ctx = this.ensure();
    if (!ctx) return 0;
    const b = 60 / bpm;
    const { chords } = CADENCES[scale];
    const t0 = ctx.currentTime + 0.05;
    let t = t0;
    chords.forEach((ch, i) => {
      const d = i === chords.length - 1 ? b * 2.4 : b * 1.15;
      ch.forEach((s) => this.tone({ midi: tonicMidi + s, at: t, dur: d, type: 'triangle', gain: 0.045 }));
      const root = ((ch[0] % 12) + 12) % 12;
      this.tone({ midi: tonicMidi - 24 + root, at: t, dur: d, type: 'square', gain: 0.05 });
      t += b * 1.2;
    });
    return t - t0 + b * 1.2;
  }

  // Comp a chord progression: a soft pad per chord and the root in the bass on
  // beats 1 and 3. Starts on the same clock tick as playPhrase, so calling both
  // back to back lines the lick up with the changes. onBar fires as each chord
  // begins. Returns a cancel function for the UI timers.
  backing(
    tonicMidi: number,
    changes: { root: number; tones: number[]; beats: number }[],
    bpm: number,
    hooks: { onBar?: (i: number) => void; onDone?: () => void; gain?: number } = {},
  ): () => void {
    const ctx = this.ensure();
    const b = 60 / bpm;
    const gain = hooks.gain ?? 1;
    let t = ctx ? ctx.currentTime + 0.06 : 0;
    let ms = 60;
    const mine: number[] = [];
    changes.forEach((ch, i) => {
      const len = ch.beats * b;
      if (ctx) {
        ch.tones.forEach((s) => this.tone({ midi: tonicMidi + s, at: t, dur: len * 0.96, type: 'triangle', gain: 0.03 * gain }));
        const bass = tonicMidi - 24 + (((ch.root % 12) + 12) % 12);
        const hits = ch.beats >= 4 ? [0, 2] : [0];
        hits.forEach((h, k) => {
          const d = (k === hits.length - 1 ? ch.beats - h : 2) * b;
          this.tone({ midi: bass, at: t + h * b, dur: d * 0.9, type: 'square', gain: 0.045 * gain });
        });
      }
      if (hooks.onBar) mine.push(window.setTimeout(() => hooks.onBar?.(i), ms));
      t += len;
      ms += len * 1000;
    });
    if (hooks.onDone) mine.push(window.setTimeout(() => hooks.onDone?.(), ms + 40));
    this.timers.push(...mine);
    return () => mine.forEach((id) => window.clearTimeout(id));
  }

  bass(tonicMidi: number, bpm: number): number {
    const ctx = this.ensure();
    if (!ctx) return 0;
    const d = (60 / bpm) * 3;
    this.tone({ midi: tonicMidi - 24, at: ctx.currentTime + 0.05, dur: d, type: 'square', gain: 0.06 });
    this.tone({ midi: tonicMidi - 12, at: ctx.currentTime + 0.05, dur: d, type: 'triangle', gain: 0.03 });
    return d;
  }

  // Play a phrase. onNote fires (on the UI clock) as each note begins;
  // onDone fires after the last note ends. Returns a cancel function.
  playPhrase(
    midis: number[],
    beats: number[],
    bpm: number,
    hooks: { onNote?: (i: number) => void; onDone?: () => void; swing?: boolean } = {},
  ): () => void {
    const ctx = this.ensure();
    const b = 60 / bpm;
    const start = ctx ? ctx.currentTime + 0.06 : 0;
    let t = start;
    let ms = 60;
    const mine: number[] = [];
    // Swing: written eighths play long-short (2:1). Each note's start and end
    // are moved, so the phrase keeps its length and stays on the beat.
    const feel = (pos: number) => {
      if (!hooks.swing) return pos;
      const beat = Math.floor(pos + 1e-9);
      const f = pos - beat;
      return beat + (f <= 0.5 ? f * (4 / 3) : 2 / 3 + (f - 0.5) * (2 / 3));
    };
    let pos = 0;
    midis.forEach((m, i) => {
      const dur = (feel(pos + beats[i]) - feel(pos)) * b;
      pos += beats[i];
      if (ctx) this.tone({ midi: m, at: t, dur: Math.max(0.08, dur * 0.9) });
      if (hooks.onNote) mine.push(window.setTimeout(() => hooks.onNote?.(i), ms));
      t += dur;
      ms += dur * 1000;
    });
    if (hooks.onDone) mine.push(window.setTimeout(() => hooks.onDone?.(), ms + 40));
    this.timers.push(...mine);
    return () => mine.forEach((id) => window.clearTimeout(id));
  }

  cancelAll(): void {
    this.timers.forEach((id) => window.clearTimeout(id));
    this.timers = [];
  }

  // Little UI sounds.
  blipYes(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    this.tone({ midi: 84, at: t, dur: 0.08, type: 'square', gain: 0.03 });
    this.tone({ midi: 91, at: t + 0.08, dur: 0.14, type: 'square', gain: 0.03 });
  }

  // A short chiptune arpeggio for opening a gate.
  fanfare(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => {
      const last = i === 6;
      this.tone({ midi: m, at: t + i * 0.09, dur: last ? 0.5 : 0.1, type: 'square', gain: 0.035 });
    });
    this.tone({ midi: 48, at: t, dur: 1.0, type: 'triangle', gain: 0.06 });
  }

  blipNo(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    this.tone({ midi: 55, at: t, dur: 0.12, type: 'sawtooth', gain: 0.025 });
    this.tone({ midi: 54, at: t + 0.1, dur: 0.18, type: 'sawtooth', gain: 0.025 });
  }
}

export const engine = new Engine();
