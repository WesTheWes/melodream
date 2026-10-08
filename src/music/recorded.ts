import data from './data/recorded.json';
import { L, type Lick } from './licks';
import type { Mode } from './theory';

// Licks recorded from your own piano (dev → Record). They live in
// data/recorded.json, which ships with the game; the recorder writes to it on
// the local dev server. Notes are semitones from home, durations in beats.
export interface Recorded {
  id: string;
  stage: number;
  home: Mode;
  notes: number[];
  durs: number[];
  tag?: string;
  swing?: boolean;
  lead?: number;
  recordedAt: string;
}

const listeners = new Set<() => void>();
let current: Recorded[] = data as Recorded[];

export const toLick = (r: Recorded): Lick => ({ ...L(r.id, r.stage, r.home, r.notes, r.durs, r.tag), swing: !!r.swing, lead: r.lead || undefined });

export const RECORDED: Lick[] = current.map(toLick);

export function recordedList(): Recorded[] {
  return current;
}

export function subscribeRecorded(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Replace the saved list. Resolves to whether it reached the project file.
export async function saveRecorded(next: Recorded[]): Promise<boolean> {
  current = next;
  RECORDED.splice(0, RECORDED.length, ...next.map(toLick));
  listeners.forEach((fn) => fn());
  if (!import.meta.env.DEV) return false;
  try {
    const res = await fetch('/__dev/recorded', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
    return res.ok;
  } catch {
    return false;
  }
}
