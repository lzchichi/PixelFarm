import type { Point } from './GameState';

interface VelocityBody { setVelocity(x: number, y: number): unknown }
export function hasPlayerMoved(previous: Point, current: Point): boolean {
  return Math.hypot(current.x - previous.x, current.y - previous.y) > 0.01;
}
export function applyPlayerMotion(body: VelocityBody, direction: Point, seconds: number, blocked = false): void {
  const length = Math.hypot(direction.x, direction.y);
  if (blocked || !Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(length) || length === 0) {
    body.setVelocity(0, 0); return;
  }
  body.setVelocity(direction.x / length * 160, direction.y / length * 160);
}
