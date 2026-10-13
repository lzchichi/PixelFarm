import Phaser from 'phaser';
import { textures } from './palette';

// Only retain the existing player / menu-cloud placeholders. All supplied
// terrain, buildings, vegetation and decorations load from local PNG files.
// Ask the user before adding any new art absent from their supplied sheets.
export function generateTextures(scene: Phaser.Scene): void {
  const sheet = document.createElement('canvas'); sheet.width = 96; sheet.height = 96;
  const c = sheet.getContext('2d'); if (!c) throw new Error('无法加载现有玩家占位动画');
  c.imageSmoothingEnabled = false;
  for (let row = 0; row < 4; row++) for (let frame = 0; frame < 6; frame++) {
    c.save(); c.translate(frame * 16, row * 24);
    const stride = frame < 2 ? 0 : [0, 1, 0, -1][frame - 2] ?? 0;
    const bob = frame === 1 || frame === 3 || frame === 5 ? -1 : 0;
    c.fillStyle = '#425e3a'; c.fillRect(3, 22, 11, 2);
    c.fillStyle = '#413d36'; c.fillRect(5, 18, 3, 5 - stride); c.fillRect(9, 18, 3, 5 + stride);
    c.translate(0, bob);
    c.fillStyle = '#dfae79'; c.fillRect(4, 7, 9, 6); c.fillRect(2, 13 + stride, 2, 4); c.fillRect(13, 13 - stride, 2, 4);
    c.fillStyle = '#678d91'; c.fillRect(4, 12, 9, 8);
    c.fillStyle = '#a9bbb0'; c.fillRect(6, 12, 2, 6); c.fillRect(10, 12, 2, 6);
    c.fillStyle = '#584632'; c.fillRect(5, 6, 8, 2);
    if (row === 3) c.fillRect(4, 8, 9, 4);
    else if (row === 0) { c.fillRect(6, 9, 1, 1); c.fillRect(10, 9, 1, 1); }
    else c.fillRect(row === 1 ? 4 : 12, 9, 1, 1);
    c.fillStyle = '#e2ba69'; c.fillRect(4, 2, 9, 5); c.fillRect(1, 6, 15, 2);
    c.fillStyle = '#ad8050'; c.fillRect(4, 5, 9, 1);
    c.restore();
  }
  const canvasTexture = scene.textures.addCanvas(textures.playerSheet, sheet);
  if (!canvasTexture) throw new Error('无法注册玩家画布');
  const animated = scene.textures.addSpriteSheet(textures.playerSheet, canvasTexture, { frameWidth: 16, frameHeight: 24 });
  if (!animated) throw new Error('无法注册玩家动画');
  animated.setFilter(Phaser.Textures.FilterMode.NEAREST);
  const cloud = document.createElement('canvas'); cloud.width = 64; cloud.height = 20;
  const context = cloud.getContext('2d'); if (!context) throw new Error('无法加载现有云朵占位');
  context.fillStyle = '#f6eccd'; context.fillRect(4, 9, 55, 9); context.fillRect(12, 4, 20, 12); context.fillRect(29, 1, 20, 15);
  context.fillStyle = '#e7d9b7'; context.fillRect(8, 16, 47, 2);
  scene.textures.addCanvas(textures.cloud, cloud)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
}
