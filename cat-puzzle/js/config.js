/**
 * config.js
 * Game definitions and constants
 */
const GAME_CONFIG = {
    GRID: {
        ROWS: 12,
        COLS: 8,
        PADDING: 0
    },
    COLORS: [
        '#FF9A9E', // Pink (Sakura)
        '#A18CD1', // Purple (Lavender)
        '#FBC2EB', // Light Pink
        '#84FAB0', // Green (Mint)
        '#FFD1FF', // Pale Purple
        '#A6C0FE', // Blue
        '#FF9A9E'  // Repeat or Red
    ],
    // Map colors to "Cat Types" if needed, or just allow any color
    ANIMATION: {
        DROP_SPEED: 0.5, // 0.5 cells per frame? No, simpler gravity
        GRAVITY: 0.5,
        BOUNCE: 0.2
    },
    SCORE: {
        BASE_EXPONENT: 2
    }
};
