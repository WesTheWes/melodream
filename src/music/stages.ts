import { KEYBOARDS, SCALES, type Mode } from './theory';

export type Home = 'major' | 'minor' | 'both';

export interface Stage {
  id: number;
  name: string;
  blurb: string;
  desc: string;
  home: Home;
  // Pitch classes (0..11) the player may be asked to hear, per mode.
  available: Record<Mode, number[]>;
  // Which keyboard layout to show, per mode.
  keyboard: Record<Mode, number[]>;
  unlocks: string;
  color: string;
  // Clean runs in a row needed to open the next territory.
  gate: number;
  // Does timing count in feedback? (Pitch always counts; rhythm is a later milestone.)
  rhythm: boolean;
  // Progression Paths: licks over chord changes. A harmony territory opens when
  // the main-road territory `after` is cleared, so it never asks for degrees
  // you have not met.
  branch?: 'harmony';
  after?: number;
  progressions?: string[];
  // Ask where the lick lands on each new chord ("Land the target").
  targets?: boolean;
}

export const GATE = 10;

export const STAGES: Stage[] = [
  {
    id: 1,
    name: 'First Steps',
    blurb: 'Three notes, tiny moves',
    desc: 'Licks built from 1, 2 and 3 over a major home. Mostly steps, one note at a time, slow and sing-able.',
    home: 'major',
    available: { major: [0, 2, 4], minor: [0, 2, 3] },
    keyboard: { major: KEYBOARDS.major, minor: KEYBOARDS.minor },
    unlocks: 'Square Lead voice · The cadence button',
    color: '#FFD166',
    gate: GATE,
    rhythm: false,
  },
  {
    id: 2,
    name: 'Pentatonic Meadow',
    blurb: 'Major pentatonic: 1 2 3 5 6',
    desc: 'The five notes behind most melodies you already love, over a major home. Licks start to leap a little.',
    home: 'major',
    available: { major: SCALES.majorPent, minor: SCALES.minorPent },
    keyboard: { major: KEYBOARDS.major, minor: KEYBOARDS.minor },
    unlocks: 'Triangle Bass voice · 8-note licks · Folk & country phrase shapes',
    color: '#7CF5C8',
    gate: GATE,
    rhythm: false,
  },
  {
    id: 3,
    name: 'Leap Lake',
    blurb: 'Major pentatonic, bigger jumps',
    desc: 'Same five notes, bolder moves: sixths, octaves, skipping over home and landing back on it.',
    home: 'major',
    available: { major: SCALES.majorPent, minor: SCALES.minorPent },
    keyboard: { major: KEYBOARDS.major, minor: KEYBOARDS.minor },
    unlocks: 'Octave key · Call-and-response licks',
    color: '#6EC6FF',
    gate: GATE,
    rhythm: false,
  },
  {
    id: 4,
    name: 'Minor Hollow',
    blurb: 'Minor pentatonic: 1 ♭3 4 5 ♭7',
    desc: 'A new home. The cadence turns minor and the five notes shift with it. Hear ♭3 and ♭7 as colors of the key, not as borrowed notes.',
    home: 'minor',
    available: { major: SCALES.majorPent, minor: SCALES.minorPent },
    keyboard: { major: KEYBOARDS.major, minor: KEYBOARDS.minor },
    unlocks: 'Minor home · Minor cadence · Blues & rock phrase shapes',
    color: '#C77DFF',
    gate: GATE,
    rhythm: false,
  },
  {
    id: 5,
    name: 'Shadow Peaks',
    blurb: 'Minor pentatonic, bigger jumps',
    desc: 'Leaps across the minor pentatonic: 4 up to ♭3, ♭7 down to home, two-octave runs. Then licks that switch between the two homes.',
    home: 'both',
    available: { major: SCALES.majorPent, minor: SCALES.minorPent },
    keyboard: { major: KEYBOARDS.major, minor: KEYBOARDS.minor },
    unlocks: 'Major ↔ minor switching · Riff-style licks',
    color: '#8E86B8',
    gate: GATE,
    rhythm: false,
  },
  {
    id: 6,
    name: 'Rhythm Ridge',
    blurb: 'Syncopation, rests, swing',
    desc: 'Both pentatonics, rhythms you do not know yet. Timing now counts in feedback, not just pitch.',
    home: 'both',
    available: { major: SCALES.majorPent, minor: SCALES.minorPent },
    keyboard: { major: KEYBOARDS.major, minor: KEYBOARDS.minor },
    unlocks: 'Swing feel · Rhythm feedback',
    color: '#FF9F68',
    gate: GATE,
    rhythm: true,
  },
  {
    id: 7,
    name: 'Diatonic Forest',
    blurb: 'All seven degrees arrive',
    desc: '4 and 7 join the major key; 2 and ♭6 join the minor. Hear the pull of the leading tone and the lean of 4 toward 3.',
    home: 'both',
    available: { major: SCALES.major, minor: SCALES.minor },
    keyboard: { major: KEYBOARDS.major, minor: KEYBOARDS.minor },
    unlocks: 'Full diatonic keyboard · Pop & hymn phrases',
    color: '#FF6FA5',
    gate: GATE,
    rhythm: true,
  },
  {
    id: 8,
    name: 'Chromatic Caves',
    blurb: 'Notes from outside the key',
    desc: 'Passing tones and borrowed colors: ♯4, ♭6, ♭7 in major, the raised 7 in minor. Learn how outside notes resolve.',
    home: 'both',
    available: { major: SCALES.chromatic, minor: SCALES.chromatic },
    keyboard: { major: KEYBOARDS.chromatic, minor: KEYBOARDS.chromatic },
    unlocks: 'Black keys · Bebop phrase shapes · Wurly voice',
    color: '#FF7B7B',
    gate: GATE,
    rhythm: true,
  },
  {
    id: 9,
    name: 'Mode Mountains',
    blurb: 'Modes & wandering harmony',
    desc: 'Home stays put while the colors around it shift: Dorian, Mixolydian, Lydian. Then progressions that borrow chords and feint toward a new key.',
    home: 'both',
    available: { major: SCALES.chromatic, minor: SCALES.chromatic },
    keyboard: { major: KEYBOARDS.chromatic, minor: KEYBOARDS.chromatic },
    unlocks: 'Mode cadences · Chord backing · Modulation drills',
    color: '#7CF5C8',
    gate: GATE,
    rhythm: true,
  },
  {
    id: 10,
    name: 'Genre Gardens',
    blurb: 'Blues, bebop, folk, chiptune',
    desc: 'Pick a style and learn its vocabulary. Every lick here is something a player in that scene would actually want to steal.',
    home: 'both',
    available: { major: SCALES.chromatic, minor: SCALES.chromatic },
    keyboard: { major: KEYBOARDS.chromatic, minor: KEYBOARDS.chromatic },
    unlocks: 'Style packs · Lick library · Your own licks',
    color: '#FFD166',
    gate: GATE,
    rhythm: true,
  },
];

