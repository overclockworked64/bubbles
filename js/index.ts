import { 
  Vec2D,
  BubbleGrid,
  createBubbleGrid,
  key2Coords, 
  canvas2Math,
  math2Canvas,
  pickRandomColor,
  rotate, 
} from "./util";

export const SCALE = 10;
export const RADIUS = 1;
export const PLAYGROUND_WIDTH = 40;
export const PLAYGROUND_HEIGHT = 30;

const GUN_LENGTH = 5;
const CANVAS_WIDTH = (PLAYGROUND_WIDTH + 0.5) * 2 * RADIUS * SCALE;
const CANVAS_HEIGHT = PLAYGROUND_HEIGHT * 2 * RADIUS * SCALE;

export enum Color {
  Orange = '#f80',
  White = '#ffffff',
  Blue = '#36C1D4',
}

export enum Direction {
  Left,
  Right,
}

class BubbleShooter {
  public bubbles: BubbleGrid;
  public gun: Gun;
  public wantedLandingPosition: Vec2D;
  public score: number;
  public time: number;
  public bullet: Bullet;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    this.setCanvasSize(this.canvas);
    this.setCanvasColor(this.canvas);
    this.outlineCanvas(this.canvas);
  
    this.bubbles = createBubbleGrid();
    this.gun = new Gun();
    this.bullet = new Bullet(this);
    this.time = 0;
    this.score = 0;
    this.wantedLandingPosition = new Vec2D(0, 0);

    this.drawBubbles();
    this.drawGun();
    this.drawBullet();
  }

  public reDraw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBubbles();
    this.drawGun();
    this.drawBullet();
  }

  public getSurroundingBubbles(coord: Vec2D, keepOnly?: Color) {
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
      const [bubbleCoordX, bubbleCoordY] = key2Coords(bubbleKey).toXY();    
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

  public explode(coord: Vec2D) {
    /*
      First we have to find the bubbles that surround the
      coordinate where the explosion happens.

      We iterate over the bubble grid and look for bubbles
      of the same color, then we explode them recursively. 
    */
    const surroundingBubbles = this.getSurroundingBubbles(coord, this.bullet.color);

    // Since only bubbles of the same color remained in `surroundingBubbles`,
    // repeat for each surrounding bubble recursively.
    for (const surroundingBubble of Object.keys(surroundingBubbles)) {
      if (this.bubbles[surroundingBubble] !== null) {
        this.score += 10;
        this.updateScore();  
        this.bubbles[surroundingBubble] = null;
        this.explode(key2Coords(surroundingBubble)); 
      }
    }
  }

  public newRound() {
    this.bullet = new Bullet(this);
    this.time = 0;
    this.reDraw();

    if (Object.values(this.bubbles).every(x => x === null)) {
      this.declareWin();
    }
  }
 
  public updateScore() {
    document.getElementById('score')!.innerText = `SCORE: ${this.score}`;
  }

  private declareWin() {
    document.getElementById('score')!.innerText = 'YOU WON!';
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

  private drawBubbles() {
    for (const [coord, color] of Object.entries(this.bubbles)) {
      if (color !== null) {
        const bubbleCoords = math2Canvas(key2Coords(coord));
            
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
    const initialPosition = math2Canvas(new Vec2D(0, 0));
    const gunPosition = math2Canvas(this.gun.coords.scalarDiv(this.gun.coords.length()).scalarMul(GUN_LENGTH));
        
    this.ctx.beginPath();
    this.ctx.moveTo(initialPosition.x, initialPosition.y - RADIUS * SCALE);
    this.ctx.lineTo(gunPosition.x, gunPosition.y);
    this.ctx.strokeStyle = Color.White;
    this.ctx.stroke();
    this.ctx.closePath();
  }

  private drawBullet() {
    const bulletCoords = math2Canvas(this.bullet.coords);
 
    this.ctx.beginPath();

    this.ctx.fillStyle = this.bullet.color;
    this.ctx.arc(
      bulletCoords.x,
      bulletCoords.y - (0.5 * 2 * RADIUS * SCALE),
      SCALE * RADIUS,
      0, 2 * Math.PI
    );
    this.ctx.fill();
    this.ctx.closePath();
  }
}

class Bullet {
  private game: BubbleShooter;
  public coords: Vec2D;
  public color: Color;

  constructor(game: BubbleShooter) {
    this.game = game;
    this.coords = new Vec2D(0, 0);
    this.color = pickRandomColor();
  }

  private land() {
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

    const potentialLandingPositions = this.game.getSurroundingBubbles(this.game.wantedLandingPosition);

    // Find free spots (i.e., where color is null)
    for (const [position, color] of Object.entries(potentialLandingPositions)) {
      const coord = key2Coords(position);
      const distanceVector = coord.sub(this.game.wantedLandingPosition);
      const distance = Math.abs(distanceVector.length());
      
      distances[position] = distance;  
    }

    // Find the minimum distance
    const minDistance = Math.min(...Object.values(distances));
    
    // Find the position with minimum distance
    const finalPosition = Object.keys(distances).find(d => distances[d] === minDistance);

    this.coords = key2Coords(finalPosition!);
    this.game.bubbles[finalPosition!] = this.color; 

    this.game.explode(key2Coords(finalPosition!));
  
    this.game.newRound();
  }

  public async shoot() {
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    const gunOrigin = new Vec2D(0, 0);

    let directionVector = this.game.gun.coords.sub(gunOrigin);
    directionVector = directionVector.scalarDiv(directionVector.length());

    while (!this.aboutToCollide()) {
      if (
        (this.coords.x < -(PLAYGROUND_WIDTH / 2 + 1) || this.coords.x > (PLAYGROUND_WIDTH / 2 + 1)) ||
        (this.coords.y < 0 || this.coords.y > PLAYGROUND_HEIGHT)
      ) {
        this.game.score -= 10;
        this.game.updateScore();
        this.game.newRound();
        
        return;
      }

      this.coords = gunOrigin.add(directionVector.scalarMul(this.game.time));

      this.game.time += 0.75;
      this.game.reDraw();

      await delay(10);
    }

    this.land();
  }

  private aboutToCollide(): boolean {
    for (const [index, color] of Object.entries(this.game.bubbles)) {
      if (color !== null) {
        const bubbleCoords = key2Coords(index);
        if (bubbleCoords.sub(this.coords).length() < 1.12) {
          this.game.wantedLandingPosition = bubbleCoords;
          return true;
        }
      }
    }
    return false;
  }

}

class Gun {
  public coords: Vec2D;

  constructor() {
    this.coords =  new Vec2D(0, 1);  
  }

  public rotate(direction: Direction) {
    this.coords = rotate(this.coords, direction);
  }

}

const main = () => {
  const game = new BubbleShooter();
  document.addEventListener('mousemove', event => {
    game.gun.coords = canvas2Math(new Vec2D(event.offsetX, event.offsetY));
    game.reDraw();
  });
  document.addEventListener('mousedown', event => {
    game.bullet.shoot();
  });
};

document.addEventListener('DOMContentLoaded', main);
