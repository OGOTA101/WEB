/**
 * game.js
 * Core Game Logic with Time Attack Mode and Refined UI
 */

class GameManager {
    constructor(view, ui, storage, audio) {
        this.view = view; // Renderer
        this.ui = ui; // UIManager
        this.storage = storage; // StorageManager Data
        this.audio = audio; // AudioManager

        this.state = 'idle'; // idle, playing, paused, result
        this.mode = 'normal'; // normal
        this.speedMultiplier = 1.0;

        this.stars = [];
        this.lastFrameTime = 0;
        this.combo = 0;
        this.score = 0;

        // In-Game Currency Tracker (collected in stage)
        this.currentStageStars = 0;

        // Time Attack System
        this.baseTimeLimit = GAME_CONFIG.SYSTEM.TIME_LIMIT_SECONDS;
        this.timeLeft = 0;
        this.maxTime = 0;

        this.currentStats = {
            hitScale: 1.0,
            lifeAdd: 0,    // Star Lifetime extension (ms)
            timeAdd: 0,    // Game Time extension (sec)
            rareRate: 0,
            scoreAdd: 0,
            currencyMult: 1.0,
            autoCatch: 0,
            luckyHeal: 0,  // Chance to recover Time (+5s)
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
        this.currentStageStars = 0;
        this.updateStageStarsUI();

        // Initialize Time
        this.maxTime = this.baseTimeLimit + this.currentStats.timeAdd;
        this.timeLeft = this.maxTime;
        this.elapsedTime = 0; // Track actual playtime for probability scaling

        this.autoCatchTimer = 0;
        this.spawnTimer = 0;

        this.view.clear();
        this.view.particles = [];
        this.view.traces = [];

        this.lastFrameTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));

        this.updateTimerUI();
        document.getElementById('btn-pause').style.display = 'block';

