import { useEffect, useRef, useState } from 'react';
import { engine } from '../audio/engine';
import { listenForMidi, midiSupported, type MidiListener } from '../audio/midi';
import { listenForNotes, type PitchListener } from '../audio/pitch';
import { Stars } from '../components/Mascot';
import { forceNextLick } from '../dev';
import { recordedList, saveRecorded, toLick, type Recorded } from '../music/recorded';
import { ALL_STAGES, stageById, stageCode } from '../music/stages';
import { degreeColor, degreeLabel, pcOf, type Mode } from '../music/theory';
import { useStore } from '../state/store';
import type { Screen } from '../router';

// Dev only (?dev=me): record a lick from your piano. A one-bar count-in, then
// play; the metronome keeps going until you stop or leave two beats of
// silence. Notes are quantized to the grid you pick and saved as a lick in the
// territory you choose. Input is a MIDI keyboard when one is connected,
// otherwise the microphone's pitch tracker.

type Grid = 'eighths' | 'sixteenths' | 'triplets';
const KEYS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const lbl = (s: number) => degreeLabel(s);

interface Raw {
  midi: number;
  at: number; // ms on the page clock
}

// Snap a position in beats to the grid, returning beats.
function snap(pos: number, grid: Grid, swing: boolean): number {
  const beat = Math.floor(pos);
  const f = pos - beat;
  const straight = grid === 'eighths' ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1];
  const trip = [0, 1 / 3, 2 / 3, 1];
  const cands = grid === 'triplets' ? trip : swing ? [...straight, 2 / 3] : straight;
  let best = cands[0];
  cands.forEach((c) => {
    if (Math.abs(c - f) < Math.abs(best - f)) best = c;
  });
  // In swing, the "and" is played late (at 2/3) but written as a plain eighth.
  if (swing && Math.abs(best - 2 / 3) < 1e-9) best = 0.5;
  return beat + best;
}

