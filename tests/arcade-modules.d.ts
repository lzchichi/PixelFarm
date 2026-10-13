// Phaser's DOM-free physics modules expose the same bodies as its public API.
declare module 'phaser/src/physics/arcade/World' {
  import type Phaser from 'phaser';
  const World: new (scene: { sys: { scale: { width: number; height: number } } }, config: Phaser.Types.Physics.Arcade.ArcadeWorldConfig) => Phaser.Physics.Arcade.World;
  export default World;
}
declare module 'phaser/src/physics/arcade/Body' {
  import type Phaser from 'phaser';
  const Body: new (world: Phaser.Physics.Arcade.World) => Phaser.Physics.Arcade.Body;
  export default Body;
}
declare module 'phaser/src/physics/arcade/StaticBody' {
  import type Phaser from 'phaser';
  const Body: new (world: Phaser.Physics.Arcade.World) => Phaser.Physics.Arcade.StaticBody;
  export default Body;
}
