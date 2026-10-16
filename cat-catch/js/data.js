/**
 * Cat Catch - Data Manager
 * セーブデータの管理
 */

const DataManager = {
    // デフォルトのセーブデータ
    defaultData: {
        highScore: 0,
        maxWave: 0,
        currency: 0,
        gachaItems: [],
        equipped: {
            cat: null,
            ufo: null
        },
        upgrades: {
            ufo_capacity: 1,
            ufo_speed: 1,
            ufo_capture_speed: 1,
            ufo_capture_range: 1,
            ufo_eject_speed: 1,
            castle_hp: 1,
            castle_regen: 0,
            castle_armor: 1,
            skill_multi_capture: 1,
            skill_auto_eject: 0,
            skill_slow_aura: 1,
            skill_magnet: 0,
            skill_shield: 0,
            bonus_score: 1,
            bonus_currency: 1,
            bonus_exp: 1
        },
        settings: {
            bgmVolume: 0.5,
            seVolume: 0.5,
            selectedBgm: 0
        }
    },

    // 現在のデータ
    data: null,

    /**
     * データを読み込む
     */
    load() {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (saved) {
                this.data = { ...this.defaultData, ...JSON.parse(saved) };
                // 新しいフィールドがあれば追加
                this.data.upgrades = { ...this.defaultData.upgrades, ...this.data.upgrades };
                this.data.settings = { ...this.defaultData.settings, ...this.data.settings };
            } else {
                this.data = { ...this.defaultData };
            }
        } catch (e) {
            console.error('Failed to load data:', e);
            this.data = { ...this.defaultData };
        }
        return this.data;
    },

    /**
     * データを保存する
     */
    save() {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.data));
        } catch (e) {
            console.error('Failed to save data:', e);
        }
    },

    /**
     * 通貨を追加
     */
    addCurrency(amount) {
        this.data.currency += amount;
        this.save();
    },

    /**
     * 通貨を消費
     */
    spendCurrency(amount) {
        if (this.data.currency >= amount) {
            this.data.currency -= amount;
            this.save();
            return true;
        }
        return false;
    },

    /**
     * ステータスをアップグレード
     */
    upgrade(upgradeId) {
        const upgradeDef = CONFIG.UPGRADES[upgradeId];
        if (!upgradeDef) return false;

        const currentLevel = this.data.upgrades[upgradeId] || 1;
        if (currentLevel >= upgradeDef.maxLevel) return false;

        const cost = Math.floor(upgradeDef.baseCost * Math.pow(1.5, currentLevel - 1));
        if (!this.spendCurrency(cost)) return false;

        this.data.upgrades[upgradeId] = currentLevel + 1;
        this.save();
        return true;
    },

    /**
     * 現在のステータス値を取得
     */
    getStatValue(upgradeId) {
        const upgradeDef = CONFIG.UPGRADES[upgradeId];
        if (!upgradeDef) return null;

        const level = this.data.upgrades[upgradeId] || 1;
        return upgradeDef.effect(level);
    },

    /**
     * ハイスコアを更新
     */
    updateHighScore(score) {
        if (score > this.data.highScore) {
            this.data.highScore = score;
            this.save();
            return true;
        }
        return false;
    },

    /**
     * 最大ウェーブを更新
     */
    updateMaxWave(wave) {
        if (wave > this.data.maxWave) {
            this.data.maxWave = wave;
            this.save();
            return true;
        }
        return false;
    },

    /**
     * 設定を更新
     */
    updateSettings(key, value) {
        if (this.data.settings.hasOwnProperty(key)) {
            this.data.settings[key] = value;
            this.save();
        }
    },

    /**
     * データをリセット
     */
    reset() {
        this.data = { ...this.defaultData };
        this.save();
    }
};

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}
