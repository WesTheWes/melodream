import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { engine, type Voice } from '../audio/engine';
import { listenForNotes, type PitchListener } from '../audio/pitch';
import { Pips, Stepper } from '../components/Header';
import { ChangesLane } from '../components/ChangesLane';
import { Keyboard } from '../components/Keyboard';
import { WorldScene } from '../components/WorldScene';
import { Mascot, Stars } from '../components/Mascot';
import type { Chord, Lick } from '../music/licks';
import { GATE, HARMONY_STAGES, STAGES, isHarmony, stageById, stageCode, type Stage } from '../music/stages';
import { chordToneLabel, chordToneWord, degreeColor, degreeLabel, degreeSpoken, hintFor, pcOf, spellNote, tonicName, type Mode, type Scale } from '../music/theory';
import { pickLick, pickTonic, whyThisLick } from '../state/adapt';
import { useStore } from '../state/store';
import type { Screen } from '../router';

interface Round {
  lick: Lick;
  tonic: number;
  mode: Mode;
  scale: Scale;
}

const lbl = (s: number) => degreeLabel(s);

export function Play({ go }: { go: (s: Screen) => void }) {
  const { progress, dispatch, isUnlocked, highestUnlocked, dev } = useStore();
  const stageId = isUnlocked(progress.stageId) ? progress.stageId : highestUnlocked;
  const stage = stageById(stageId);

  const [round, setRound] = useState<Round | null>(null);
  const [phase, setPhase] = useState(0);
  const [homeHeard, setHomeHeard] = useState(false);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [soundingIdx, setSoundingIdx] = useState(-1);
  const [tapDown, setTapDown] = useState<number | null>(null);
  const [sayIdx, setSayIdx] = useState(-1);
  const [guesses, setGuesses] = useState<number[]>([]);
  const [played, setPlayed] = useState<number[]>([]);
  const [attempt, setAttempt] = useState(1);
  // One undo per lick, across all takes: more would let you fish for notes by ear.
  const [undoUsed, setUndoUsed] = useState(false);
  const [input, setInput] = useState<'keys' | 'mic'>('keys');
  const [mic, setMic] = useState<'off' | 'on' | 'denied'>('off');
  const [quiet, setQuiet] = useState(0);
  const [reveal, setReveal] = useState(false);
  // Harmony licks: which chord is sounding, the Land-the-Target picks (by bar), and the feedback lens.
  const [litBar, setLitBar] = useState(-1);
  const [targetPicks, setTargetPicks] = useState<Record<number, number>>({});
  const [lens, setLens] = useState<'degree' | 'chord'>('degree');

  const cancelRef = useRef<(() => void) | null>(null);
  const micRef = useRef<PitchListener | null>(null);
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  engine.voice = progress.voice;
  const bpm = progress.tempo;

  // Read live progress when a round starts. startRound is memoized per stage,
  // so a closure over `progress` would pick licks from stale stats.
  const progressRef = useRef(progress);
  progressRef.current = progress;
  // Was this territory already cleared when the round began? The level-up
  // prompt only appears on the run that actually opens the gate.
  const clearedAtStart = useRef(false);
  const [celebrateDismissed, setCelebrateDismissed] = useState(false);

  const startRound = useCallback(() => {
    const p = progressRef.current;
    const lick = pickLick(stage, p.stats, p.lastLickId);
    clearedAtStart.current = p.cleared.includes(stage.id);
    setCelebrateDismissed(false);
    setRound({ lick, tonic: pickTonic(lick, Math.random, p.alwaysC), mode: lick.home, scale: lick.scale });
    setPhase(0);
    setHomeHeard(false);
    setPlays(0);
    setGuesses([]);
    setPlayed([]);
    setAttempt(1);
    setUndoUsed(false);
    setSayIdx(-1);
    setQuiet(0);
    setReveal(false);
    setLitBar(-1);
    setTargetPicks({});
    setLens('degree');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.id]);

  useEffect(() => {
    startRound();
  }, [startRound]);

  useEffect(
    () => () => {
      cancelRef.current?.();
      backRef.current?.();
      engine.cancelAll();
      micRef.current?.stop();
      timers.current.forEach((t) => window.clearTimeout(t));
    },
    [],
  );

  // Quiet bar during Imagine: four slow beats, then the keys are "ready".
  useEffect(() => {
    if (phase !== 3) return;
    setQuiet(0);
    const b = (60 / bpm) * 1000 * 1.2;
    const ids = [1, 2, 3, 4].map((n) => window.setTimeout(() => setQuiet(n), b * n));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [phase, bpm]);

  const expected = round?.lick.notes ?? [];
  const total = expected.length;
  const start = expected[0] ?? 0;
  const startOk = guesses.length > 0 && guesses[guesses.length - 1] === start;

  // Harmony: the changes, and the bars whose downbeat note you are asked to name.
  const changes = round?.lick.changes;
  const harmony = !!changes;
  const noteChord = round?.lick.noteChord ?? [];
  const chordName = (ch: Chord) => (round ? spellNote(round.tonic, round.mode, ch.root) + ch.suffix : '');
  const chordOf = (i: number): Chord | undefined => changes?.[noteChord[i]];
  const targetBars = harmony && stage.targets ? changes!.map((_, i) => i).filter((i) => i > 0) : [];
  const targetNote = (bar: number) => expected[noteChord.indexOf(bar)];
  const nextTarget = targetBars.find((b) => targetPicks[b] === undefined);
  const targetsDone = nextTarget === undefined;
  const targetMiss = targetBars.some((b) => targetPicks[b] !== undefined && targetPicks[b] !== pcOf(targetNote(b)));

  // ---- actions -------------------------------------------------------

  const backRef = useRef<(() => void) | null>(null);
  // The changes alone, no lick: for finding home, imagining, and playing along.
  const playChanges = () => {
    if (!round || !changes || playing) return;
    backRef.current?.();
    setPlaying(true);
    backRef.current = engine.backing(round.tonic, changes, bpm, {
      onBar: setLitBar,
      onDone: () => {
        setLitBar(-1);
        setPlaying(false);
      },
    });
    setHomeHeard(true);
  };
  const playCadence = () => {
    if (!round) return;
    engine.cadence(round.tonic, round.scale, bpm);
    setHomeHeard(true);
  };
  const playHome = () => (harmony ? playChanges() : playCadence());
  const playBass = () => {
    if (!round) return;
    engine.bass(round.tonic, bpm);
    setHomeHeard(true);
  };

  const playLick = (slow = false) => {
    if (!round || playing) return;
    cancelRef.current?.();
    if (!slow) {
      if (plays === 0) dispatch({ type: 'lickHeard', lickId: round.lick.id });
      else dispatch({ type: 'replay' });
      setPlays((p) => p + 1);
    }
    setPlaying(true);
    const midis = round.lick.notes.map((n) => round.tonic + n);
    if (changes) {
      backRef.current?.();
      backRef.current = engine.backing(round.tonic, changes, slow ? bpm * 0.6 : bpm, { onBar: setLitBar, gain: slow ? 0.7 : 1 });
    }
    cancelRef.current = engine.playPhrase(midis, round.lick.durs, slow ? bpm * 0.6 : bpm, {
      swing: round.lick.swing,
      onNote: (i) => {
        setSoundingIdx(i);
        setSayIdx(slow ? i : -1);
      },
      onDone: () => {
        setSoundingIdx(-1);
        setSayIdx(-1);
        setLitBar(-1);
        setPlaying(false);
      },
    });
  };

  const finish = (take: number[]) => {
    if (!round) return;
    dispatch({
      type: 'finishTake',
      stageId: stage.id,
      expected: round.lick.notes,
      played: take,
      counts: attempt === 1 && !progress.colorHints,
      chords: changes ? noteChord.map((b) => changes[b].roman) : undefined,
      extraMiss: targetMiss,
    });
    setPhase(5);
    const perfect = round.lick.notes.every((n, i) => take[i] === n);
    if (perfect) engine.blipYes();
    else engine.blipNo();
  };

  const handleTap = (semi: number, opts: { silent?: boolean } = {}) => {
    if (!round) return;
    // Once the start note is named, the keys go quiet: no hunting for the rest.
    if (phase === 2 && startOk) return;
    if (!opts.silent) engine.tap(round.tonic + semi);
    setTapDown(semi);
    later(() => setTapDown((s) => (s === semi ? null : s)), 220);
    if (phase === 2) {
      setGuesses((g) => [...g, semi]);
      dispatch({ type: 'startGuess', expected: start, got: semi });
      if (semi === start) engine.blipYes();
      else engine.blipNo();
    } else if (phase === 4) {
      if (played.length >= total) return;
      const next = [...played, semi];
      setPlayed(next);
      if (next.length >= total) later(() => finish(next), 450);
    }
  };
  const pickTarget = (bar: number, pc: number) => {
    if (targetPicks[bar] !== undefined) return;
    setTargetPicks((t) => ({ ...t, [bar]: pc }));
    const want = targetNote(bar);
    dispatch({ type: 'startGuess', expected: want, got: pc });
    if (pcOf(want) === pc) engine.blipYes();
    else engine.blipNo();
  };

  const tapRef = useRef(handleTap);
  tapRef.current = handleTap;

  // Microphone input (experimental): active in START and PLAY phases.
  useEffect(() => {
    const want = input === 'mic' && (phase === 2 || phase === 4) && round;
    if (!want) {
      micRef.current?.stop();
      micRef.current = null;
      if (mic === 'on') setMic('off');
      return;
    }
    let alive = true;
    listenForNotes((midi) => {
      const r = tapRef.current;
      const rel = midi - round.tonic;
      const pc = pcOf(rel);
      // Octave ambiguity only matters for home; pick whichever the lick wants next.
      const slot = phase === 2 ? 0 : played.length;
      const semi = pc === 0 && expected[slot] === 12 ? 12 : pc;
      r(semi, { silent: true });
    })
      .then((l) => {
        if (!alive) {
          l.stop();
          return;
        }
        micRef.current = l;
        setMic('on');
      })
      .catch(() => setMic('denied'));
    return () => {
      alive = false;
      micRef.current?.stop();
      micRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, phase, round?.tonic]);

  // ---- derived view state -------------------------------------------

  const hints = progress.colorHints;
  const litColor = (n: number) => (hints ? degreeColor(n) : 'var(--cream)');
  const streak = progress.streaks[String(stage.id)] ?? 0;
  const perfect = phase === 5 && expected.every((n, i) => played[i] === n);
  const correct = expected.filter((n, i) => played[i] === n).length;
  const onRetry = attempt > 1;
  const counted = attempt === 1 && !hints;
  // A clean run needs every pitch, and every Land-the-Target guess, right first time.
  const cleanTake = perfect && !targetMiss;
  const justReset = phase === 5 && !cleanTake && counted && streak === 0;
  const gateOpen = phase === 5 && cleanTake && counted && streak >= GATE;
  const nextStage = isHarmony(stage) ? undefined : STAGES.find((s) => s.id === stage.id + 1);
  const celebrate = gateOpen && !clearedAtStart.current && !celebrateDismissed;
  // Where the prompt sends you: the next main-road territory, or after a path,
  // the next open path you have not cleared (else back to the main road).
  const newPaths = isHarmony(stage) ? [] : HARMONY_STAGES.filter((h) => h.after === stage.id);
  const onward: Stage | undefined =
    nextStage ??
    HARMONY_STAGES.find((h) => h.id !== stage.id && !progress.cleared.includes(h.id) && isUnlocked(h.id)) ??
    stageById(highestUnlocked);
  const goTo = (st: Stage) => {
    setCelebrateDismissed(true);
    dispatch({ type: 'setStage', stageId: st.id });
  };

  const firstWrong = expected.findIndex((n, i) => played[i] !== n);
  const insight = useMemo(() => {
    if (phase !== 5 || firstWrong < 0) return '';
    const d = expected[firstWrong];
    const p = played[firstWrong];
    const moveFrom = firstWrong > 0 ? `${lbl(expected[firstWrong - 1])} to ${lbl(d)}` : `onto ${lbl(d)}`;
    const ch = chordOf(firstWrong);
    return (
      `Note ${firstWrong + 1}: you played ${p == null ? 'nothing' : lbl(p)} where the lick goes to ${lbl(d)}. ` +
      hintFor(d) +
      (ch ? ` Over ${chordName(ch)} it is the ${chordToneWord(d, ch.root)}.` : '') +
      (p != null ? ` Melodream will serve you more phrases that move ${moveFrom}.` : '')
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, firstWrong, expected, played]);

  const showKeys = phase === 2 || phase === 5 || (phase === 4 && input === 'keys');
  const kbSemis = stage.keyboard[round?.mode ?? 'major'];
  const available = useMemo(() => {
    if (!round) return new Set<number>();
    if (phase === 5) return new Set(kbSemis.map(pcOf));
    const set = new Set(stage.available[round.mode]);
    // Any note the lick itself uses is playable, even if it is a color note.
    round.lick.notes.forEach((n) => set.add(pcOf(n)));
    return set;
  }, [round, phase, stage, kbSemis]);
  const ring = phase === 5 && firstWrong >= 0 && played[firstWrong] != null ? [expected[firstWrong], played[firstWrong]] : [];

  if (!round) return null;

  const why = whyThisLick(round.lick, progress.stats);
  // Saving only appears in feedback, after the take, so the Saved tab can never show an answer early.
  const isSaved = progress.saved.some((s) => s.lickId === round.lick.id);
  const keyLabel = `${tonicName(round.tonic, round.mode)} ${round.scale}`;

  return (
    <>
      <Stars />
      <div className="world-banner">
        <WorldScene stageId={stage.id} fit="banner" label={`${stage.name}, pixel scene`} />
        <div className="hdr">
          <div className="hdr-left">
            <span className="badge" style={{ background: stage.color }}>
              {isHarmony(stage) ? 'PATH' : 'STAGE'} {stageCode(stage)} · {stage.name.toUpperCase()}
            </span>
            <span className="muted banner-chip">
              {progress.stats.licksHeard + (plays === 0 ? 1 : 0)} licks heard · Key of {keyLabel}
              {round.lick.tag ? ` · ${round.lick.tag}` : ''}
            </span>
          </div>
          <div className="hdr-right">
            {hints && (
              <span className="badge" style={{ background: 'var(--violet)' }} title="Takes with color hints on never count toward the gate">
                COLOR HINTS ON · NOT COUNTED
              </span>
            )}
            <span className="row banner-chip" style={{ gap: 10 }}>
              <span className="muted" style={{ fontSize: 20 }}>clean runs in a row</span>
              <Pips value={streak} max={GATE} label={`${streak} of ${GATE} clean runs in a row`} />
              <span className="ps" style={{ fontSize: 9, color: justReset ? 'var(--pink)' : streak >= GATE ? 'var(--gold)' : 'var(--cream)' }}>
                {streak}/{GATE}
                {justReset ? ' · RESET' : ''}
              </span>
            </span>
          </div>
        </div>
      </div>

      <main className="main" style={{ paddingTop: 10 }}>
        <Stepper phase={phase} />

        {phase === 0 && (
          <section className="panel col" style={{ gap: 22, minHeight: 420, justifyContent: 'center', alignItems: 'flex-start' }}>
            <div className="lbl">STEP 1 · FIND HOME</div>
            <h2 style={{ fontSize: 24 }}>Where is home tonight?</h2>
            <p style={{ fontSize: 26, maxWidth: '46ch' }}>
              {harmony ? 'This lick rides on a chord progression. Play the changes and listen for the note they settle on. ' : 'Listen for the note everything settles back to. '}
              Hum it. That&apos;s your <strong style={{ color: 'var(--gold)' }}>1</strong>. Every other note in the lick is measured against it{harmony ? ', even over the other chords' : ''}.
            </p>
            {harmony && <ChangesLane lick={round.lick} chordName={chordName} litBar={litBar} soundingIdx={-1} show="none" lens="degree" litColor={litColor} />}
            <div className="row">
              {harmony && (
                <button type="button" className="btn" onClick={playChanges} disabled={playing}>
                  Play the changes
                </button>
              )}
              <button type="button" className={'btn' + (harmony ? ' ghost' : '')} onClick={playCadence}>
                {harmony ? 'Cadence' : 'Play cadence'}
              </button>
              <button type="button" className="btn ghost" onClick={playBass}>
                Just the bass note
              </button>
              <span className="badge" style={{ background: round.mode === 'major' ? 'var(--gold)' : 'var(--violet)' }}>
                {round.scale.toUpperCase()} HOME
              </span>
            </div>
            <button type="button" className="btn mint" onClick={() => setPhase(1)} disabled={!homeHeard}>
              I can hear home →
            </button>
          </section>
        )}

        {phase === 1 && (
          <section className="panel col" style={{ gap: 22, minHeight: 420, justifyContent: 'center' }}>
            <div className="row between">
              <div className="lbl">STEP 2 · HEAR IT</div>
              {playing && (
                <span className="row muted" style={{ gap: 10, fontSize: 21 }}>
                  <span style={{ width: 12, height: 12, background: 'var(--pink)', border: '3px solid var(--ink)' }} /> playing
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 24 }}>{harmony ? 'Here comes the lick, over the changes. Just listen.' : 'Here comes the lick. Just listen.'}</h2>
            {harmony ? (
              <ChangesLane lick={round.lick} chordName={chordName} litBar={litBar} soundingIdx={playing ? soundingIdx : -1} show={reveal ? 'shown' : 'hidden'} lens="degree" litColor={litColor} />
            ) : (
              <Mystery lick={round.lick} soundingIdx={playing ? soundingIdx : -1} reveal={reveal} litColor={litColor} />
            )}
            <div className="row">
              <button type="button" className="btn" onClick={() => playLick()} disabled={playing}>
                {playing ? 'Playing…' : plays === 0 ? 'Play the lick' : 'Play it again'}
              </button>
              <button type="button" className="btn ghost" onClick={playHome} disabled={harmony && playing}>
                {harmony ? 'Changes again' : 'Home again'}
              </button>
              <span className="muted">
                Heard {plays} time{plays === 1 ? '' : 's'}
                {plays > 1 ? ' · replays are fine, we just count them' : ''}
              </span>
            </div>
            {why && <p className="muted" style={{ fontSize: 20 }}>Why this lick: {why}</p>}
            <button type="button" className="btn mint" style={{ alignSelf: 'flex-start' }} onClick={() => setPhase(2)} disabled={plays === 0}>
              Got it, where does it start? →
            </button>
          </section>
        )}

        {phase === 2 && (
          <section className="panel col" style={{ gap: 18 }}>
            <div className="lbl">STEP 3 · THE FIRST NOTE</div>
            <h2>Which degree does it start on? {input === 'mic' ? 'Play it on your instrument.' : 'Tap a key.'}</h2>
            <div className="col" style={{ gap: 10 }}>
              {guesses.map((g, i) => {
                const ok = g === start;
                return (
                  <div key={i} className={'band ' + (ok ? 'yes' : 'no')} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: ok ? 24 : 22 }}>
                    <span className="badge" style={{ background: 'var(--cream)', whiteSpace: 'nowrap' }}>
                      {ordinal(i + 1)} GUESS
                    </span>
                    <span>
                      {ok
                        ? `Yes. It starts on ${lbl(start)}${i > 0 ? ' (we will remember the slip)' : ''}. ${hintFor(start)}`
                        : `Not ${lbl(g)}. ${hintFor(g)} Hear the lick again and compare the first note with the bass.`}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => playLick()} disabled={playing}>
                Hear it again
              </button>
              <button type="button" className="btn ghost" onClick={playHome}>
                Home
              </button>
              <InputToggle input={input} setInput={setInput} mic={mic} />
              {startOk && targetsDone && (
                <button type="button" className="btn mint" onClick={() => setPhase(3)}>
                  Now hear the whole thing inside →
                </button>
              )}
            </div>
            {startOk && targetBars.length > 0 && (
              <Targets
                bars={targetBars}
                changes={changes!}
                chordName={chordName}
                picks={targetPicks}
                current={nextTarget}
                targetPc={(b) => pcOf(targetNote(b))}
                onPick={pickTarget}
              />
            )}
          </section>
        )}

        {phase === 3 && (
          <section className="panel col" style={{ gap: 22, minHeight: 440, justifyContent: 'center', alignItems: 'center', textAlign: 'center', background: 'var(--bar)' }}>
            <div className="lbl">STEP 4 · HEAR IT INSIDE</div>
            <div style={{ position: 'relative' }}>
              <Mascot size={128} />
              <span className="ps" style={{ position: 'absolute', right: -40, top: -18, fontSize: 12, color: 'var(--muted)' }}>z</span>
              <span className="ps" style={{ position: 'absolute', right: -58, top: -40, fontSize: 16, color: 'var(--muted)' }}>z</span>
            </div>
            <h2 style={{ fontSize: 22, lineHeight: 1.5, maxWidth: '30ch' }}>
              Close your eyes. Starts on <span style={{ color: degreeColor(start) }}>{lbl(start)}</span>. Hear all {total} notes before you touch anything.
            </h2>
            <div className="row" style={{ gap: 10, justifyContent: 'center' }} aria-label="Silent beats to imagine through">
              {round.lick.notes.map((n, i) => (
                <div
                  key={i}
                  style={{
                    width: 44 + round.lick.durs[i] * 28,
                    height: 28,
                    border: '4px solid var(--ink)',
                    background: i === 0 ? degreeColor(n) : playing && soundingIdx === i ? litColor(n) : 'var(--panel)',
                  }}
                />
              ))}
            </div>
            <div className="row" style={{ gap: 8, justifyContent: 'center' }} aria-label={`Quiet bar: ${quiet} of 4 beats`}>
              {[1, 2, 3, 4].map((n) => (
                <span key={n} style={{ width: 18, height: 18, border: '3px solid var(--ink)', background: quiet >= n ? 'var(--gold)' : 'var(--night)' }} />
              ))}
              <span className="muted" style={{ fontSize: 21, marginLeft: 8 }}>
                {quiet < 4 ? 'a quiet bar, then the keys come back' : 'keys are ready when you are'}
              </span>
            </div>
            <p style={{ fontSize: 24, maxWidth: '44ch' }}>
              Hum it to yourself if it helps. As each note goes by, try to name its scale degree in your head.
            </p>
            {harmony && (
              <>
                <ChangesLane lick={round.lick} chordName={chordName} litBar={litBar} soundingIdx={-1} show="none" lens="degree" litColor={litColor} />
                <p style={{ fontSize: 22, maxWidth: '50ch' }}>Loop the changes with no lick, and hear the melody over them in your head.</p>
              </>
            )}
            <p className="muted" style={{ maxWidth: '52ch' }}>The keyboard is hidden on purpose. Imagine first, then play. Replaying is allowed; it only tells us the phrase was not yet yours.</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              {harmony && (
                <button type="button" className="btn" onClick={playChanges} disabled={playing}>
                  Loop the changes
                </button>
              )}
              <button type="button" className="btn ghost" onClick={() => playLick()} disabled={playing}>
                One more listen
              </button>
              <button type="button" className="btn pink" onClick={() => setPhase(4)}>
                I&apos;ve got it, let me play →
              </button>
            </div>
          </section>
        )}

        {phase === 4 && (
          <section className="panel col" style={{ gap: 16 }}>
            <div className="row between">
              <div>
                <div className="lbl">STEP 5 · PLAY IT BACK{onRetry ? ` · TAKE ${attempt}` : ''}</div>
                <h2 style={{ fontSize: 20, marginTop: 10 }}>Play it on purpose. No fishing.</h2>
              </div>
              <InputToggle input={input} setInput={setInput} mic={mic} />
            </div>
            <div className="slots" aria-label={`Notes played so far: ${played.length} of ${total}`}>
              {expected.map((_, i) => {
                const p = played[i];
                const filled = p != null;
                return (
                  <div key={i} className={'slot' + (filled ? ' filled' : '') + (i === played.length ? ' next' : '')} style={{ background: filled ? degreeColor(p) : undefined }}>
                    {filled ? lbl(p) : '·'}
                  </div>
                );
              })}
              <span className="muted" style={{ marginLeft: 6 }}>
                {played.length} of {total}
              </span>
              <button type="button" className="btn ghost small" style={{ marginLeft: 'auto' }} onClick={() => {
                  setPlayed((p) => p.slice(0, -1));
                  setUndoUsed(true);
                }}
                disabled={played.length === 0 || undoUsed}
                title="You get one undo per lick"
              >
                {undoUsed ? 'Undo used' : 'Undo · 1 left'}
              </button>
            </div>
            {input === 'mic' && (
              <div style={{ border: '4px dashed var(--ink)', padding: 22, background: 'var(--night)' }} className="col">
                <div className="row" style={{ gap: 14 }}>
                  <span style={{ width: 14, height: 14, background: mic === 'on' ? 'var(--pink)' : 'var(--dim)', border: '3px solid var(--ink)' }} />
                  <span style={{ fontSize: 24 }}>
                    {mic === 'on'
                      ? `Listening. Play the lick from ${lbl(start)} in ${keyLabel}.`
                      : mic === 'denied'
                        ? 'Microphone blocked. Allow it in the browser, or switch to in-app keys.'
                        : 'Asking for the microphone…'}
                  </span>
                </div>
                <p className="muted" style={{ fontSize: 20 }}>Experimental: pitch tracking works best with a clean single-note tone, no chords, no reverb. Octaves are folded to the key.</p>
              </div>
            )}
            {harmony && (
              <div className="row" style={{ gap: 12 }}>
                <button type="button" className="btn ghost small" onClick={playChanges} disabled={playing}>
                  Play the changes
                </button>
                <span className="muted" style={{ fontSize: 20 }}>Play along with them if you like. Timing is free; pitches count.</span>
              </div>
            )}
            <p className="muted" style={{ fontSize: 20 }}>
              {stage.rhythm ? 'Pitches count tonight. Rhythm feedback is on its way for this territory.' : 'Rhythm is free in this territory; pitches count.'}
            </p>
          </section>
        )}

        {phase === 5 && (
          <section className="panel col" style={{ gap: 18 }}>
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="lbl">STEP 6 · HOW DID IT LAND?</div>
                <h2 style={{ marginTop: 10, color: perfect ? 'var(--mint)' : correct >= total - 1 ? 'var(--gold)' : 'var(--pink)' }}>
                  {perfect
                    ? onRetry
                      ? 'All of them, on the retry. It’s yours now.'
                      : targetMiss
                        ? 'Every note right. One target slipped earlier.'
                        : 'Clean run. That one lives in your ear now.'
                    : correct >= total - 1
                      ? 'So close. One note slipped.'
                      : 'Good attempt. Let’s clarify a couple of notes.'}
                </h2>
              </div>
              <div className="badge" style={{ fontSize: 14, padding: '12px 14px', background: perfect ? 'var(--mint)' : correct >= total - 1 ? 'var(--gold)' : 'var(--pink)' }}>
                {correct} / {total}
              </div>
            </div>
            <div className="row" style={{ gap: 10 }} aria-label="Expected versus played, note by note">
              {expected.map((n, i) => {
                const p = played[i];
                const ok = p === n;
                return (
                  <div key={i} className={'cmp ' + (ok ? 'ok' : 'bad')} style={i === firstWrong ? { outline: '4px solid var(--cream)', outlineOffset: 2 } : undefined}>
                    <span className="exp">{lbl(n)}</span>
                    <span className="sub">{ok ? 'yes' : `you: ${p == null ? '–' : lbl(p)}`}</span>
                    {chordOf(i) && <span className="sub ct">{chordToneLabel(n, chordOf(i)!.root)} of {chordName(chordOf(i)!)}</span>}
                  </div>
                );
              })}
            </div>
            {insight && (
              <div className="workon">
                <span className="badge" style={{ background: 'var(--pink)', whiteSpace: 'nowrap' }}>
                  WORK ON
                </span>
                <p>{insight}</p>
              </div>
            )}
            {harmony && (
              <div className="col" style={{ gap: 10 }}>
                <div className="row between">
                  <span className="muted" style={{ fontSize: 21 }}>
                    {lens === 'degree' ? 'Graded in the key: each note as a degree of home.' : 'The chord lens: each note’s job over the chord under it. Gold is a chord tone, violet a tension.'}
                  </span>
                  <div className="row" style={{ gap: 6 }} role="group" aria-label="Label notes as">
                    <button type="button" className={'toggle' + (lens === 'degree' ? ' on' : '')} onClick={() => setLens('degree')}>
                      KEY DEGREE
                    </button>
                    <button type="button" className={'toggle' + (lens === 'chord' ? ' on' : '')} onClick={() => setLens('chord')}>
                      CHORD TONE
                    </button>
                  </div>
                </div>
                <ChangesLane lick={round.lick} chordName={chordName} litBar={litBar} soundingIdx={playing ? soundingIdx : -1} show="shown" lens={lens} litColor={(n) => degreeColor(n)} />
              </div>
            )}
            {gateOpen && !nextStage && (
              <div className="band gold">
                Ten in a row. {stage.name} is cleared.{' '}
                <button type="button" className="btn ink small" style={{ marginLeft: 12 }} onClick={() => go('territory')}>
                  See the map
                </button>
              </div>
            )}
            {gateOpen && nextStage && (
              <div className="band gold">
                Ten in a row. The gate to {nextStage.name} is open.{' '}
                <button type="button" className="btn ink small" style={{ marginLeft: 12 }} onClick={() => go('territory')}>
                  See the map
                </button>
              </div>
            )}
            <div className="row" style={{ gap: 12 }}>
              <span className="muted">Say the degrees out loud as it plays:</span>
              {expected.map((n, i) => (
                <span key={i} className={'say' + (sayIdx === i ? ' on' : '')} style={sayIdx === i ? { background: degreeColor(n) } : undefined} title={degreeSpoken(n)}>
                  {lbl(n)}
                </span>
              ))}
            </div>
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => playLick(true)} disabled={playing}>
                Play slowly &amp; say it
              </button>
              {!perfect && (
                <button
                  type="button"
                  className="btn pink"
                  onClick={() => {
                    setAttempt((a) => a + 1);
                    setPlayed([]);
                    setPhase(3);
                  }}
                >
                  Try again →
                </button>
              )}
              <button
                type="button"
                className={'btn' + (isSaved ? ' ink' : ' ghost')}
                onClick={() =>
                  isSaved ? dispatch({ type: 'unsaveLick', lickId: round.lick.id }) : dispatch({ type: 'saveLick', lickId: round.lick.id, tonic: round.tonic })
                }
                aria-pressed={isSaved}
                title="Keep this lick in your Saved Licks to replay later"
              >
                {isSaved ? '★ Saved' : '☆ Save lick'}
              </button>
              <button type="button" className="btn mint" onClick={startRound} disabled={!perfect}>
                Next lick →
              </button>
              <span className="muted" style={{ fontSize: 21 }}>
                {perfect
                  ? hints
                    ? `All ${total} with color hints on: you move on, but hinted takes never count toward the gate.`
                    : onRetry
                      ? `All ${total} on a retry: you move on, but no pip for the gate.`
                      : targetMiss
                        ? `All ${total} right, but a missed target means this one does not count. The streak resets to 0.`
                        : 'Clean run. Pip earned.'
                  : `Play all ${total} right to move on. ${hints ? 'Hinted takes never touch the streak.' : attempt === 1 ? 'The streak resets to 0.' : 'Retries never count toward the gate.'}`}
              </span>
            </div>
          </section>
        )}

        {showKeys && (
          <section className="kbd-wrap">
            <div className="row between">
              <span className="muted">
                {phase === 2
                  ? startOk
                    ? 'Keys are quiet now. The rest of the lick stays in your head until you play it.'
                    : `Tap the key the lick started on.${available.size < kbSemis.length ? ' Dim keys unlock in later territories.' : ''}`
                  : phase === 4
                    ? `Play all ${total} notes. The lick auto-checks after the last one.`
                    : 'Poke around. Compare the note you missed with its neighbors.'}
              </span>
              <div className="row" style={{ gap: 6 }} role="group" aria-label="Keyboard layout">
                <button
                  type="button"
                  className={'toggle' + (progress.kbLayout === 'piano' ? ' on' : '')}
                  onClick={() => dispatch({ type: 'setKbLayout', layout: 'piano' })}
                  title="Real piano: keys sit where they are on your instrument"
                >
                  PIANO
                </button>
                <button
                  type="button"
                  className={'toggle' + (progress.kbLayout === 'movable' ? ' on' : '')}
                  onClick={() => dispatch({ type: 'setKbLayout', layout: 'movable' })}
                  title="Always drawn in C: home is the left edge and each degree sits on the same key in every key"
                >
                  SAME SHAPE · IN C
                </button>
              </div>
              <div className="row" style={{ gap: 6 }} role="group" aria-label="Key labels">
                <button type="button" className={'toggle' + (progress.labels === 'degree' ? ' on' : '')} onClick={() => dispatch({ type: 'setLabels', labels: 'degree' })}>
                  DEGREES
                </button>
                <button type="button" className={'toggle' + (progress.labels === 'name' ? ' on' : '')} onClick={() => dispatch({ type: 'setLabels', labels: 'name' })}>
                  NOTE NAMES
                </button>
              </div>
            </div>
            <Keyboard available={available} tonicMidi={round.tonic} mode={round.mode} keyLabel={keyLabel} labels={progress.labels} layout={progress.kbLayout} onTap={(s) => handleTap(s)} down={tapDown} ring={ring} disabled={phase === 2 && startOk} />
          </section>
        )}

        {celebrate && (
          <LevelUp
            stage={stage}
            onward={onward && onward.id !== stage.id ? onward : undefined}
            newPaths={newPaths}
            onGo={goTo}
            onStay={() => setCelebrateDismissed(true)}
            onMap={() => go('territory')}
          />
        )}

        <Settings tempo={bpm} voice={progress.voice} onTempo={(t) => dispatch({ type: 'setTempo', tempo: t })} onVoice={(v) => dispatch({ type: 'setVoice', voice: v })} hints={hints} onHints={(on) => dispatch({ type: 'setColorHints', on })} alwaysC={progress.alwaysC} onAlwaysC={(on) => { dispatch({ type: 'setAlwaysC', on }); if (phase === 0) later(startRound, 0); }} dev={dev} reveal={reveal} setReveal={setReveal} lick={round.lick} onNewLick={startRound} />
      </main>
    </>
  );
}

function Mystery({ lick, soundingIdx, reveal, litColor }: { lick: Lick; soundingIdx: number; reveal: boolean; litColor: (n: number) => string }) {
  return (
    <div className="row" style={{ gap: 10, alignItems: 'flex-end', minHeight: 120 }} aria-label={`${lick.notes.length} hidden notes; width shows duration`}>
      {lick.notes.map((n, i) => {
        const lit = soundingIdx === i;
        return (
          <div key={i} className={'myst' + (lit ? ' lit' : '')} style={{ width: 44 + lick.durs[i] * 28, background: lit ? litColor(n) : undefined }}>
            {reveal ? lbl(n) : '?'}
          </div>
        );
      })}
    </div>
  );
}

// Land the Target: after naming the first note, name the note each new chord
// lands on. Choices are that chord's own tones, written as degrees of home.
// One guess per bar; a miss spoils the clean run.
function Targets({
  bars,
  changes,
  chordName,
  picks,
  current,
  targetPc,
  onPick,
}: {
  bars: number[];
  changes: Chord[];
  chordName: (c: Chord) => string;
  picks: Record<number, number>;
  current: number | undefined;
  targetPc: (bar: number) => number;
  onPick: (bar: number, pc: number) => void;
}) {
  const ch = current !== undefined ? changes[current] : undefined;
  const choices = ch
    ? [...new Set(ch.tones.map(pcOf))].sort((a, b) => pcOf(a - ch.root) - pcOf(b - ch.root))
    : [];
  return (
    <div className="col" style={{ gap: 12, borderTop: '4px dashed var(--ink)', paddingTop: 14 }}>
      <div className="lbl">LAND THE TARGET</div>
      <div className="row" style={{ gap: 10 }}>
        {bars.map((b) => {
          const pick = picks[b];
          const want = targetPc(b);
          const done = pick !== undefined;
          return (
            <div key={b} className={'band ' + (done ? (pick === want ? 'yes' : 'no') : '')} style={{ fontSize: 20, padding: '8px 12px', background: done ? undefined : b === current ? 'var(--gold)' : 'var(--panel)', color: done || b === current ? 'var(--night)' : 'var(--cream)' }}>
              {chordName(changes[b])}: {done ? (pick === want ? `${lbl(want)} ✓` : `${lbl(want)}, not ${lbl(pick)}`) : '?'}
            </div>
          );
        })}
      </div>
      {ch && current !== undefined ? (
        <>
          <h2 style={{ fontSize: 16 }}>
            When the chord changes to {chordName(ch)} ({ch.roman}), which degree is on the downbeat?
          </h2>
          <div className="row" style={{ gap: 10 }}>
            {choices.map((pc) => (
              <button key={pc} type="button" className="btn small" style={{ background: degreeColor(pc), color: 'var(--night)' }} onClick={() => onPick(current, pc)}>
                {lbl(pc)} · {chordToneLabel(pc, ch.root)}
              </button>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 20 }}>One guess per chord. The choices are {chordName(ch)}&apos;s own notes, named as degrees of home.</p>
        </>
      ) : (
        <p style={{ fontSize: 22 }}>
          {bars.every((b) => picks[b] === targetPc(b)) ? 'Every target landed. Now imagine the whole line.' : 'A target slipped, so this round will not count toward the streak. Finish it anyway: the replay shows where the line went.'}
        </p>
      )}
    </div>
  );
}

// The level-up prompt: shown once, on the clean run that opens the gate.
function LevelUp({
  stage,
  onward,
  newPaths,
  onGo,
  onStay,
  onMap,
}: {
  stage: Stage;
  onward?: Stage;
  newPaths: Stage[];
  onGo: (s: Stage) => void;
  onStay: () => void;
  onMap: () => void;
}) {
  const goRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    goRef.current?.focus();
    engine.fanfare();
  }, []);
  return (
    <div className="levelup-back" role="dialog" aria-modal="true" aria-labelledby="levelup-title">
      <div className="levelup">
        <div className="levelup-art">
          <WorldScene stageId={(onward ?? stage).id} fit="banner" label={`${(onward ?? stage).name}, pixel scene`} />
        </div>
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => (
            <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.12}s`, background: ['var(--gold)', 'var(--pink)', 'var(--mint)', 'var(--violet)', '#6EC6FF', '#FF9F68'][i % 6] }} />
          ))}
        </div>
        <div className="row" style={{ gap: 22, alignItems: 'center' }}>
          <div className="bounce">
            <Mascot size={112} />
          </div>
          <div className="col" style={{ gap: 10 }}>
            <div className="lbl" style={{ color: 'var(--night)', opacity: 0.7 }}>
              TEN CLEAN RUNS IN A ROW
            </div>
            <h2 id="levelup-title" style={{ fontSize: 22, color: 'var(--night)', lineHeight: 1.4 }}>
              {isHarmony(stage) ? 'Path cleared!' : 'Gate open!'}
            </h2>
            <p style={{ fontSize: 24, color: 'var(--night)', maxWidth: '34ch' }}>
              {stage.name} lives in your ear now.{' '}
              {onward ? `${onward.name} is waiting: ${onward.blurb}.` : 'Every territory is yours. Wander anywhere.'}
            </p>
          </div>
        </div>
        {newPaths.length > 0 && (
          <div className="row" style={{ gap: 8 }}>
            <span className="ps" style={{ fontSize: 8, color: 'var(--night)', opacity: 0.7 }}>
              NEW PROGRESSION PATH{newPaths.length > 1 ? 'S' : ''}
            </span>
            {newPaths.map((h) => (
              <button key={h.id} type="button" className="chip" style={{ background: h.color, cursor: 'pointer' }} onClick={() => onGo(h)}>
                {stageCode(h)} · {h.name}
              </button>
            ))}
          </div>
        )}
        <div className="row" style={{ gap: 12 }}>
          {onward && (
            <button ref={goRef} type="button" className="btn ink" onClick={() => onGo(onward)}>
              Onward to {onward.name} →
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onMap}>
            See the map
          </button>
          <button type="button" className="btn ghost" onClick={onStay}>
            Stay a little longer
          </button>
        </div>
      </div>
    </div>
  );
}

function InputToggle({ input, setInput, mic }: { input: 'keys' | 'mic'; setInput: (i: 'keys' | 'mic') => void; mic: 'off' | 'on' | 'denied' }) {
  return (
    <div className="row" style={{ gap: 6 }} role="group" aria-label="Input method">
      <button type="button" className={'toggle' + (input === 'keys' ? ' on' : '')} onClick={() => setInput('keys')}>
        IN-APP KEYS
      </button>
      <button type="button" className={'toggle' + (input === 'mic' ? ' on' : '')} onClick={() => setInput('mic')}>
        MY INSTRUMENT{input === 'mic' && mic === 'on' ? ' ●' : ''}
      </button>
    </div>
  );
}

function Settings({
  tempo,
  voice,
  onTempo,
  onVoice,
  hints,
  onHints,
  alwaysC,
  onAlwaysC,
  dev,
  reveal,
  setReveal,
  lick,
  onNewLick,
}: {
  tempo: number;
  voice: Voice;
  onTempo: (t: number) => void;
  onVoice: (v: Voice) => void;
  hints: boolean;
  onHints: (on: boolean) => void;
  alwaysC: boolean;
  onAlwaysC: (on: boolean) => void;
  dev: boolean;
  reveal: boolean;
  setReveal: (b: boolean) => void;
  lick: Lick;
  onNewLick: () => void;
}) {
  return (
    <div className="row between muted" style={{ fontSize: 20, borderTop: '4px dashed var(--ink)', paddingTop: 14 }}>
      <label className="row" style={{ gap: 10 }}>
        Tempo {tempo} bpm
        <input type="range" min={60} max={160} step={4} value={tempo} onChange={(e) => onTempo(Number(e.target.value))} />
      </label>
      <div className="row" style={{ gap: 6 }} role="group" aria-label="Voice">
        {(['square', 'triangle', 'sawtooth'] as Voice[]).map((v) => (
          <button key={v} type="button" className={'toggle' + (voice === v ? ' on' : '')} onClick={() => onVoice(v)}>
            {v.toUpperCase()}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={'toggle' + (alwaysC ? ' on' : '')}
        onClick={() => onAlwaysC(!alwaysC)}
        aria-pressed={alwaysC}
        title="Play every lick in C instead of a new key each round. Good for getting started."
      >
        {alwaysC ? 'ALWAYS IN C' : 'KEY: VARIES'}
      </button>
      <button
        type="button"
        className={'toggle' + (hints ? ' on' : '')}
        onClick={() => onHints(!hints)}
        aria-pressed={hints}
        title="Light each note in its degree color while the lick plays. For absolute beginners; hinted takes never count toward the gate."
      >
        {hints ? 'COLOR HINTS ON' : 'COLOR HINTS'}
      </button>
      {dev && (
        <div className="row" style={{ gap: 6 }}>
          <span className="badge" style={{ background: 'var(--pink)' }}>DEV</span>
          <button type="button" className={'toggle' + (reveal ? ' on' : '')} onClick={() => setReveal(!reveal)}>
            {reveal ? `LICK: ${lick.notes.map((n) => lbl(n)).join(' ')}` : 'REVEAL LICK'}
          </button>
          <button type="button" className="toggle" onClick={onNewLick}>
            SKIP LICK
          </button>
        </div>
      )}
    </div>
  );
}

function ordinal(n: number): string {
  return n === 1 ? '1ST' : n === 2 ? '2ND' : n === 3 ? '3RD' : `${n}TH`;
}
