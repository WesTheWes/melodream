import { CH, H, L, LICKS, type Bar, type ChordKey, type Lick } from './licks';
import { stageById } from './stages';
import { pcOf, type Mode } from './theory';

// Generated licks: hundreds of fresh phrases for every territory, built from
// simple rules so they sound like melodies, not random notes.
//
// Main road: a stepwise walk through the territory's scale with the odd leap
// (filled back in by a step the other way), rhythms from the territory's
// feel, and an ending on a stable degree.
// Progression Paths: for each chord, aim the downbeat at one of its chord
// tones (voice-led from the last one), then walk to the next target, with
// chromatic approach tones where the territory allows them.
//
// Everything is seeded, so the same licks (and ids) come out on every build.

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];

type Feel = 'even' | 'mixed' | 'sync' | 'swing' | 'funk';
const CELLS: Record<Feel, number[][]> = {
  even: [[1], [1], [1], [0.5, 0.5]],
  mixed: [[0.5, 0.5], [0.5, 0.5], [1], [1], [1.5, 0.5], [0.5, 0.5, 1]],
  sync: [[0.5, 1, 0.5], [0.75, 0.25], [0.5, 0.5], [1], [0.25, 0.25, 0.5], [1.5, 0.5]],
  swing: [[0.5, 0.5], [0.5, 0.5], [0.5, 0.5], [1], [1.5, 0.5], [0.5, 1, 0.5]],
  funk: [[0.25, 0.25, 0.5], [0.5, 0.25, 0.25], [0.75, 0.25], [0.25, 0.25, 0.25, 0.25], [0.5, 0.5], [1]],
};

// Durations for n notes, from rhythm cells, with the last note held to the
// next half-bar line.
function rhythm(r: () => number, n: number, feel: Feel): number[] {
  const d: number[] = [];
  while (d.length < n - 1) d.push(...pick(r, CELLS[feel]));
  d.length = n - 1;
  const used = d.reduce((a, b) => a + b, 0);
  const end = Math.max(1, Math.ceil((used + 1) / 2) * 2 - used);
  return [...d, end];
}

// Durations that fill exactly `beats`, for one bar of a harmony lick.
function barRhythm(r: () => number, beats: number, feel: Feel, last: boolean): number[] {
  if (last) return [beats];
  for (let tries = 0; tries < 40; tries++) {
    const d: number[] = [];
    let left = beats;
    while (left > 1e-9) {
      const cell = pick(r, CELLS[feel]).filter((x) => x <= left + 1e-9);
      if (!cell.length) d.push(left), (left = 0);
      for (const x of cell) {
        if (x > left + 1e-9) break;
        d.push(x);
        left -= x;
      }
    }
    if (d.length >= 2 || beats <= 2) return d;
  }
  return [beats / 2, beats / 2];
}

const ladderOf = (pcs: number[], lo: number, hi: number) => {
  const out: number[] = [];
  for (let s = lo; s <= hi; s++) if (pcs.includes(pcOf(s))) out.push(s);
  return out;
};
const nearestIdx = (ladder: number[], s: number) => {
  let best = 0;
  ladder.forEach((x, i) => {
    if (Math.abs(x - s) < Math.abs(ladder[best] - s)) best = i;
  });
  return best;
};

// ---- Main road ---------------------------------------------------------

interface Spec {
  count: number;
  homes: Mode[];
  len: [number, number];
  leap: number;
  feel: Feel;
  span: number;
  chroma?: boolean;
  scales?: { tag: string; home: Mode; pcs: number[]; color: number }[];
  genres?: { tag: string; home: Mode; pcs: number[]; feel: Feel }[];
}

