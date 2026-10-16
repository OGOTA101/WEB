/* ============================================
   EFFECTS - Horror / Glitch effects
   ============================================ */

const Effects = {
    glitchActive: false,

    flashScreen() {
        const flash = createElement('div');
        flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#fff;z-index:99999;pointer-events:none;';
        document.body.appendChild(flash);
        setTimeout(() => { flash.style.background = '#f00'; }, 50);
        setTimeout(() => { flash.style.background = '#000'; }, 100);
        setTimeout(() => flash.remove(), 200);
        SoundManager.playSE('noise');
    },

    showGlitch(type) {
        const overlay = $('glitch-overlay');
        overlay.style.display = 'block';
        overlay.className = 'glitch-overlay ' + (type || 'scanlines');
        this.glitchActive = true;
        GameManager.state.params.glitch_count++;
    },

    hideGlitch() {
        const overlay = $('glitch-overlay');
        overlay.style.display = 'none';
        overlay.className = 'glitch-overlay';
        this.glitchActive = false;
    },

    triggerJumpscare() {
        const overlay = $('jumpscare-overlay');
        overlay.style.display = 'flex';
        SoundManager.playSE('jumpscare');
        document.body.classList.add('screen-shake');
        
        setTimeout(() => {
            overlay.style.display = 'none';
            document.body.classList.remove('screen-shake');
        }, 800);
    },

    garbleText(text) {
        const garbled = 'ﾈ??ｶ%$#@!ﾎﾞ◆■▲●★☆♪♫♬ᚠᚢᚦᚨᚱ';
        let result = '';
        for (let i = 0; i < text.length; i++) {
            if (Math.random() < 0.5) {
                result += garbled[Math.floor(Math.random() * garbled.length)];
            } else {
                result += text[i];
            }
        }
        return result;
    },

    addVignette() {
        if (!document.querySelector('.dark-vignette')) {
            const v = createElement('div', 'dark-vignette');
            document.body.appendChild(v);
        }
    },

    removeVignette() {
        const v = document.querySelector('.dark-vignette');
        if (v) v.remove();
    },

    corruptWindow(winId) {
        const win = document.getElementById(winId);
        if (win) {
            win.classList.add('corrupted');
            setTimeout(() => win.classList.remove('corrupted'), 3000);
        }
    },

    mouseJack(duration) {
        document.body.classList.add('cursor-busy');
        setTimeout(() => {
            document.body.classList.remove('cursor-busy');
        }, duration || 3000);
    },

    screenShake() {
        document.body.classList.add('screen-shake');
        setTimeout(() => document.body.classList.remove('screen-shake'), 500);
    },

    // Sister horror events
    sisterAppearance() {
        const overlay = createElement('div');
        overlay.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,0.95);z-index:99998;
            display:flex;align-items:center;justify-content:center;
            font-size:200px;cursor:pointer;
        `;
        overlay.textContent = '👁️';
        overlay.onclick = () => overlay.remove();
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            if (overlay.parentElement) overlay.remove();
        }, 3000);
    },

    // Random horror event check
    checkRandomHorror() {
        const darkness = GameManager.state.params.sister_darkness;
        const corruption = GameManager.state.params.corruption;
        
        if (darkness >= 3 && Math.random() < 0.1) {
            this.addVignette();
        }
        if (darkness >= 5 && Math.random() < 0.05) {
            this.showGlitch('scanlines');
            setTimeout(() => this.hideGlitch(), 1000);
        }
        if (darkness >= 8 && Math.random() < 0.03) {
            this.sisterAppearance();
        }
        if (corruption >= 5 && Math.random() < 0.05) {
            this.mouseJack(2000);
        }
    },
};

// Random horror check every 30 seconds
setInterval(() => {
    if (GameManager.state.gamePhase === 'desktop') {
        Effects.checkRandomHorror();
    }
}, 30000);
