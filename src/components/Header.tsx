import type { ReactNode } from 'react';
import type { Screen } from '../router';

export function Header({
  screen,
  go,
  right,
}: {
  screen: Screen;
  go: (s: Screen) => void;
  right?: ReactNode;
}) {
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
        </nav>
      </div>
      <div className="hdr-right">{right}</div>
    </header>
  );
}

export function Pips({ value, max = 10, big = false, label }: { value: number; max?: number; big?: boolean; label?: string }) {
  return (
    <div className={'pips' + (big ? ' big' : '')} aria-label={label ?? `${value} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={'pip' + (i < value ? ' on' : '')} />
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
