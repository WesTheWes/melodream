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
      // the final chord rings on a little after the phrase ends
      const ring = i === changes.length - 1 ? len + 1.5 * b : len * 0.96;
      if (ctx) {
        ch.tones.forEach((s) => this.tone({ midi: tonicMidi + s, at: t, dur: ring, type: 'triangle', gain: 0.03 * gain }));
        const bass = tonicMidi - 24 + (((ch.root % 12) + 12) % 12);
        const hits = ch.beats >= 4 ? [0, 2] : [0];
        hits.forEach((h, k) => {
          const d = (k === hits.length - 1 ? ch.beats - h + (i === changes.length - 1 ? 1.5 : 0) : 2) * b;
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
  // `lead` is rest before the first note, in beats (a pickup), so the phrase
  // sits on the beat against the backing, which starts at beat 0.
  playPhrase(
    midis: number[],
    beats: number[],
    bpm: number,
    hooks: { onNote?: (i: number) => void; onDone?: () => void; swing?: boolean; lead?: number } = {},
  ): () => void {
    const ctx = this.ensure();
    const b = 60 / bpm;
    const lead = hooks.lead ?? 0;
    const mine: number[] = [];
    // Note onsets in beats from the downbeat.
    const onsets: number[] = [];
    let p = lead;
    beats.forEach((d) => {
      onsets.push(p);
      p += d;
    });
    const frac = (x: number) => x - Math.floor(x + 1e-9);
    const near = (x: number, y: number) => Math.abs(x - y) < 1e-6;
    // Swing: written eighths play long-short (2:1). Only beats made purely of
    // eighth notes swing; triplets and sixteenths are already where they belong.
    const plainBeat = new Set<number>();
    if (hooks.swing) {
      const byBeat = new Map<number, number[]>();
      [...onsets, p].forEach((x) => {
        const k = Math.floor(x + 1e-9);
        byBeat.set(k, [...(byBeat.get(k) ?? []), frac(x)]);
      });
      byBeat.forEach((fs, k) => {
        if (fs.every((f) => near(f, 0) || near(f, 0.5))) plainBeat.add(k);
      });
    }
    const feel = (x: number) => (plainBeat.has(Math.floor(x + 1e-9)) && near(frac(x), 0.5) ? Math.floor(x + 1e-9) + 2 / 3 : x);
    const t0 = ctx ? ctx.currentTime + 0.06 : 0;
    midis.forEach((m, i) => {
      const start = feel(onsets[i]);
      const end = feel(onsets[i] + beats[i]);
      const last = i === midis.length - 1;
      // the last note rings at least a beat and a half, so phrases don't stop dead
      const sound = last ? Math.max(end - start, 1.5) : (end - start) * 0.9;
      if (ctx) this.tone({ midi: m, at: t0 + start * b, dur: Math.max(0.08, sound * b) });
      if (hooks.onNote) mine.push(window.setTimeout(() => hooks.onNote?.(i), 60 + start * b * 1000));
    });
    const endBeat = feel(p);
    if (hooks.onDone) mine.push(window.setTimeout(() => hooks.onDone?.(), 60 + endBeat * b * 1000 + 40));
    this.timers.push(...mine);
    return () => mine.forEach((id) => window.clearTimeout(id));
  }

  cancelAll(): void {
    this.timers.forEach((id) => window.clearTimeout(id));
    this.timers = [];
  }

  // Metronome click, scheduled on the audio clock. Accent the downbeat.
  click(at: number, accent = false): void {
    this.tone({ midi: accent ? 88 : 81, at, dur: 0.05, type: 'square', gain: accent ? 0.05 : 0.03 });
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
