/* ========================================
   Bar-Code Tactics: 凸（TOTSU）
   ユニット生成ロジック
   ======================================== */

const UnitGenerator = {
    /**
     * シード文字列からユニットを生成
     * @param {string} seed - バーコード/QRの文字列
     * @param {string} customName - カスタム名（オプション）
     * @returns {Object} 生成されたユニット
     */
    generate(seed, customName = null) {
        // シード付き乱数生成器を初期化
        const rng = new Math.seedrandom(seed);

        // ユニークIDを生成
        const id = this.generateId(seed);

        // 総合コストを決定（レアリティ抽選）
        const { totalCost, rarity } = this.determineTotalCost(rng);

        // パラメータを分配
        const stats = this.distributeStats(rng, totalCost);

        // クラスを判定
        const unitClass = this.determineClass(stats);

        // 名前を決定
        const name = customName || this.generateName(seed, rng);

        return {
            id,
            seed,
            name,
            customName,
            totalCost,
            rarity,
            stats,
            class: unitClass,
            isDefault: false,
            createdAt: new Date().toISOString()
        };
    },

    /**
     * シードからユニークIDを生成
     */
    generateId(seed) {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return 'unit_' + Math.abs(hash).toString(16);
    },

    /**
     * 総合コストとレアリティを決定
     */
    determineTotalCost(rng) {
        const roll = rng();
        const { RARITY } = CONFIG.GENERATION;

        let cumulative = 0;
        let selectedRarity = 'NORMAL';

        for (const [name, data] of Object.entries(RARITY)) {
            cumulative += data.chance;
            if (roll < cumulative) {
                selectedRarity = name;
                break;
            }
        }

        const rarityData = RARITY[selectedRarity];
        const range = rarityData.max - rarityData.min;
        const totalCost = Math.floor(rarityData.min + rng() * range);

        return { totalCost, rarity: selectedRarity };
    },

    /**
     * パラメータを分配
     */
    distributeStats(rng, totalCost) {
        const { CAPS } = CONFIG.GENERATION;

        // HPの決定（総コストの20%〜80%）
        const minHP = Math.max(CAPS.HP.min, Math.floor(totalCost * 0.2));
        const maxHP = Math.min(CAPS.HP.max, Math.floor(totalCost * 0.8));
        const hp = Math.floor(minHP + rng() * (maxHP - minHP));

        // 残りポイント
        const restPoints = totalCost - hp;

        // 重み付きで各ステータスに分配
        const weights = [rng(), rng(), rng(), rng()]; // ATK, DEF, RNG, SPD
        const totalWeight = weights.reduce((a, b) => a + b, 0);

        // 重みを正規化して割り振り
        const rawAtk = (weights[0] / totalWeight) * restPoints;
        const rawDef = (weights[1] / totalWeight) * restPoints;
        const rawRng = (weights[2] / totalWeight) * restPoints;
        const rawSpd = (weights[3] / totalWeight) * restPoints;

        // スケーリングして制限内に収める
        const atk = this.clamp(Math.floor(rawAtk / 10), CAPS.ATK.min, CAPS.ATK.max);
        const def = this.clamp(Math.floor(rawDef / 15), CAPS.DEF.min, CAPS.DEF.max);
        const rngStat = this.clamp(Math.floor(rawRng / 200) + 1, CAPS.RNG.min, CAPS.RNG.max);
        const spd = this.clamp(Math.floor(rawSpd / 30), CAPS.SPD.min, CAPS.SPD.max);

        return { hp, atk, def, rng: rngStat, spd };
    },

    /**
     * クラスを判定
     */
    determineClass(stats) {
        const { CLASS_THRESHOLD } = CONFIG;
        const { atk, def, rng, spd } = stats;

        // 遠距離判定（最優先）
        if (rng >= CLASS_THRESHOLD.RANGE_RNG) {
            return CONFIG.CLASS.RANGE;
        }

        // 忍（特殊）判定
        if (atk >= CLASS_THRESHOLD.SPECIAL_ATK && def <= CLASS_THRESHOLD.SPECIAL_DEF_MAX) {
            return CONFIG.CLASS.SPECIAL;
        }

        // 騎馬判定
        if (spd >= CLASS_THRESHOLD.CAVALRY_SPD) {
            return CONFIG.CLASS.CAVALRY;
        }

        // 重装判定
        if (def >= CLASS_THRESHOLD.TANK_DEF && spd <= CLASS_THRESHOLD.TANK_SPD_MAX) {
            return CONFIG.CLASS.TANK;
        }

        // デフォルトは歩兵
        return CONFIG.CLASS.INFANTRY;
    },

    /**
     * 名前を自動生成
     */
    generateName(seed, rng) {
        // 日本語が含まれているかチェック
        if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(seed)) {
            // 日本語が含まれている場合、最初の8文字を使用
            return seed.substring(0, 8) + '軍';
        }

        // 数字のみの場合（バーコード）
        if (/^\d+$/.test(seed)) {
            const lastFour = seed.slice(-4);
            return `第${lastFour}部隊`;
        }

        // その他はランダム漢字2文字
        const kanji = CONFIG.NAME_KANJI;
        const char1 = kanji[Math.floor(rng() * kanji.length)];
        const char2 = kanji[Math.floor(rng() * kanji.length)];
        return char1 + char2 + '軍';
    },

    /**
     * 出撃コストを取得
     */
    getDeployCost(unit) {
        const power = unit.totalCost;
        const { DEPLOY_COST } = CONFIG;

        if (power <= DEPLOY_COST.LOW.maxPower) return DEPLOY_COST.LOW.cost;
        if (power <= DEPLOY_COST.MID.maxPower) return DEPLOY_COST.MID.cost;
        if (power <= DEPLOY_COST.HIGH.maxPower) return DEPLOY_COST.HIGH.cost;
        return DEPLOY_COST.ULTRA.cost;
    },

    /**
     * 敵ユニットを生成（ステージ用）
     */
    generateEnemy(power, type = null) {
        // ランダムなシードを生成
        const seed = 'enemy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const rng = new Math.seedrandom(seed);

        // 固定のtotalCostでパラメータ生成
        const stats = this.distributeStatsWithPower(rng, power, type);
        const unitClass = type || this.determineClass(stats);

        // 敵の名前
        const enemyNames = ['敵軍', '賊軍', '敵兵', '侵略軍', '魔軍'];
        const name = enemyNames[Math.floor(rng() * enemyNames.length)];

        return {
            id: seed,
            seed,
            name,
            totalCost: power,
            stats,
            class: unitClass,
            isEnemy: true
        };
    },

    /**
     * 指定されたパワーでステータスを生成（敵用）
     */
    distributeStatsWithPower(rng, power, type = null) {
        const { CAPS } = CONFIG.GENERATION;

        // HPの決定
        const minHP = Math.max(CAPS.HP.min, Math.floor(power * 0.3));
        const maxHP = Math.min(CAPS.HP.max, Math.floor(power * 0.7));
        const hp = Math.floor(minHP + rng() * (maxHP - minHP));

        const restPoints = power - hp;

        // タイプに応じて重みを調整
        let weights;
        switch (type) {
            case 'cavalry':
                weights = [0.3, 0.1, 0.1, 0.5]; // SPD重視
                break;
            case 'tank':
                weights = [0.2, 0.5, 0.1, 0.2]; // DEF重視
                break;
            case 'range':
                weights = [0.3, 0.1, 0.5, 0.1]; // RNG重視
                break;
            default:
                weights = [rng(), rng(), rng(), rng()];
        }

        const totalWeight = weights.reduce((a, b) => a + b, 0);

        const rawAtk = (weights[0] / totalWeight) * restPoints;
        const rawDef = (weights[1] / totalWeight) * restPoints;
        const rawRng = (weights[2] / totalWeight) * restPoints;
        const rawSpd = (weights[3] / totalWeight) * restPoints;

        const atk = this.clamp(Math.floor(rawAtk / 10), CAPS.ATK.min, CAPS.ATK.max);
        const def = this.clamp(Math.floor(rawDef / 15), CAPS.DEF.min, CAPS.DEF.max);
        let rngStat = this.clamp(Math.floor(rawRng / 200) + 1, CAPS.RNG.min, CAPS.RNG.max);
        const spd = this.clamp(Math.floor(rawSpd / 30), CAPS.SPD.min, CAPS.SPD.max);

        // タイプが遠距離なら射程を確保
        if (type === 'range' && rngStat < 3) {
            rngStat = 3;
        }

        return { hp, atk, def, rng: rngStat, spd };
    },

    /**
     * 値を範囲内にクランプ
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * クラス相性をチェック
     */
    hasAdvantage(attackerClass, defenderClass) {
        const advantages = CONFIG.CLASS_ADVANTAGE[attackerClass];
        return advantages && advantages.includes(defenderClass);
    }
};

// グローバルにエクスポート
window.UnitGenerator = UnitGenerator;