        // Show Combined Info Container
        const infoContainer = document.getElementById('game-info-container');
        if (infoContainer) {
            infoContainer.style.display = 'flex';
            // Ensure children are visible (they might have been hidden in gameOver)
            document.getElementById('game-stats').style.display = 'block';
            document.getElementById('game-timer').style.display = 'block';
        } else {
            // Fallback for old IDs if container missing (though it shouldn't be)
            document.getElementById('game-stats').style.display = 'block';
            document.getElementById('game-timer').style.display = 'block';
        }
    }

    updateTimerUI() {
        if (this.mode === 'endless') {
            const el = document.getElementById('timer-display');
            if (el) {
                el.textContent = '∞';
                el.parentElement.style.color = '#aaddff';
            }
            this.ui.updateTimeWarning(100, 100, 16); // Force no warning
            return;
        }

        // Format timeLeft as simple seconds (e.g., 179)
        const t = Math.max(0, Math.ceil(this.timeLeft));
        const el = document.getElementById('timer-display');
        if (el) {
            el.textContent = `${t}`;
            // Red color warning if low
            if (t <= 10) el.parentElement.style.color = '#ff4444';
            else el.parentElement.style.color = '#ffffff';
        }

        // Update Time Warning Effect (Dawn Effect)
        // Pass deltaTime for smooth interpolation
        const dt = 16; // approximate frame time if not available globally here, or use this.dt if stored
        this.ui.updateTimeWarning(this.timeLeft, this.maxTime, 16);
    }

    updateStageStarsUI() {
        const el = document.getElementById('current-stage-stars');
        if (el) el.textContent = this.currentStageStars;
    }

    calculateStats() {
        this.currentStats = {
            hitScale: 1.0,
            lifeAdd: 0,
            timeAdd: 0,
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
                        if (eff.stats.timeAdd) this.currentStats.timeAdd += eff.stats.timeAdd; // Game Time
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
        // Time Countdown
        if (this.mode !== 'endless') {
            this.timeLeft -= (dt / 1000);
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.updateTimerUI();
                this.gameOver();
                return;
            }
        }
        this.elapsedTime += dt;
        this.updateTimerUI();

        this.updateDifficulty();
        this.spawnTimer += dt;

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

            if (s.isShooting) {
                s.spawnProgress += (dt / 500);
                if (s.spawnProgress >= 1.0) {
                    s.isShooting = false;
                    s.x = s.spawnTarget.x;
                    s.y = s.spawnTarget.y;
                    this.view.spawnParticle(s.x * this.view.canvas.width, s.y * this.view.canvas.height, 'white');
                }
                continue;
            }

            s.life -= dt;
            const moveSpeed = this.speedMultiplier;

            // Use individual star type if available, otherwise current difficulty type
            const moveType = s.type || this.currentDifficulty.type;

            if (moveType === 'wobbly') {
                s.x += Math.sin(performance.now() / 200) * 0.0005 * moveSpeed;
            } else if (moveType === 'moving' || moveType === 'rush') {
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
        const validStars = this.stars.filter(s => !s.isShooting);
        if (validStars.length === 0) return;

        const index = Math.floor(Math.random() * validStars.length);
        const s = validStars[index];
        const realIndex = this.stars.indexOf(s);

        if (realIndex !== -1) {
            const sx = s.x * this.view.canvas.width;
            const sy = s.y * this.view.canvas.height;
            this.hitStar(realIndex, sx, sy, s, true);
        }
    }

    draw() {
        this.view.clear();

        const groups = {};
        this.stars.forEach(s => {
            if (s.constellationId && !s.isShooting) {
                if (!groups[s.constellationId]) groups[s.constellationId] = [];
                groups[s.constellationId].push(s);
            }
        });

        Object.values(groups).forEach(group => {
            if (group.length < 2) return;
            for (let i = 0; i < group.length - 1; i++) {
                this.view.drawConstellationLine(group[i].x, group[i].y, group[i + 1].x, group[i + 1].y);
            }
        });

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

            if (s.isShooting) continue;

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
        this.processHit(px, py, star, isAuto);

        if (star.constellationId) {
            for (let i = this.stars.length - 1; i >= 0; i--) {
                const s = this.stars[i];
                if (s.constellationId === star.constellationId && !s.isShooting) {
                    this.stars.splice(i, 1);
                    const spx = s.x * this.view.canvas.width;
                    const spy = s.y * this.view.canvas.height;
                    this.processHit(spx, spy, s, true, true);
                }
            }
            this.ui.showFloatingText(px, py - 50, "Constellation!", '#88ccff');
            this.audio.playSE('tap');
        }
    }

    processHit(px, py, star, isAuto, isChain = false) {
        this.combo++;
        if (!isChain) this.audio.playSE('tap');

        // Points
        let point = 1;
        if (star.rarity > 0 && GAME_CONFIG.RARITY.BONUS_POINTS[star.rarity]) {
            point += GAME_CONFIG.RARITY.BONUS_POINTS[star.rarity];
        }
        point += this.currentStats.scoreAdd;

        if (star.constellationId) point += 2;

        if (this.currentStats.scoreMult !== 1.0) {
            point = Math.floor(point * this.currentStats.scoreMult);
        }

        this.score += point;

        let earned = Math.floor(point * this.currentStats.currencyMult);

        if (this.mode === 'endless') {
            earned = Math.floor(earned * GAME_CONFIG.SYSTEM.ENDLESS_SCORE_RATE);
        }

        if (earned < 1) earned = 1;
        this.currentStageStars += earned;
        this.updateStageStarsUI();

        // Heal Logic -> Time Recovery (5% chance to +5 sec)
        if (this.currentStats.luckyHeal > 0) {
            if (Math.random() < this.currentStats.luckyHeal) {
                this.timeLeft = Math.min(this.maxTime, this.timeLeft + 5);
                this.updateTimerUI();
                this.ui.showFloatingText(px, py - 30, "+5s!", '#44ff44');
            }
        }

        const colors = GAME_CONFIG.RARITY.COLORS;
        let rarityColor = colors[star.rarity] || colors[0];

        let text = `+${point}`;
        if (isAuto) text = `Auto +${point}`;
        if (isChain) text = `Link +${point}`;

        this.ui.showFloatingText(px, py, text, rarityColor);
        this.view.spawnParticle(px, py, 'random');
        this.view.spawnTrace(px, py, 'random');
    }

    missTap(px, py) {
        // Penalty: Reduce Time (Only if not endless)
        if (this.mode === 'endless') {
            this.view.spawnParticle(px, py, '#555');
            return;
        }

        const penalty = GAME_CONFIG.SYSTEM.MISS_TIME_PENALTY;
        this.timeLeft -= penalty;
        this.ui.showFloatingText(px, py - 20, `-${penalty}s`, '#ff4444');

        this.view.spawnParticle(px, py, '#555');

        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.updateTimerUI();
            this.gameOver();
        }
    }

    spawnStar() {
        if (!this.currentDifficulty) this.currentDifficulty = GAME_CONFIG.DIFFICULTY_TABLE[0];

        // --- Time-Based Probability for Special Events ---
        // 0-1 min: 0% | 1-2 min: 10% | 2-3 min: 20% | ... | Max 50%
        let timeChance = 0;

        if (this.mode === 'endless') {
            timeChance = 0.25; // Fixed 25% for endless
        } else {
            const elapsedMinutes = Math.floor(this.elapsedTime / 60000);
            timeChance = Math.min(0.5, Math.max(0, elapsedMinutes * 0.1));
        }

        // If triggered, force a special event
        if (Math.random() < timeChance) {
            const roll = Math.random();
            if (roll < 0.33) {
                this.spawnConstellation();
                return;
            } else if (roll < 0.66) {
                this.spawnShootingStar();
                return;
            } else {
                // Force a moving star
                this.createStarEntity(null, null, { type: 'moving' });
                return;
            }
        }

        // Gimmick check (Legacy / Difficulty Based)
        const gimmick = this.currentDifficulty.gimmick;

        if (gimmick) {
            const roll = Math.random();
            if (roll < gimmick.constellation) {
                this.spawnConstellation();
                return;
            } else if (roll < gimmick.constellation + gimmick.shooting) {
                this.spawnShootingStar();
                return;
            }
        }

        this.createStarEntity();
    }

    spawnConstellation() {
        const count = 3 + Math.floor(Math.random() * 2);
        const centerX = 0.2 + Math.random() * 0.6;
        const centerY = 0.2 + Math.random() * 0.5;
        const id = 'c_' + Date.now() + '_' + Math.random();

        for (let i = 0; i < count; i++) {
            let ox = (Math.random() - 0.5) * 0.25;
            let oy = (Math.random() - 0.5) * 0.25;
            let x = Math.max(0.1, Math.min(0.9, centerX + ox));
            let y = Math.max(0.1, Math.min(0.8, centerY + oy));

            this.createStarEntity(x, y, { constellationId: id });
        }
    }

    spawnShootingStar() {
        const startX = 1.2;
        const startY = -0.2;
        const targetX = 0.1 + Math.random() * 0.8;
        const targetY = 0.1 + Math.random() * 0.8;

        this.createStarEntity(targetX, targetY, {
            isShooting: true,
            spawnProgress: 0,
            spawnStart: { x: startX, y: startY },
            spawnTarget: { x: targetX, y: targetY },
            rarity: 2
        });
    }

    createStarEntity(forceX = null, forceY = null, extraProps = {}) {
        const diff = this.currentDifficulty;
        const starSize = diff.starSize || 18;
        const lifeRaw = (diff.lifeTime * 3) + this.currentStats.lifeAdd; // Use lifeAdd for duration
        const life = Math.max(500, lifeRaw); // Minimum life

        const x = forceX !== null ? forceX : (0.1 + Math.random() * 0.8);
        const y = forceY !== null ? forceY : (0.1 + Math.random() * 0.7);

        let rarity = 0;
        if (extraProps.rarity !== undefined) {
            rarity = extraProps.rarity;
        } else {
            const baseChance = diff.rareChance || 0;
            const chance = baseChance + this.currentStats.rareRate;
            if (Math.random() < chance) {
                const roll = Math.random();
                const T = GAME_CONFIG.RARITY.THRESHOLDS;
                if (roll < T.UNCOMMON) rarity = 1;
                else if (roll < T.RARE) rarity = 2;
                else if (roll < T.EPIC) rarity = 3;
                else rarity = 4;
            }
        }

        // Determine type: allow override from extraProps, else use difficulty
        const type = extraProps.type || diff.type;

        const star = {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 0.05,
            vy: (Math.random() - 0.5) * 0.05,
            size: starSize,
            life: life,
            maxLife: life,
            rotation: Math.random() * Math.PI * 2,
            rarity: rarity,
            type: type, // Store type specifically
            ...extraProps
        };

        this.stars.push(star);
        return star;
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
        this.state = 'result';
        document.getElementById('btn-pause').style.display = 'none';

        // Hide combined info container if it exists
        const info = document.getElementById('game-info-container');
        if (info) info.style.display = 'none';

        // Also hide legacy IDs just in case
        const legacyStats = document.getElementById('game-stats');
        const legacyTimer = document.getElementById('game-timer');
        if (legacyStats) legacyStats.style.display = 'none';
        if (legacyTimer) legacyTimer.style.display = 'none';

        const data = StorageManager.load();

        const earned = this.currentStageStars;
        data.stars += earned;

        if (this.mode === 'normal' && this.score > data.highScore) {
            data.highScore = this.score;
        }
        // Endless mode does not update high score
        StorageManager.save(data);

        this.audio.playSE('title');

        document.getElementById('result-score').textContent = `${this.score} (Get: ${earned}★)`;
        document.getElementById('result-modal').classList.remove('hidden');
        document.getElementById('result-title').textContent = 'おやすみなさい';
    }
}
