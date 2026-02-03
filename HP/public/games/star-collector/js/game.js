/**
 * game.js
 * Core Game Logic
 */

class GameManager {
    constructor(view, ui, storage) {
        this.view = view; // Renderer
        this.ui = ui; // UIManager
        this.storage = storage; // StorageManager Data

        this.state = 'idle'; // idle, playing, paused, result
        this.mode = 'normal'; // normal, endless

        this.stars = [];
        this.lastFrameTime = 0;
        this.combo = 0;
        this.score = 0;
        this.stamina = 100;
        this.maxStamina = 100;

        this.spawnTimer = 0;
        this.currentDifficulty = DIFFICULTY_TABLE[0];

        // Bind Input
        this.view.canvas.addEventListener('mousedown', (e) => this.input(e));
        this.view.canvas.addEventListener('touchstart', (e) => this.input(e));
    }

    start(mode) {
        this.mode = mode;
        this.state = 'playing';
        this.stars = [];
        this.combo = 0;
        this.score = 0;
        this.stamina = this.maxStamina;
        this.view.clear();

        // Use logic loop
        this.lastFrameTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));

        this.ui.updateStamina(this.stamina, this.maxStamina);

        // Show pause button
        document.getElementById('btn-pause').style.display = 'block';
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
        // Difficulty Update
        this.updateDifficulty();

        // Spawning
        this.spawnTimer += dt;
        if (this.spawnTimer > this.currentDifficulty.spawnRate) {
            this.spawnStar();
            this.spawnTimer = 0;
        }

        // Star Logic
        for (let i = this.stars.length - 1; i >= 0; i--) {
            let s = this.stars[i];
            s.life -= dt;

            // Movement (if valid)
            if (this.currentDifficulty.type === 'wobbly') {
                s.x += Math.sin(timestamp / 200) * 0.001;
            } else if (this.currentDifficulty.type === 'moving' || this.currentDifficulty.type === 'rush') {
                s.x += s.vx * (dt / 1000);
                s.y += s.vy * (dt / 1000);
            }

            if (s.life <= 0) {
                // Star Expired (Missed without penalty in normal, just combo break?)
                // Spec say: "Failure (miss): No penalty, but loss of opportunity"
                // Let's break combo if generous, or keep it. Let's break combo for difficulty.
                if (this.combo > 0) {
                    this.combo = 0;
                    // this.ui.showFloatingText(s.x * this.view.canvas.width, s.y * this.view.canvas.height, "Miss...");
                }
                this.stars.splice(i, 1);
            }
        }
    }

    draw() {
        this.view.clear();
        // Draw Stars
        this.stars.forEach(s => this.view.drawStar(s));
        // Draw Particles
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

        // Hit Detection
        let hit = false;
        // Check stored relative coordinates vs pixel input
        for (let i = this.stars.length - 1; i >= 0; i--) {
            let s = this.stars[i];
            const sx = s.x * this.view.canvas.width;
            const sy = s.y * this.view.canvas.height;
            const dist = Math.sqrt((x - sx) ** 2 + (y - sy) ** 2);

            // Hit radius ~50px or size
            if (dist < (s.size / 2) + 20) { // +20 margin
                this.hitStar(i, sx, sy);
                hit = true;
                break; // One per tap
            }
        }

        if (!hit) {
            this.missTap(x, y);
        }
    }

    hitStar(index, px, py) {
        this.stars.splice(index, 1);
        this.combo++;

        let point = 1;
        // Buffs logic here (if implemented)

        if (this.mode === 'endless') point = 0; // Or 0.1 logic handled at end

        this.score += point;
        this.view.spawnParticle(px, py, '#ffd700');
        this.ui.showFloatingText(px, py, `+${point}`);

        // Recover Stamina slightly? Maybe no? Spec didn't say.
    }

    missTap(px, py) {
        if (this.mode === 'normal') {
            this.stamina -= 10;
            this.ui.updateStamina(this.stamina, this.maxStamina);
            this.view.spawnParticle(px, py, '#555');

            if (this.stamina <= 0) {
                this.gameOver();
            }
        } else {
            // Endless: visual only
            this.view.spawnParticle(px, py, '#fff');
        }
    }

    spawnStar() {
        // Determine params based on difficulty
        const life = this.currentDifficulty.lifeTime;

        // Random pos (keep away from edges 10%)
        const x = 0.1 + Math.random() * 0.8;
        const y = 0.1 + Math.random() * 0.6; // Keep upper part mostly

        this.stars.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 0.1,
            vy: (Math.random() - 0.5) * 0.1,
            size: 60, // px
            life: life,
            maxLife: life,
            rotation: Math.random() * Math.PI
        });
    }

    updateDifficulty() {
        this.level = this.calculateTotalLevel();

        // Find difficulty params based on simple iteration or mapping level to table
        // The table is range-based on combo, so we can stick to the existing logic 
        // or refine it to match the level groups.
        // Existing logic:
        let diff = DIFFICULTY_TABLE[0];
        for (let d of DIFFICULTY_TABLE) {
            // If current combo is within this difficulty's range (implied by order)
            // Actually the table has maxCombo. 
            // We want the difficulty where combo <= maxCombo.
            // But we iterating from start (low maxCombo) to end (high maxCombo).
            // So the first one we find where combo <= maxCombo is the correct one.
            // Wait, if combo is 0. 0 <= 9. Match.
            // If combo is 10. 10 <= 9 False. Next. 10 <= 29. Match.
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
        if (c < 30) return 1 + Math.floor((c - 10) / 4); // 20 range / 5 levels = 4
        if (c < 60) return 6 + Math.floor((c - 30) / 6); // 30 range / 5 levels = 6
        if (c < 90) return 11 + Math.floor((c - 60) / 6);
        if (c < 120) return 16 + Math.floor((c - 90) / 6);
        if (c < 150) return 21 + Math.floor((c - 120) / 6);
        if (c < 180) return 26 + Math.floor((c - 150) / 10); // 30 range / 3 levels = 10
        if (c < 200) return 29;
        return 30;
    }

    gameOver() {
        this.state = 'result';
        document.getElementById('btn-pause').style.display = 'none';

        // Save
        const data = StorageManager.load();
        data.stars += Math.floor(this.score * (this.mode === 'endless' ? 0.1 : 1.0));
        if (this.score > data.highScore) data.highScore = this.score;
        StorageManager.save(data);

        // Show Result
        document.getElementById('result-score').textContent = this.score;
        document.getElementById('result-modal').classList.remove('hidden');
        document.getElementById('result-title').textContent = this.mode === 'normal' ? 'おやすみなさい' : 'おさんぽ終了';
    }
}
