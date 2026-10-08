// Everything is measured from the tonic. A "semi" is semitones above the
// tonic; 0 is home, 12 is home one floor up. Labels are scale degrees.

export type Mode = 'major' | 'minor';

// The scale a phrase actually lives in. Mode (major/minor family) drives the
// keyboard layout and spelling; Scale drives the harmony that establishes home.
export type Scale = 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian';

export const SCALE_FAMILY: Record<Scale, Mode> = {
  major: 'major',
  lydian: 'major',
  mixolydian: 'major',
  minor: 'minor',
  dorian: 'minor',
  phrygian: 'minor',
};

// Four-chord cadences that use each mode's own characteristic chord, voiced
// as semitones above the tonic. The last chord is always home.
export const CADENCES: Record<Scale, { names: string[]; chords: number[][] }> = {
  major: { names: ['I', 'IV', 'V', 'I'], chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]] },
  minor: { names: ['i', 'iv', 'V', 'i'], chords: [[0, 3, 7], [5, 8, 12], [7, 11, 14], [0, 3, 7]] },
  dorian: { names: ['i', 'IV', '♭VII', 'i'], chords: [[0, 3, 7], [5, 9, 12], [-2, 2, 5], [0, 3, 7]] },
  mixolydian: { names: ['I', '♭VII', 'IV', 'I'], chords: [[0, 4, 7], [-2, 2, 5], [5, 9, 12], [0, 4, 7]] },
  lydian: { names: ['I', 'II', 'V', 'I'], chords: [[0, 4, 7], [2, 6, 9], [7, 11, 14], [0, 4, 7]] },
  phrygian: { names: ['i', '♭II', '♭vii', 'i'], chords: [[0, 3, 7], [1, 5, 8], [-2, 1, 5], [0, 3, 7]] },
};

export const LABELS: Record<number, string> = {
  0: '1',
  1: '♭2',
  2: '2',
  3: '♭3',
  4: '3',
  5: '4',
  6: '♯4',
  7: '5',
  8: '♭6',
  9: '6',
  10: '♭7',
  11: '7',
};

export function degreeLabel(semi: number, opts: { octaveMark?: boolean } = {}): string {
  const pc = ((semi % 12) + 12) % 12;
  const base = LABELS[pc];
  if (opts.octaveMark === false) return base;
  if (semi >= 12) return base + '↑';
  if (semi < 0) return base + '↓';
  return base;
}

// Spoken form for "say it out loud" prompts.
export function degreeSpoken(semi: number): string {
  const pc = ((semi % 12) + 12) % 12;
  const words: Record<number, string> = {
    0: 'one',
    1: 'flat two',
    2: 'two',
    3: 'flat three',
    4: 'three',
    5: 'four',
    6: 'sharp four',
    7: 'five',
    8: 'flat six',
    9: 'six',
    10: 'flat seven',
    11: 'seven',
  };
  return words[pc];
}

// One color per degree, everywhere in the app.
export const DEGREE_COLORS: Record<number, string> = {
  0: '#FFD166',
  1: '#E0C8FF',
  2: '#FF9F68',
  3: '#FFA3C6',
  4: '#FF6FA5',
  5: '#C77DFF',
  6: '#D8B4FF',
  7: '#6EC6FF',
  8: '#C8A2FF',
  9: '#7CF5C8',
  10: '#FFB0B0',
  11: '#FF7B7B',
};

export function degreeColor(semi: number): string {
  return DEGREE_COLORS[((semi % 12) + 12) % 12];
}

// ---- Spelling ------------------------------------------------------
// Notes are spelled from the key, never from a fixed list. Each scale degree
// owns a letter a fixed distance from the tonic's letter, so a key uses one
// consistent signature: C♯ minor is all sharps, D♭ major is all flats.

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

// How each tonic pitch class is named, per mode. These are the keys with six
// or fewer accidentals in their signature.
const TONIC_SPELLING: Record<Mode, string[]> = {
  //       C     C♯/D♭  D     D♯/E♭  E     F     F♯/G♭  G     G♯/A♭  A     A♯/B♭  B
  major: ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'],
  minor: ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'],
};

// Letter steps above the tonic for each semitone degree:
// 1 ♭2 2 ♭3 3 4 ♯4 5 ♭6 6 ♭7 7
const DEGREE_LETTER_STEP = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];

function accidental(n: number): string {
  if (n === 0) return '';
  if (n === 1) return '♯';
  if (n === 2) return '𝄪';
  if (n === -1) return '♭';
  if (n === -2) return '𝄫';
  return n > 0 ? '♯'.repeat(n) : '♭'.repeat(-n);
}

