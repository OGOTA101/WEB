/* ========================================
   Bar-Code Tactics: 凸（TOTSU）
   ゲーム設定
   ======================================== */

const CONFIG = {
    // ゲームバージョン
    VERSION: '1.0.0',
    STORAGE_KEY: 'barcode_tactics_v1',

    // ユニット生成
    GENERATION: {
        DEFAULT_COST: 2500,
        MIN_COST: 2500,
        MAX_COST: 5000,

        // レアリティ確率
        RARITY: {
            NORMAL: { min: 2500, max: 3000, chance: 0.40 },
            RARE: { min: 3001, max: 4000, chance: 0.40 },
            SUPER_RARE: { min: 4001, max: 4800, chance: 0.15 },
            LEGEND: { min: 4801, max: 5000, chance: 0.05 }
        },

        // パラメータ制限
        CAPS: {
            HP: { min: 50, max: 4000 },
            ATK: { min: 1, max: 100 },
            DEF: { min: 0, max: 80 },
            RNG: { min: 1, max: 5 },
            SPD: { min: 1, max: 20 }
        }
    },

    // クラス判定
    CLASS: {
        INFANTRY: 'infantry',    // 歩兵
        CAVALRY: 'cavalry',      // 騎馬
        TANK: 'tank',            // 重装
        RANGE: 'range',          // 遠距離
        SPECIAL: 'special'       // 忍
    },

    // クラス判定閾値
    CLASS_THRESHOLD: {
        CAVALRY_SPD: 10,
        TANK_DEF: 30,
        TANK_SPD_MAX: 5,
        RANGE_RNG: 2,
        SPECIAL_ATK: 50,
        SPECIAL_DEF_MAX: 20
    },

    // クラス相性（1.5倍ダメージ）
    CLASS_ADVANTAGE: {
        cavalry: ['range'],     // 騎馬 → 遠距離に有利
        range: ['tank'],        // 遠距離 → 重装に有利
        tank: ['cavalry'],      // 重装 → 騎馬に有利
        special: ['infantry', 'cavalry', 'tank', 'range'] // 忍 → 全てに攻撃有利
    },

    // 出撃コスト
    DEPLOY_COST: {
        LOW: { maxPower: 2500, cost: 3 },
        MID: { maxPower: 3500, cost: 4 },
        HIGH: { maxPower: 4500, cost: 6 },
        ULTRA: { maxPower: 5000, cost: 8 }
    },

    // バトル設定
    BATTLE: {
        COST_MAX: 10,
        COST_START: 5,
        COST_PER_SECOND: 1,

        MAX_UNITS_ON_FIELD: 3,

        ATTACK_INTERVAL: 1000,  // ミリ秒
        MIN_DAMAGE: 1,
        DAMAGE_VARIANCE: 0.2,   // ±20%
        ADVANTAGE_MULTIPLIER: 1.5,

        // 射程別攻撃間隔（ミリ秒）
        RANGE_ATTACK_INTERVAL: {
            1: 1000,
            2: 1500,
            3: 2000,
            4: 2500,
            5: 3000
        },

        // ユニットサイズ（描画用）
        UNIT_SIZE: 40,

        // 移動速度係数
        SPEED_MULTIPLIER: 30,

        // 攻撃範囲（ピクセル）
        ATTACK_RANGE: {
            1: 50,
            2: 100,
            3: 150,
            4: 200,
            5: 250
        }
    },

    // ステージ設定
    STAGES: [
        { id: 1, name: '初陣の野', desc: '最初の戦い', enemies: [1500, 1500] },
        { id: 2, name: '平原の戦い', desc: '広い平原での戦闘', enemies: [2000, 2000] },
        { id: 3, name: '山道の伏兵', desc: '伏兵に注意', enemies: [2000, 2000, 2000] },
        { id: 4, name: '川辺の攻防', desc: '川を挟んでの攻防', enemies: [2500, 2500, 2500] },
        { id: 5, name: '城門突破戦', desc: '城門を突破せよ', enemies: [2500, 2500, 2500, 2500] },
        { id: 6, name: '激戦の荒野', desc: '荒野での激戦', enemies: [3000, 3000, 3000] },
        { id: 7, name: '騎馬軍団', desc: '高速の騎馬隊', enemies: [3500, 3500, 3500], type: 'cavalry' },
        { id: 8, name: '鉄壁の陣', desc: '堅い守りを崩せ', enemies: [4000, 4000, 4000], type: 'tank' },
        { id: 9, name: '弓兵の嵐', desc: '遠距離攻撃の嵐', enemies: [3500, 3500, 3500, 3500], type: 'range' },
        { id: 10, name: '魔王の城', desc: '最終決戦', enemies: [5000, 5000, 5000, 5000] }
    ],

    // デフォルト軍
    DEFAULT_UNITS: [
        {
            id: 'default_red',
            seed: 'default_red_seed_v1',
            name: '赤の軍',
            totalCost: 2500,
            stats: { hp: 1200, atk: 12, def: 8, rng: 1, spd: 8 },
            class: 'infantry',
            isDefault: true
        },
        {
            id: 'default_blue',
            seed: 'default_blue_seed_v1',
            name: '青の軍',
            totalCost: 2500,
            stats: { hp: 800, atk: 8, def: 5, rng: 1, spd: 12 },
            class: 'cavalry',
            isDefault: true
        },
        {
            id: 'default_green',
            seed: 'default_green_seed_v1',
            name: '緑の軍',
            totalCost: 2500,
            stats: { hp: 1500, atk: 6, def: 15, rng: 1, spd: 4 },
            class: 'tank',
            isDefault: true
        },
        {
            id: 'default_yellow',
            seed: 'default_yellow_seed_v1',
            name: '黄の軍',
            totalCost: 2500,
            stats: { hp: 600, atk: 10, def: 3, rng: 3, spd: 6 },
            class: 'range',
            isDefault: true
        }
    ],

    // 命名用漢字プール
    NAME_KANJI: [
        '疾', '風', '鉄', '壁', '紅', '蓮', '雷', '神', '影', '龍',
        '鬼', '武', '聖', '覇', '剣', '盾', '炎', '氷', '光', '闇',
        '烈', '天', '地', '海', '山', '虎', '狼', '鷹', '隼', '熊'
    ],

    // クラス表示
    CLASS_DISPLAY: {
        infantry: { name: '歩兵', symbol: '凸', color: '#FFFFFF' },
        cavalry: { name: '騎馬', symbol: '凸', color: '#4A90D9' },
        tank: { name: '重装', symbol: '回', color: '#D4A853' },
        range: { name: '遠距離', symbol: '凸', color: '#D95050' },
        special: { name: '忍', symbol: '凵', color: '#9B59B6' }
    },

    // レアリティ表示
    RARITY_DISPLAY: {
        NORMAL: { name: '並', color: '#AAAAAA' },
        RARE: { name: '良', color: '#4A90D9' },
        SUPER_RARE: { name: '激強', color: '#9B59B6' },
        LEGEND: { name: '神', color: '#FFD700' }
    }
};

// グローバルにエクスポート
window.CONFIG = CONFIG;
