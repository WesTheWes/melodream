import { useEffect, useRef, useState } from 'react';
import { engine } from '../audio/engine';
import { ChangesLane } from '../components/ChangesLane';
import { Stars } from '../components/Mascot';
import { lickById } from '../music/library';
import type { Chord, Lick } from '../music/licks';
import { stageById, stageCode } from '../music/stages';
import { degreeColor, degreeLabel, spellNote, tonicName } from '../music/theory';
import { useStore, type SavedLick } from '../state/store';
import type { Screen } from '../router';

const lbl = (s: number) => degreeLabel(s);

export function Saved({ go }: { go: (s: Screen) => void }) {
  const { progress, dispatch } = useStore();
  engine.voice = progress.voice;
  const items = progress.saved
    .map((s) => ({ s, lick: lickById(s.lickId) }))
    .filter((x): x is { s: SavedLick; lick: Lick } => !!x.lick);

  // One card plays at a time.
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [soundingIdx, setSoundingIdx] = useState(-1);
  const [litBar, setLitBar] = useState(-1);
  const cancels = useRef<(() => void)[]>([]);
  const stop = () => {
    cancels.current.forEach((c) => c());
    cancels.current = [];
    setPlayingId(null);
    setSoundingIdx(-1);
    setLitBar(-1);
  };
  useEffect(() => () => cancels.current.forEach((c) => c()), []);

  const play = (s: SavedLick, lick: Lick, slow: boolean) => {
    stop();
    const bpm = progress.tempo * (slow ? 0.6 : 1);
    setPlayingId(s.lickId);
    if (lick.changes) cancels.current.push(engine.backing(s.tonic, lick.changes, bpm, { onBar: setLitBar, gain: slow ? 0.7 : 1 }));
    cancels.current.push(
      engine.playPhrase(
        lick.notes.map((n) => s.tonic + n),
        lick.durs,
        bpm,
        {
          swing: lick.swing,
          lead: lick.lead,
          onNote: setSoundingIdx,
          onDone: () => {
            setPlayingId(null);
            setSoundingIdx(-1);
            setLitBar(-1);
          },
        },
      ),
    );
  };

  const playHome = (s: SavedLick, lick: Lick) => {
    stop();
    if (lick.changes) {
      setPlayingId(s.lickId);
      cancels.current.push(engine.backing(s.tonic, lick.changes, progress.tempo, { onBar: setLitBar, onDone: stop }));
    } else {
      engine.cadence(s.tonic, lick.scale, progress.tempo);
    }
  };

  return (
    <>
      <Stars />
      <main className="main">
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <h1 style={{ fontSize: 16 }}>Saved licks</h1>
          <span className="muted" style={{ fontSize: 20 }}>
            {items.length} saved · in the key you heard them
          </span>
        </div>

        {items.length === 0 ? (
          <section className="panel col" style={{ gap: 16, alignItems: 'flex-start' }}>
            <h2 style={{ fontSize: 16 }}>Nothing saved yet.</h2>
            <p style={{ fontSize: 24, maxWidth: '50ch' }}>
              After you play a lick back, tap <strong style={{ color: 'var(--gold)' }}>☆ Save lick</strong> on the feedback screen. It lands here, with its degrees and its chords, ready to replay.
            </p>
            <button type="button" className="btn" onClick={() => go('play')}>
              Go play
            </button>
          </section>
        ) : (
          <div className="col" style={{ gap: 18 }}>
            {items.map(({ s, lick }) => {
              const st = stageById(lick.stage);
              const mine = playingId === s.lickId;
              const chordName = (c: Chord) => spellNote(s.tonic, lick.home, c.root) + c.suffix;
              return (
                <section key={s.lickId} className="panel col saved-card" style={{ gap: 14 }}>
                  <div className="row between" style={{ alignItems: 'center' }}>
                    <div className="row" style={{ gap: 10 }}>
                      <span className="badge" style={{ background: st.color }}>
                        {stageCode(st)} · {st.name.toUpperCase()}
                      </span>
                      <span className="muted" style={{ fontSize: 21 }}>
                        Key of {tonicName(s.tonic, lick.home)} {lick.scale}
                        {lick.tag ? ` · ${lick.tag}` : ''}
                      </span>
                    </div>
                    <span className="muted" style={{ fontSize: 19 }}>
                      saved {new Date(s.savedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {lick.changes ? (
                    <ChangesLane
                      lick={lick}
                      chordName={chordName}
                      litBar={mine ? litBar : -1}
                      soundingIdx={mine ? soundingIdx : -1}
                      show="shown"
                      lens="degree"
                      litColor={degreeColor}
                    />
                  ) : (
                    <div className="row" style={{ gap: 8 }} aria-label="Degrees in the lick">
                      {lick.notes.map((n, i) => (
                        <div
                          key={i}
                          className={'saved-note' + (mine && soundingIdx === i ? ' lit' : '')}
                          style={{ background: degreeColor(n), width: 40 + lick.durs[i] * 26 }}
                        >
                          <span className="ps">{lbl(n)}</span>
                          <span>{spellNote(s.tonic, lick.home, n)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="row" style={{ gap: 10 }}>
                    <button type="button" className="btn small" onClick={() => (mine ? stop() : play(s, lick, false))}>
                      {mine ? 'Stop' : 'Play'}
                    </button>
                    <button type="button" className="btn ghost small" onClick={() => play(s, lick, true)}>
                      Slowly
                    </button>
                    <button type="button" className="btn ghost small" onClick={() => playHome(s, lick)}>
                      {lick.changes ? 'Just the changes' : 'Cadence'}
                    </button>
                    <button
                      type="button"
                      className="btn ghost small"
                      style={{ marginLeft: 'auto' }}
                      onClick={() => {
                        if (mine) stop();
                        dispatch({ type: 'unsaveLick', lickId: s.lickId });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
