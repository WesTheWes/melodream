import { STAGES, stageById } from '../music/stages';
import { degreeColor, degreeLabel, hintFor } from '../music/theory';
import { masteryWord, topConfusions } from '../state/adapt';
import { useStore } from '../state/store';
import type { Screen } from '../router';

const lbl = (pc: number) => degreeLabel(pc, { octaveMark: false });

export function TonalMap({ go }: { go: (s: Screen) => void }) {
  const { progress, highestUnlocked, dispatch } = useStore();
  const stage = stageById(progress.stageId);
  const mode = stage.home === 'minor' ? 'minor' : 'major';
  const inPlay = stage.available[mode];
  // All twelve degrees, always: ones you have not met yet show as such.
  const shown = Array.from({ length: 12 }, (_, pc) => pc);
  const conf = topConfusions(progress.stats, 3);
  const grid = inPlay.slice(0, 7);
  const minorOpen = highestUnlocked >= 4 || progress.dev;
  // Harmony licks: degrees heard over particular chords, shakiest first.
  const overChord = Object.entries(progress.stats.overChord ?? {})
    .map(([key, t]) => {
      const [pcStr, roman] = key.split('@');
      return { key, pc: Number(pcStr), roman, seen: t.seen, right: t.right, ratio: t.seen ? t.right / t.seen : 0 };
    })
    .filter((o) => o.seen > 0)
    .sort((a, b) => a.ratio - b.ratio || b.seen - a.seen)
    .slice(0, 5);

  const moveColor = (from: number, to: number): { bg: string; word: string } => {
    const t = progress.stats.moves[`${from}>${to}`];
    if (!t || t.seen === 0) return { bg: 'var(--night)', word: 'not heard yet' };
    const r = t.right / t.seen;
    if (r >= 0.8) return { bg: 'var(--mint)', word: 'easy' };
    if (r >= 0.5) return { bg: 'var(--gold)', word: 'settling' };
    return { bg: 'var(--pink)', word: 'confusing' };
  };

  return (
    <main className="main">
      <div className="row between" style={{ alignItems: 'flex-end' }}>
        <h1 style={{ fontSize: 18, maxWidth: '40ch' }}>What your ear already knows, and what it is still reaching for.</h1>
        <span className="muted" style={{ fontSize: 20, maxWidth: '40ch', textAlign: 'right' }}>
          {progress.stats.licksHeard} licks heard · {progress.stats.cleanRuns} clean runs · {progress.stats.replays} replays
        </span>
      </div>

      <div className="row" style={{ alignItems: 'stretch', gap: 22 }}>
        <section className="panel col" style={{ flex: '1 1 300px', minWidth: 0, padding: 22 }}>
          <div className="lbl">SCALE DEGREES</div>
          <ul className="bars">
            {shown.map((pc) => {
              const t = progress.stats.degrees[String(pc)];
              const word = masteryWord(progress.stats, pc);
              const ratio = t && t.seen ? t.right / t.seen : 0;
              const level = !t || t.seen === 0 ? 0 : Math.max(1, Math.round(ratio * 8));
              const met = !!t && t.seen > 0;
              const color = word === 'Solid' ? 'var(--mint)' : word === 'Settling' ? 'var(--gold)' : word === 'Not met yet' ? '#8E86B8' : 'var(--pink)';
              return (
                <li key={pc} className="bar-row">
                  <span
                    className="chip"
                    style={{
                      fontSize: 12,
                      width: 36,
                      height: 36,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      background: met ? degreeColor(pc) : 'var(--night)',
                      color: met ? 'var(--night)' : '#8E86B8',
                    }}
                  >
                    {lbl(pc)}
                  </span>
                  <div className="bar-cells" aria-label={`Degree ${lbl(pc)}: ${word}`}>
                    {Array.from({ length: 8 }, (_, i) => (
                      <span key={i} className="bar-cell" style={{ background: i < level ? degreeColor(pc) : undefined }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 21, color }}>{word}</span>
                </li>
              );
            })}
          </ul>
          <div className="muted" style={{ fontSize: 20, borderTop: '3px dashed var(--ink)', paddingTop: 10 }}>
            {minorOpen ? 'Major and minor homes are open.' : 'Home key: major. Minor home opens in Minor Hollow; 4 and 7 arrive in Diatonic Forest.'}
          </div>
        </section>

        <section className="panel col" style={{ flex: '1 1 320px', minWidth: 0, padding: 22 }}>
          <div className="lbl">MELODIC MOVES · FROM → TO</div>
          <div className="heat" style={{ gridTemplateColumns: `repeat(${grid.length + 1}, minmax(0, 1fr))` }} aria-label="Grid of melodic moves, colored by how reliably you hear each">
            <span />
            {grid.map((pc) => (
              <span key={'h' + pc} className="hl">
                {lbl(pc)}
              </span>
            ))}
            {grid.map((from) => (
              <RowCells key={'r' + from} from={from} grid={grid} moveColor={moveColor} />
            ))}
          </div>
          <div className="row muted" style={{ gap: 14, fontSize: 19 }}>
            <Legend bg="var(--mint)" t="easy" />
            <Legend bg="var(--gold)" t="settling" />
            <Legend bg="var(--pink)" t="confusing" />
            <Legend bg="var(--night)" t="not heard yet" />
          </div>
          <div className="lbl" style={{ marginTop: 6 }}>MIX-UPS</div>
          {conf.length === 0 ? (
            <p className="muted" style={{ fontSize: 21 }}>No mix-ups logged yet. They show up here as you play.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 21 }}>
              {conf.map((c, i) => (
                <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="badge" style={{ background: i === 0 ? 'var(--pink)' : 'var(--gold)', whiteSpace: 'nowrap' }}>
                    {lbl(c.expected)} ↔ {lbl(c.got)}
                  </span>
                  <span>
                    {c.count} time{c.count === 1 ? '' : 's'}. {hintFor(c.expected)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {overChord.length > 0 && (
            <>
              <div className="lbl" style={{ marginTop: 6 }}>OVER THE CHORDS</div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 21 }}>
                {overChord.map((o) => (
                  <li key={o.key} className="row" style={{ gap: 10 }}>
                    <span className="chip" style={{ background: degreeColor(o.pc), color: 'var(--night)' }}>
                      {lbl(o.pc)} over {o.roman}
                    </span>
                    <span style={{ color: o.ratio >= 0.8 ? 'var(--mint)' : o.ratio >= 0.5 ? 'var(--gold)' : 'var(--pink)' }}>
                      {o.right}/{o.seen} right
                    </span>
                  </li>
                ))}
              </ul>
              <p className="muted" style={{ fontSize: 19 }}>Shakiest first. Melodream serves more harmony licks that put these degrees over these chords.</p>
            </>
          )}
        </section>

        <section className="col" style={{ flex: '1 1 300px', minWidth: 0, gap: 16 }}>
          <div className="panel col" style={{ padding: 22, background: 'var(--pink)', color: 'var(--night)', gap: 12 }}>
            <div className="lbl" style={{ color: 'var(--night)', opacity: 0.75 }}>TONIGHT, ADAPTED FOR YOU</div>
            <div style={{ fontSize: 26, lineHeight: 1.1 }}>{conf[0] ? `Clarify the ${lbl(conf[0].expected)}` : `Settle into ${stage.name}`}</div>
            <ol style={{ margin: 0, paddingLeft: 22, fontSize: 21, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {conf[0] ? (
                <>
                  <li>
                    Licks that land on {lbl(conf[0].expected)} after {lbl(conf[0].got)}
                  </li>
                  <li>A lick that leaps onto {lbl(conf[0].expected)}, then walks home</li>
                  <li>Say the degrees out loud on every replay</li>
                </>
              ) : (
                <>
                  <li>Find home in a few different keys</li>
                  <li>Three licks from {stage.name}</li>
                  <li>Say the degrees out loud on every replay</li>
                </>
              )}
            </ol>
            <div style={{ fontSize: 19, opacity: 0.8 }}>Chosen from your mix-ups, not a fixed syllabus.</div>
            <button type="button" className="btn ink" style={{ alignSelf: 'flex-start' }} onClick={() => go('play')}>
              Start session
            </button>
          </div>

          <div className="panel col" style={{ padding: 20, gap: 10 }}>
            <div className="lbl">UNLOCKED BY YOUR EAR</div>
            <div className="row" style={{ gap: 6 }}>
              {STAGES.map((s) =>
                s.unlocks.split(' · ').map((u) => {
                  const on = highestUnlocked > s.id || progress.cleared.includes(s.id) || (s.id === 1);
                  return (
                    <span
                      key={s.id + u}
                      style={{
                        fontSize: 20,
                        padding: '6px 10px',
                        border: '3px solid var(--ink)',
                        background: on ? s.color : 'var(--night)',
                        color: on ? 'var(--night)' : '#8E86B8',
                      }}
                    >
                      {u}
                    </span>
                  );
                }),
              )}
            </div>
          </div>

          <div className="panel col" style={{ padding: 20, gap: 8 }}>
            <div className="lbl">HOW THIS MAP FILLS IN</div>
            <p style={{ fontSize: 21 }}>
              Every guess, replay and retry is a data point. A degree turns solid when you place it first try, from leaps and from steps. Nothing is ever marked wrong for good.
            </p>
            <button
              type="button"
              className="btn ghost small"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => {
                if (window.confirm('Erase all progress and start over?')) dispatch({ type: 'resetAll' });
              }}
            >
              Reset everything
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function RowCells({
  from,
  grid,
  moveColor,
}: {
  from: number;
  grid: number[];
  moveColor: (f: number, t: number) => { bg: string; word: string };
}) {
  return (
    <>
      <span className="hl">{lbl(from)}</span>
      {grid.map((to) => {
        const m = moveColor(from, to);
        return <span key={to} className="cell" style={{ background: m.bg, opacity: from === to ? 0.35 : 1 }} title={`${lbl(from)} to ${lbl(to)}: ${m.word}`} />;
      })}
    </>
  );
}

function Legend({ bg, t }: { bg: string; t: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 14, height: 14, background: bg, border: '3px solid var(--ink)' }} />
      {t}
    </span>
  );
}
