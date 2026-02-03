
class StarrySky {
    constructor() {
        this.container = document.getElementById('bg-stars');
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.stars = [];
        this.shootingStars = [];
        this.width = 0;
        this.height = 0;

        // Configuration
        this.starCount = 200; // Number of stars
        this.maxStarSize = 1.5;
        this.shootingStarFrequency = 0.005; // Chance per frame

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.createStars();
        this.animate();
    }

    resize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        // Re-create stars on resize to distribute them evenly or just let them be
        // this.createStars(); 
    }

    createStars() {
        this.stars = [];
        for (let i = 0; i < this.starCount; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * this.maxStarSize,
                baseAlpha: Math.random() * 0.5 + 0.3, // 0.3 to 0.8
                alpha: 0,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinkleOffset: Math.random() * Math.PI * 2,
                color: this.getRandomStarColor()
            });
        }
    }

    getRandomStarColor() {
        const colors = [
            '255, 255, 255', // White
            '220, 220, 255', // Blue-white
            '255, 255, 220', // Yellow-white
            '255, 200, 200'  // Reddish (faint)
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    drawStars() {
        this.stars.forEach(star => {
            // Update alpha for twinkle
            const cycle = Math.sin(Date.now() * star.twinkleSpeed + star.twinkleOffset);
            // Map -1..1 to something like 0.5..1.5 multiplier or just modify baseAlpha
            // Let's make it breathe.
            const alphaMultiplier = (cycle + 1) / 2; // 0..1
            // We want it to go from 0.5 * base to 1.5 * base (clamped 0..1)
            let currentAlpha = star.baseAlpha * (0.5 + alphaMultiplier);
            if (currentAlpha > 1) currentAlpha = 1;

            this.ctx.fillStyle = `rgba(${star.color}, ${currentAlpha})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    updateShootingStars() {
        // Chance to spawn
        if (Math.random() < this.shootingStarFrequency) {
            this.shootingStars.push({
                x: Math.random() * this.width,
                y: Math.random() * (this.height * 0.5), // Top half
                length: Math.random() * 50 + 50,
                speed: Math.random() * 10 + 5,
                angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1), // roughly 45 degrees
                life: 1.0
            });
        }

        // Update and draw
        for (let i = this.shootingStars.length - 1; i >= 0; i--) {
            const ss = this.shootingStars[i];

            // Move
            ss.x += Math.cos(ss.angle) * ss.speed;
            ss.y += Math.sin(ss.angle) * ss.speed;
            ss.life -= 0.02;

            // Draw tail
            const tailX = ss.x - Math.cos(ss.angle) * ss.length;
            const tailY = ss.y - Math.sin(ss.angle) * ss.length;

            const gradient = this.ctx.createLinearGradient(ss.x, ss.y, tailX, tailY);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${ss.life})`);
            gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(ss.x, ss.y);
            this.ctx.lineTo(tailX, tailY);
            this.ctx.stroke();

            // Draw head
            this.ctx.fillStyle = `rgba(255, 255, 255, ${ss.life})`;
            this.ctx.beginPath();
            this.ctx.arc(ss.x, ss.y, 1.5, 0, Math.PI * 2);
            this.ctx.fill();

            // Remove if off screen or dead
            if (ss.life <= 0 || ss.x > this.width || ss.y > this.height) {
                this.shootingStars.splice(i, 1);
            }
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawStars();
        this.updateShootingStars();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new StarrySky();
});
