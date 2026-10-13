import type { InteractionObject } from '../data/farmMap';
import type { Point, Rectangle } from './GameState';

export type Direction = 'up' | 'down' | 'left' | 'right';
const inside = (point: Point, rect: Rectangle): boolean => point.x > rect.x && point.x < rect.x + rect.width && point.y > rect.y && point.y < rect.y + rect.height;
export function findInteraction(position: Point, direction: Direction, objects: readonly InteractionObject[], obstacles: readonly Rectangle[]): InteractionObject | undefined {
  const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
  const lateral = axis === 'x' ? 'y' : 'x';
  const sign = direction === 'up' || direction === 'left' ? -1 : 1;
  let selected: InteractionObject | undefined; let nearest = Infinity;
  for (const object of objects) {
    const target = { x: Math.max(object.x, Math.min(position.x, object.x + object.width)), y: Math.max(object.y, Math.min(position.y, object.y + object.height)) };
    const forward = (target[axis] - position[axis]) * sign;
    if (forward < 0 || forward > 32 || Math.abs(target[lateral] - position[lateral]) > 16) continue;
    const distance = Math.hypot(target.x - position.x, target.y - position.y);
    const steps = Math.ceil(distance / 2); let occluded = false;
    for (let step = 1; step < steps; step++) {
      const point = { x: position.x + (target.x - position.x) * step / steps, y: position.y + (target.y - position.y) * step / steps };
      if (!inside(point, object) && obstacles.some((obstacle) => inside(point, obstacle))) { occluded = true; break; }
    }
    if (!occluded && distance < nearest) { selected = object; nearest = distance; }
  }
  return selected;
}
