/**
 * view.js
 * Pixel Art Rendering with Procedural Sprite Generation
 */
class View {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });
        this.config = config;

        // Internal Logical Resolution (Low Res)
        this.blockSize = 16;
        this.cols = config.GRID.COLS;
        this.rows = config.GRID.ROWS;

        // Internal canvas size
        this.width = this.cols * this.blockSize;
        this.height = this.rows * this.blockSize;

        // Set canvas resolution match internal size
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Palette
        this.palette = [
            '#000000',
            '#FF7777', // 1: Red
            '#8866FF', // 2: Purple
            '#FF99CC', // 3: Pink
            '#44CC44', // 4: Green
            '#CC88FF', // 5: Light Purple
            '#44AAFF', // 6: Blue
            '#FFAA44'  // 7: Orange
        ];

        // Generate Sprites In-Memory
        try {
            this.sprites = this.generateInternalSprites();
            this.spritesLoaded = true;
        } catch (e) {
            console.error("Sprite Generation Failed:", e);
            this.spritesLoaded = false;
        }

        this.tintCache = {};
    }

    // Convert screen coord to grid coord
    getGridCoord(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();

        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        const x = (screenX - rect.left) * scaleX;
        const y = (screenY - rect.top) * scaleY;

        const c = Math.floor(x / this.blockSize);
        const r = Math.floor(y / this.blockSize);

        return { r, c };
    }

    render(game) {
        // Clear background
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.width, this.height);

        const meta = game.analyzeGrid();

        for (let r = 0; r < game.rows; r++) {
            for (let c = 0; c < game.cols; c++) {
                const cell = game.grid[r][c];
                if (!cell) continue;

                const m = meta[r][c];
                this.drawBlock(r, c, cell.color, m);
            }
        }
    }

    drawBlock(r, c, colorIndex, meta) {
        const size = this.blockSize;
        const x = c * size;
        const y = r * size;
        const ctx = this.ctx;

        // Fallback or custom drawing if no sprites
        const color = this.palette[colorIndex];

        // 1. Draw Puyo-style Body (Slime/Connected Shape)
        ctx.fillStyle = color;
        ctx.beginPath();
        const rad = size / 2; // Max radius for maximum slime effect (circle if isolated)

        ctx.moveTo(x + rad, y);

        // Top Edge & Top Right Corner
        if (meta.u || meta.r) {
            ctx.lineTo(x + size, y); // Square
        } else {
            ctx.lineTo(x + size - rad, y);
            ctx.arcTo(x + size, y, x + size, y + rad, rad); // Round
        }

        // Right Edge & Bottom Right Corner
        if (meta.r || meta.d) {
            ctx.lineTo(x + size, y + size); // Square
        } else {
            ctx.lineTo(x + size, y + size - rad);
            ctx.arcTo(x + size, y + size, x + size - rad, y + size, rad); // Round
        }

        // Bottom Edge & Bottom Left Corner
        if (meta.d || meta.l) {
            ctx.lineTo(x, y + size); // Square
        } else {
            ctx.lineTo(x + rad, y + size);
            ctx.arcTo(x, y + size, x, y + size - rad, rad); // Round
        }

        // Left Edge & Top Left Corner
        if (meta.l || meta.u) {
            ctx.lineTo(x, y); // Square
        } else {
            ctx.lineTo(x, y + rad);
            ctx.arcTo(x, y, x + rad, y, rad); // Round
        }

        ctx.closePath();
        ctx.fill();

        // Optional subtle highlight/shadow for 3D slime feel
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 2. Draw Parts (Tinted)
        if (!this.spritesLoaded || !this.tintCache[colorIndex]) {
            if (!this.tintCache[colorIndex]) this.createTintedSprites(colorIndex);
        }
        const sheet = this.tintCache[colorIndex];
        if (!sheet) return;

        const SPRITE_SIZE = 16;

        // 2. Draw Parts
        if (meta.isTail) {
            ctx.drawImage(sheet, 2 * SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE, x, y, size, size);
        }
        if (meta.isHand) {
            ctx.drawImage(sheet, 1 * SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE, x, y, size, size);
        }
        if (meta.isFoot) {
            ctx.drawImage(sheet, 1 * SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE, x, y, size, size);
        }
        if (meta.isHead) {
            ctx.drawImage(sheet, 0 * SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE, x, y, size, size);
        }
    }

    createTintedSprites(colorIndex) {
        if (!this.sprites) return;

        const canvas = document.createElement('canvas');
        canvas.width = this.sprites.width;
        canvas.height = this.sprites.height;
        const ctx = canvas.getContext('2d');

        const color = this.palette[colorIndex];

        // 1. Draw solid color
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Mask with sprite opacity (Keep only sprite shape)
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(this.sprites, 0, 0);

        // 3. Multiply with original sprite (Black lines remain black, White becomes Color)
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(this.sprites, 0, 0);

        this.tintCache[colorIndex] = canvas;
    }

    generateInternalSprites() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');

        // 0: Transparent, 1: Body(White -> Color), 2: Black (Outline/Details)
        const drawMap = (offsetX, map) => {
            for (let y = 0; y < 16; y++) {
                if (!map[y]) continue; // Safety check
                for (let x = 0; x < 16; x++) {
                    const c = map[y][x];
                    if (c === 0) continue;
                    if (c === 1) ctx.fillStyle = '#FFFFFF';
                    if (c === 2) ctx.fillStyle = '#000000';
                    // Need to fill 1x1 rect
                    ctx.fillRect(offsetX + x, y, 1, 1);
                }
            }
        };

        // Sprite 0: Face
        const face = [
            [0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0], // Ears
            [0, 0, 2, 1, 1, 2, 0, 0, 0, 2, 1, 1, 2, 0, 0, 0],
            [0, 2, 1, 1, 1, 1, 2, 0, 2, 1, 1, 1, 1, 2, 0, 0],
            [0, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 0, 0],
            [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0], // Top Head
            [2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 0], // Eyes (2=Black)
            [2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 0],
            [2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 0], // Nose
            [2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 0],
            [0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0],
            [0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0],
            [0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0], // Collar
            [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0]
        ];

        // Sprite 1: Paw
        const paw = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 2, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [2, 1, 1, 1, 1, 1, 2, 0, 0, 2, 2, 2, 0, 0, 0, 0], // Toes
            [2, 1, 1, 1, 1, 1, 2, 0, 2, 1, 1, 1, 2, 0, 0, 0],
            [2, 1, 1, 1, 1, 1, 2, 0, 2, 1, 1, 1, 2, 0, 0, 0],
            [0, 2, 2, 2, 2, 2, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ];

        // Sprite 2: Tail (Curved up)
        const tail = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 2, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 2, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 2, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ];

        // Sprite 3: Body (No border)
        const body = [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ];

        drawMap(0, face);
        drawMap(16, paw);
        drawMap(32, tail);
        drawMap(48, body);

        return canvas;
    }
}
