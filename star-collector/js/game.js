/**
 * game.js
 * Core Game Logic
 */

class GameManager {
    constructor(view, ui, storage, audio) {
        this.view = view; // Renderer
        this.ui = ui; // UIManager
        this.storage = storage; // StorageManager Data
        this.audio = audio; // AudioManager

        this.state = 'idle'; // idle, playing, paused, result
        this.mode = 'normal'; // normal
        this.speedMultiplier = 1.0; // 0.5 (slow), 1.0 (normal), 1.5 (fast)

        this.stars = [];
        this.lastFrameTime = 0;
        this.combo = 0;
        this.score = 0;

        // Base max stamina
        this.baseMaxStamina = GAME_CONFIG.SYSTEM.MAX_STAMINA;
        this.stamina = this.baseMaxStamina;
        this.maxStamina = this.baseMaxStamina;

        this.currentStats = {
            hitScale: 1.0,
            lifeAdd: 0,
            staminaAdd: 0,
            rareRate: 0,
            scoreAdd: 0,
            currencyMult: 1.0,
            autoCatch: 0,
            luckyHeal: 0,
            scoreMult: 1.0
        };

        this.spawnTimer = 0;
        this.autoCatchTimer = 0;
        this.currentDifficulty = GAME_CONFIG.DIFFICULTY_TABLE[0];

        // Bind Input
        this.view.canvas.addEventListener('mousedown', (e) => this.input(e));
        this.view.canvas.addEventListener('touchstart', (e) => this.input(e));
    }

