import { LICKS, type Lick } from './licks';
import { isHidden } from './ratings';
import { RECORDED } from './recorded';
import { BOOK } from './book';

// Every lick in the game: the hand-written ones in licks.ts, the Licks For
// Days book (book.ts), and licks recorded from your piano (recorded.ts). Ids are stable, so saved licks and stats survive rebuilds.
export const ALL_LICKS: Lick[] = [...LICKS, ...BOOK, ...RECORDED];

// Recorded licks can change while the dev server runs, so these are rebuilt
// whenever the list length changes.
const byStage = new Map<number, Lick[]>();
const byId = new Map<string, Lick>();
let indexed = -1;
function index(): void {
  if (indexed === ALL_LICKS.length) return;
  byStage.clear();
  byId.clear();
  for (const l of ALL_LICKS) {
    if (!byStage.has(l.stage)) byStage.set(l.stage, []);
    byStage.get(l.stage)!.push(l);
    byId.set(l.id, l);
  }
  indexed = ALL_LICKS.length;
}

export type { Lick };

// The licks a territory can serve: everything except the ones you've hidden
// (unless you've hidden them all).
export function licksForStage(stage: number): Lick[] {
  index();
  const all = byStage.get(stage) ?? [];
  const kept = all.filter((l) => !isHidden(l.id));
  return kept.length ? kept : all;
}

export function lickById(id: string): Lick | undefined {
  index();
  return byId.get(id);
}
