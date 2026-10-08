import { licksForStage, type Lick } from '../music/licks';
import type { Stage } from '../music/stages';
import { pcOf, type Mode } from '../music/theory';
import type { Stats } from './store';

// How shaky is a degree, 0 (solid) .. 1 (fuzzy)? Unknown degrees are
// treated as half-shaky so they get introduced.
export function weakness(stats: Stats, pc: number): number {
  const t = stats.degrees[String(pc)];
  if (!t || t.seen < 3) return 0.5;
  return 1 - t.right / t.seen;
}

export function masteryWord(stats: Stats, pc: number): 'Solid' | 'Settling' | 'Wobbly' | 'Fuzzy' | 'Not met yet' {
  const t = stats.degrees[String(pc)];
  if (!t || t.seen === 0) return 'Not met yet';
  if (t.seen < 3) return 'Fuzzy';
  const r = t.right / t.seen;
  if (r >= 0.92) return 'Solid';
  if (r >= 0.75) return 'Settling';
  if (r >= 0.5) return 'Wobbly';
  return 'Fuzzy';
}

export function topConfusions(stats: Stats, n = 3): { expected: number; got: number; count: number }[] {
  return Object.entries(stats.confusions)
    .map(([k, count]) => {
      const [e, g] = k.split('>').map(Number);
      return { expected: e, got: g, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

// Choose the next lick for a stage. Licks that lean on shaky degrees or
// confused moves are weighted up; the lick just played is avoided.
export function pickLick(stage: Stage, stats: Stats, lastId: string | null, rng: () => number = Math.random): Lick {
  const pool = licksForStage(stage.id).filter((l) => l.id !== lastId);
  const confusions = topConfusions(stats, 5);
  const weights = pool.map((l) => {
    let w = 1;
    const seen = new Set<number>();
    l.notes.forEach((n) => {
      const pc = pcOf(n);
      if (!seen.has(pc)) {
        seen.add(pc);
        w += weakness(stats, pc) * 2;
      }
    });
    for (let i = 1; i < l.notes.length; i++) {
      const from = pcOf(l.notes[i - 1]);
      const to = pcOf(l.notes[i]);
      confusions.forEach((c) => {
        // A phrase that moves from the "wrong" note to the right one, or lands
        // on the confused degree, clarifies it.
        if (to === c.expected && (from === c.got || from === c.expected)) w += 1.5;
      });
      const mv = stats.moves[`${from}>${to}`];
      if (mv && mv.seen >= 2 && mv.right / mv.seen < 0.6) w += 1;
    }
    // Harmony licks: lean toward degrees you lose over a particular chord.
    if (l.changes && l.noteChord) {
      const seenHere = new Set<string>();
      l.notes.forEach((n, i) => {
        const key = `${pcOf(n)}@${l.changes![l.noteChord![i]].roman}`;
        if (seenHere.has(key)) return;
        seenHere.add(key);
        const t = stats.overChord[key];
        if (t && t.seen >= 2 && t.right / t.seen < 0.75) w += 1;
      });
    }
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// Pick a tonic for the lick so the key varies from phrase to phrase but the
// phrase stays in a comfortable register (tonic between G3 and E4).
export function pickTonic(lick: Lick, rng: () => number = Math.random, alwaysC = false): number {
  if (alwaysC) return 60;
  const top = Math.max(...lick.notes);
  const lo = 55;
  const hi = top >= 12 ? 62 : 64;
  return lo + Math.floor(rng() * (hi - lo + 1));
}

// A short reason why this lick was chosen, for the session card.
export function whyThisLick(lick: Lick, stats: Stats): string | null {
  const c = topConfusions(stats, 1)[0];
  if (!c) return null;
  const lands = lick.notes.some((n) => pcOf(n) === c.expected);
  if (!lands) return null;
  return `Lands on ${labelPc(c.expected)}, which you have heard as ${labelPc(c.got)} ${c.count} time${c.count === 1 ? '' : 's'}.`;
}

function labelPc(pc: number): string {
  const L: Record<number, string> = { 0: '1', 1: '♭2', 2: '2', 3: '♭3', 4: '3', 5: '4', 6: '♯4', 7: '5', 8: '♭6', 9: '6', 10: '♭7', 11: '7' };
  return L[pc];
}

export function modeForLick(lick: Lick): Mode {
  return lick.home;
}
