import { HC, type Lick } from './licks';
import type { Mode } from './theory';
import data from './data/wjazzd-licks.json';

// Phrases from real jazz solos, from the Weimar Jazz Database (ODbL v1.0;
// see data/README.md). Each keeps its chords, performer and title.
interface Raw {
  id: string;
  home: Mode;
  swing: boolean;
  tag: string;
  bars: { roman: string; suffix: string; root: number; tones: number[]; notes: [number, [number, number]][] }[];
}

export const SOLOS: Lick[] = (data as Raw[]).map((r) =>
  HC(
    r.id,
    22,
    r.home,
    r.bars.map((b) => ({
      chord: { roman: b.roman, suffix: b.suffix, root: b.root, tones: b.tones },
      notes: b.notes.map(([n, [num, den]]) => [n, num / den] as [number, number]),
    })),
    r.tag,
    r.swing,
  ),
);
