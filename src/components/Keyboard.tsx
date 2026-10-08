import { degreeColor, degreeLabel, pcOf, spellNote, type Mode } from '../music/theory';

export type KbLayout = 'piano' | 'movable';

const BLACK = [1, 3, 6, 8, 10];
const isBlack = (midi: number) => BLACK.includes(pcOf(midi));
const BLACK_W = 0.62; // black key width as a fraction of a white key

interface KeyGeom {
  semi: number; // semitones above the tonic; what a tap reports
  black: boolean;
  left: number; // percent
  width: number; // percent
  playable: boolean; // inside the home octave (0..12)
}

// Lay out a run of physical keys from `lo` to `hi` (MIDI), positioned like a
// real piano. `toSemi` maps a physical key to the degree it stands for.
function layout(lo: number, hi: number, toSemi: (m: number) => number): KeyGeom[] {
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
  const ww = 100 / whites.length;
  const keys: KeyGeom[] = whites.map((m, i) => {
    const semi = toSemi(m);
    return { semi, black: false, left: i * ww, width: ww, playable: semi >= 0 && semi <= 12 };
  });
  for (let m = lo; m <= hi; m++) {
    if (!isBlack(m)) continue;
    const i = whites.indexOf(m - 1);
    if (i < 0) continue;
    const semi = toSemi(m);
    keys.push({ semi, black: true, left: (i + 1) * ww - (ww * BLACK_W) / 2, width: ww * BLACK_W, playable: semi >= 0 && semi <= 12 });
  }
  return keys;
}

export function Keyboard({
  available,
  tonicMidi,
  mode,
  labels,
  layout: kind,
  onTap,
  down,
  ring = [],
  disabled = false,
  keyLabel,
}: {
  available: Set<number>;
  tonicMidi: number;
  mode: Mode;
  labels: 'degree' | 'name';
  layout: KbLayout;
  onTap: (semi: number) => void;
  down?: number | null;
  ring?: number[];
  disabled?: boolean;
  keyLabel?: string;
}) {
  let keys: KeyGeom[];
  if (kind === 'piano') {
    // The real piano: one octave from home, widened to whole white keys at each
    // end so the shape reads like an actual keyboard.
    let lo = tonicMidi;
    let hi = tonicMidi + 12;
    if (isBlack(lo)) lo--;
    if (isBlack(hi)) hi++;
    keys = layout(lo, hi, (m) => m - tonicMidi);
  } else {
    // Movable-do: always drawn in C, so home is always the left edge and every
    // degree sits on the same key whatever key it actually sounds in.
    keys = layout(60, 72, (m) => m - 60);
  }

  return (
    <div className={'pkb ' + kind + (disabled ? ' quiet' : '')} role="group" aria-label={kind === 'piano' ? 'Piano keyboard' : 'Scale-degree keyboard, drawn in C in every key'}>
      <div className="pkb-felt" />
      <div className="pkb-keys">
        {keys.map((k) => {
          const pc = pcOf(k.semi);
          const open = k.playable && available.has(pc);
          const deg = degreeLabel(k.semi, { octaveMark: false });
          const name = spellNote(tonicMidi, mode, k.semi);
          const cls =
            'pk' +
            (k.black ? ' black' : ' white') +
            (open ? ' open' : ' locked') +
            (k.playable ? '' : ' outside') +
            (down === k.semi && k.playable ? ' down' : '') +
            (ring.includes(k.semi) && k.playable ? ' ring' : '') +
            (pc === 0 && k.playable ? ' home' : '');
          const color = degreeColor(k.semi);
          return (
            <button
              key={`${k.black ? 'b' : 'w'}${k.left.toFixed(3)}`}
              type="button"
              className={cls}
              style={{
                left: `${k.left}%`,
                width: `${k.width}%`,
              }}
              disabled={!open || disabled}
              onPointerDown={(e) => {
                if (!open || disabled) return;
                e.preventDefault();
                onTap(k.semi);
              }}
              aria-label={`Degree ${deg}${k.semi === 12 ? ' (high)' : ''}, ${name}${open ? '' : k.playable ? ', locked in this territory' : ', outside the home octave'}`}
            >
              {open && (
                <span className="dot" style={{ background: color }}>
                  {labels === 'degree' ? deg : ''}
                </span>
              )}
              {(labels === 'name' || !k.black || kind === 'movable') && (
                <span className="nm">{labels === 'name' ? name : open ? '' : kind === 'movable' ? deg : name}</span>
              )}
            </button>
          );
        })}
      </div>
      {kind === 'movable' && (
        <div className="pkb-note">
          Drawn in C, so every degree always sits on the same key.{keyLabel && !keyLabel.startsWith('C ') ? ` It sounds in ${keyLabel}.` : ''}
        </div>
      )}
    </div>
  );
}
