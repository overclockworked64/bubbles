import * as _ from 'lodash';
import { PLAYGROUND_WIDTH, PLAYGROUND_HEIGHT, SCALE, Color } from "./index";

export class Vec2 {
  constructor(public x: number, public y: number) {}

  public add(vector: Vec2): Vec2 {
    return new Vec2(this.x + vector.x, this.y + vector.y);
  }

  public sub(vector: Vec2): Vec2 {
    return new Vec2(this.x - vector.x, this.y - vector.y);
  }

  public scalarMul(scalar: number): Vec2 {
    return new Vec2(this.x * scalar, this.y * scalar);
  }

  public scalarDiv(scalar: number): Vec2 {
    return new Vec2(this.x / scalar, this.y / scalar);
  }

  public length(): number {
    return Math.hypot(this.x, this.y);
  }
}

export type BubbleGrid = Record<string, Color | null>;

export function createBubbleGrid(): BubbleGrid {
  const bubbleGrid: BubbleGrid = {};

  for (let row = 0; row < PLAYGROUND_HEIGHT; row++) {
    for (let col = 0; col < PLAYGROUND_WIDTH; col++) {
      const offset = row % 2 !== 0 ? 0.5 : 0;
      const index = coords2Key(
        new Vec2(
          col + offset - PLAYGROUND_WIDTH / 2,
          -row + PLAYGROUND_HEIGHT
        )
      );
      
      bubbleGrid[index] = row < 5 ? pickRandomColor() : null;
    }
  }
  return bubbleGrid;
}

export function math2Canvas(vector: Vec2): Vec2 {
  return new Vec2(
    (2 * SCALE) * (vector.x + (PLAYGROUND_WIDTH / 2)),
    (2 * SCALE) * (-vector.y + PLAYGROUND_HEIGHT),
  );
}

export function canvas2Math(vector: Vec2): Vec2 {
  const convertedCoord = new Vec2(
    vector.x / (2 * SCALE) - PLAYGROUND_WIDTH / 2,
    -vector.y / (2 * SCALE) + PLAYGROUND_HEIGHT,
  );
  return convertedCoord;
}

export function key2Coords(index: string): Vec2 {
  const [x, y] = index.split(' ').map(c => parseFloat(c));
  return new Vec2(x, y);
}

export function coords2Key(coord: Vec2): string {
  return `${coord.x} ${coord.y}`;
}

export function pickRandomColor() {
  return _.sample(Object.values(Color)) as Color;
}
