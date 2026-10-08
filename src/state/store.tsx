import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { GATE, MAIN_STAGES, stageById, isHarmony } from '../music/stages';
import { pcOf } from '../music/theory';
import type { Voice } from '../audio/engine';
import type { KbLayout } from '../components/Keyboard';
import { DEV_ALLOWED } from '../dev';

export interface Tally {
  seen: number;
  right: number;
}

export interface Stats {
  // keyed by pitch class "0".."11": did the player name/play this degree right?
  degrees: Record<string, Tally>;
  // keyed by "expected>played" pitch classes, e.g. "9>7"
  confusions: Record<string, number>;
  // keyed by "from>to" pitch classes: melodic moves heard right
  moves: Record<string, Tally>;
  // keyed by "pc@roman", e.g. "11@V7": a degree heard over a particular chord.
  overChord: Record<string, Tally>;
  licksHeard: number;
  cleanRuns: number;
  replays: number;
}

// A lick kept for later, in the key it was heard in.
export interface SavedLick {
  lickId: string;
  tonic: number;
  savedAt: string; // ISO date-time
}

export interface Progress {
  v: 1;
  stageId: number;
  streaks: Record<string, number>;
  cleared: number[];
  dev: boolean;
  tempo: number;
  voice: Voice;
  labels: 'degree' | 'name';
  // Show degree colors while the lick plays. Takes made with hints on never count toward the gate.
  colorHints: boolean;
  // Classic piano (real key positions) or movable-do (same shape in every key).
  kbLayout: KbLayout;
  // Beginner option: every lick sounds in C instead of a new key each round.
  alwaysC: boolean;
  lastLickId: string | null;
  saved: SavedLick[];
  stats: Stats;
  days: string[]; // ISO dates with at least one lick heard
}

export const emptyStats = (): Stats => ({
  degrees: {},
  confusions: {},
  moves: {},
  overChord: {},
  licksHeard: 0,
  cleanRuns: 0,
  replays: 0,
});

export const initialProgress = (): Progress => ({
  v: 1,
  stageId: 1,
  streaks: {},
  cleared: [],
  dev: false,
  tempo: 108,
  voice: 'square',
  labels: 'degree',
  colorHints: false,
  kbLayout: 'piano',
  alwaysC: false,
  lastLickId: null,
  saved: [],
  stats: emptyStats(),
  days: [],
});

export type Action =
  | { type: 'hydrate'; progress: Progress }
  | { type: 'setStage'; stageId: number }
  | { type: 'toggleDev' }
  | { type: 'setTempo'; tempo: number }
  | { type: 'setVoice'; voice: Voice }
  | { type: 'setLabels'; labels: 'degree' | 'name' }
  | { type: 'setColorHints'; on: boolean }
  | { type: 'setKbLayout'; layout: KbLayout }
  | { type: 'setAlwaysC'; on: boolean }
  | { type: 'lickHeard'; lickId: string }
  | { type: 'replay' }
  | { type: 'startGuess'; expected: number; got: number }
  | {
      type: 'finishTake';
      stageId: number;
      expected: number[];
      played: number[];
      // A take counts toward the streak only if it is the first take and no hints were on.
      counts: boolean;
      // Harmony licks: the roman numeral under each note, for the degree-over-chord map.
      chords?: string[];
      // A slip earlier in the round (a missed Land-the-Target guess) that spoils the clean run.
      extraMiss?: boolean;
    }
  | { type: 'saveLick'; lickId: string; tonic: number }
  | { type: 'unsaveLick'; lickId: string }
  | { type: 'resetAll' };

