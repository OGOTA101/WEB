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
    /**
     * 総合コストとレアリティを決定
     */
    determineTotalCost(rng) {
        const roll = rng();
        const { RARITY } = CONFIG.GENERATION;

        // レアリティ抽選
        let cumulative = 0;
        let selectedRarity = 'NORMAL';

        for (const [name, data] of Object.entries(RARITY)) {
            cumulative += data.chance;
            if (roll < cumulative) {
                selectedRarity = name;
                break;
            }
        }

        // 3000〜10000の範囲でコストを設定
        // レアリティに応じて最低値を引き上げる
        // NORMAL: 3000-4000
        // RARE: 4000-6000
        // SUPER_RARE: 6000-8000
        // ULTRA_RARE: 8000-10000

        // 実際のRARITY設定はconfig.jsにあるが、ここではハードコードロジックでオーバーライド気味に実装
        let minCost = 3000;
        let maxCost = 4000;

        if (selectedRarity === 'RARE') {
            minCost = 4000;
            maxCost = 6000;
        } else if (selectedRarity === 'SUPER_RARE') {
            minCost = 6000;
            maxCost = 8000;
        } else if (selectedRarity === 'ULTRA_RARE') {
            minCost = 8000;
            maxCost = 10000;
        }

        // 生成
        const totalCost = Math.floor(minCost + rng() * (maxCost - minCost));

        return { totalCost, rarity: selectedRarity };
    },

    /**
     * パラメータを分配
     */
    distributeStats(rng, totalCost) {
        // 最低保証値
        const MIN_VAL = 100;
        const STAT_COUNT = 5; // HP, ATK, DEF, RNG, SPD

        // まず最低値を確保
        let remaining = totalCost - (MIN_VAL * STAT_COUNT);
        if (remaining < 0) remaining = 0;

        // ランダムな重み付け
        // 基本重み
        let wHp = 1.5 + rng();   // HPは少し重めだが以前より減らす
        let wAtk = 1.0 + rng();
        let wDef = 1.0 + rng();
        let wRng = 1.0 + rng();
        let wSpd = 1.0 + rng();

        // 50%の確率で「特化型」になり、いずれかのステータスが大きく伸びる
        if (rng() < 0.5) {
            const types = ['atk', 'def', 'rng', 'spd'];
            const focus = types[Math.floor(rng() * types.length)];
            const bonus = 3.0 + rng() * 2.0; // 強力なボーナス

            if (focus === 'atk') wAtk += bonus;
            else if (focus === 'def') wDef += bonus;
            else if (focus === 'rng') wRng += bonus;
            else if (focus === 'spd') wSpd += bonus;
        }

        const totalWeight = wHp + wAtk + wDef + wRng + wSpd;

        // 割り振り
        let hp = Math.floor(MIN_VAL + (wHp / totalWeight) * remaining);
        let atk = Math.floor(MIN_VAL + (wAtk / totalWeight) * remaining);
        let def = Math.floor(MIN_VAL + (wDef / totalWeight) * remaining);
        let rngStat = Math.floor(MIN_VAL + (wRng / totalWeight) * remaining);
        let spd = Math.floor(MIN_VAL + (wSpd / totalWeight) * remaining);

        return { hp, atk, def, rng: rngStat, spd };
    },

    /**
     * ステータスからクラスを判定
     */
    determineClass(stats) {
        const { CLASS } = CONFIG;

        // ステータス値とその対応クラスを定義
        const params = [
            { val: stats.atk, cls: CLASS.SPECIAL }, // 攻撃特化 -> 忍者
            { val: stats.def, cls: CLASS.TANK },    // 防御特化 -> 重装
            { val: stats.rng, cls: CLASS.RANGE },   // 射程特化 -> 弓兵
            { val: stats.spd, cls: CLASS.CAVALRY }  // 機動特化 -> 騎兵
        ];

        // 値の大きい順にソート
        params.sort((a, b) => b.val - a.val);

        const first = params[0];
        const second = params[1];

        // 全て0などの異常値
        if (first.val === 0) return CLASS.INFANTRY;

        // 1位が2位より一定以上大きければ、そのクラスにする
        // 閾値を 1.05 (5%差) に緩和して、特色が出やすくする
        if (first.val >= second.val * 1.05) {
            return first.cls;
        }

        // 差が小さければバランス型として歩兵
        return CLASS.INFANTRY;
    },

    /**
     * ランダムな名前を生成
     */
    generateName(seed, rng) {
        const prefixes = ['赤の', '青の', '疾風の', '鉄壁の', '古の', '新星', '猛き', '静かなる', '光の', '闇の'];
        const roots = ['騎士', '兵士', '射手', '忍者', '侍', '魔導士', '竜', '巨神', '精霊', '守護者'];
        const suffixes = ['アルファ', 'ベータ', 'オメガ', 'ゼロ', 'カイ', 'ジン', 'レイ', 'ミナ', 'タケル', 'サクラ'];

        const p = prefixes[Math.floor(rng() * prefixes.length)];
        const r = roots[Math.floor(rng() * roots.length)];
        const s = suffixes[Math.floor(rng() * suffixes.length)];

        // 30%の確率で二つ名形式、70%でカタカナ名
        if (rng() < 0.3) {
            return `${p}${r}`;
        } else {
            return `${r}・${s}`;
        }
    },

    /**
     * 敵ユニットを生成（ステージ用）
     */
    generateEnemy(power, type = null) {
        // ランダムなシードを生成
        const seed = 'enemy_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const rng = new Math.seedrandom(seed);

        // 指定powerがない場合はデフォルト3000
        const actualPower = power || 3000;

        // 固定のtotalCostでパラメータ生成
        const stats = this.distributeStatsWithPower(rng, actualPower, type);
        const unitClass = type || this.determineClass(stats);

        // 敵の名前
        const enemyNames = ['敵軍', '賊軍', '敵兵', '侵略軍', '魔軍'];
        const name = enemyNames[Math.floor(rng() * enemyNames.length)];

        return {
            id: seed,
            seed,
            name,
            totalCost: actualPower,
            stats,
            class: unitClass,
            isEnemy: true
        };
    },

    /**
     * 指定されたパワーでステータスを生成（敵用）
     */
    distributeStatsWithPower(rng, power, type = null) {
        const MIN_VAL = 100;
        const STAT_COUNT = 5;
        let remaining = power - (MIN_VAL * STAT_COUNT);
        if (remaining < 0) remaining = 0;

        // タイプに応じて重みを調整
        let wHp = 2.0, wAtk = 1.0, wDef = 1.0, wRng = 1.0, wSpd = 1.0;

        switch (type) {
            case 'cavalry':
                wSpd = 3.0; // 機動重視
                wAtk = 1.5;
                break;
            case 'tank':
                wDef = 3.0; // 防御重視
                wHp = 3.0;
                break;
            case 'range':
                wRng = 3.0; // 射程重視
                break;
            default:
                // ランダム
                wHp += rng();
                wAtk += rng();
                wDef += rng();
                wRng += rng();
                wSpd += rng();
        }

        const totalWeight = wHp + wAtk + wDef + wRng + wSpd;

        let hp = Math.floor(MIN_VAL + (wHp / totalWeight) * remaining);
        let atk = Math.floor(MIN_VAL + (wAtk / totalWeight) * remaining);
        let def = Math.floor(MIN_VAL + (wDef / totalWeight) * remaining);
        let rngStat = Math.floor(MIN_VAL + (wRng / totalWeight) * remaining);
        let spd = Math.floor(MIN_VAL + (wSpd / totalWeight) * remaining);

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
