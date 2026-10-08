import type { ReactNode } from 'react';
import type { Screen } from '../router';
import { useStore } from '../state/store';

export function Header({
  screen,
  go,
  right,
}: {
  screen: Screen;
  go: (s: Screen) => void;
  right?: ReactNode;
}) {
  const saved = useStore().progress.saved.length;
  const Nav = ({ to, label }: { to: Screen; label: string }) => (
    <button type="button" className={'navbtn' + (screen === to ? ' on' : '')} onClick={() => go(to)}>
      {label}
    </button>
  );
  return (
    <header className="hdr">
      <div className="hdr-left">
        <button type="button" className="brand" onClick={() => go('home')}>
          MELODREAM
        </button>
        <nav className="nav">
          <Nav to="play" label="PLAY" />
          <Nav to="territory" label="TERRITORY" />
          <Nav to="map" label="TONAL MAP" />
          <Nav to="saved" label={saved ? `SAVED · ${saved}` : 'SAVED'} />
        </nav>
      </div>
      <div className="hdr-right">{right}</div>
    </header>
  );
}

// The gate window: one square per recent counted take, oldest first.
// Mint = clean, pink = miss, dark = not played yet.
export function TakePips({ takes, slots = 10, big = false, label }: { takes: boolean[]; slots?: number; big?: boolean; label?: string }) {
  const clean = takes.filter(Boolean).length;
  return (
    <div className={'pips' + (big ? ' big' : '')} role="img" aria-label={label ?? `${clean} clean of the last ${takes.length} takes`}>
      {Array.from({ length: slots }, (_, i) => (
        <span key={i} className={'pip' + (i < takes.length ? (takes[i] ? ' on' : ' miss') : '')} />
      ))}
    </div>
  );
}

export const PHASES = ['HOME', 'HEAR', 'START', 'IMAGINE', 'PLAY', 'FEEDBACK'] as const;

export function Stepper({ phase }: { phase: number }) {
  return (
    <ol className="stepper" aria-label="Loop progress">
      {PHASES.map((p, i) => (
        <li key={p} className={'step' + (i === phase ? ' on' : i < phase ? ' done' : '')}>
          {p}
        </li>
      ))}
    </ol>
  );
}
