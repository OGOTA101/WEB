/**
 * background.js
 * Deep Cosmic Flow (Cold, Deep, No Warm Colors)
 */

class StarrySky {
    constructor() {
        this.container = document.getElementById('bg-stars');
        this.container.innerHTML = '';

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.filter = 'blur(60px)'; // Stronger blur
        this.container.appendChild(this.canvas);

        this.width = 0;
        this.height = 0;
        this.time = 0;
        this.flowElements = [];

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.initFlow();
        this.animate();
    }

    resize() {
        this.width = this.container.clientWidth || window.innerWidth;
        this.height = this.container.clientHeight || window.innerHeight;
        this.canvas.width = this.width / 4;
        this.canvas.height = this.height / 4;
    }

    initFlow() {
        this.flowElements = [];
        const count = 9; // Increased count for richer mix
        for (let i = 0; i < count; i++) {
            this.flowElements.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: (this.canvas.width + this.canvas.height) * (0.4 + Math.random() * 0.4),
                vx: (Math.random() - 0.5) * 0.04,
                vy: (Math.random() - 0.5) * 0.02,
                color: this.getFlowColor(i),
                phase: Math.random() * Math.PI * 2,
                phaseSpeed: 0.0005 + Math.random() * 0.0015
            });
        }
    }

    getFlowColor(index) {
        // STRICTLY Cold/Dark Colors.
        // Adding subtle greens and purples for graduation, but keeping it deep.
        const colors = [
            { r: 2, g: 10, b: 40 },    // Deepest Navy
            { r: 10, g: 30, b: 60 },   // Twilight Blue
            { r: 0, g: 25, b: 45 },    // Deep Teal
            { r: 20, g: 10, b: 45 },   // Deep Indigo
            { r: 5, g: 40, b: 50 },    // Abyss Cyan (Brighter)
            { r: 30, g: 20, b: 60 },   // Dark Violet
            { r: 0, g: 15, b: 35 },    // Midnight Greenish
            { r: 10, g: 10, b: 30 }    // Void
        ];
        return colors[index % colors.length];
    }

    animate() {
        this.time++;

        // Deepest black-blue base gradient
        const gradBase = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradBase.addColorStop(0, '#02020a');
        gradBase.addColorStop(1, '#050515');
        this.ctx.fillStyle = gradBase;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.globalCompositeOperation = 'screen';

        this.flowElements.forEach(el => {
            el.x += el.vx;
            el.y += el.vy;

            const margin = el.radius;
            if (el.x < -margin) el.x = this.canvas.width + margin;
            if (el.x > this.canvas.width + margin) el.x = -margin;
            if (el.y < -margin) el.y = this.canvas.height + margin;
            if (el.y > this.canvas.height + margin) el.y = -margin;

            const pulse = Math.sin(this.time * el.phaseSpeed + el.phase) * 0.15 + 0.85;

            const grad = this.ctx.createRadialGradient(el.x, el.y, 0, el.x, el.y, el.radius);

            grad.addColorStop(0, `rgba(${el.color.r}, ${el.color.g}, ${el.color.b}, ${0.35 * pulse})`);
            grad.addColorStop(1, `rgba(${el.color.r}, ${el.color.g}, ${el.color.b}, 0)`);

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(el.x, el.y, el.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.ctx.globalCompositeOperation = 'source-over';

        // Vignette
        const gradV = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.height / 3,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.height
        );
        gradV.addColorStop(0, 'rgba(0,0,0,0)');
        gradV.addColorStop(1, 'rgba(0,0,0,0.85)');
        this.ctx.fillStyle = gradV;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new StarrySky();
});