// Progression Paths. Every progression stays in its home key: chords are
// diatonic, borrowed from the parallel mode, or a brief secondary dominant, so
// every note is graded as a degree of home (see the home rule in the README).
const BLUES = [0, 2, 3, 4, 5, 6, 7, 9, 10];
const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 10, 11];
const MODAL_MINOR = [0, 2, 3, 5, 7, 8, 9, 10, 11];
const BORROWED = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const FUNK_MAJOR = [0, 2, 3, 4, 7, 9, 10];
const FUNK_MINOR = [0, 2, 3, 5, 7, 9, 10];

export const HARMONY_STAGES: Stage[] = [
  {
    id: 11,
    name: 'Two-Chord Tide',
    blurb: 'I–IV and I–V',
    desc: 'Major pentatonic licks over two chords. Hear how the same degree changes job: 6 is a sweet 3rd over IV, 2 is the 5th of V.',
    home: 'major',
    available: { major: SCALES.majorPent, minor: SCALES.minorPent },
    keyboard: { major: KEYBOARDS.major, minor: KEYBOARDS.minor },
    unlocks: 'Chord backing · The chord lane',
    color: '#7CF5C8',
    gate: GATE,
    rhythm: false,
    branch: 'harmony',
    after: 2,
    progressions: ['I–IV–I', 'I–V–I'],
  },
  {
    id: 12,
    name: 'Pop Pier',
    blurb: 'I–V–vi–IV',
    desc: 'The four-chord loop behind a thousand choruses. 1 over IV feels open, 3 over vi feels bittersweet.',
    home: 'major',
    available: { major: SCALES.majorPent, minor: SCALES.minorPent },
    keyboard: { major: KEYBOARDS.major, minor: KEYBOARDS.minor },
    unlocks: 'Four-chord hooks',
    color: '#FF9F68',
    gate: GATE,
    rhythm: false,
    branch: 'harmony',
    after: 2,
    progressions: ['I–V–vi–IV', 'vi–IV–I–V'],
  },
  {
    id: 13,
    name: 'Blues Bayou',
    blurb: 'I7–IV7–V7',
    desc: 'Blues over dominant chords in a major home, swung. Hear ♭3 slide into 3, the ♭5 blue note, and ♭3 turn into the ♭7 of IV7.',
    home: 'major',
    available: { major: BLUES, minor: BLUES },
    keyboard: { major: KEYBOARDS.chromatic, minor: KEYBOARDS.chromatic },
    unlocks: 'Blue notes over changes',
    color: '#6EC6FF',
    gate: GATE,
    rhythm: false,
    branch: 'harmony',
    after: 4,
    progressions: ['I7–IV7–I7', 'I7–IV7–V7–I7'],
  },
  {
    id: 14,
    name: 'Jazz Junction',
    blurb: 'ii–V–I',
    desc: 'Arpeggios and guide-tone lines through the most common move in jazz. Land the Target starts here: where does the lick land when the chord changes?',
    home: 'major',
    available: { major: SCALES.major, minor: SCALES.minor },
    keyboard: { major: KEYBOARDS.major, minor: KEYBOARDS.minor },
    unlocks: 'Land the Target · Guide tones',
    color: '#FFD166',
    gate: GATE,
    rhythm: false,
    branch: 'harmony',
    after: 7,
    progressions: ['ii7–V7–Imaj7'],
    targets: true,
  },
  {
    id: 15,
    name: 'Turnaround Tower',
    blurb: 'I–vi–ii–V, two beats each',
    desc: 'A chord every two beats. The lick has to keep up with the changes on the way back home.',
    home: 'major',
    available: { major: SCALES.major, minor: SCALES.minor },
    keyboard: { major: KEYBOARDS.major, minor: KEYBOARDS.minor },
    unlocks: 'Fast changes',
    color: '#FFA3C6',
    gate: GATE,
    rhythm: true,
    branch: 'harmony',
    after: 7,
    progressions: ['I–vi–ii–V–I', 'iii–vi–ii–V–I'],
    targets: true,
  },
  {
    id: 16,
    name: 'Borrowed Bridge',
    blurb: 'iv, ♭VI, ♭VII, V/V',
    desc: 'Chords borrowed from the parallel minor, and a quick lean toward V. Home never moves: the borrowed notes are ♭3, ♭6 and ♭7, and ♯4 leans into 5.',
    home: 'major',
    available: { major: BORROWED, minor: BORROWED },
    keyboard: { major: KEYBOARDS.chromatic, minor: KEYBOARDS.chromatic },
    unlocks: 'Modal mixture · Secondary dominants',
    color: '#C77DFF',
    gate: GATE,
    rhythm: false,
    branch: 'harmony',
    after: 8,
    progressions: ['I–iv–I', 'I–♭VI–♭VII–I', 'I–♭VII–IV–I', 'I–V/V–V7–I'],
    targets: true,
  },
  {
    id: 17,
    name: 'Minor Moors',
    blurb: 'iiø–V7–i',
    desc: 'The minor ii–V. The raised 7 appears only over V7, and ♭6 is its ♭9. Hear 7 → 1 and ♭6 → 5 pull home.',
    home: 'minor',
    available: { major: SCALES.major, minor: HARMONIC_MINOR },
    keyboard: { major: KEYBOARDS.chromatic, minor: KEYBOARDS.chromatic },
    unlocks: 'Minor ii–V',
    color: '#8E86B8',
    gate: GATE,
    rhythm: false,
    branch: 'harmony',
    after: 8,
    progressions: ['iiø7–V7–i', 'i–iv7–V7–i'],
    targets: true,
  },
  {
    id: 18,
    name: 'Andalusian Cliffs',
    blurb: 'i–♭VII–♭VI–V, Dorian i–IV',
    desc: 'Minor vamps and their colors: the flamenco walk down to V, and the bright 6 over Dorian’s major IV.',
    home: 'minor',
    available: { major: SCALES.major, minor: MODAL_MINOR },
    keyboard: { major: KEYBOARDS.chromatic, minor: KEYBOARDS.chromatic },
    unlocks: 'Modal vamps',
    color: '#FFB0B0',
    gate: GATE,
    rhythm: false,
    branch: 'harmony',
    after: 9,
    progressions: ['i–♭VII–♭VI–V', 'i–IV (Dorian)'],
    targets: true,
  },
  {
    id: 19,
    name: 'Bebop Boulevard',
    blurb: 'ii–V–I with chromatic vocabulary',
    desc: 'The language of bebop over the changes, swung: chromatic passing tones, enclosures that circle a target before landing, and the ♭9 over V7.',
    home: 'major',
    available: { major: SCALES.chromatic, minor: SCALES.chromatic },
    keyboard: { major: KEYBOARDS.chromatic, minor: KEYBOARDS.chromatic },
    unlocks: 'Enclosures · Chromatic approach tones',
    color: '#6EC6FF',
    gate: GATE,
    rhythm: false,
    branch: 'harmony',
    after: 8,
    progressions: ['ii7–V7–Imaj7', 'I–vi–ii–V–I'],
    targets: true,
  },
  {
    id: 20,
    name: 'Funk Factory',
    blurb: 'One-chord vamps, sixteenths',
    desc: 'Funk lives on one or two chords and a lot of rhythm. Sixteenth-note riffs over I7 and a Dorian i7, with ♭3 sliding into 3 and the bright 6 over minor.',
    home: 'both',
    available: { major: FUNK_MAJOR, minor: FUNK_MINOR },
    keyboard: { major: KEYBOARDS.chromatic, minor: KEYBOARDS.chromatic },
    unlocks: 'Sixteenth-note riffs',
    color: '#FF6FA5',
    gate: GATE,
    rhythm: true,
    branch: 'harmony',
    after: 6,
    progressions: ['I7 vamp', 'I7–IV7', 'i7 vamp', 'i7–IV (Dorian)'],
  },
];

export const MAIN_STAGES = STAGES;
export const ALL_STAGES: Stage[] = [...STAGES, ...HARMONY_STAGES];

export function stageById(id: number): Stage {
  return ALL_STAGES.find((s) => s.id === id) ?? STAGES[0];
}

export const isHarmony = (s: Stage): boolean => s.branch === 'harmony';

// Short code shown on tiles: 1..10 on the main road, H1..H8 on Progression Paths.
export function stageCode(s: Stage): string {
  return isHarmony(s) ? `H${s.id - 10}` : String(s.id);
}
