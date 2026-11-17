import { GameApp } from './app/GameApp';
import { Showcase } from './ui';

export default function App() {
  const isShowcase =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('showcase') === '1';

  return isShowcase ? <Showcase /> : <GameApp />;
}
