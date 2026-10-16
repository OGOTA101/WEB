/* ============================================
   SAVE MANAGER
   ============================================ */

const SaveManager = {
    PREFIX: 'kimikoi_save_',

    save(slot, state) {
        const data = {
            playerName: state.playerName,
            currentDay: state.currentDay,
            params: { ...state.params },
            flags: { ...state.flags },
            gameTime: { ...state.gameTime },
            loopCount: state.loopCount,
            novelProgress: { ...state.novelProgress },
            choiceHistory: [...state.choiceHistory],
            items: [...state.items],
            savedAt: new Date().toLocaleString('ja-JP'),
        };
        try {
            localStorage.setItem(this.PREFIX + slot, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('SaveManager: Failed to save', e);
            return false;
        }
    },

    getSlot(slot) {
        try {
            const data = localStorage.getItem(this.PREFIX + slot);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    hasSaves() {
        for (let i = 1; i <= 6; i++) {
            if (this.getSlot(i)) return true;
        }
        return false;
    },

    deleteSlot(slot) {
        localStorage.removeItem(this.PREFIX + slot);
    },
};

/* ============================================
   SOUND MANAGER (placeholder - no actual audio)
   ============================================ */

const SoundManager = {
    volumes: { master: 100, bgm: 50, se: 60, voice: 90 },
    currentBGMName: null,
    bgmAudio: null,

    init() {
        // Add global click SE for buttons and interactive elements
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('.desktop-icon') || e.target.closest('.start-menu-item') || e.target.closest('.lime-contact')) {
                this.playSE('click');
            }
        });
    },

    setMaster(val) { this.volumes.master = parseInt(val); this.updateVolume(); },
    setBGM(val) { this.volumes.bgm = parseInt(val); this.updateVolume(); },
    setSE(val) { this.volumes.se = parseInt(val); },

    updateVolume() {
        if (this.bgmAudio) {
            this.bgmAudio.volume = (this.volumes.bgm / 100) * (this.volumes.master / 100);
        }
    },

    playBGM(name) {
        if (this.currentBGMName === name) return;
        this.stopBGM();
        this.currentBGMName = name;

        let src = null;
        if (name === 'BGM_TITLE') {
            src = 'assets/ontama_piano2_milktea.mp3';
        } else if (name === 'BGM_NOVEL') {
            src = 'assets/ontama_piano2_yubikiri.mp3';
        }
        
        if (src) {
            this.bgmAudio = new Audio(src);
            this.bgmAudio.loop = true;
            this.updateVolume();
            this.bgmAudio.play().catch(e => console.log('BGM Autoplay prevented'));
        }
    },
    
    stopBGM() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio = null;
        }
        this.currentBGMName = null;
    },
    
    playSE(name) {
        const audio = new Audio('assets/決定ボタンを押す2.mp3');
        audio.volume = (this.volumes.se / 100) * (this.volumes.master / 100);
        audio.play().catch(e => {});
    },
};
