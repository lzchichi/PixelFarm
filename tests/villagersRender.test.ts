import { it, expect } from 'vitest';
import type Phaser from 'phaser';
import { Villagers } from '../src/game/entities/Villagers';
import { createGameState } from '../src/domain/GameState';
it('creates villagers only after the scene exists and updates all schedule targets', () => {
  const displayed: { x: number; y: number }[] = [];
  function display() {
    const object = { x:0,y:0,setOrigin:()=>object,setDepth:()=>object,setPosition:(x:number,y:number)=>{object.x=x;object.y=y;return object;} };
    displayed.push(object); return object;
  }
  // Minimal rendering adapter double: the test exercises initialization, not Phaser internals.
  const scene = {add:{image:display,text:display}} as unknown as Phaser.Scene;
  const state=createGameState({x:0,y:0});
  const villagers=new Villagers(scene,state);const morning=villagers.update();
  expect(morning).toHaveLength(3);expect(displayed).toHaveLength(6);
  state.minute=840;const afternoon=villagers.update();
  expect(afternoon[0]?.x).not.toBe(morning[0]?.x);
});
