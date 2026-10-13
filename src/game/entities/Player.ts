import Phaser from 'phaser';
import type { GameState } from '../../domain/GameState';
import type { Direction } from '../../domain/interaction';
import { applyPlayerMotion, hasPlayerMoved } from '../../domain/playerMotion';
import { textures } from '../assets/palette';

const keyNames = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'W', 'A', 'S', 'D', 'E'];
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  facing: Direction = 'down';
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
  private interactionPressed = false;
  private moving = false;

  constructor(scene: Phaser.Scene, private readonly gameState: GameState) {
    super(scene, gameState.player.x, gameState.player.y + 14, textures.playerSheet, 0);
    this.setOrigin(0.5, 1).setScale(2);
    scene.add.existing(this); scene.physics.add.existing(this);
    this.body.setSize(12, 14).setOffset(2, 10).setCollideWorldBounds(true);
    const keyboard = scene.input.keyboard; if (!keyboard) throw new Error('键盘输入初始化失败');
    this.keys = Object.fromEntries(keyNames.map((name) => [name, keyboard.addKey(name)]));
    (['down', 'left', 'right', 'up'] as const).forEach((direction, row) => {
      for (const mode of ['idle', 'walk'] as const) {
        const key = `player-${mode}-${direction}`;
        if (!scene.anims.exists(key)) scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(textures.playerSheet,
          { start: row * 6 + (mode === 'idle' ? 0 : 2), end: row * 6 + (mode === 'idle' ? 1 : 5) }), frameRate: mode === 'idle' ? 2 : 9, repeat: -1 });
      }
    });
    scene.events.on(Phaser.Scenes.Events.PRE_UPDATE, this.control, this);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.sync, this);
    const previous = { ...gameState.player };
    // WORLD_STEP fires after all separations. Preserve this result on render
    // frames without a physics step, avoiding animation flicker at high FPS.
    const measureMovement = (): void => {
      this.moving = hasPlayerMoved(previous, this.body.center);
      previous.x = this.body.center.x; previous.y = this.body.center.y;
    };
    const physicsWorld = scene.physics.world;
    physicsWorld.on(Phaser.Physics.Arcade.Events.WORLD_STEP, measureMovement);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.events.off(Phaser.Scenes.Events.PRE_UPDATE, this.control, this);
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.sync, this);
      // Arcade's earlier shutdown listener clears scene.physics.world.
      physicsWorld.off(Phaser.Physics.Arcade.Events.WORLD_STEP, measureMovement);
      keyboard.removeCapture(keyNames);
      for (const key of Object.values(this.keys)) keyboard.removeKey(key, true);
    });
  }

  private control(_time: number, delta: number): void {
    const down = (...names: string[]): boolean => names.some((name) => this.keys[name]?.isDown);
    const x = Number(down('RIGHT', 'D')) - Number(down('LEFT', 'A'));
    const y = Number(down('DOWN', 'S')) - Number(down('UP', 'W'));
    const blocked = this.scene.registry.get('uiBlocked') === true || document.hidden || document.activeElement instanceof HTMLButtonElement;
    if (!blocked) {
      if (x !== 0) this.facing = x < 0 ? 'left' : 'right';
      else if (y !== 0) this.facing = y < 0 ? 'up' : 'down';
    }
    applyPlayerMotion(this.body, { x, y }, delta / 1000, blocked);
    if (blocked || (x === 0 && y === 0)) this.moving = false;
    const interact = this.keys.E;
    this.interactionPressed = !!interact && Phaser.Input.Keyboard.JustDown(interact) && !blocked;
  }

  private sync(): void {
    this.gameState.player.x = this.body.center.x; this.gameState.player.y = this.body.center.y;
    this.setDepth(this.body.bottom);
    this.play(`player-${this.moving ? 'walk' : 'idle'}-${this.facing}`, true);
  }

  consumeInteraction(): boolean {
    const pressed = this.interactionPressed; this.interactionPressed = false; return pressed;
  }
}