export function tonicName(tonicMidi: number, mode: Mode): string {
  return TONIC_SPELLING[mode][pcOf(tonicMidi)];
}

// Spell the note `semi` semitones above the tonic, in this key.
export function spellNote(tonicMidi: number, mode: Mode, semi: number): string {
  const tonic = tonicName(tonicMidi, mode);
  const tonicLetter = LETTERS.indexOf(tonic[0]);
  const step = DEGREE_LETTER_STEP[pcOf(semi)];
  const letterIdx = (tonicLetter + step) % 7;
  const targetPc = pcOf(tonicMidi + semi);
  let diff = targetPc - LETTER_PC[letterIdx];
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  if (Math.abs(diff) >= 2) return plainName(targetPc, tonic.includes('♭') ? 'flat' : 'sharp');
  return LETTERS[letterIdx] + accidental(diff);
}

// Readability over strict spelling: a double sharp or flat becomes its plain
// enharmonic (E𝄫 → D), using the key's own accidental when a black key is needed.
function plainName(pc: number, prefer: 'sharp' | 'flat'): string {
  const natural = LETTER_PC.indexOf(pc);
  if (natural >= 0) return LETTERS[natural];
  return prefer === 'flat' ? LETTERS[LETTER_PC.indexOf(pc + 1)] + '♭' : LETTERS[LETTER_PC.indexOf(pc - 1)] + '♯';
}

export function keyName(tonicMidi: number, mode: Mode): string {
  return `${tonicName(tonicMidi, mode)} ${mode}`;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

// Scale sets as pitch classes above the tonic.
export const SCALES = {
  majorPent: [0, 2, 4, 7, 9],
  minorPent: [0, 3, 5, 7, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

// Keyboard layouts: which semis (0..12) get a key. Keys not in a stage's
// "available" set render locked.
export const KEYBOARDS: Record<Mode | 'chromatic', number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  minor: [0, 2, 3, 5, 7, 8, 10, 12],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

// Why a degree sounds the way it does; shown after a guess, never before.
export const DEGREE_HINTS: Record<number, string> = {
  0: '1 is home. Everything else leans back toward it. Hum the bass note, then the phrase again.',
  1: '♭2 sits a half step above home and leans hard back down onto it.',
  2: '2 hangs just above home and wants to drop back down to 1. Hear that tug.',
  3: '♭3 is the dark third. It sits a half step under the bright 3 and gives minor its color.',
  4: '3 is the sweet, settled chord note. It sits a little above 2 and feels at rest.',
  5: '4 leans down toward 3. It feels suspended, like a held breath.',
  6: '♯4 is bright and strange. It pushes up into 5.',
  7: '5 is the strong pillar of the key. It can sit still for a long time without pulling anywhere.',
  8: '♭6 is heavy and sad. It sinks a half step down onto 5.',
  9: '6 sits one step above 5 and likes to fall back into it. If 6 sounded like 5, listen for the extra lift.',
  10: '♭7 is the bluesy, relaxed seventh. It leans down toward 6 or ♭6, never up.',
  11: '7 is the leading tone. It aches to rise a half step into home.',
};

export function hintFor(semi: number): string {
  return DEGREE_HINTS[((semi % 12) + 12) % 12];
}

export function pcOf(semi: number): number {
  return ((semi % 12) + 12) % 12;
}

// ---- Chords ----------------------------------------------------------
// The chord lens: what job a note does over the chord under it. Grading always
// uses the key degree; this is the second layer shown in feedback.

const CHORD_TONE_LABELS = ['R', '♭9', '9', '♭3', '3', '11', '♭5', '5', '♭13', '13', '♭7', '7'];
const CHORD_TONE_WORDS: Record<string, string> = {
  R: 'root',
  '♭9': '♭9',
  '9': '9th',
  '♭3': '♭3rd',
  '3': '3rd',
  '11': '11th',
  '♭5': '♭5th',
  '5': '5th',
  '♭13': '♭13th',
  '13': '13th',
  '♭7': '♭7th',
  '7': '7th',
};

// Interval of `semi` above the chord root, as a chord-tone label (R, 3, ♭7, 9…).
export function chordToneLabel(semi: number, chordRoot: number): string {
  return CHORD_TONE_LABELS[pcOf(semi - chordRoot)];
}

export function chordToneWord(semi: number, chordRoot: number): string {
  return CHORD_TONE_WORDS[chordToneLabel(semi, chordRoot)];
}

// Is this note one of the chord's own tones (as opposed to a tension)?
export function isChordTone(semi: number, tones: number[]): boolean {
  return tones.some((t) => pcOf(t) === pcOf(semi));
}
