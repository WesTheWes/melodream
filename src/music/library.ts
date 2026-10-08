import { LICKS, type Lick } from './licks';
import { BOOK } from './book';
import { GENERATED } from './generate';
import { SOLOS } from './solos';

// Every lick in the game: the hand-written ones in licks.ts, the Licks For
// Days book (book.ts), and the generated ones. Ids are stable, so saved licks and stats survive rebuilds.
export const ALL_LICKS: Lick[] = [...LICKS, ...BOOK, ...SOLOS, ...GENERATED];

const byStage = new Map<number, Lick[]>();
const byId = new Map<string, Lick>();
for (const l of ALL_LICKS) {
  if (!byStage.has(l.stage)) byStage.set(l.stage, []);
  byStage.get(l.stage)!.push(l);
  byId.set(l.id, l);
}

export function licksForStage(stage: number): Lick[] {
  return byStage.get(stage) ?? [];
}

export function lickById(id: string): Lick | undefined {
  return byId.get(id);
}
