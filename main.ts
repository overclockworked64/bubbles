class BubbleShooter {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.getElementById('canvas') as HTMLCanvasElement;

        this.setCanvasSize(this.canvas);
        this.outlineCanvas(this.canvas);

        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    }

    private setCanvasSize(canvas: HTMLCanvasElement) {
        canvas.width = 800;
        canvas.height = 600;
    }

    private outlineCanvas(canvas: HTMLCanvasElement) {
        this.canvas.style.border = '3px solid black';
    }
}

const main = () => {
    const game = new BubbleShooter();
};

document.addEventListener('DOMContentLoaded', main);