const SPECS: Record<number, Spec> = {
  1: { count: 30, homes: ['major'], len: [3, 6], leap: 0.08, feel: 'even', span: 4 },
  2: { count: 45, homes: ['major'], len: [5, 8], leap: 0.2, feel: 'mixed', span: 12 },
  3: { count: 45, homes: ['major'], len: [4, 7], leap: 0.55, feel: 'mixed', span: 19 },
  4: { count: 45, homes: ['minor'], len: [5, 8], leap: 0.2, feel: 'mixed', span: 12 },
  5: { count: 45, homes: ['minor', 'minor', 'major'], len: [5, 8], leap: 0.5, feel: 'mixed', span: 19 },
  6: { count: 45, homes: ['major', 'minor'], len: [5, 9], leap: 0.25, feel: 'sync', span: 14 },
  7: { count: 55, homes: ['major', 'minor'], len: [6, 10], leap: 0.2, feel: 'mixed', span: 17 },
  8: { count: 55, homes: ['major', 'minor'], len: [6, 10], leap: 0.2, feel: 'mixed', span: 17, chroma: true },
  9: {
    count: 45, homes: ['major'], len: [6, 10], leap: 0.2, feel: 'mixed', span: 17,
    scales: [
      { tag: 'Dorian', home: 'minor', pcs: [0, 2, 3, 5, 7, 9, 10], color: 9 },
      { tag: 'Mixolydian', home: 'major', pcs: [0, 2, 4, 5, 7, 9, 10], color: 10 },
      { tag: 'Lydian', home: 'major', pcs: [0, 2, 4, 6, 7, 9, 11], color: 6 },
      { tag: 'Phrygian', home: 'minor', pcs: [0, 1, 3, 5, 7, 8, 10], color: 1 },
    ],
  },
  10: {
    count: 45, homes: ['major'], len: [6, 11], leap: 0.25, feel: 'swing', span: 19,
    genres: [
      { tag: 'blues', home: 'minor', pcs: [0, 3, 5, 6, 7, 10], feel: 'swing' },
      { tag: 'bebop', home: 'major', pcs: [0, 2, 4, 5, 7, 8, 9, 11], feel: 'swing' },
      { tag: 'folk', home: 'major', pcs: [0, 2, 4, 7, 9], feel: 'mixed' },
      { tag: 'country', home: 'major', pcs: [0, 2, 3, 4, 7, 9], feel: 'sync' },
      { tag: 'chiptune', home: 'major', pcs: [0, 4, 7, 11], feel: 'funk' },
    ],
  },
};

const STABLE: Record<Mode, number[]> = { major: [0, 4, 7], minor: [0, 3, 7] };

function walk(r: () => number, ladder: number[], n: number, leap: number, stable: number[]): number[] {
  const stableIdx = ladder.map((s, i) => (stable.includes(pcOf(s)) ? i : -1)).filter((i) => i >= 0);
  let i = r() < 0.7 ? pick(r, stableIdx.filter((j) => ladder[j] <= 12)) ?? 0 : Math.floor(r() * ladder.length);
  const out = [ladder[i]];
  let dir = r() < 0.5 ? 1 : -1;
  let leapt = false;
  while (out.length < n - 1) {
    if (r() > 0.7) dir = -dir;
    let step = 1;
    if (leapt) {
      dir = -dir;
      leapt = false;
    } else if (r() < leap) {
      step = 2 + Math.floor(r() * 3);
      leapt = true;
    }
    let j = i + dir * step;
    if (j < 0 || j >= ladder.length) {
      dir = -dir;
      j = i + dir * step;
    }
    j = Math.max(0, Math.min(ladder.length - 1, j));
    // no note three times running
    if (out.length >= 2 && ladder[j] === out[out.length - 1] && ladder[j] === out[out.length - 2]) continue;
    i = j;
    out.push(ladder[i]);
  }
  // end on a stable degree reached by step, adding a passing note if needed
  const near = stableIdx.reduce((b, j) => (Math.abs(j - i) < Math.abs(b - i) ? j : b), stableIdx[0]);
  if (Math.abs(near - i) > 1) out.push(ladder[near + (near > i ? -1 : 1)]);
  out.push(ladder[near]);
  return out;
}

function addChroma(r: () => number, notes: number[], durs: number[]): void {
  // A few chromatic approach tones: a half step below or above the next note.
  for (let k = notes.length - 1; k >= 1; k--) {
    if (r() < 0.3 && durs[k - 1] >= 0.5) {
      const target = notes[k];
      const ap = target + (r() < 0.6 ? -1 : 1);
      if (ap !== notes[k - 1] && ap >= 0) {
        const half = durs[k - 1] / 2;
        durs.splice(k - 1, 1, half, half);
        notes.splice(k, 0, ap);
        if (notes.length > 12) break;
      }
    }
  }
}