function bump(t: Record<string, Tally>, key: string, right: boolean): void {
  const cur = t[key] ?? { seen: 0, right: 0 };
  t[key] = { seen: cur.seen + 1, right: cur.right + (right ? 1 : 0) };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function reducer(p: Progress, a: Action): Progress {
  switch (a.type) {
    case 'hydrate':
      return a.progress;
    case 'setStage':
      return { ...p, stageId: a.stageId };
    case 'toggleDev':
      return { ...p, dev: !p.dev };
    case 'setTempo':
      return { ...p, tempo: a.tempo };
    case 'setVoice':
      return { ...p, voice: a.voice };
    case 'setLabels':
      return { ...p, labels: a.labels };
    case 'setColorHints':
      return { ...p, colorHints: a.on };
    case 'setKbLayout':
      return { ...p, kbLayout: a.layout };
    case 'setAlwaysC':
      return { ...p, alwaysC: a.on };
    case 'lickHeard': {
      const d = today();
      return {
        ...p,
        lastLickId: a.lickId,
        days: p.days.includes(d) ? p.days : [...p.days, d],
        stats: { ...p.stats, licksHeard: p.stats.licksHeard + 1 },
      };
    }
    case 'replay':
      return { ...p, stats: { ...p.stats, replays: p.stats.replays + 1 } };
    case 'startGuess': {
      const stats: Stats = { ...p.stats, degrees: { ...p.stats.degrees }, confusions: { ...p.stats.confusions } };
      const e = pcOf(a.expected);
      const g = pcOf(a.got);
      bump(stats.degrees, String(e), e === g);
      if (e !== g) stats.confusions[`${e}>${g}`] = (stats.confusions[`${e}>${g}`] ?? 0) + 1;
      return { ...p, stats };
    }
    case 'finishTake': {
      const stats: Stats = {
        ...p.stats,
        degrees: { ...p.stats.degrees },
        confusions: { ...p.stats.confusions },
        moves: { ...p.stats.moves },
        overChord: { ...p.stats.overChord },
      };
      let perfect = true;
      a.expected.forEach((exp, i) => {
        const got = a.played[i];
        const ok = got === exp;
        if (!ok) perfect = false;
        bump(stats.degrees, String(pcOf(exp)), ok);
        if (a.chords?.[i]) bump(stats.overChord, `${pcOf(exp)}@${a.chords[i]}`, ok);
        if (!ok && got !== undefined) {
          const k = `${pcOf(exp)}>${pcOf(got)}`;
          stats.confusions[k] = (stats.confusions[k] ?? 0) + 1;
        }
        if (i > 0) {
          const prevOk = a.played[i - 1] === a.expected[i - 1];
          bump(stats.moves, `${pcOf(a.expected[i - 1])}>${pcOf(exp)}`, ok && prevOk);
        }
      });
      const streaks = { ...p.streaks };
      const key = String(a.stageId);
      let cleared = p.cleared;
      if (a.extraMiss) perfect = false;
      if (a.counts) {
        const cur = streaks[key] ?? 0;
        streaks[key] = perfect ? Math.min(GATE, cur + 1) : 0;
        if (perfect) stats.cleanRuns += 1;
        if (streaks[key] >= GATE && !cleared.includes(a.stageId)) cleared = [...cleared, a.stageId];
      }
      return { ...p, streaks, cleared, stats };
    }
    case 'saveLick': {
      const rest = p.saved.filter((s) => s.lickId !== a.lickId);
      return { ...p, saved: [{ lickId: a.lickId, tonic: a.tonic, savedAt: new Date().toISOString() }, ...rest] };
    }
    case 'unsaveLick':
      return { ...p, saved: p.saved.filter((s) => s.lickId !== a.lickId) };
    case 'resetAll':
      return initialProgress();
  }
}

const KEY = 'melodream.progress.v1';

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialProgress();
    const parsed = JSON.parse(raw) as Progress;
    if (parsed.v !== 1) return initialProgress();
    return { ...initialProgress(), ...parsed, stats: { ...emptyStats(), ...parsed.stats } };
  } catch {
    return initialProgress();
  }
}

interface Ctx {
  progress: Progress;
  dispatch: (a: Action) => void;
  isUnlocked: (stageId: number) => boolean;
  highestUnlocked: number;
  // Free roam: only when dev tools are allowed (?dev=me) and switched on.
  dev: boolean;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [progress, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch {
      // storage unavailable; progress lives in memory for this session
    }
  }, [progress]);

  const value = useMemo<Ctx>(() => {
    // The main road opens in order. Progression Paths open off it: each one
    // when its main-road territory is cleared.
    const highest = MAIN_STAGES.reduce((acc, s) => (progress.cleared.includes(s.id) ? Math.max(acc, s.id + 1) : acc), 1);
    const highestUnlocked = Math.min(highest, MAIN_STAGES.length);
    const dev = DEV_ALLOWED && progress.dev;
    return {
      progress,
      dispatch,
      highestUnlocked,
      dev,
      isUnlocked: (id) => {
        if (dev) return true;
        const st = stageById(id);
        if (isHarmony(st)) return st.after != null && (progress.cleared.includes(st.after) || highestUnlocked > st.after);
        return id <= highestUnlocked;
      },
    };
  }, [progress]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreContext);
  if (!c) throw new Error('useStore outside StoreProvider');
  return c;
}
