import { Header } from './components/Header';
import { useScreen } from './router';
import { Home } from './screens/Home';
import { Play } from './screens/Play';
import { Saved } from './screens/Saved';
import { Territory } from './screens/Territory';
import { TonalMap } from './screens/TonalMap';
import { StoreProvider, useStore } from './state/store';

function Shell() {
  const [screen, go] = useScreen();
  const { progress } = useStore();
  const nights = progress.days.length;
  return (
    <div className="app">
      <Header
        screen={screen}
        go={go}
        right={
          screen !== 'play' ? (
            <span className="row" style={{ gap: 12, fontSize: 22 }}>
              <svg className="px" width="24" height="24" viewBox="0 0 12 12" aria-hidden="true">
                <rect x="5" y="0" width="2" height="3" fill="#FF9F68" />
                <rect x="3" y="3" width="6" height="2" fill="#FF9F68" />
                <rect x="2" y="5" width="8" height="4" fill="#FFD166" />
                <rect x="4" y="9" width="4" height="2" fill="#FFD166" />
              </svg>
              <span>
                {nights} night{nights === 1 ? '' : 's'} played
              </span>
            </span>
          ) : null
        }
      />
      {screen === 'home' && <Home go={go} />}
      {screen === 'play' && <Play go={go} />}
      {screen === 'territory' && <Territory go={go} />}
      {screen === 'map' && <TonalMap go={go} />}
      {screen === 'saved' && <Saved go={go} />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
