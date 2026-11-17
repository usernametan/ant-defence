import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { UIScene } from './game/scenes/UIScene';
import { VillageScene } from './game/scenes/VillageScene';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return undefined;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: 480,
      height: 270,
      backgroundColor: '#0d0b12',
      pixelArt: true,
      antialias: false,
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [BootScene, VillageScene, UIScene],
    });

    return () => {
      game.destroy(true);
    };
  }, []);

  return (
    <main className="game-root">
      <div ref={containerRef} className="phaser-stage" />
      <div className="ui-overlay" aria-live="polite" />
    </main>
  );
}