export function LickRecorder({ go }: { go: (s: Screen) => void }) {
  const { progress, dispatch } = useStore();
  engine.voice = progress.voice;
  const [input, setInput] = useState<'midi' | 'mic'>(midiSupported() ? 'midi' : 'mic');
  const [devices, setDevices] = useState<string[]>([]);
  const [inputState, setInputState] = useState('');
  const [tonicPc, setTonicPc] = useState(0);
  const [home, setHome] = useState<Mode>('major');
  const [stage, setStage] = useState(2);
  const [tempo, setTempo] = useState(Math.min(progress.tempo, 100));
  const [grid, setGrid] = useState<Grid>('sixteenths');
  const [swing, setSwing] = useState(false);
  const [tag, setTag] = useState('');
  const [phase, setPhase] = useState<'idle' | 'countin' | 'recording' | 'review'>('idle');
  const [beatFlash, setBeatFlash] = useState(-1);
  const [raw, setRaw] = useState<Raw[]>([]);
  const [lick, setLick] = useState<Recorded | null>(null);
  const [sounding, setSounding] = useState(-1);
  const [note, setNote] = useState('');
  const [, bump] = useState(0);

  const rawRef = useRef<Raw[]>([]);
  const startRef = useRef(0); // page-clock ms of beat 0 (end of count-in)
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const timers = useRef<number[]>([]);
  const listener = useRef<MidiListener | PitchListener | null>(null);
  const cancels = useRef<(() => void)[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  // Open the input once, keep it open while on this screen.
  useEffect(() => {
    let alive = true;
    setInputState(input === 'midi' ? 'Looking for MIDI keyboards…' : 'Asking for the microphone…');
    const onNote = (midi: number, at: number) => {
      if (phaseRef.current !== 'recording' && phaseRef.current !== 'countin') return;
      rawRef.current = [...rawRef.current, { midi, at }];
      setRaw(rawRef.current);
      engine.tap(midi, 0.2);
    };
    const open = input === 'midi' ? listenForMidi(onNote) : listenForNotes((m) => onNote(m, performance.now()));
    open
      .then((l) => {
        if (!alive) {
          l.stop();
          return;
        }
        listener.current = l;
        const names: string[] = 'inputs' in l ? (l as MidiListener).inputs : [];
        setDevices(names);
        setInputState(input === 'midi' ? (names.length ? `Listening to ${names.join(', ')}` : 'No MIDI keyboard found. Plug one in and reload, or use the microphone.') : 'Microphone on. Play one note at a time, no sustain pedal.');
      })
      .catch(() => setInputState(input === 'midi' ? 'MIDI access was refused.' : 'Microphone blocked. Allow it in the browser.'));
    return () => {
      alive = false;
      listener.current?.stop();
      listener.current = null;
    };
  }, [input]);

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      cancels.current.forEach((c) => c());
    },
    [],
  );

  const beatMs = 60000 / tempo;

  const stopAll = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    cancels.current.forEach((c) => c());
    cancels.current = [];
    setBeatFlash(-1);
  };

  // Count in one bar, then record with the metronome running. Stops by itself
  // after two beats of silence once something has been played.
  const record = () => {
    stopAll();
    rawRef.current = [];
    setRaw([]);
    setLick(null);
    setNote('');
    setPhase('countin');
    const ctx = engine.ensure();
    const t0 = (ctx?.currentTime ?? 0) + 0.1;
    const page0 = performance.now() + 100;
    const b = beatMs / 1000;
    for (let i = 0; i < 4; i++) engine.click(t0 + i * b, i === 0);
    for (let i = 0; i < 4; i++) later(() => setBeatFlash(i), i * beatMs);
    startRef.current = page0 + 4 * beatMs;
    later(() => {
      setPhase('recording');
      let beat = 0;
      const tick = () => {
        if (phaseRef.current !== 'recording') return;
        const ctx2 = engine.ensure();
        if (ctx2) engine.click(ctx2.currentTime + 0.01, beat % 4 === 0);
        setBeatFlash(beat % 4);
        // silence check: two beats without a note after at least one note
        const last = rawRef.current[rawRef.current.length - 1];
        if (last && performance.now() - last.at > 2 * beatMs && beat > 0) {
          finish();
          return;
        }
        if (beat > 64) {
          finish();
          return;
        }
        beat++;
        later(tick, beatMs);
      };
      tick();
    }, 4 * beatMs);
  };

  const finish = () => {
    stopAll();
    const notes = rawRef.current;
    if (notes.length === 0) {
      setPhase('idle');
      setNote('Nothing was played.');
      return;
    }
    setPhase('review');
    setLick(quantize(notes));
  };

  const quantize = (notes: Raw[]): Recorded => {
    const pos = notes.map((n) => snap((n.at - startRef.current) / beatMs, grid, swing));
    // Pitches relative to a tonic in whichever octave keeps the lick near home.
    const lowest = Math.min(...notes.map((n) => n.midi));
    const tonicMidi = tonicPc + 12 * Math.floor((lowest + 4 - tonicPc) / 12);
    const semis = notes.map((n) => n.midi - tonicMidi);
    const kept: number[] = [];
    const onsets: number[] = [];
    pos.forEach((p, i) => {
      // two notes snapped to the same spot: keep the later one (a grace note or mis-hit)
      if (onsets.length && Math.abs(onsets[onsets.length - 1] - p) < 1e-9) kept[kept.length - 1] = semis[i];
      else {
        onsets.push(p);
        kept.push(semis[i]);
      }
    });
    const first = onsets[0];
    const lead = first - Math.floor(first);
    const durs = onsets.map((p, i) => (i < onsets.length - 1 ? onsets[i + 1] - p : 2));
    return {
      id: `rec-${Date.now().toString(36)}`,
      stage,
      home,
      notes: kept,
      durs: durs.map((d) => Math.round(d * 12) / 12),
      tag: tag.trim() || undefined,
      swing: swing || undefined,
      lead: lead > 1e-9 ? Math.round(lead * 12) / 12 : undefined,
      recordedAt: new Date().toISOString(),
    };
  };

  // Re-quantize the same raw notes when the grid or swing changes during review.
  useEffect(() => {
    if (phase === 'review' && rawRef.current.length) setLick(quantize(rawRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, swing, tonicPc, home, stage, tag]);

  const play = () => {
    if (!lick) return;
    stopAll();
    const l = toLick(lick);
    cancels.current.push(
      engine.playPhrase(
        l.notes.map((n) => 60 + n),
        l.durs,
        tempo,
        { swing: l.swing, lead: l.lead, onNote: setSounding, onDone: () => setSounding(-1) },
      ),
    );
  };

  const save = async () => {
    if (!lick) return;
    const ok = await saveRecorded([...recordedList(), lick]);
    setNote(ok ? `Saved as ${lick.id} in src/music/data/recorded.json. It is in ${stageById(lick.stage).name} now.` : 'Not saved: run the local dev server (npm run dev) to save recordings to the project.');
    bump((n) => n + 1);
  };

  const remove = async (id: string) => {
    await saveRecorded(recordedList().filter((r) => r.id !== id));
    bump((n) => n + 1);
  };

  const st = stageById(stage);
  const outside = lick ? lick.notes.filter((n) => !st.available[home].includes(pcOf(n))) : [];
  const recent = [...recordedList()].reverse().slice(0, 12);

  return (
    <>
      <Stars />
      <main className="main">
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <h1 style={{ fontSize: 16 }}>Record a lick</h1>
          <span className="muted" style={{ fontSize: 20 }}>
            {recordedList().length} recorded so far
          </span>
        </div>

        <section className="panel col" style={{ gap: 14, padding: 18 }}>
          <div className="row" style={{ gap: 14 }}>
            <div className="row" style={{ gap: 6 }} role="group" aria-label="Input">
              <button type="button" className={'toggle' + (input === 'midi' ? ' on' : '')} onClick={() => setInput('midi')} disabled={!midiSupported()}>
                MIDI KEYBOARD
              </button>
              <button type="button" className={'toggle' + (input === 'mic' ? ' on' : '')} onClick={() => setInput('mic')}>
                MICROPHONE
              </button>
            </div>
            <span className="muted" style={{ fontSize: 20 }}>
              {inputState}
              {devices.length > 1 ? ` (${devices.length} devices)` : ''}
            </span>
          </div>

          <div className="row" style={{ gap: 14 }}>
            <label className="row" style={{ gap: 8, fontSize: 20 }}>
              You will play in
              <select className="dev-select" value={tonicPc} onChange={(e) => setTonicPc(Number(e.target.value))}>
                {KEYS.map((k, i) => (
                  <option key={k} value={i}>
                    {k}
                  </option>
                ))}
              </select>
              <select className="dev-select" value={home} onChange={(e) => setHome(e.target.value as Mode)}>
                <option value="major">major</option>
                <option value="minor">minor</option>
              </select>
            </label>
            <label className="row" style={{ gap: 8, fontSize: 20 }}>
              File under
              <select className="dev-select" value={stage} onChange={(e) => setStage(Number(e.target.value))}>
                {ALL_STAGES.filter((s) => !s.branch).map((s) => (
                  <option key={s.id} value={s.id}>
                    {stageCode(s)} · {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="row" style={{ gap: 8, fontSize: 20 }}>
              Tempo {tempo}
              <input type="range" min={60} max={140} step={4} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} disabled={phase === 'countin' || phase === 'recording'} />
            </label>
          </div>

          <div className="row" style={{ gap: 14 }}>
            <div className="row" style={{ gap: 6 }} role="group" aria-label="Grid">
              {(['eighths', 'sixteenths', 'triplets'] as Grid[]).map((g) => (
                <button key={g} type="button" className={'toggle' + (grid === g ? ' on' : '')} onClick={() => setGrid(g)}>
                  {g.toUpperCase()}
                </button>
              ))}
              <button type="button" className={'toggle' + (swing ? ' on' : '')} onClick={() => setSwing(!swing)} aria-pressed={swing}>
                SWING FEEL
              </button>
            </div>
            <label className="row" style={{ gap: 8, fontSize: 20, flex: '1 1 200px' }}>
              Tag
              <input className="dev-input" type="text" value={tag} placeholder="optional, e.g. blues turn" onChange={(e) => setTag(e.target.value)} />
            </label>
          </div>

          <div className="row" style={{ gap: 14, alignItems: 'center' }}>
            {phase === 'idle' || phase === 'review' ? (
              <button type="button" className="btn pink" onClick={record}>
                {phase === 'review' ? 'Record again' : 'Record'}
              </button>
            ) : (
              <button type="button" className="btn" onClick={finish}>
                Stop
              </button>
            )}
            <div className="row" style={{ gap: 6 }} aria-label="Metronome">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} style={{ width: 22, height: 22, border: '3px solid var(--ink)', background: beatFlash === i ? (i === 0 ? 'var(--gold)' : 'var(--cream)') : 'var(--night)' }} />
              ))}
            </div>
            <span style={{ fontSize: 22 }}>
              {phase === 'countin' ? 'Count-in… play on the next downbeat.' : phase === 'recording' ? `Recording. ${raw.length} note${raw.length === 1 ? '' : 's'}. Stop, or leave two beats of silence.` : phase === 'review' ? 'Listen back, then save.' : 'One bar of clicks, then play your lick in time.'}
            </span>
          </div>
        </section>

        {lick && (
          <section className="panel col" style={{ gap: 12, padding: 18 }}>
            <div className="row between">
              <div className="row" style={{ gap: 10 }}>
                <span className="badge" style={{ background: st.color }}>
                  {stageCode(st)} · {st.name.toUpperCase()}
                </span>
                <span className="muted" style={{ fontSize: 20 }}>
                  {KEYS[tonicPc]} {home}
                  {lick.swing ? ' · swing' : ''}
                  {lick.lead ? ` · starts ${lick.lead} beat late` : ''}
                </span>
              </div>
              <span className="muted" style={{ fontSize: 20 }}>{lick.notes.length} notes</span>
            </div>
            <div className="row lick-notes" aria-label="Degrees, with durations in beats">
              {lick.notes.map((n, i) => (
                <span key={i} className={'lick-note' + (sounding === i ? ' lit' : '')} style={{ background: degreeColor(n), minWidth: 30 + lick.durs[i] * 24 }} title={`${lick.durs[i]} beats`}>
                  {lbl(n)}
                </span>
              ))}
            </div>
            {outside.length > 0 && (
              <p className="muted" style={{ fontSize: 20 }}>
                Heads up: {[...new Set(outside.map((n) => lbl(n)))].join(', ')} {outside.length === 1 ? 'is' : 'are'} outside {st.name}&apos;s notes. The lick will still play; the keyboard unlocks the notes it uses.
              </p>
            )}
            <div className="row" style={{ gap: 10 }}>
              <button type="button" className="btn small" onClick={play}>
                Play back
              </button>
              <button type="button" className="btn mint small" onClick={save}>
                Save to project
              </button>
              <button
                type="button"
                className="btn ghost small"
                onClick={() => {
                  if (!lick) return;
                  void saveRecorded([...recordedList(), lick]).then(() => {
                    forceNextLick(lick.id);
                    dispatch({ type: 'setStage', stageId: lick.stage });
                    go('play');
                  });
                }}
              >
                Save and play it in the game →
              </button>
            </div>
            <p className="muted" style={{ fontSize: 19 }}>Wrong grid? Change it above and the notes re-snap. Rushed or dragged the count-in? Record again; the click is the clock.</p>
          </section>
        )}

        {note && <p style={{ fontSize: 22, color: 'var(--mint)' }}>{note}</p>}

        {recent.length > 0 && (
          <section className="col" style={{ gap: 8 }}>
            <div className="lbl">RECENT RECORDINGS</div>
            <ul className="lick-list">
              {recent.map((r) => (
                <li key={r.id} className="lick-row">
                  <div className="row between">
                    <div className="row" style={{ gap: 8 }}>
                      <span className="badge" style={{ background: stageById(r.stage).color }}>
                        {stageCode(stageById(r.stage))}
                      </span>
                      <span className="ps lick-id">{r.id}</span>
                      <span className="muted" style={{ fontSize: 19 }}>
                        {r.home}
                        {r.tag ? ` · ${r.tag}` : ''} · {new Date(r.recordedAt).toLocaleString()}
                      </span>
                    </div>
                    <button type="button" className="btn ghost small" onClick={() => remove(r.id)}>
                      Delete
                    </button>
                  </div>
                  <div className="row lick-notes">
                    {r.notes.map((n, i) => (
                      <span key={i} className="lick-note" style={{ background: degreeColor(n) }}>
                        {lbl(n)}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
