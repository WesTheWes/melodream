import { useEffect, useMemo, useRef, useState } from 'react';
import { engine } from '../audio/engine';
import { Stars } from '../components/Mascot';
import { forceNextLick } from '../dev';
import { ALL_LICKS, type Lick } from '../music/library';
import { ratingCounts, ratingOf, setRating, subscribeRatings, type Rating } from '../music/ratings';
import { ALL_STAGES, stageById, stageCode } from '../music/stages';
import { degreeColor, degreeLabel, spellNote } from '../music/theory';
import { useStore } from '../state/store';
import type { Screen } from '../router';

// Dev only (?dev=me): every lick in the game, filterable, playable in C, and
// one click away from being the next round on the Play screen. Like or hide
// licks here; on the local dev server that saves to data/ratings.json.

type Source = 'all' | 'hand' | 'book' | 'recorded';
const sourceOf = (l: Lick): Exclude<Source, 'all'> => (l.id.startsWith('lfd-') ? 'book' : l.id.startsWith('rec-') ? 'recorded' : 'hand');
const SOURCE_LABEL: Record<Exclude<Source, 'all'>, string> = { hand: 'HAND', book: 'BOOK', recorded: 'REC' };
const PAGE = 60;
const lbl = (s: number) => degreeLabel(s);
const fmtDur = (d: number) => (Math.abs(d * 3 - Math.round(d * 3)) < 1e-6 && d % 0.25 ? `${Math.round(d * 3)}/3` : String(d));

