// ===== Boss Definitions =====
// Stage 1: 3 bosses (boss rush - progressive difficulty)

export const STAGES = {
    1: {
        name: 'NEON FORTRESS',
        waves: [
            // Wave 1: Normal enemy - basic bullet patterns
            {
                bossId: 'scout',
                name: 'SCOUT',
                type: 'geometric',
                color: '#ff4466',
                size: 30,
                hp: 500,
                speed: 0.8,
                patterns: [
                    { type: 'radial', bullets: 8, speed: 2, interval: 2500, color: '#ff4466' },
                    { type: 'aimed', bullets: 2, speed: 3, interval: 2000, color: '#ff8844' },
                ]
            },
            // Wave 2: Normal enemy - heavier bullet barrages
            {
                bossId: 'sentinel',
                name: 'SENTINEL',
                type: 'fortress',
                color: '#aa44ff',
                size: 40,
                hp: 800,
                speed: 0.6,
                patterns: [
                    { type: 'radial', bullets: 16, speed: 2.5, interval: 2000, color: '#cc66ff' },
                    { type: 'aimed', bullets: 4, speed: 3.5, interval: 1500, color: '#ff8844' },
                    { type: 'spiral', bullets: 1, speed: 2, interval: 80, duration: 2000, color: '#aa44ff' },
                    { type: 'ring', bullets: 24, speed: 1.5, interval: 3500, color: '#8822dd' },
                ]
            },
            // Wave 3: Strong enemy - dense patterns + homing missiles
            {
                bossId: 'overlord',
                name: 'OVERLORD',
                type: 'mech',
                color: '#ffee00',
                size: 50,
                hp: 1500,
                speed: 1.0,
                patterns: [
                    { type: 'radial', bullets: 20, speed: 3, interval: 1800, color: '#ffee00' },
                    { type: 'aimed', bullets: 5, speed: 4, interval: 1200, color: '#ff8800' },
                    { type: 'spiral', bullets: 2, speed: 2.5, interval: 60, duration: 3000, color: '#ffcc00' },
                    { type: 'homing', bullets: 3, speed: 2.5, interval: 4000, turnRate: 0.03, color: '#ff2244' },
                    { type: 'charge_rush', speed: 8, interval: 10000, warning: 1500, color: '#ff2244' },
                ]
            }
        ]
    },
    2: {
        name: 'DUAL MENACE',
        waves: [
            // Wave 1: Slightly stronger Scout
            {
                bossId: 'scout_ex',
                name: 'SCOUT EX',
                type: 'geometric',
                color: '#ff66aa',
                size: 35,
                hp: 1000,
                speed: 1.0,
                patterns: [
                    { type: 'radial', bullets: 12, speed: 2.5, interval: 2000, color: '#ff66aa' },
                    { type: 'aimed', bullets: 3, speed: 4, interval: 1800, color: '#ffaa66' },
                ]
            },
            // Wave 2: Slightly stronger Sentinel
            {
                bossId: 'sentinel_ex',
                name: 'SENTINEL EX',
                type: 'fortress',
                color: '#cc66ff',
                size: 45,
                hp: 1600,
                speed: 0.8,
                patterns: [
                    { type: 'radial', bullets: 20, speed: 3.0, interval: 1800, color: '#dd88ff' },
                    { type: 'aimed', bullets: 5, speed: 4.0, interval: 1200, color: '#ffaa66' },
                    { type: 'spiral', bullets: 2, speed: 2.5, interval: 70, duration: 2500, color: '#cc66ff' },
                    { type: 'ring', bullets: 30, speed: 2.0, interval: 3000, color: '#aa44ff' },
                ]
            },
            // Wave 3: Boss that duplicates when HP < 50%
            {
                bossId: 'gemini',
                name: 'GEMINI CORE',
                type: 'mech',
                color: '#00ffff',
                size: 55,
                hp: 3000, // Very high HP since it will split
                speed: 1.2,
                splitAtHalfHP: true,
                patterns: [
                    { type: 'radial', bullets: 16, speed: 3.5, interval: 1500, color: '#00ffff' },
                    { type: 'aimed', bullets: 4, speed: 5, interval: 1000, color: '#00ffff' },
                    { type: 'spiral', bullets: 1, speed: 3, interval: 50, duration: 2000, color: '#88ffff' },
                    { type: 'homing', bullets: 4, speed: 3, interval: 3500, turnRate: 0.04, color: '#ffffff' },
                    { type: 'charge_rush', speed: 10, interval: 8000, warning: 1200, color: '#ffffff' },
                ]
            }
        ]
    },
    3: {
        name: 'APEX ASSAULT',
        waves: [
            // Wave 1: Stage 1 Boss
            {
                bossId: 'overlord',
                name: 'OVERLORD',
                type: 'mech',
                color: '#ffee00',
                size: 50,
                hp: 2000, // Boosted HP
                speed: 1.2, // Boosted Speed
                patterns: [
                    { type: 'radial', bullets: 24, speed: 3.5, interval: 1500, color: '#ffee00' },
                    { type: 'aimed', bullets: 6, speed: 4.5, interval: 1000, color: '#ff8800' },
                    { type: 'spiral', bullets: 2, speed: 3, interval: 50, duration: 3000, color: '#ffcc00' },
                    { type: 'homing', bullets: 4, speed: 3, interval: 3500, turnRate: 0.04, color: '#ff2244' },
                    { type: 'charge_rush', speed: 9, interval: 9000, warning: 1200, color: '#ff2244' },
                ]
            },
            // Wave 2: Stage 2 Boss (without split, or maybe with? user said "stage 2 boss", we'll just make it strong)
            {
                bossId: 'gemini_omega',
                name: 'GEMINI OMEGA',
                type: 'mech',
                color: '#00ffff',
                size: 60,
                hp: 3500,
                speed: 1.4,
                splitAtHalfHP: false, // Let's keep wave 2 simpler but tougher
                patterns: [
                    { type: 'radial', bullets: 32, speed: 4, interval: 1200, color: '#00ffff' },
                    { type: 'aimed', bullets: 8, speed: 5.5, interval: 800, color: '#00ffff' },
                    { type: 'spiral', bullets: 3, speed: 3.5, interval: 40, duration: 4000, color: '#88ffff' },
                    { type: 'homing', bullets: 6, speed: 3.5, interval: 3000, turnRate: 0.05, color: '#ffffff' },
                    { type: 'laser_warning', duration: 1500, interval: 6000, color: '#ff00aa' },
                ]
            },
            // Wave 3: Final Boss (small, fast, homing)
            {
                bossId: 'apex_phantom',
                name: 'APEX PHANTOM',
                type: 'geometric', // Or whatever makes sense for a small fast enemy
                color: '#ffffff',
                size: 15, // Same size as player
                hp: 4000,
                speed: 2.5, // Extremely fast
                patterns: [
                    { type: 'aimed', bullets: 5, speed: 8, interval: 600, color: '#ffffff' }, // Fast sniper shots
                    { type: 'homing', bullets: 8, speed: 4, interval: 2000, turnRate: 0.08, color: '#ff0044' }, // Aggressive homing
                    { type: 'radial', bullets: 40, speed: 5, interval: 3000, color: '#00f0ff' }, // Dense, fast rings
                    { type: 'charge_rush', speed: 15, interval: 5000, warning: 800, color: '#ff0000' }, // Very fast rush
                    { type: 'spiral', bullets: 4, speed: 4, interval: 30, duration: 1500, color: '#ffee00' }, // Burst spirals
                ]
            }
        ]
    }
};

export function getScaledHP(baseHP, playerCount) {
    if (playerCount <= 1) return baseHP;
    // 1.75x per additional player, slightly milder
    const scale = 1 + (playerCount - 1) * 0.75;
    return Math.floor(baseHP * scale);
}