function mainLicks(stage: number): Lick[] {
  const spec = SPECS[stage];
  const st = stageById(stage);
  const r = rng(stage * 7919);
  const out: Lick[] = [];
  const seen = new Set(LICKS.filter((l) => l.stage === stage).map((l) => l.notes.join(',') + '|' + l.durs.join(',')));
  for (let tries = 0; out.length < spec.count && tries < spec.count * 30; tries++) {
    let home: Mode = pick(r, spec.homes);
    let pcs = st.available[home];
    let feel = spec.feel;
    let tag: string | undefined;
    let color: number | undefined;
    if (spec.scales) {
      const sc = pick(r, spec.scales);
      ({ home, pcs, tag, color } = sc);
    }
    if (spec.genres) {
      const g = pick(r, spec.genres);
      ({ home, pcs, feel, tag } = g);
    }
    if (st.available[home].length === 12 && !spec.scales && !spec.genres) pcs = home === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
    const ladder = ladderOf(pcs, 0, spec.span);
    const n = spec.len[0] + Math.floor(r() * (spec.len[1] - spec.len[0] + 1));
    const notes = walk(r, ladder, n, spec.leap, STABLE[home]);
    const durs = rhythm(r, notes.length, feel);
    if (spec.chroma) addChroma(r, notes, durs);
    if (color !== undefined && !notes.some((x) => pcOf(x) === color)) continue; // a mode lick must use its color note
    if (notes.some((x) => !st.available[home].includes(pcOf(x)))) continue;
    const key = notes.join(',') + '|' + durs.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(L(`g${stage}-${out.length + 1}`, stage, home, notes, durs, tag));
  }
  return out;
}

// ---- Progression Paths -------------------------------------------------

type Template = { chords: (ChordKey | [ChordKey, number])[]; home: Mode; tag?: string; feel?: Feel };
const T = (home: Mode, chords: Template['chords'], tag?: string, feel?: Feel): Template => ({ home, chords, tag, feel });

const PATHS: Record<number, { count: number; feel: Feel; chroma: boolean; templates: Template[] }> = {
  11: { count: 30, feel: 'mixed', chroma: false, templates: [T('major', ['I', 'IV']), T('major', ['I', 'IV', 'I']), T('major', ['I', 'V', 'I']), T('major', ['I', 'V'])] },
  12: { count: 30, feel: 'mixed', chroma: false, templates: [T('major', ['I', 'V', 'vi', 'IV']), T('major', ['vi', 'IV', 'I', 'V']), T('major', ['I', 'vi', 'IV', 'V'])] },
  13: { count: 30, feel: 'swing', chroma: false, templates: [T('major', ['I7', 'IV7', 'I7'], 'blues'), T('major', ['I7', 'IV7', 'V7', 'I7'], 'blues'), T('major', ['I7', 'I7', 'IV7', 'I7'], 'blues')] },
  14: { count: 30, feel: 'swing', chroma: false, templates: [T('major', ['ii7', 'V7', 'Imaj7'])] },
  15: { count: 30, feel: 'swing', chroma: false, templates: [T('major', [['I', 2], ['vi', 2], ['ii', 2], ['V7', 2], 'I']), T('major', [['iii7', 2], ['vi7', 2], ['ii7', 2], ['V7', 2], 'Imaj7'])] },
  16: { count: 30, feel: 'mixed', chroma: false, templates: [T('major', ['I', 'iv', 'I']), T('major', ['I', 'bVI', 'bVII', 'I']), T('major', ['I', 'bVII', 'IV', 'I']), T('major', ['I', 'VofV', 'V7', 'I'])] },
  17: { count: 30, feel: 'swing', chroma: false, templates: [T('minor', ['iiø', 'V7m', 'i']), T('minor', ['i', 'iv7', 'V7m', 'i'])] },
  18: { count: 30, feel: 'mixed', chroma: false, templates: [T('minor', ['i', 'bVIIm', 'bVIm', 'Vm']), T('minor', ['i', 'IVdor', 'i', 'IVdor'], 'Dorian vamp')] },
  19: { count: 30, feel: 'swing', chroma: true, templates: [T('major', ['ii7', 'V7', 'Imaj7']), T('major', [['I', 2], ['vi', 2], ['ii', 2], ['V7', 2], 'I'])] },
  20: { count: 30, feel: 'funk', chroma: false, templates: [T('major', ['I7', 'I7'], 'funk'), T('minor', ['i7', 'i7'], 'funk'), T('major', ['I7', 'IV7'], 'funk'), T('minor', ['i7', 'IVdor'], 'Dorian funk')] },
};

