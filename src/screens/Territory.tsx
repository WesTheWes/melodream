import { useRef, useState } from 'react';
import { Lock, Stars } from '../components/Mascot';
import { GATE, HARMONY_STAGES, STAGES, WINDOW, isHarmony, stageById, stageCode, type Stage } from '../music/stages';
import { WorldScene } from '../components/WorldScene';
import { DEV_ALLOWED } from '../dev';
import { cleanCount, useStore } from '../state/store';
import type { Screen } from '../router';

const HOME_LONG = { major: 'MAJOR HOME', minor: 'MINOR HOME', both: 'MAJOR & MINOR HOMES' };

export function Territory({ go }: { go: (s: Screen) => void }) {
  const { progress, dispatch, isUnlocked, highestUnlocked, dev } = useStore();
  const [sel, setSel] = useState(progress.stageId);
  // The details panel is docked to the bottom of the screen on wide layouts.
  // On phones it sits in the flow, so scroll it into view when a tile is picked.
  const detailRef = useRef<HTMLElement | null>(null);
  const pick = (id: number) => {
    setSel(id);
    if (window.matchMedia('(max-width: 640px)').matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    }
  };
  const s = stageById(sel);
  const open = isUnlocked(s.id);
  const cleared = progress.cleared.filter((id) => !isHarmony(stageById(id))).length;
  const pathsCleared = progress.cleared.filter((id) => isHarmony(stageById(id))).length;
  // Open without free roam? (Free roam opens everything for testing.)
  const earned = (st: Stage) =>
    isHarmony(st) ? st.after != null && (progress.cleared.includes(st.after) || highestUnlocked > st.after) : st.id <= highestUnlocked;
  const harmony = isHarmony(s);
  const minorOpen = isUnlocked(4);

  const tile = (st: Stage) => {
            const unlocked = isUnlocked(st.id);
            const done = progress.cleared.includes(st.id);
            const current = st.id === progress.stageId;
            const takes = progress.recent[String(st.id)] ?? [];
            const clean = cleanCount(progress, st.id);
            const badge = done ? 'CLEAR' : current ? 'NOW' : unlocked ? (dev && !earned(st) ? 'DEV' : 'OPEN') : 'LOCKED';
            const badgeBg = done || current ? 'var(--cream)' : badge === 'DEV' ? 'var(--pink)' : unlocked ? 'var(--cream)' : 'var(--night)';
            return (
              <button
                key={st.id}
                type="button"
                className={'tile' + (unlocked ? '' : ' locked') + (sel === st.id ? ' sel' : '')}
                style={{ background: unlocked ? st.color : undefined }}
                onClick={() => pick(st.id)}
                aria-label={`${isHarmony(st) ? 'Progression path' : 'Territory'} ${stageCode(st)}, ${st.name}, ${badge.toLowerCase()}`}
              >
                <div className="tile-art">
                  <WorldScene stageId={st.id} />
                </div>
                <div className="row between" style={{ gap: 6 }}>
                  <span className="num">{stageCode(st)}</span>
                  <span className="tbadge" style={{ background: badgeBg, color: unlocked ? 'var(--night)' : 'var(--dim)' }}>
                    {badge}
                  </span>
                </div>
                <div className="name">{st.name}</div>
                <div className="blurb">{st.blurb}</div>
                <div className="row" style={{ gap: 6, marginTop: 'auto' }}>
                  <span
                    className="ps"
                    style={{
                      fontSize: 7,
                      padding: '4px 5px',
                      border: '2px solid var(--ink)',
                      background: unlocked ? 'var(--night)' : 'var(--night)',
                      color: unlocked ? 'var(--cream)' : 'var(--dim)',
                    }}
                  >
                    {isHarmony(st) ? st.progressions?.[0] : st.home.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 17, opacity: 0.85 }}>
                    {done ? 'cleared' : `${clean}/${WINDOW} clean`}
                  </span>
                </div>
                <div className="minipips" aria-hidden="true">
                  {Array.from({ length: WINDOW }, (_, i) => (
                    <span
                      key={i}
                      className="minipip"
                      style={{
                        background: done || takes[i] ? (unlocked ? 'var(--night)' : '#8E86B8') : takes[i] === false ? 'var(--pink)' : unlocked ? 'rgba(255,247,230,.45)' : 'var(--night)',
                      }}
                    />
                  ))}
                </div>
              </button>
            );
          };

  return (
    <>
      <Stars />
      <main className="main">
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <h1 style={{ fontSize: 15 }}>Ten territories. 8 clean takes out of your last 10 opens each gate.</h1>
          <span className="muted" style={{ fontSize: 20 }}>
            {cleared} of 10 cleared{dev ? ' · free roam lets you jump anywhere' : ''}
          </span>
        </div>

        <div className="row" style={{ gap: 12 }}>
          <span className="muted" style={{ fontSize: 20 }}>Homes you can hear:</span>
          <span className="badge" style={{ background: 'var(--gold)' }}>MAJOR</span>
          <span className={'badge' + (minorOpen ? '' : ' locked')} style={minorOpen ? { background: 'var(--violet)' } : undefined}>
            MINOR{minorOpen ? '' : ' · T4'}
          </span>
          {DEV_ALLOWED && (
            <button
              type="button"
              className={'toggle danger' + (dev ? ' on' : '')}
              onClick={() => dispatch({ type: 'toggleDev' })}
              aria-pressed={dev}
            >
              {dev ? 'DEV: FREE ROAM ON' : 'DEV: FREE ROAM'}
            </button>
          )}
        </div>

        <div className="tiles">{STAGES.map(tile)}</div>

        <div className="row between" style={{ alignItems: 'baseline', marginTop: 8 }}>
          <h2 style={{ fontSize: 13 }}>Progression Paths: licks over chord changes</h2>
          <span className="muted" style={{ fontSize: 20 }}>
            {pathsCleared} of {HARMONY_STAGES.length} cleared · each opens off the main road
          </span>
        </div>
        <div className="tiles">{HARMONY_STAGES.map(tile)}</div>

        <section ref={detailRef} className="panel row detail-dock" aria-live="polite" style={{ background: open ? s.color : 'var(--muted)', color: 'var(--night)', alignItems: 'flex-start', gap: 20, padding: '16px 20px' }}>
          <div className={'panel-art' + (open ? '' : ' dim')}>
            <WorldScene stageId={s.id} label={`${s.name}, pixel scene`} />
          </div>
          <div className="col" style={{ flex: '2 1 420px', minWidth: 0, gap: 10 }}>
            <div className="lbl" style={{ color: 'var(--night)', opacity: 0.7, fontSize: 9 }}>
              {harmony ? 'PROGRESSION PATH' : 'TERRITORY'} {stageCode(s)} · {HOME_LONG[s.home]}
            </div>
            <h2 style={{ fontSize: 18, color: 'var(--night)' }}>{s.name}</h2>
            <p style={{ fontSize: 23 }}>{s.desc}</p>
            {harmony && (
              <div className="row" style={{ gap: 6 }}>
                <span className="ps" style={{ fontSize: 8, opacity: 0.7, marginRight: 4 }}>CHANGES</span>
                {s.progressions?.map((pr) => (
                  <span key={pr} className="chip" style={{ background: 'var(--cream)' }}>
                    {pr}
                  </span>
                ))}
              </div>
            )}
            <div className="row" style={{ gap: 6 }}>
              <span className="ps" style={{ fontSize: 8, opacity: 0.7, marginRight: 4 }}>NOTES IN PLAY</span>
              {(s.home === 'minor' ? s.available.minor : s.available.major).map((pc) => (
                <span key={pc} className="chip" style={{ background: 'var(--cream)' }}>
                  {['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'][pc]}
                </span>
              ))}
              {s.home === 'both' && (
                <span style={{ fontSize: 19, opacity: 0.8 }}>
                  + minor: {s.available.minor.map((pc) => ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'][pc]).join(' ')}
                </span>
              )}
            </div>
          </div>
          <div className="col" style={{ flex: '1 1 280px', minWidth: 0, gap: 10 }}>
            <div>
              <div className="ps" style={{ fontSize: 8, opacity: 0.7, marginBottom: 4 }}>UNLOCKS</div>
              <div style={{ fontSize: 21 }}>{s.unlocks}</div>
            </div>
            <div style={{ borderTop: '3px dashed var(--ink)', paddingTop: 10, fontSize: 21 }}>
              {progress.cleared.includes(s.id)
                ? `Done. ${GATE} of ${WINDOW} clean, every note nailed.`
                : open
                  ? !earned(s)
                    ? 'Free roam: gate bypassed for testing.'
                    : `${cleanCount(progress, s.id)} clean of your last ${WINDOW}. Get to ${GATE} to ${harmony ? 'clear this path' : 'open the next gate'}.`
                  : harmony
                    ? `Opens when you clear ${stageById(s.after ?? 1).name} on the main road.`
                    : `Needs ${GATE} of ${WINDOW} clean in ${STAGES[s.id - 2]?.name ?? 'the previous territory'}.`}
            </div>
            {open ? (
              <button
                type="button"
                className="btn ink"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => {
                  dispatch({ type: 'setStage', stageId: s.id });
                  go('play');
                }}
              >
                {progress.cleared.includes(s.id) ? 'Revisit' : s.id === progress.stageId ? 'Continue' : !earned(s) ? 'Jump in (dev)' : 'Enter'}
              </button>
            ) : (
              <div className="row" style={{ gap: 12, fontSize: 21 }}>
                <Lock />
                Locked. Clear the territory before it to open this one.
              </div>
            )}
          </div>
        </section>
        <p className="muted" style={{ fontSize: 20 }}>
          A clean take is a full lick with every pitch right on the first try. The gate looks at your last 10 counted takes: a miss costs one spot, not everything. Retries and color-hint takes never count. 8 of 10 is hard to fluke.
        </p>
      </main>
    </>
  );
}
