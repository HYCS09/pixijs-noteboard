import { Point } from 'pixi.js';
import { Box } from './type';

export function copyPoint(point: Point) {
  const { x, y } = point;
  return new Point(x, y);
}

// AABB碰撞检测
export function AABBRectTest(box1: Box, box2: Box) {
  if (box1.tl.y > box2.br.y) {
    return false;
  }
  if (box1.tl.x > box2.br.x) {
    return false;
  }
  if (box2.tl.y > box1.br.y) {
    return false;
  }
  if (box2.tl.x > box1.br.x) {
    return false;
  }
  return true;
}
