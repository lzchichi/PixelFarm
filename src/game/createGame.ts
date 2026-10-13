import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { FarmScene } from './scenes/FarmScene';
import { UIScene } from './scenes/UIScene';
import { TownScene } from './scenes/TownScene';
import { GAME_WIDTH, GAME_HEIGHT, getIntegerScale } from './viewport';

export function createGame(parent: HTMLElement): Phaser.Game {
  const viewport = parent.parentElement;
  if (!viewport) throw new Error('缺少游戏窗口容器');
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#18382e',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    antialiasGL: false,
    render: { pixelArt: true, roundPixels: true, antialias: false, antialiasGL: false },
    scale: { mode: Phaser.Scale.NONE, width: GAME_WIDTH, height: GAME_HEIGHT, zoom: 1, autoCenter: Phaser.Scale.NO_CENTER },
    scene: [BootScene, MenuScene, FarmScene, TownScene, UIScene],
    audio: { noAudio: true },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, fixedStep: true, fps: 60, debug: false } },
  });
  const resize = (): void => {
    const zoom = getIntegerScale(viewport.clientWidth, viewport.clientHeight);
    parent.style.width = `${GAME_WIDTH * zoom}px`;
    parent.style.height = `${GAME_HEIGHT * zoom}px`;
    parent.style.setProperty('--game-zoom', String(zoom));
    game.scale.setZoom(zoom);
  };
  const observer = new ResizeObserver(resize);
  game.events.once(Phaser.Core.Events.READY, () => {
    game.canvas.setAttribute('aria-label', '青芽农场像素画面');
    game.canvas.tabIndex = 0;
    observer.observe(viewport);
    resize();
  });
  game.events.once(Phaser.Core.Events.DESTROY, () => observer.disconnect());
  return game;
}
