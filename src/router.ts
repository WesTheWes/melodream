import { useEffect, useState } from 'react';

export type Screen = 'home' | 'play' | 'territory' | 'map' | 'saved';

const VALID: Screen[] = ['home', 'play', 'territory', 'map', 'saved'];

function fromHash(): Screen {
  const h = window.location.hash.replace(/^#\/?/, '') as Screen;
  return VALID.includes(h) ? h : 'home';
}

export function useScreen(): [Screen, (s: Screen) => void] {
  const [screen, setScreen] = useState<Screen>(fromHash);
  useEffect(() => {
    const onHash = () => setScreen(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = (s: Screen) => {
    window.location.hash = `/${s}`;
    setScreen(s);
    window.scrollTo(0, 0);
  };
  return [screen, go];
}
