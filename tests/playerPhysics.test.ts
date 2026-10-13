import { describe, expect, it } from 'vitest';
import World from 'phaser/src/physics/arcade/World';
import Body from 'phaser/src/physics/arcade/Body';
import StaticBody from 'phaser/src/physics/arcade/StaticBody';
import { applyPlayerMotion, hasPlayerMoved } from '../src/domain/playerMotion';
import { parseFarmMap } from '../src/data/farmMap';
import mapJson from '../public/assets/maps/farm.json';

function setup(x = 100, y = 100, height = 640, width = 960) {
  const world = new World({ sys: { scale: { width, height } } }, { gravity: { x: 0, y: 0 } });
  const body = new Body(world);
  body.setSize(24, 28); body.position.set(x - 12, y - 14); body.updateCenter();
  body.setCollideWorldBounds(true); world.add(body);
  const obstacle = (x: number, y: number, width: number, height: number): void => {
    const wall = new StaticBody(world);
    wall.setSize(width, height); wall.position.set(x, y); wall.updateCenter(); world.add(wall);
    world.addCollider(body, wall);
  };
  const advance = (): void => { for (let i = 0; i < 6; i++) world.step(1 / 60); };
  return { world, body, obstacle, advance };
}

describe('real Arcade player physics', () => {
  it('constrains the migrated 1920×1280 world, including a high starting position', () => {
    const { body, advance } = setup(1908, 1266, 1280, 1920);
    applyPlayerMotion(body, { x: 1, y: 1 }, 0.1); advance();
    expect(body.center).toMatchObject({ x: 1908, y: 1266 });
    applyPlayerMotion(body, { x: -1, y: -1 }, 0.1); advance();
    expect(body.center.x).toBeLessThan(1908); expect(body.center.y).toBeLessThan(1266);
  });
  it('moves at 160 px/s and stops against obstacles without teleporting', () => {
    const { body, obstacle, advance } = setup();
    applyPlayerMotion(body, { x: 1, y: 0 }, 0.1); advance();
    expect(body.center.x).toBeCloseTo(116); expect(body.center.y).toBe(100);
    expect(hasPlayerMoved({ x: 100, y: 100 }, body.center)).toBe(true);
    obstacle(128, 80, 40, 40);
    const previous = { x: body.center.x, y: body.center.y };
    applyPlayerMotion(body, { x: 1, y: 0 }, 0.1); advance();
    expect(body.center.x).toBeCloseTo(116); expect(body.center.y).toBe(100);
    expect(hasPlayerMoved(previous, body.center)).toBe(false);
  });
  it('normalizes diagonal speed and obeys all four world edges', () => {
    const { body, advance } = setup();
    applyPlayerMotion(body, { x: 1, y: 1 }, 0.1); advance();
    expect(Math.hypot(body.center.x - 100, body.center.y - 100)).toBeCloseTo(16);
    for (const [x, y, dx, dy] of [[948, 626, 1, 1], [12, 14, -1, -1]]) {
      body.position.set(x! - 12, y! - 14); body.updateCenter();
      applyPlayerMotion(body, { x: dx!, y: dy! }, 0.1); advance();
      expect(body.center.x).toBe(x); expect(body.center.y).toBe(y);
    }
  });
  it('stops on invalid elapsed time or blocked UI input', () => {
    const { body, advance } = setup();
    for (const seconds of [-1, NaN, Infinity]) { applyPlayerMotion(body, { x: 1, y: 0 }, seconds); advance(); }
    expect(body.center.x).toBe(100);
    applyPlayerMotion(body, { x: 1, y: 1 }, 0.1, true); advance();
    expect(body.center).toMatchObject({ x: 100, y: 100 });
  });
  it('slides along a thin fence and cannot cross generated map obstacles', () => {
    const map = parseFarmMap(mapJson);
    for (const rect of map.collisions) {
      const { body, obstacle, advance } = setup(rect.x - 20, rect.y + rect.height / 2, map.height * map.tileSize, map.width * map.tileSize);
      obstacle(rect.x, rect.y, rect.width, rect.height);
      for (let i = 0; i < 10; i++) { applyPlayerMotion(body, { x: 1, y: 0 }, 0.1); advance(); }
      expect(body.right).toBeLessThanOrEqual(rect.x + 0.001);
    }
    const { body, obstacle, advance } = setup(100, 100);
    obstacle(116, 50, 8, 200);
    for (let i = 0; i < 10; i++) { applyPlayerMotion(body, { x: 1, y: 1 }, 0.1); advance(); }
    expect(body.right).toBeLessThanOrEqual(116.001); expect(body.center.y).toBeGreaterThan(200);
  });
});
