import * as _ from 'lodash';

const SCALE = 10;
const RADIUS = 1;
const PLAYGROUND_WIDTH = 40;
const PLAYGROUND_HEIGHT = 30;
const GUN_LENGTH = 5;
const CANVAS_WIDTH = (PLAYGROUND_WIDTH + 0.5) * 2 * RADIUS * SCALE;
const CANVAS_HEIGHT = PLAYGROUND_HEIGHT * 2 * RADIUS * SCALE;


enum Color {
  Orange = '#f80',
  White = '#ffffff',
  Blue = '#36C1D4',
}

enum Direction {
  Left,
  Right,
}

type BubbleGrid = {
  [key: string]: Color;
};

type Matrix = number[][];

const MATRIX_ROTATE_COUNTERCLOCKWISE: Matrix = [
  [Math.cos(Math.PI / 90), Math.sin(Math.PI / 90)],
  [-Math.sin(Math.PI / 90), Math.cos(Math.PI / 90)],
];

const MATRIX_ROTATE_CLOCKWISE: Matrix = [
  [Math.cos(Math.PI / 90), -Math.sin(Math.PI / 90)],
  [Math.sin(Math.PI / 90), Math.cos(Math.PI / 90)],
];

class Vec2D {
  public x: number;
  public y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public toXY(): [number, number] {
    return [this.x, this.y];
  }

  public add(vector: Vec2D): Vec2D {
    return new Vec2D(this.x + vector.x, this.y + vector.y);
  }

  public sub(vector: Vec2D): Vec2D {
    return new Vec2D(this.x - vector.x, this.y - vector.y);
  }

  public scalarMul(scalar: number): Vec2D {
    return new Vec2D(this.x * scalar, this.y * scalar);
  }

  public scalarDiv(scalar: number): Vec2D {
    return new Vec2D(this.x / scalar, this.y / scalar);
  }

  public length(): number {
    return Math.hypot(this.x, this.y);
  }
}

