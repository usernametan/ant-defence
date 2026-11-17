import { Showcase } from './ui';

export default function App() {
  const isShowcase =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('showcase') === '1';

  if (isShowcase) {
    return <Showcase />;
  }

  return (
    <main className="game-root">
      <div className="placeholder">
        <h1>Zone Control</h1>
        <p>Top-down arena shooter — foundation in progress.</p>
      </div>
    </main>
  );
}
