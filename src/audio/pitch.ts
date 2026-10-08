import { freqToMidi } from '../music/theory';

// Experimental microphone input. Autocorrelation pitch tracking on a live
// analyser; a note is emitted once the detected MIDI number is stable for a
// few frames, and again after a silence gap or a change of pitch.

export interface PitchListener {
  stop: () => void;
}

function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.012) return -1;

  // Trim quiet edges.
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) {
      r2 = SIZE - i;
      break;
    }
  }
  const slice = buf.slice(r1, r2);
  const N = slice.length;
  const c = new Float32Array(N).fill(0);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N - i; j++) c[i] += slice[j] * slice[j + i];
  }
  let d = 0;
  while (d + 1 < N && c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < N; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  if (maxpos <= 0) return -1;
  let T0 = maxpos;
  const x1 = c[T0 - 1] ?? 0;
  const x2 = c[T0];
  const x3 = c[T0 + 1] ?? 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);
  return sampleRate / T0;
}

export async function listenForNotes(onNote: (midi: number) => void): Promise<PitchListener> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const ctx = new C();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);

  let stable = 0;
  let candidate = -1;
  let lastEmitted = -1;
  let silent = 0;
  let raf = 0;

  const loop = () => {
    analyser.getFloatTimeDomainData(buf);
    const f = autoCorrelate(buf, ctx.sampleRate);
    if (f < 0 || f > 2000 || f < 50) {
      silent++;
      stable = 0;
      candidate = -1;
      if (silent > 5) lastEmitted = -1; // a gap lets the same note be played again
    } else {
      silent = 0;
      const m = Math.round(freqToMidi(f));
      if (m === candidate) stable++;
      else {
        candidate = m;
        stable = 1;
      }
      if (stable >= 4 && m !== lastEmitted) {
        lastEmitted = m;
        onNote(m);
      }
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return {
    stop: () => {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}
