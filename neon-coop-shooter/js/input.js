// ===== Input Handler =====
// Handles touch/mouse input: drag, double tap, swipe up

export class InputHandler {
    constructor(canvas) {
        this.canvas = canvas;
        this.touching = false;
        this.touchX = 0;
        this.touchY = 0;
        this.startX = 0;
        this.startY = 0;
        this.startTime = 0;
        this.lastTapTime = 0;
        this.moving = false;
        this.prevTouchX = 0;
        this.prevTouchY = 0;

        // Callbacks
        this.onMove = null;
        this.onStart = null;
        this.onEnd = null;
        this.onDoubleTap = null;
        this.onSwipeUp = null;

        this._bindEvents();
    }

    _getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        if (e.touches && e.touches.length > 0) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    _bindEvents() {
        const c = this.canvas;
        // Touch
        c.addEventListener('touchstart', (e) => { e.preventDefault(); this._onStart(e); }, { passive: false });
        c.addEventListener('touchmove', (e) => { e.preventDefault(); this._onMove(e); }, { passive: false });
        c.addEventListener('touchend', (e) => { e.preventDefault(); this._onEnd(e); }, { passive: false });
        c.addEventListener('touchcancel', (e) => { e.preventDefault(); this._onEnd(e); }, { passive: false });
        // Mouse
        c.addEventListener('mousedown', (e) => this._onStart(e));
        c.addEventListener('mousemove', (e) => { if (this.touching) this._onMove(e); });
        c.addEventListener('mouseup', (e) => this._onEnd(e));
        c.addEventListener('mouseleave', (e) => { if (this.touching) this._onEnd(e); });
    }

    _onStart(e) {
        const pos = this._getPos(e);
        this.touching = true;
        this.touchX = pos.x;
        this.touchY = pos.y;
        this.startX = pos.x;
        this.startY = pos.y;
        this.prevTouchX = pos.x;
        this.prevTouchY = pos.y;
        this.startTime = performance.now();
        this.moving = false;

        // Double tap detection
        const now = performance.now();
        if (now - this.lastTapTime < 300) {
            if (this.onDoubleTap) this.onDoubleTap(pos.x, pos.y);
            this.lastTapTime = 0;
        } else {
            this.lastTapTime = now;
        }

        if (this.onStart) this.onStart(pos.x, pos.y);
    }

    _onMove(e) {
        const pos = this._getPos(e);
        this.prevTouchX = this.touchX;
        this.prevTouchY = this.touchY;
        this.touchX = pos.x;
        this.touchY = pos.y;

        const dx = pos.x - this.startX;
        const dy = pos.y - this.startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            this.moving = true;
        }

        if (this.onMove) this.onMove(pos.x, pos.y);
    }

    _onEnd(e) {
        if (!this.touching) return;
        const dt = performance.now() - this.startTime;
        const dy = this.touchY - this.startY;
        const dx = this.touchX - this.startX;

        // Swipe up detection
        if (dt < 400 && dy < -60 && Math.abs(dx) < 80) {
            if (this.onSwipeUp) this.onSwipeUp();
        }

        this.touching = false;
        this.moving = false;
        if (this.onEnd) this.onEnd();
    }
}
