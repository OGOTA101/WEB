/* ========================================
   Bar-Code Tactics: 凸（TOTSU）
   LocalStorage管理
   ======================================== */

const Storage = {
    /**
     * ゲームデータを取得
     */
    getData() {
        try {
            const data = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load data:', e);
        }

        // 初期データを作成
        return this.createInitialData();
    },

    /**
     * ゲームデータを保存
     */
    saveData(data) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save data:', e);
            return false;
        }
    },

    /**
     * 初期データを作成
     */
    createInitialData() {
        const data = {
            userId: this.generateUserId(),
            deck: ['default_red', 'default_blue', 'default_green', 'default_yellow'],
            stock: [...CONFIG.DEFAULT_UNITS],
            progress: {
                clearedStages: []
            },
            settings: {
                bgmVolume: 0.5,
                seVolume: 0.8
            }
        };

        this.saveData(data);
        return data;
    },

    /**
     * ユーザーIDを生成
     */
    generateUserId() {
        return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    /**
     * デッキを取得
     */
    getDeck() {
        const data = this.getData();
        return data.deck.map(id => this.getUnitById(id)).filter(u => u !== null);
    },

    /**
     * デッキを保存
     */
    saveDeck(deckIds) {
        const data = this.getData();
        data.deck = deckIds;
        this.saveData(data);
    },

    /**
     * ストックを取得
     */
    getStock() {
        const data = this.getData();
        return data.stock || [];
    },

    /**
     * ユニットをストックに追加
     */
    addToStock(unit) {
        const data = this.getData();

        // 重複チェック
        const exists = data.stock.some(u => u.seed === unit.seed);
        if (exists) {
            return { success: false, message: 'このユニットは既に登録されています' };
        }

        // ストック上限チェック
        if (data.stock.length >= 50) {
            return { success: false, message: 'ストックが上限（50体）に達しています' };
        }

        data.stock.push(unit);
        this.saveData(data);
        return { success: true, message: 'ストックに追加しました' };
    },

    /**
     * ユニットをストックから削除
     */
    removeFromStock(unitId) {
        const data = this.getData();

        // デフォルトユニットは削除不可
        const unit = data.stock.find(u => u.id === unitId);
        if (unit && unit.isDefault) {
            return { success: false, message: 'デフォルトユニットは削除できません' };
        }

        // デッキに入っているユニットは削除不可
        if (data.deck.includes(unitId)) {
            return { success: false, message: 'デッキに入っているユニットは削除できません' };
        }

        data.stock = data.stock.filter(u => u.id !== unitId);
        this.saveData(data);
        return { success: true, message: '削除しました' };
    },

    /**
     * IDからユニットを取得
     */
    getUnitById(unitId) {
        const data = this.getData();
        return data.stock.find(u => u.id === unitId) || null;
    },

    /**
     * クリア済みステージを取得
     */
    getClearedStages() {
        const data = this.getData();
        return data.progress.clearedStages || [];
    },

    /**
     * ステージクリアを記録
     */
    markStageCleared(stageId) {
        const data = this.getData();
        if (!data.progress.clearedStages.includes(stageId)) {
            data.progress.clearedStages.push(stageId);
            this.saveData(data);
        }
    },

    /**
     * ステージがアンロックされているか
     */
    isStageUnlocked(stageId) {
        if (stageId === 1) return true;
        const cleared = this.getClearedStages();
        return cleared.includes(stageId - 1);
    },

    /**
     * データをリセット
     */
    resetData() {
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        return this.createInitialData();
    }
};

// グローバルにエクスポート
window.Storage = Storage;
