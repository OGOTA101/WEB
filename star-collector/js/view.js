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
        this.nebulas = [];

        // Init Nebula Particles
        for (let i = 0; i < 5; i++) {
            this.nebulas.push({
                x: Math.random(), // normalized
                y: Math.random(),
                size: 0.3 + Math.random() * 0.4, // large relative to screen
                vx: (Math.random() - 0.5) * 0.0001,
                vy: (Math.random() - 0.5) * 0.0001,
                color: Math.random() > 0.5 ? 'rgba(100, 0, 255, 0.05)' : 'rgba(0, 100, 255, 0.05)',
                phase: Math.random() * Math.PI * 2
            });
        }
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

        // Dreamy Background Overlay (Very Subtle)
        // Instead of circular nebulas, apply a soft full-canvas color wash
        const t = Date.now();
        const pulse = 0.015 + Math.sin(t * 0.0003) * 0.005; // Very subtle pulse 0.01 - 0.02

        // Create a gentle top-to-bottom gradient overlay
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        grad.addColorStop(0, `rgba(80, 60, 120, ${pulse})`);  // Purple tint at top
        grad.addColorStop(0.5, `rgba(40, 60, 100, ${pulse * 0.5})`); // Blue in middle
        grad.addColorStop(1, `rgba(20, 40, 80, 0)`);  // Fade to transparent at bottom

        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawConstellationLine(x1, y1, x2, y2) {
        // Convert normalized coordinates to pixel coordinates
        const px1 = x1 * this.canvas.width;
        const py1 = y1 * this.canvas.height;
        const px2 = x2 * this.canvas.width;
        const py2 = y2 * this.canvas.height;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(px1, py1);
        this.ctx.lineTo(px2, py2);
        this.ctx.strokeStyle = `rgba(200, 230, 255, 0.4)`;
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = '#fff';
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawShootingStar(star) {
        if (!star.spawnStart || !star.spawnTarget) return;

        const ctx = this.ctx;
        const progress = star.spawnProgress;

        // Linear interpolation
        const sx = star.spawnStart.x * this.canvas.width;
        const sy = star.spawnStart.y * this.canvas.height;
        const tx = star.spawnTarget.x * this.canvas.width;
        const ty = star.spawnTarget.y * this.canvas.height;

        const currentX = sx + (tx - sx) * progress;
        const currentY = sy + (ty - sy) * progress;

        // Draw Trail
        // Calculate tail position (lagging behind)
        const tailLen = 0.2; // Length of tail relative to total path
        const tailProgress = Math.max(0, progress - tailLen);
        const tailX = sx + (tx - sx) * tailProgress;
        const tailY = sy + (ty - sy) * tailProgress;

        // Gradient for trail
        const grad = ctx.createLinearGradient(tailX, tailY, currentX, currentY);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.8)');

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(currentX, currentY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 4 * (1 - progress); // Thins out as it lands? Or stays constant?
        // Let's make it look like a cometa
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.stroke();

        // Draw head
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    drawStar(star) {
        // If shooting (spawning animation), delegate to drawShootingStar
        if (star.isShooting) {
            this.drawShootingStar(star);
            return;
        }

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

        // Constellation Glow (Extra)
        if (star.constellationId) {
            ctx.beginPath();
            ctx.arc(0, 0, outerRadius * 2.5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(150, 200, 255, 0.4)`;
            ctx.lineWidth = 1;
            ctx.stroke();
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

        // For smooth fade interpolation
        this.currentWarningOpacity = 0;
    }

    updateTimeWarning(timeLeft, maxTime, dt = 16) {
        // Dawn Effect: 30 seconds remaining -> Start fading to bright
        const dawnStart = 30; // seconds

        let targetOpacity = 0;
        if (timeLeft <= dawnStart) {
            // 0s -> 1.0 (Full Dawn), 30s -> 0.0
            targetOpacity = 1.0 - (Math.max(0, timeLeft) / dawnStart);
        }

        // Smooth Lerp (Linear Interpolation)
        // Move currentOpacity towards targetOpacity
        const speed = 0.002 * dt; // Adjust speed

        // Initialize if undefined
        if (typeof this.currentWarningOpacity === 'undefined') this.currentWarningOpacity = 0;

        if (this.currentWarningOpacity < targetOpacity) {
            this.currentWarningOpacity += speed;
            if (this.currentWarningOpacity > targetOpacity) this.currentWarningOpacity = targetOpacity;
        } else if (this.currentWarningOpacity > targetOpacity) {
            this.currentWarningOpacity -= speed;
            if (this.currentWarningOpacity < targetOpacity) this.currentWarningOpacity = targetOpacity;
        }

        // Time Warning: Screen gradually darkens (becomes black)
        const alpha = Math.min(0.7, this.currentWarningOpacity * 0.7); // Max 0.7 opacity

        // Simple black overlay - screen darkens as time runs out
        this.staminaAura.style.background = `rgba(0, 0, 0, ${alpha})`;
        this.staminaAura.style.opacity = this.currentWarningOpacity > 0 ? 1 : 0;
        this.staminaAura.style.pointerEvents = 'none';
        this.staminaAura.style.transform = 'none';

        // Ensure full coverage
        this.staminaAura.style.width = '100%';
        this.staminaAura.style.height = '100%';
        this.staminaAura.style.top = '0';
        this.staminaAura.style.left = '0';
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
