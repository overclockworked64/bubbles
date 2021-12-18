import * as _ from "lodash";

const SCALE = 10;
const RADIUS = 1;
const PLAYGROUND_WIDTH = 40;
const PLAYGROUND_HEIGHT = 30;

enum Color {
  Red = "red",
  Green = "green",
  Blue = "blue",
  Yellow = "yellow",
}

type BubbleGrid = {
  [key: string]: Color;
};

class Vec2D {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}


class BubbleShooter {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  grid: BubbleGrid;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;

    this.setCanvasSize(this.canvas);
    this.outlineCanvas(this.canvas);

    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    this.grid = this.createBubbleGrid();
    this.drawBubbles();
  }

  private setCanvasSize(canvas: HTMLCanvasElement) {
    canvas.width = 800;
    canvas.height = 600;
  }

  private outlineCanvas(canvas: HTMLCanvasElement) {
    canvas.style.border = '3px solid black';
  }

  private createBubbleGrid(): BubbleGrid {
    let bubbleGrid: BubbleGrid = {};

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < PLAYGROUND_WIDTH; col++) {
        const offset = row % 2 !== 0 ? 0.5 : 0;
        const hashedCoords = this.coord2Index(new Vec2D(col + offset, row));
        
        bubbleGrid[hashedCoords] = _.sample(Object.keys(Color)) as Color;
      }
    }

    return bubbleGrid;
  }

  private drawBubbles() {
    for (const [coord, color] of Object.entries(this.grid)) {
      const c = this.index2Coord(coord);
      const gamifiedCoords = this.game2Canvas(new Vec2D(c.x, c.y));
          
      this.ctx.beginPath();
      this.ctx.arc(
        gamifiedCoords.x + c.x * SCALE, gamifiedCoords.y + c.y * SCALE,
        RADIUS * SCALE,
        0, 2 * Math.PI,
      );
      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.closePath;
    }
  }

  private game2Canvas(vector: Vec2D): Vec2D {
    return new Vec2D(
      SCALE * (vector.x + RADIUS),
      SCALE * (vector.y + RADIUS), 
    );
  }

  private coord2Index(coord: Vec2D): string {
    return `${coord.x} ${coord.y}`
  }

  private index2Coord(index: string): Vec2D {
    const [x, y] = index.split(' ').map(c => parseFloat(c));
    return new Vec2D(x, y);
  }
}

const main = () => {
  const game = new BubbleShooter();
};

document.addEventListener('DOMContentLoaded', main);
