import type { Chord, Lick } from '../music/licks';
import { chordToneLabel, degreeColor, degreeLabel, isChordTone } from '../music/theory';

const lbl = (s: number) => degreeLabel(s);

// The chord lane: one box per chord, as wide as its beats, with the lick's
// blocks inside the bar they sound in. `show` hides the notes entirely (just
// the changes), masks them (?), or reveals them through the chosen lens.
export function ChangesLane({
  lick,
  chordName,
  litBar,
  soundingIdx,
  show,
  lens,
  litColor,
}: {
  lick: Lick;
  chordName: (c: Chord) => string;
  litBar: number;
  soundingIdx: number;
  show: 'none' | 'hidden' | 'shown';
  lens: 'degree' | 'chord';
  litColor: (n: number) => string;
}) {
  const changes = lick.changes ?? [];
  const noteChord = lick.noteChord ?? [];
  return (
    <div className="lane" aria-label={`Chord changes: ${changes.map((c) => chordName(c)).join(', ')}`}>
      {changes.map((ch, bi) => (
        <div key={bi} className={'lane-bar' + (litBar === bi ? ' lit' : '')} style={{ flex: `${ch.beats} 1 0` }}>
          <div className="lane-head">
            <span className="ps">{chordName(ch)}</span>
            <span className="ps roman">{ch.roman}</span>
          </div>
          {show !== 'none' && (
            <div className="lane-notes">
              {lick.notes.map((n, i) => {
                if (noteChord[i] !== bi) return null;
                const lit = soundingIdx === i;
                const ct = chordToneLabel(n, ch.root);
                let bg: string | undefined;
                let label = '?';
                let sub = '';
                if (show === 'shown') {
                  if (lens === 'degree') {
                    bg = degreeColor(n);
                    label = lbl(n);
                    sub = ct;
                  } else {
                    bg = isChordTone(n, ch.tones) ? 'var(--gold)' : 'var(--violet)';
                    label = ct;
                    sub = lbl(n);
                  }
                }
                if (lit) bg = show === 'shown' ? bg : litColor(n);
                return (
                  <div key={i} className={'myst sm' + (lit ? ' lit' : '') + (show === 'shown' ? ' shown' : '')} style={{ flex: `${lick.durs[i]} 1 0`, background: bg }}>
                    <span>{label}</span>
                    {sub && <span className="lane-sub">{sub}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
