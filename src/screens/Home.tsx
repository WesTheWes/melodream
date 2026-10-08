import { Mascot, Stars } from '../components/Mascot';
import { TakePips } from '../components/Header';
import { GATE, STAGES, WINDOW, stageById } from '../music/stages';
import { degreeColor, degreeLabel } from '../music/theory';
import { masteryWord, topConfusions } from '../state/adapt';
import { cleanCount, useStore } from '../state/store';
import type { Screen } from '../router';

function label(pc: number): string {
  return degreeLabel(pc, { octaveMark: false });
}

export function Home({ go }: { go: (s: Screen) => void }) {
  const { progress, highestUnlocked } = useStore();
  const stage = stageById(progress.stageId);
  const takes = progress.recent[String(stage.id)] ?? [];
  const clean = cleanCount(progress, stage.id);
  const next = STAGES.find((s) => s.id === highestUnlocked + 0 && !progress.cleared.includes(s.id)) ?? STAGES.find((s) => s.id === highestUnlocked);
  const nextUnlock = STAGES.find((s) => s.id === (next?.id ?? 1) + 1);
  const mode = stage.home === 'minor' ? 'minor' : 'major';
  const degrees = stage.available[mode];
  const conf = topConfusions(progress.stats, 1)[0];
  const nights = progress.days.length;
  const wobbly = degrees.filter((pc) => {
    const w = masteryWord(progress.stats, pc);
    return w === 'Wobbly' || w === 'Fuzzy';
  });

  return (
    <>
      <Stars />
      <main className="main" style={{ paddingTop: 40, justifyContent: 'center' }}>
        <div className="row" style={{ alignItems: 'stretch', gap: 32 }}>
          <section className="col" style={{ flex: '1 1 520px', minWidth: 0, justifyContent: 'center', gap: 28 }}>
            <div className="row" style={{ alignItems: 'flex-end', gap: 24 }}>
              <Mascot mood="curious" scale={2} />
              <h1 className="logo">
                MELO
                <br />
                DREAM
              </h1>
            </div>
            <p style={{ fontSize: 30, maxWidth: '32ch' }}>
              Hear it. Imagine it. Play it. A tiny music game that teaches you to hear licks in your head before your hands find them.
            </p>
            <div className="row" style={{ gap: 20 }}>
              <button type="button" className="btn" onClick={() => go('play')}>
                {progress.stats.licksHeard === 0 ? 'Start tonight' : 'Continue tonight'}
              </button>
              <span className="muted">
                {stage.name} · {clean}/{WINDOW} clean · about 5 min
              </span>
            </div>
          </section>

          <aside className="col" style={{ flex: '1 1 360px', minWidth: 0, gap: 20 }}>
            <div className="panel col" style={{ padding: 24, gap: 16 }}>
              <div className="lbl">TONIGHT&apos;S SESSION</div>
              <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 24 }}>
                <Li n="1" bg="var(--mint)">
                  Warm up: find home in a new key
                </Li>
                <Li n="2" bg="var(--sky)">
                  {stage.blurb}, {stage.id >= 3 ? 'bigger leaps' : 'small moves'}
                </Li>
                <Li n="3" bg="var(--pink)">
                  {conf ? `Clarify the ${label(conf.expected)}: phrases that land on it` : 'Three licks, every note on purpose'}
                </Li>
              </ol>
              <div className="muted" style={{ fontSize: 20, borderTop: '3px dashed var(--ink)', paddingTop: 12 }}>
                {conf
                  ? `Adapted from your tonal map: you've heard ${label(conf.expected)} as ${label(conf.got)} ${conf.count} time${conf.count === 1 ? '' : 's'}.`
                  : 'Your tonal map fills in as you play. Sessions adapt to what you mix up.'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
              <div className="panel col" style={{ padding: 18, gap: 8 }}>
                <div className="lbl" style={{ fontSize: 9 }}>YOU CAN HEAR</div>
                <div className="row" style={{ gap: 6 }}>
                  {degrees.map((pc) => {
                    const w = masteryWord(progress.stats, pc);
                    const dim = w === 'Wobbly' || w === 'Fuzzy' || w === 'Not met yet';
                    return (
                      <span key={pc} className="chip" style={{ background: degreeColor(pc), opacity: dim ? 0.55 : 1 }}>
                        {label(pc)}
                      </span>
                    );
                  })}
                </div>
                <div className="muted" style={{ fontSize: 20 }}>
                  {wobbly.length === 0 ? 'All solid so far' : `${wobbly.map(label).join(', ')} still wobbly`}
                </div>
              </div>
              <div className="panel col" style={{ padding: 18, gap: 8 }}>
                <div className="lbl" style={{ fontSize: 9 }}>NEXT UNLOCK</div>
                <div style={{ fontSize: 24, lineHeight: 1.1 }}>{nextUnlock ? nextUnlock.name : 'Everything is open'}</div>
                <TakePips takes={takes} slots={WINDOW} big label={`${clean} clean of your last ${takes.length} takes`} />
                <div className="muted" style={{ fontSize: 20 }}>
                  {clean >= GATE ? 'Gate open.' : `${clean} of your last ${WINDOW} clean. ${GATE} opens the gate.`}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <footer className="footer">
        <span>Sound before theory · function before intervals · imagine before playing</span>
        <span>
          {nights} night{nights === 1 ? '' : 's'} played · {progress.stats.cleanRuns} clean runs
        </span>
      </footer>
    </>
  );
}

function Li({ n, bg, children }: { n: string; bg: string; children: React.ReactNode }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span
        className="ps"
        style={{
          fontSize: 10,
          width: 28,
          height: 28,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: bg,
          color: 'var(--night)',
          border: '3px solid var(--ink)',
          flexShrink: 0,
        }}
      >
        {n}
      </span>
      {children}
    </li>
  );
}