function pathLicks(stage: number): Lick[] {
  const spec = PATHS[stage];
  const st = stageById(stage);
  const r = rng(stage * 104729);
  const out: Lick[] = [];
  const seen = new Set<string>();
  for (let tries = 0; out.length < spec.count && tries < spec.count * 40; tries++) {
    const tpl = pick(r, spec.templates);
    const allowed = st.available[tpl.home];
    const chords = tpl.chords.map((c) => (Array.isArray(c) ? { key: c[0], beats: c[1] } : { key: c, beats: 4 }));
    // Walk the key's own scale plus the chord's tones. Territories that allow
    // every note (bebop, borrowed chords) would otherwise walk in half steps.
    const DIATONIC = tpl.home === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
    const ladderFor = (key: ChordKey) => {
      if (allowed.length <= 8) return ladderOf(allowed, 0, 19);
      const tones = CH[key].tones.map(pcOf);
      return ladderOf([...new Set([...DIATONIC, ...tones])].filter((p) => allowed.includes(p)), 0, 19);
    };
    // voice-led downbeat targets: a chord tone near the last target
    const targets: number[] = [];
    let ok = true;
    for (let b = 0; b < chords.length; b++) {
      const tones = CH[chords[b].key].tones.map(pcOf).filter((p) => allowed.includes(p));
      const cands = ladderFor(chords[b].key).filter((s) => tones.includes(pcOf(s)));
      if (!cands.length) {
        ok = false;
        break;
      }
      const prev = targets[b - 1] ?? 4 + Math.floor(r() * 9);
      const sorted = [...cands].sort((a, z) => Math.abs(a - prev) - Math.abs(z - prev));
      // last chord: land on its root or third, and prefer a resolution
      targets.push(b === chords.length - 1 ? sorted.find((s) => [0, 3, 4].includes(pcOf(s - CH[chords[b].key].root))) ?? sorted[0] : pick(r, sorted.slice(0, 3)));
    }
    if (!ok) continue;
    const bars: Bar[] = [];
    for (let b = 0; b < chords.length; b++) {
      const last = b === chords.length - 1;
      const durs = barRhythm(r, chords[b].beats, tpl.feel ?? spec.feel, last);
      const notes = [targets[b]];
      const next = last ? targets[b] : targets[b + 1];
      const ladder = ladderFor(chords[b].key);
      let i = nearestIdx(ladder, targets[b]);
      for (let k = 1; k < durs.length; k++) {
        const remaining = durs.length - k;
        const goal = nearestIdx(ladder, next);
        // head toward the next target; wander a little when there is time
        let dir = Math.sign(goal - i) || (r() < 0.5 ? 1 : -1);
        if (remaining > Math.abs(goal - i) + 1 && r() < 0.35) dir = -dir;
        const step = r() < 0.15 ? 2 : 1;
        i = Math.max(0, Math.min(ladder.length - 1, i + dir * step));
        let note = ladder[i];
        // chromatic approach into the next downbeat
        if (spec.chroma && k === durs.length - 1 && !last && r() < 0.6) note = next + (next > notes[notes.length - 1] ? -1 : 1);
        if (note === notes[notes.length - 1] && notes.length >= 2 && note === notes[notes.length - 2]) note = ladder[Math.max(0, i - 1)];
        notes.push(note);
      }
      bars.push([chords[b].key, notes.map((s, k) => [s, durs[k]] as [number, number]), chords[b].beats]);
    }
    const flat = bars.flatMap((b) => b[1].map((x) => x[0]));
    if (flat.some((x) => x < 0 || x > 24)) continue;
    if (!spec.chroma && flat.some((x) => !allowed.includes(pcOf(x)))) continue;
    const key = bars.map((b) => b[0] + ':' + b[1].map((x) => x.join('/')).join(' ')).join(' | ');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(H(`g${stage}-${out.length + 1}`, stage, tpl.home, bars, tpl.tag));
  }
  return out;
}

export const GENERATED: Lick[] = [
  ...Object.keys(SPECS).flatMap((s) => mainLicks(Number(s))),
  ...Object.keys(PATHS).flatMap((s) => pathLicks(Number(s))),
];
