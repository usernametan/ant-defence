import { Suspense, lazy } from 'react';
import { GameApp } from './app/GameApp';

const DevShowcase = import.meta.env.DEV
  ? lazy(() => import('./ui/Showcase').then((m) => ({ default: m.Showcase })))
  : null;

export default function App() {
  const isShowcase =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('showcase') === '1';

  if (isShowcase && DevShowcase) {
    return (
      <Suspense fallback={null}>
        <DevShowcase />
      </Suspense>
    );
  }

  return <GameApp />;
}
