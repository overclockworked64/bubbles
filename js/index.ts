import "./seed.js";
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
  [key: string]: Color | null;
};

type Matrix = number[][];

const MATRIX_ROTATE_COUNTERCLOCKWISE: Matrix = [
  [Math.cos(Math.PI / 360), Math.sin(Math.PI / 360)],
  [-Math.sin(Math.PI / 360), Math.cos(Math.PI / 360)],
];

const MATRIX_ROTATE_CLOCKWISE: Matrix = [
  [Math.cos(Math.PI / 360), -Math.sin(Math.PI / 360)],
  [Math.sin(Math.PI / 360), Math.cos(Math.PI / 360)],
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
  public gun: Vec2D;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private bubbles: BubbleGrid;
  private bullet: Vec2D;
  private bulletColor: Color;

  private time: number;

  private score: number;

  private wantedLandingPosition: Vec2D;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;

    this.setCanvasSize(this.canvas);
    this.setCanvasColor(this.canvas);
    this.outlineCanvas(this.canvas);

    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    
    this.bubbles = this.createBubbleGrid();
    this.gun = this.createGun();
    this.bullet = this.createBullet();
    this.bulletColor = this.pickBulletColor();
    this.time = 0;
    this.score = 0;
    this.wantedLandingPosition = new Vec2D(0, 0);

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
    /*
      We want to find a landing position for the bubble.
      
      If the bubble stopped at a clean spot, we do not need
      to do anything. However, the spot is occupied, we need
      to find a spot with the minimum distance from the spot
      where the bullet landed.
    */
    
    const distances: {
      [key: string]: number
    } = {};

    const potentialLandingPositions = this.getSurroundingBubbles(this.wantedLandingPosition);

    // Find free spots (i.e., where color is null)
    for (const [position, color] of Object.entries(potentialLandingPositions)) {
      const coord = this.key2Coord(position);
      const distanceVector = coord.sub(this.wantedLandingPosition);
      const distance = Math.abs(distanceVector.length());
      
      distances[position] = distance;  
    }

    // Find the minimum distance
    const minDistance = Math.min(...Object.values(distances));
    console.log('minDistance is', minDistance);
    
    // Find the position with minimum distance
    const finalPosition = Object.keys(distances).find(d => distances[d] === minDistance);

    console.log('finalPosition is:', finalPosition);

    this.bullet = this.key2Coord(finalPosition!);
    this.bubbles[finalPosition!] = this.bulletColor; 

    this.explode(this.key2Coord(finalPosition!));
  
    this.newRound();
  }

  private getSurroundingBubbles(coord: Vec2D, keepOnly?: Color) {
    /*
      We want to check:

      UP-LEFT    (x - 0.5, y + 1)
      UP         (x      , y + 1)
      UP-RIGHT   (x + 0.5, y + 1)
      LEFT       (x - 1  , y    )
      RIGHT      (x + 1  , y    )
      DOWN-LEFT  (x - 0.5, y - 1)
      DOWN       (x      , y - 1)
      DOWN-RIGHT (x + 0.5, y - 1)    
    */
    const surroundingBubbles: BubbleGrid = {};

    for (const [bubbleKey, color] of Object.entries(this.bubbles)) {
      const [bubbleCoordX, bubbleCoordY] = this.key2Coord(bubbleKey).toXY();    
      if (
        (bubbleCoordX === coord.x - 0.5 && bubbleCoordY === coord.y + 1) ||
        (bubbleCoordX === coord.x + 0.5 && bubbleCoordY === coord.y + 1) ||
        (bubbleCoordX === coord.x - 1 && bubbleCoordY === coord.y) ||
        (bubbleCoordX === coord.x + 1 && bubbleCoordY === coord.y) ||
        (bubbleCoordX === coord.x - 0.5 && bubbleCoordY === coord.y - 1) ||
        (bubbleCoordX === coord.x + 0.5 && bubbleCoordY === coord.y - 1)
      ) {
        surroundingBubbles[bubbleKey] = color;
      }
    }

    // Keep only bubbles of the same color as the bullet
    for (const [key, color] of Object.entries(surroundingBubbles)) {
      if (keepOnly === undefined) {
        if (color !== null) {
          // Keep only free spots
          delete surroundingBubbles[key];
        }
      } else {
        if (color !== keepOnly) {
          delete surroundingBubbles[key];
        }
      }
    }

    return surroundingBubbles;
  }

  private explode(coord: Vec2D) {
    /*
      First we have to find the bubbles that surround the
      coordinate where the explosion happens.

      We iterate over the bubble grid and look for bubbles
      of the same color, then we explode them recursively. 
    */
    const surroundingBubbles = this.getSurroundingBubbles(coord, this.bulletColor);

    // Since only bubbles of the same color remained in `surroundingBubbles`,
    // repeat for each surrounding bubble recursively.
    for (const surroundingBubble of Object.keys(surroundingBubbles)) {
      if (this.bubbles[surroundingBubble] !== null) {
        this.score += 10;
        this.updateScore();  
        this.bubbles[surroundingBubble] = null;
        this.explode(this.key2Coord(surroundingBubble)); 
      }
    }
  }

  public async fireBullet() {
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    const gunOrigin = new Vec2D(0, 0);

    let directionVector = this.gun.sub(gunOrigin);
    directionVector = directionVector.scalarDiv(directionVector.length());

    while (!this.bulletIsAboutToCollide()) {
      if (
        (this.bullet.x < -(PLAYGROUND_WIDTH / 2 + 1) || this.bullet.x > (PLAYGROUND_WIDTH / 2 + 1)) ||
        (this.bullet.y < 0 || this.bullet.y > PLAYGROUND_HEIGHT)
      ) {
        this.score -= 10;
        this.updateScore();
        this.newRound();
        
        return;
      }

      this.bullet = gunOrigin.add(directionVector.scalarMul(this.time));

      this.time += 0.75;
      this.reDraw();

      await delay(10);
    }

    this.landBullet();
  }

  private declareWin() {
    document.getElementById('score')!.innerText = 'YOU WON!';
  }

  private newRound() {
    this.bullet = this.createBullet();
    this.bulletColor = this.pickBulletColor();
    this.time = 0;
    this.reDraw();

    if (Object.values(this.bubbles).every(x => x === null)) {
      this.declareWin();
    }
  }
 
  private bulletIsAboutToCollide(): boolean {
    for (const [index, color] of Object.entries(this.bubbles)) {
      if (color !== null) {
        const bubbleCoords = this.key2Coord(index);
        if (bubbleCoords.sub(this.bullet).length() < 1.12) {
          this.wantedLandingPosition = bubbleCoords;
          return true;
        }
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

    for (let row = 0; row < PLAYGROUND_HEIGHT; row++) {
      for (let col = 0; col < PLAYGROUND_WIDTH; col++) {
        const offset = row % 2 !== 0 ? 0.5 : 0;
        const index = this.coord2Index(
          new Vec2D(
            col + offset - PLAYGROUND_WIDTH / 2,
            -row + PLAYGROUND_HEIGHT
          )
        );
        
        bubbleGrid[index] = row < 5 ? this.pickBulletColor() : null;
      }
    }
    return bubbleGrid;
  }

  private updateScore() {
    document.getElementById('score')!.innerText = `SCORE: ${this.score}`;
  }

  private createGun(): Vec2D {
    return new Vec2D(0, 1);
  }

  private createBullet(): Vec2D {
    return new Vec2D(0, 0);
  }

  private pickBulletColor() {
    return _.sample(Object.values(Color)) as Color;
  }

  private drawBubbles() {
    for (const [coord, color] of Object.entries(this.bubbles)) {
      if (color !== null) {
        const bubbleCoords = this.math2Canvas(this.key2Coord(coord));
            
        this.ctx.beginPath();
        this.ctx.arc(
          bubbleCoords.x + (2 * RADIUS * SCALE) / 2,
          bubbleCoords.y + (2 * RADIUS * SCALE) / 2,
          RADIUS * SCALE,
          0, 2 * Math.PI,
        );
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.closePath();
     }
    }
  }

  private drawGun() {
    const initialPosition = this.math2Canvas(new Vec2D(0, 0));
    const gunPosition = this.math2Canvas(this.gun.scalarDiv(this.gun.length()).scalarMul(GUN_LENGTH));
        
    this.ctx.beginPath();
    this.ctx.moveTo(initialPosition.x, initialPosition.y - RADIUS * SCALE);
    this.ctx.lineTo(gunPosition.x, gunPosition.y);
    this.ctx.strokeStyle = Color.White;
    this.ctx.stroke();
    this.ctx.closePath();
  }

  private drawBullet() {
    const bulletCoords = this.math2Canvas(this.bullet);
 
    this.ctx.beginPath();

    this.ctx.fillStyle = this.bulletColor;
    this.ctx.arc(
      bulletCoords.x,
      bulletCoords.y - (0.5 * 2 * RADIUS * SCALE),
      SCALE * RADIUS,
      0, 2 * Math.PI
    );
    this.ctx.fill();
    this.ctx.closePath();
  }

  private math2Canvas(vector: Vec2D): Vec2D {
    return new Vec2D(
      (2 * SCALE) * (vector.x + (PLAYGROUND_WIDTH / 2)),
      (2 * SCALE) * (-vector.y + PLAYGROUND_HEIGHT),
    );
  }

  public canvas2Math(vector: Vec2D): Vec2D {
    const convertedCoord = new Vec2D(
      vector.x / (2 * SCALE) - PLAYGROUND_WIDTH / 2,
      -vector.y / (2 * SCALE) + PLAYGROUND_HEIGHT,
    );
    return convertedCoord;
  }

  private coord2Index(coord: Vec2D): string {
    return `${coord.x} ${coord.y}`;
  }

  private key2Coord(index: string): Vec2D {
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
  document.addEventListener('mousemove', event => {
    game.gun = game.canvas2Math(new Vec2D(event.offsetX, event.offsetY));
    game.reDraw();
  });
  document.addEventListener('mousedown', event => {
    game.fireBullet();
  });
};

document.addEventListener('DOMContentLoaded', main);