    start(mode, speedMultiplier = 1.0) {
        this.mode = mode;
        this.speedMultiplier = speedMultiplier;
        this.state = 'playing';

        // Reset and Calculate Stats
        this.calculateStats();

        this.stars = [];
        this.combo = 0;
        this.score = 0;
        this.maxStamina = this.baseMaxStamina + this.currentStats.staminaAdd;
        this.stamina = this.maxStamina;
        this.autoCatchTimer = 0;
        this.spawnTimer = 0;

        // IMPORTANT: Clear view only when starting new game
        this.view.clear();
        this.view.particles = [];
        this.view.traces = [];

        this.lastFrameTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));

        this.ui.updateStamina(this.stamina, this.maxStamina);
        document.getElementById('btn-pause').style.display = 'block';
    }

    calculateStats() {
        this.currentStats = {
            hitScale: 1.0,
            lifeAdd: 0,
            staminaAdd: 0,
            rareRate: 0,
            scoreAdd: 0,
            currencyMult: 1.0,
            autoCatch: 0,
            luckyHeal: 0,
            scoreMult: 1.0
        };

        const data = StorageManager.load();
        if (data.equippedId) {
            const item = data.inventory.find(i => i.uid === data.equippedId);
            if (item) {
                item.effectIds.forEach(eid => {
                    const eff = GAME_CONFIG.ACCESSORY_EFFECTS.find(e => e.id === eid);
                    if (eff && eff.stats) {
                        if (eff.stats.hitScale) this.currentStats.hitScale += eff.stats.hitScale;
                        if (eff.stats.lifeAdd) this.currentStats.lifeAdd += eff.stats.lifeAdd;
                        if (eff.stats.staminaAdd) this.currentStats.staminaAdd += eff.stats.staminaAdd;
                        if (eff.stats.rareRate) this.currentStats.rareRate += eff.stats.rareRate;
                        if (eff.stats.scoreAdd) this.currentStats.scoreAdd += eff.stats.scoreAdd;
                        if (eff.stats.currencyMult) this.currentStats.currencyMult += eff.stats.currencyMult;

                        if (eff.stats.autoCatch) this.currentStats.autoCatch = eff.stats.autoCatch;
                        if (eff.stats.luckyHeal) this.currentStats.luckyHeal += eff.stats.luckyHeal;
                        if (eff.stats.scoreMult) this.currentStats.scoreMult *= eff.stats.scoreMult;
                    }
                });
            }
        }
    }

    loop(timestamp) {
        if (this.state !== 'playing') return;

        const dt = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        this.updateDifficulty();

        this.spawnTimer += dt;

        // Adjust spawn rate by speedMultiplier
        const baseRate = this.currentDifficulty.spawnRate;
        const realRate = baseRate / this.speedMultiplier;

        if (this.spawnTimer > realRate) {
            this.spawnStar();
            this.spawnTimer = 0;
        }

        if (this.currentStats.autoCatch > 0) {
            this.autoCatchTimer += dt;
            if (this.autoCatchTimer > this.currentStats.autoCatch) {
                this.performAutoCatch();
                this.autoCatchTimer = 0;
            }
        }

        for (let i = this.stars.length - 1; i >= 0; i--) {
            let s = this.stars[i];
            s.life -= dt; // Life decreases normally (or should it be faster? User said "speed of stars appearing", not life)
            // If speed also affects movement:
            // s.x += s.vx * (dt / 1000) * this.speedMultiplier;
            // Let's apply speed multiple to movement too for "Faster" feel.
            const moveSpeed = this.speedMultiplier;

            if (this.currentDifficulty.type === 'wobbly') {
                s.x += Math.sin(performance.now() / 200) * 0.0005 * moveSpeed;
            } else if (this.currentDifficulty.type === 'moving' || this.currentDifficulty.type === 'rush') {
                s.x += s.vx * (dt / 1000) * moveSpeed;
                s.y += s.vy * (dt / 1000) * moveSpeed;
            }

            if (s.life <= 0) {
                if (this.combo > 0) {
                    this.combo = 0;
                }
                this.stars.splice(i, 1);
            }
        }
    }

    performAutoCatch() {
        if (this.stars.length === 0) return;
        const index = Math.floor(Math.random() * this.stars.length);
        const s = this.stars[index];
        const sx = s.x * this.view.canvas.width;
        const sy = s.y * this.view.canvas.height;
        this.hitStar(index, sx, sy, s, true);
    }

    draw() {
        this.view.clear();
        this.stars.forEach(s => this.view.drawStar(s));
        this.view.updateParticles();
    }

    input(e) {
        if (this.state !== 'playing') return;
        e.preventDefault();

        const rect = this.view.canvas.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        let hit = false;
        for (let i = this.stars.length - 1; i >= 0; i--) {
            let s = this.stars[i];
            const sx = s.x * this.view.canvas.width;
            const sy = s.y * this.view.canvas.height;
            const dist = Math.sqrt((x - sx) ** 2 + (y - sy) ** 2);

            const baseRadius = Math.max(25, s.size * 1.5);
            const tapRadius = baseRadius * this.currentStats.hitScale;

            if (dist < tapRadius) {
                this.hitStar(i, sx, sy, s);
                hit = true;
                break;
            }
        }

        if (!hit) {
            this.missTap(x, y);
        }
    }

    hitStar(index, px, py, star, isAuto = false) {
        this.stars.splice(index, 1);
        this.combo++;

        this.audio.playSE('tap');

        let point = 1;
        if (star.rarity > 0 && GAME_CONFIG.RARITY.BONUS_POINTS[star.rarity]) {
            point += GAME_CONFIG.RARITY.BONUS_POINTS[star.rarity];
        }
        point += this.currentStats.scoreAdd;
        if (this.currentStats.scoreMult !== 1.0) {
            point = Math.floor(point * this.currentStats.scoreMult);
        }

        this.score += point;

        if (this.currentStats.luckyHeal > 0 && this.mode === 'normal') {
            if (Math.random() < this.currentStats.luckyHeal) {
                this.stamina = Math.min(this.maxStamina, this.stamina + 1);
                this.ui.updateStamina(this.stamina, this.maxStamina);
                this.ui.showFloatingText(px, py - 30, "Heal!", '#44ff44');
            }
        }

        const colors = GAME_CONFIG.RARITY.COLORS;
        let rarityColor = colors[star.rarity] || colors[0];

        if (isAuto) {
            this.ui.showFloatingText(px, py, `Auto +${point}`, rarityColor);
        } else {
            this.ui.showFloatingText(px, py, `+${point}`, rarityColor);
        }

        // Random colorful effect as requested
        this.view.spawnParticle(px, py, 'random');
        this.view.spawnTrace(px, py, 'random');
    }

    missTap(px, py) {
        if (this.mode === 'normal') {
            this.stamina -= GAME_CONFIG.SYSTEM.Miss_STAMINA_COST;
            this.ui.updateStamina(this.stamina, this.maxStamina);
            this.view.spawnParticle(px, py, '#555');

            if (this.stamina <= 0) {
                this.gameOver();
            }
        } else {
            // Even in other modes (if any), show miss effect
            this.view.spawnParticle(px, py, '#fff');
        }
    }

    spawnStar() {
        if (!this.currentDifficulty) this.currentDifficulty = GAME_CONFIG.DIFFICULTY_TABLE[0];

        const starSize = this.currentDifficulty.starSize || 18;
        const life = (this.currentDifficulty.lifeTime * 3) + this.currentStats.lifeAdd;

        const x = 0.1 + Math.random() * 0.8;
        const y = 0.1 + Math.random() * 0.7;

        let rarity = 0;
        const baseChance = this.currentDifficulty.rareChance || 0;
        const chance = baseChance + this.currentStats.rareRate;

        if (Math.random() < chance) {
            const roll = Math.random();
            const T = GAME_CONFIG.RARITY.THRESHOLDS;
            if (roll < T.UNCOMMON) rarity = 1;
            else if (roll < T.RARE) rarity = 2;
            else if (roll < T.EPIC) rarity = 3;
            else rarity = 4;
        }

        this.stars.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 0.05,
            vy: (Math.random() - 0.5) * 0.05,
            size: starSize,
            life: life,
            maxLife: life,
            rotation: Math.random() * Math.PI * 2,
            rarity: rarity
        });
    }

    updateDifficulty() {
        this.level = this.calculateTotalLevel();

        let diff = GAME_CONFIG.DIFFICULTY_TABLE[0];
        for (let d of GAME_CONFIG.DIFFICULTY_TABLE) {
            if (this.combo <= d.maxCombo) {
                diff = d;
                break;
            }
        }
        this.currentDifficulty = diff;
    }

    calculateTotalLevel() {
        const c = this.combo;
        if (c < 10) return 0;
        if (c < 30) return 1 + Math.floor((c - 10) / 4);
        if (c < 60) return 6 + Math.floor((c - 30) / 6);
        if (c < 90) return 11 + Math.floor((c - 60) / 6);
        if (c < 120) return 16 + Math.floor((c - 90) / 6);
        if (c < 150) return 21 + Math.floor((c - 120) / 6);
        if (c < 180) return 26 + Math.floor((c - 150) / 10);
        if (c < 200) return 29;
        return 30;
    }

    gameOver() {
        this.state = 'result'; // Stops loop
        document.getElementById('btn-pause').style.display = 'none';

        const data = StorageManager.load();

        // Endless mode removed, so always 1.0 (or adjust if needed)
        // If we want slow/fast to affect score rate, we can change here.
        // For now, keep simple: Normal mode scoring.
        let rate = 1.0;

        rate *= this.currentStats.currencyMult;
        const earned = Math.floor(this.score * rate);
        data.stars += earned;
        if (this.mode === 'normal' && this.score > data.highScore) {
            data.highScore = this.score;
        }
        StorageManager.save(data);

        this.audio.playSE('title');

        document.getElementById('result-score').textContent = `${this.score} (Get: ${earned}★)`;
        document.getElementById('result-modal').classList.remove('hidden');
        document.getElementById('result-title').textContent = 'おやすみなさい';
    }
}
