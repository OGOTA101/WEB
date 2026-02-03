/**
 * view.js
 * Visuals, Scene Management, and Rendering.
 */

class SceneManager {
    constructor() {
        this.camera = document.getElementById('world-camera');
        this.currentPos = { x: 0, y: 0 };
        // Scene Map coordinates
        this.scenes = {
            'home': { x: 0, y: 0 },
            'game': { x: 100, y: 0 },
            'equip': { x: -100, y: 0 },
            'gacha': { x: 0, y: -100 },
            'endless': { x: 0, y: 100 },
            'credit': { x: 200, y: 0 }
        };
    }

    goTo(sceneName) {
        const target = this.scenes[sceneName];
        if (target) {
            // Move camera opposite to target
            this.camera.style.transform = `translate(${-target.x}%, ${-target.y}%)`;
            this.currentPos = target;

            // Manage UI visibility based on scene
            if (sceneName === 'game' || sceneName === 'endless') {
                document.getElementById('cat-layer').style.display = 'block'; // Or customized position
                document.getElementById('ui-overlay').style.pointerEvents = 'none'; // Reset to default
            }

            return true;
        }
        return false;
    }
}

class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.assets = {
            // star: new Image(),
            // starRare: new Image() 
        };
        // this.assets.star.src = 'assets/images/star_normal.png';

        this.particles = [];
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawStar(star) {
        const timeFactor = Math.min(1, star.life / 200); // Fade in/out
        const alpha = Math.sin(timeFactor * Math.PI); // Smooth fade

        this.ctx.globalAlpha = Math.max(0, alpha);

        const size = star.size;
        const x = star.x * this.canvas.width;
        const y = star.y * this.canvas.height;

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate((star.rotation || 0) + Date.now() * 0.001); // Slowly rotate

        // Fantastic Star Effect

        // 1. Glow
        this.ctx.shadowBlur = size * 0.5;
        this.ctx.shadowColor = '#ffd700';

        // 2. Star Shape
        this.ctx.beginPath();
        const spikes = 5;
        const outerRadius = size / 2;
        const innerRadius = size / 4;

        for (let i = 0; i < spikes * 2; i++) {
            const r = (i % 2 === 0) ? outerRadius : innerRadius;
            const angle = (Math.PI / spikes) * i;
            const sx = Math.cos(angle) * r;
            const sy = Math.sin(angle) * r;
            if (i === 0) this.ctx.moveTo(sx, sy);
            else this.ctx.lineTo(sx, sy);
        }
        this.ctx.closePath();

        // Gradient Fill
        const grad = this.ctx.createRadialGradient(0, 0, innerRadius, 0, 0, outerRadius);
        grad.addColorStop(0, '#ffffcc'); // White-yellow center
        grad.addColorStop(1, '#ffd700'); // Gold edges
        this.ctx.fillStyle = grad;
        this.ctx.fill();

        // 3. Core Highlights (Sparkle)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
        this.ctx.globalAlpha = 1.0;
    }

    spawnParticle(x, y, color) {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color: color
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            } else {
                this.ctx.globalAlpha = p.life;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1.0;
    }
}

class UIManager {
    constructor() {
        this.staminaAura = document.getElementById('stamina-aura');
        this.scoreTexts = []; // Floating texts
    }

    updateStamina(current, max) {
        const ratio = current / max;
        // 1.0 = Yellow/White glow, 0.5 = Weak, 0.2 = Reddish/Dark
        let color = `rgba(255, 215, 0, ${0.2 * ratio})`;
        if (ratio < 0.3) color = `rgba(255, 50, 50, ${0.3 * (1 - ratio)})`;

        this.staminaAura.style.background = `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 70%)`;
        this.staminaAura.style.opacity = ratio > 0 ? 1 : 0;
        this.staminaAura.style.transform = `translate(-50%, -50%) scale(${0.8 + ratio * 0.7})`;
    }

    showFloatingText(x, y, text) {
        // Since canvas logic handles clicks, x/y are 0-1 or pixels? 
        // We will pass pixels here.
        const el = document.createElement('div');
        el.textContent = text;
        el.style.position = 'absolute';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.color = '#fff';
        el.style.fontWeight = 'bold';
        el.style.textShadow = '0 0 5px #ffd700';
        el.style.pointerEvents = 'none';
        el.style.transition = 'all 1s ease-out';
        el.style.transform = 'translate(-50%, -50%)';
        el.style.zIndex = 100;

        // Append to viewport
        document.getElementById('game-area').appendChild(el);

        // Animate
        requestAnimationFrame(() => {
            el.style.top = (y - 50) + 'px';
            el.style.opacity = 0;
        });

        // Remove
        setTimeout(() => {
            el.remove();
        }, 1000);
    }
}