export function LickBrowser({ go }: { go: (s: Screen) => void }) {
  const { progress, dispatch } = useStore();
  engine.voice = progress.voice;
  const [stage, setStage] = useState<number | 'all'>('all');
  const [source, setSource] = useState<Source>('all');
  const [query, setQuery] = useState('');
  const [rated, setRated] = useState<'all' | 'liked' | 'hidden' | 'unrated'>('all');
  const [, bump] = useState(0);
  const [saveNote, setSaveNote] = useState('');
  useEffect(() => subscribeRatings(() => bump((n) => n + 1)), []);
  const rate = async (id: string, r: Rating) => {
    const saved = await setRating(id, ratingOf(id) === r ? null : r);
    setSaveNote(saved ? 'Saved to src/music/data/ratings.json' : 'Not saved: run the local dev server (npm run dev) to save ratings to the project.');
  };
  const [shown, setShown] = useState(PAGE);
  const [playing, setPlaying] = useState<string | null>(null);
  const [sounding, setSounding] = useState(-1);
  const cancels = useRef<(() => void)[]>([]);
  useEffect(() => () => cancels.current.forEach((c) => c()), []);

  // Filtering 1,800 licks is cheap, so no memo: ratings changes show at once.
  const q = query.trim().toLowerCase();
  const list = ALL_LICKS.filter(
    (l) =>
      (stage === 'all' || l.stage === stage) &&
      (source === 'all' || sourceOf(l) === source) &&
      (rated === 'all' || (rated === 'unrated' ? ratingOf(l.id) === null : ratingOf(l.id) === rated)) &&
      (!q || l.id.toLowerCase().includes(q) || (l.tag ?? '').toLowerCase().includes(q) || l.notes.map(lbl).join(' ').includes(q)),
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    ALL_LICKS.forEach((l) => (c[sourceOf(l)] = (c[sourceOf(l)] ?? 0) + 1));
    return c;
  }, []);

  const stop = () => {
    cancels.current.forEach((c) => c());
    cancels.current = [];
    setPlaying(null);
    setSounding(-1);
  };
  const play = (l: Lick) => {
    stop();
    const tonic = 60;
    setPlaying(l.id);
    if (l.changes) cancels.current.push(engine.backing(tonic, l.changes, progress.tempo));
    cancels.current.push(
      engine.playPhrase(
        l.notes.map((n) => tonic + n),
        l.durs,
        progress.tempo,
        { swing: l.swing, lead: l.lead, onNote: setSounding, onDone: stop },
      ),
    );
  };
  const tryIt = (l: Lick) => {
    stop();
    forceNextLick(l.id);
    dispatch({ type: 'setStage', stageId: l.stage });
    go('play');
  };

  const reset = (fn: () => void) => {
    fn();
    setShown(PAGE);
  };

  return (
    <>
      <Stars />
      <main className="main">
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <h1 style={{ fontSize: 16 }}>Lick browser</h1>
          <span className="muted" style={{ fontSize: 20 }}>
            {list.length} of {ALL_LICKS.length} licks · played in C · ★ {ratingCounts().liked} liked · ✕ {ratingCounts().hidden} hidden
          </span>
        </div>

        <section className="panel row" style={{ gap: 14, padding: 16 }}>
          <label className="row" style={{ gap: 8, fontSize: 20 }}>
            Territory
            <select className="dev-select" value={String(stage)} onChange={(e) => reset(() => setStage(e.target.value === 'all' ? 'all' : Number(e.target.value)))}>
              <option value="all">All</option>
              {ALL_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {stageCode(s)} · {s.name}
                </option>
              ))}
            </select>
          </label>
          <div className="row" style={{ gap: 6 }} role="group" aria-label="Source">
            {(['all', 'hand', 'book', 'recorded'] as Source[]).map((s) => (
              <button key={s} type="button" className={'toggle' + (source === s ? ' on' : '')} onClick={() => reset(() => setSource(s))}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 6 }} role="group" aria-label="Rating">
            {(['all', 'liked', 'hidden', 'unrated'] as const).map((r) => (
              <button key={r} type="button" className={'toggle' + (rated === r ? ' on' : '')} onClick={() => reset(() => setRated(r))}>
                {r === 'liked' ? '★ LIKED' : r === 'hidden' ? '✕ HIDDEN' : r.toUpperCase()}
              </button>
            ))}
          </div>
          <label className="row" style={{ gap: 8, fontSize: 20, flex: '1 1 220px' }}>
            Search
            <input
              className="dev-input"
              type="search"
              value={query}
              placeholder="id, tag or degrees (e.g. lfd-m7-14, Parker, 5 6 1↑)"
              onChange={(e) => reset(() => setQuery(e.target.value))}
            />
          </label>
        </section>

        <p className="muted" style={{ fontSize: 19 }}>
          ★ Like: comes up about three times as often. ✕ Hide: never picked in the game. Click again to clear. Source counts: hand-written {counts.hand}, book {counts.book}, recorded {counts.recorded ?? 0}.
          {saveNote ? ` ${saveNote}` : ''}
        </p>

        <ul className="lick-list">
          {list.slice(0, shown).map((l) => {
            const st = stageById(l.stage);
            const mine = playing === l.id;
            const r = ratingOf(l.id);
            return (
              <li key={l.id} className={'lick-row' + (r ? ' ' + r : '')}>
                <div className="row" style={{ gap: 8, minWidth: 0 }}>
                  <span className="badge" style={{ background: st.color }}>
                    {stageCode(st)}
                  </span>
                  <span className="ps lick-id">{l.id}</span>
                  <span className="chip">{SOURCE_LABEL[sourceOf(l)]}</span>
                  <span className="muted" style={{ fontSize: 19 }}>
                    {l.scale}
                    {l.swing ? ' · swing' : ''}
                    {l.tag ? ` · ${l.tag}` : ''}
                  </span>
                </div>
                {l.changes && (
                  <div className="muted" style={{ fontSize: 19 }}>
                    {l.changes.map((c) => `${spellNote(60, l.home, c.root)}${c.suffix} (${c.roman})`).join(' → ')}
                  </div>
                )}
                <div className="row lick-notes" aria-label="Degrees, with durations in beats">
                  {l.notes.map((n, i) => (
                    <span key={i} className={'lick-note' + (mine && sounding === i ? ' lit' : '')} style={{ background: degreeColor(n) }} title={`${fmtDur(l.durs[i])} beat${l.durs[i] === 1 ? '' : 's'}`}>
                      {lbl(n)}
                    </span>
                  ))}
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button type="button" className="btn small" onClick={() => (mine ? stop() : play(l))}>
                    {mine ? 'Stop' : 'Play'}
                  </button>
                  <button type="button" className={'btn small' + (r === 'liked' ? ' mint' : ' ghost')} onClick={() => rate(l.id, 'liked')} aria-pressed={r === 'liked'}>
                    ★ Like
                  </button>
                  <button type="button" className={'btn small' + (r === 'hidden' ? ' pink' : ' ghost')} onClick={() => rate(l.id, 'hidden')} aria-pressed={r === 'hidden'}>
                    ✕ Hide
                  </button>
                  <button type="button" className="btn ghost small" onClick={() => tryIt(l)}>
                    Play it in the game →
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {shown < list.length && (
          <button type="button" className="btn ghost" style={{ alignSelf: 'center' }} onClick={() => setShown((n) => n + PAGE)}>
            Show {Math.min(PAGE, list.length - shown)} more
          </button>
        )}
        {list.length === 0 && <p className="muted">No licks match.</p>}
      </main>
    </>
  );
}
