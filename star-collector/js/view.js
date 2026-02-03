/**
 * view.js
 * Visuals, Scene Management, and Rendering.
 */

class ScreenManager {
    constructor() {
        this.bgContainer = document.getElementById('bg-container');
        this.currentScreen = 'title';
        this.bgOffsets = {
            'title': '',
            'gacha': 'bg-slide-up',
            'equip': 'bg-slide-left',
            'game': 'bg-slide-right',
            'endless': 'bg-slide-down'
        };
        this.onScreenChange = null;
    }

    goTo(screenName) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(`screen-${screenName}`);
        if (target) {
            target.classList.add('active');
            this.currentScreen = screenName;
            this.bgContainer.className = '';
            const slideClass = this.bgOffsets[screenName];
            if (slideClass) this.bgContainer.classList.add(slideClass);
            if (this.onScreenChange) this.onScreenChange(screenName);
        }
    }
}

class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => {
            if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => this.resize(), 100);
        });

        this.particles = [];
        this.traces = [];
    }

    resize() {
        const wrapper = this.canvas.parentElement;
        if (wrapper) {
            const width = wrapper.clientWidth;
            const height = wrapper.clientHeight;
            if (this.canvas.width !== width || this.canvas.height !== height) {
                this.canvas.width = width;
                this.canvas.height = height;
            }
        }
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawStar(star) {
        const ctx = this.ctx;
        const x = star.x * this.canvas.width;
        const y = star.y * this.canvas.height;
        const size = star.size;

        const lifeRatio = star.life / star.maxLife;

        let alpha = 1.0;
        let scale = 1.0;

        if (lifeRatio > 0.9) {
            const appearProgress = (1.0 - lifeRatio) / 0.1;
            scale = appearProgress;
            alpha = appearProgress;
        } else if (lifeRatio > 0.15) {
            const age = star.maxLife - star.life;
            const cycle = Math.sin(age * 0.005);
            scale = 1.0 + cycle * 0.3;
            alpha = 1.0;
        } else {
            const vanishProgress = lifeRatio / 0.15;
            scale = vanishProgress;
            alpha = vanishProgress;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        const rotation = (star.rotation || 0) + Date.now() * 0.0003;
        ctx.rotate(rotation);

        const outerRadius = size / 2;
        const innerRadius = size / 5;

        // Glow
        const glowIntensity = 1.0 + (scale - 1.0) * 0.5;
        for (let g = 2; g >= 0; g--) {
            const glowSize = outerRadius * (1.5 + g * 0.5);
            const glowAlpha = 0.2 / (g + 1);
            ctx.beginPath();
            ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 0, ${glowAlpha})`;
            ctx.fill();
        }

        // Star Shape
        ctx.beginPath();
        const spikes = 5;
        for (let i = 0; i < spikes * 2; i++) {
            const r = (i % 2 === 0) ? outerRadius : innerRadius;
            const angle = (Math.PI / spikes) * i - Math.PI / 2;
            const sx = Math.cos(angle) * r;
            const sy = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, outerRadius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#fffacd');
        grad.addColorStop(1, '#ffd700');

        ctx.shadowBlur = 15 * glowIntensity;
        ctx.shadowColor = '#ffd700';
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.restore();
        ctx.globalAlpha = 1.0;
    }

    spawnTrace(x, y, color) {
        // Fix: Generate ONE random color per trace instance
        let drawColor = color;
        if (color === 'random') {
            const hue = Math.floor(Math.random() * 360);
            drawColor = `hsl(${hue}, 90%, 75%)`;
        }
        // Base color handling if not random string but specific hex
        if (color === 'rainbow') { // Legacy support just in case
            drawColor = '#ffffff'; // will be overridden? No, treat as white
        }

        this.traces.push({
            x: x,
            y: y,
            life: 1.0,
            maxLife: 1.0,
            size: 3 + Math.random() * 2,
            alphaOffset: Math.random() * Math.PI,
            color: drawColor,
            isDynamic: false // No longer dynamic sync rainbow
        });
    }

    spawnParticle(x, y, color) {
        // Fix: Generate ONE random color per burst
        let burstColor = color;
        if (color === 'random') {
            const hue = Math.floor(Math.random() * 360);
            burstColor = `hsl(${hue}, 90%, 70%)`;
        }

        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const speed = Math.random() * 4 + 2;

            this.particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color: burstColor,
                size: Math.random() * 2 + 1,
                type: 'burst'
            });
        }
    }

    updateParticles() {
        // 1. Update Traces
        for (let i = this.traces.length - 1; i >= 0; i--) {
            let t = this.traces[i];
            t.life -= 0.0015;

            if (t.life <= 0) {
                this.traces.splice(i, 1);
            } else {
                const twinkle = Math.sin(Date.now() * 0.005 + t.alphaOffset) * 0.2 + 0.8;
                this.ctx.globalAlpha = t.life * twinkle;

                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = t.color;

                // Core
                this.ctx.fillStyle = t.color;
                this.ctx.beginPath();
                this.ctx.arc(t.x, t.y, t.size * 0.6, 0, Math.PI * 2);
                this.ctx.fill();

                // Halo
                const grad = this.ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.size * 2);
                grad.addColorStop(0, `rgba(255, 255, 255, 0.8)`);
                grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(t.x, t.y, t.size * 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // 2. Update Burst Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.life -= 0.05;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            } else {
                this.ctx.globalAlpha = p.life;
                this.ctx.fillStyle = p.color;
                this.ctx.shadowBlur = 0;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowBlur = 0;
    }
}

class UIManager {
    constructor() {
        this.staminaAura = document.getElementById('stamina-aura');
    }

    updateStamina(current, max) {
        const ratio = current / max;
        // Adjusted to be distinctly Red/Pink when low, Gold when high.
        let color = `rgba(255, 215, 0, ${0.15 * ratio})`;
        if (ratio < 0.3) color = `rgba(255, 50, 50, ${0.4 * (1 - ratio)})`;

        this.staminaAura.style.background = `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 60%)`;
        this.staminaAura.style.opacity = ratio > 0 ? 1 : 0;
        this.staminaAura.style.transform = `translate(-50%, -50%) scale(${0.8 + ratio * 0.4})`;
    }

    showFloatingText(x, y, text, color = '#fff') {
        const el = document.createElement('div');
        el.textContent = text;
        el.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            color: ${color};
            font-weight: bold;
            font-size: 20px;
            text-shadow: 0 0 10px ${color}, 0 0 20px #000;
            pointer-events: none;
            transition: all 0.8s ease-out;
            transform: translate(-50%, -50%);
            z-index: 100;
        `;

        document.getElementById('game-area').appendChild(el);

        requestAnimationFrame(() => {
            el.style.top = (y - 60) + 'px';
            el.style.opacity = 0;
            el.style.transform = 'translate(-50%, -50%) scale(1.5)';
        });

        setTimeout(() => el.remove(), 800);
    }
}