class BubbleShooter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private grid: BubbleGrid;
  private gun: Vec2D;
  private bullet: Vec2D;
  private bulletColor: Color;

  private time: number;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;

    this.setCanvasSize(this.canvas);
    this.setCanvasColor(this.canvas);
    this.outlineCanvas(this.canvas);

    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    this.grid = this.createBubbleGrid();
    this.gun = this.createGun();
    this.bullet = this.createBullet();
    this.bulletColor = this.pickBulletColor();
    this.time = 0;

    this.drawBubbles();
    this.drawGun();
    this.drawBullet();
  }

  public rotateGun(direction: Direction) {
    this.gun = this.rotate(this.gun, direction);
  }

  public reDraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBubbles();
    this.drawGun();
    this.drawBullet();
  }

  private landBullet() {
    let [x, y] = this.bullet.toXY().map(c => Math.round(c));
    const wantedLandingPosition = this.coord2Index(new Vec2D(x + (y % 2 !== 0 ? 0.5 : 0), y));
    this.grid[wantedLandingPosition] = this.bulletColor;
  }

  public fireBullet() {
    if (this.bulletIsAboutToCollide()) {
      this.landBullet();
      this.newRound();
      
      return;
    }

    let directionVector = this.gun.sub(new Vec2D(0, 0));
    directionVector = directionVector.scalarDiv(directionVector.length());

    this.bullet = this.math2Game(new Vec2D(0, 0).add(directionVector.scalarMul(this.time)));
    
    setTimeout(() => {
      this.time += 1;
      this.reDraw(); 
      this.fireBullet();
    }, 10);
  }

  private newRound() {
    this.bullet = this.createBullet();
    this.bulletColor = this.pickBulletColor();
    this.time = 0;
    this.reDraw();
  }

  private bulletIsAboutToCollide(): boolean {
    for (const bubble of Object.keys(this.grid)) {
      const bubbleCoords = this.index2Coord(bubble);

      if (bubbleCoords.sub(this.bullet).length() < 1) {
        return true;
      }
    }
    return false;
  }

  private setCanvasSize(canvas: HTMLCanvasElement) {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
  }

  private setCanvasColor(canvas: HTMLCanvasElement) {
    canvas.style.background = '#0f0f23';
  }

  private outlineCanvas(canvas: HTMLCanvasElement) {
    canvas.style.border = '3px solid black';
  }

  private createBubbleGrid(): BubbleGrid {
    const bubbleGrid: BubbleGrid = {};

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < PLAYGROUND_WIDTH; col++) {
        const offset = row % 2 !== 0 ? 0.5 : 0;
        const index = this.coord2Index(new Vec2D(col + offset, row));
        
        bubbleGrid[index] = this.pickBulletColor();
      }
    }

    return bubbleGrid;
  }

  private createGun(): Vec2D {
    return new Vec2D(0, 1);
  }

  private createBullet(): Vec2D {
    return new Vec2D(PLAYGROUND_WIDTH / 2, PLAYGROUND_HEIGHT - 0.5);
  }

  private pickBulletColor() {
    return _.sample(Object.values(Color)) as Color;
  }

  private drawBubbles() {
    for (const [coord, color] of Object.entries(this.grid)) {
      const c = this.index2Coord(coord);
      const gamifiedCoords = this.game2Canvas(new Vec2D(c.x, c.y));
          
      this.ctx.beginPath();
      this.ctx.arc(
        gamifiedCoords.x + RADIUS * SCALE,
        gamifiedCoords.y + RADIUS * SCALE,
        RADIUS * SCALE,
        0, 2 * Math.PI,
      );
      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.closePath();
    }
  }

  private drawGun() {
    const initialPosition = this.math2Canvas(new Vec2D(0, 0));
    const gunPosition = this.math2Canvas(this.gun.scalarMul(5));
        
    this.ctx.beginPath();
    this.ctx.moveTo(initialPosition.x, initialPosition.y);
    this.ctx.lineTo(gunPosition.x, gunPosition.y);
    this.ctx.strokeStyle = Color.White;
    this.ctx.stroke();
    this.ctx.closePath();
  }

  private drawBullet() {
    const bulletCoords = this.game2Canvas(this.bullet);

    this.ctx.beginPath();
    this.ctx.arc(
      bulletCoords.x,
      bulletCoords.y,
      SCALE * RADIUS,
      0, 2 * Math.PI
    );
    this.ctx.fillStyle = this.bulletColor;
    this.ctx.fill();
    this.ctx.closePath();
  }

  private math2Canvas(vector: Vec2D): Vec2D {
    return new Vec2D(
      (2 * SCALE) * (vector.x + (PLAYGROUND_WIDTH / 2)),
      (2 * SCALE) * (-vector.y + (PLAYGROUND_HEIGHT - 0.5)),
    );
  }

  private math2Game(vector: Vec2D): Vec2D {
    return new Vec2D(
      vector.x + (PLAYGROUND_WIDTH / 2),
      -vector.y + (PLAYGROUND_HEIGHT - 0.5),
    );
  }

  private game2Canvas(vector: Vec2D): Vec2D {
    return new Vec2D(
      2 * SCALE * vector.x,
      2 * SCALE * vector.y, 
    );
  }

  private coord2Index(coord: Vec2D): string {
    return `${coord.x} ${coord.y}`;
  }

  private index2Coord(index: string): Vec2D {
    const [x, y] = index.split(' ').map(c => parseFloat(c));
    return new Vec2D(x, y);
  }

  private matrixVectorMul(matrix: Matrix, vector: Vec2D): Vec2D {
    const [col1, col2] = matrix;
    const rotatedCol1 = col1.map(coord => coord * vector.x);
    const rotatedCol2 = col2.map(coord => coord * vector.y);
  
    return new Vec2D(
      rotatedCol1[0] + rotatedCol2[0],
      rotatedCol1[1] + rotatedCol2[1]
    );
  }

  private rotate(point: Vec2D, direction: Direction): Vec2D {
    let matrix: Matrix;

    switch (direction) {
    case Direction.Left:
      matrix = MATRIX_ROTATE_COUNTERCLOCKWISE;
      break;
    case Direction.Right:
      matrix = MATRIX_ROTATE_CLOCKWISE;
      break;
    }

    return this.matrixVectorMul(matrix, point);
  }
}

const main = () => {
  const game = new BubbleShooter();
  document.addEventListener('keydown', (event) => {
    switch (event.code) {
    case 'ArrowLeft':
      game.rotateGun(Direction.Left);
      game.reDraw();
      break;
    case 'ArrowRight':
      game.rotateGun(Direction.Right);
      game.reDraw();
      break;
    case 'Space':
      game.fireBullet();
      break;
    }
  });
};

document.addEventListener('DOMContentLoaded', main);
