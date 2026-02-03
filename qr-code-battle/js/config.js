/* ========================================
   QR Code Battle: 凸（TOTSU）
   ゲーム設定
   ======================================== */

const CONFIG = {
    // ゲームバージョン
    VERSION: '1.2.0',
    STORAGE_KEY: 'qr_code_battle_v1',

    // ユニット生成
    GENERATION: {
        DEFAULT_COST: 3000,
        MIN_COST: 3000,
        MAX_COST: 6000,

        // レアリティ確率
        RARITY: {
            NORMAL: { min: 3000, max: 3500, chance: 0.40 },
            RARE: { min: 3501, max: 4500, chance: 0.40 },
            SUPER_RARE: { min: 4501, max: 5500, chance: 0.15 },
            LEGEND: { min: 5501, max: 6000, chance: 0.05 }
        },

        // パラメータ制限
        CAPS: {
            HP: { min: 50, max: 5000 },
            ATK: { min: 1, max: 1000 },
            DEF: { min: 0, max: 800 },
            RNG: { min: 1, max: 5000 },
            SPD: { min: 1, max: 2000 }
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

    // クラス判定閾値 (新ステータス基準: Avg ~500)
    CLASS_THRESHOLD: {
        CAVALRY_SPD: 600,
        TANK_DEF: 600,
        TANK_SPD_MAX: 400,
        RANGE_RNG: 500,
        SPECIAL_ATK: 700,
        SPECIAL_DEF_MAX: 300
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
        LOW: { maxPower: 3000, cost: 3 },
        MID: { maxPower: 4000, cost: 4 },
        HIGH: { maxPower: 5000, cost: 6 },
        ULTRA: { maxPower: 6000, cost: 8 }
    },

    // バトル設定
    BATTLE: {
        COST_MAX: 10,
        COST_START: 5,
        COST_PER_SECOND: 1,

        MAX_UNITS_ON_FIELD: 20,

        ATTACK_INTERVAL: 2000,  // 基本攻撃間隔 2.0秒
        MIN_DAMAGE: 1,          // 最低ダメージ（新計算式用）
        DAMAGE_VARIANCE: 0.2,   // ±20%
        ADVANTAGE_MULTIPLIER: 2.0, // 相性ボーナス

        // 射程別攻撃間隔（ミリ秒）
        BASE_ATTACK_INTERVAL: 2000,

        // ユニットサイズ
        UNIT_SIZE: 40,

        // 移動速度係数
        SPEED_MULTIPLIER: 0.025,

        // 射程スケーリング
        // ユーザー要望: 1/4に縮小 (0.1 -> 0.025)
        RANGE_PIXEL_MULTIPLIER: 0.025
    },

    // 地形効果定義
    TERRAIN_EFFECTS: {
        normal: { spd: 1.0, atk: 1.0 },
        bad_road: { spd: 0.5, atk: 1.0 }, // 悪路: 速度減
        river: { spd: 0.3, atk: 0.5 },    // 川: 速度激減、攻撃半減
        mountain: { spd: 0.6, atk: 1.0 }  // 山: 基本遅い（方向による補正はロジックで）
    },

    // オブジェクト定義
    OBJECT_STATS: {
        wall: { hp: 2000, name: '土壁', width: 60, height: 20 },
        rock: { hp: 5000, name: '岩', width: 40, height: 40 },
        base: { hp: 10000, name: '砦', width: 80, height: 80 }
    },

    // ステージ設定
    STAGES: [
        { id: 1, name: '初陣の野', desc: '最初の戦い', enemies: [3000, 3000] },
        { id: 2, name: '平原の戦い', desc: '広い平原での戦闘', enemies: [3600, 3600] },
        {
            id: 3, name: '山道の伏兵', desc: '険しい山道', enemies: [3600, 3600, 3600],
            map: {
                terrain: [
                    { type: 'mountain', x: 0, y: 300, w: 400, h: 300 } // 中央部が山
                ],
                objects: [
                    { type: 'rock', x: 100, y: 400 },
                    { type: 'rock', x: 300, y: 400 }
                ]
            }
        },
        {
            id: 4, name: '川辺の攻防', desc: '川を渡る試練', enemies: [4200, 4200, 4200],
            map: {
                terrain: [
                    { type: 'river', x: 0, y: 350, w: 400, h: 100 } // 中央を横切る川
                ]
            }
        },
        {
            id: 5, name: '城門突破戦', desc: '城門を破壊せよ', enemies: [4200, 4200, 4200, 4200],
            map: {
                objects: [
                    { type: 'wall', x: 100, y: 200 },
                    { type: 'wall', x: 200, y: 200 }, // 中央ゲート
                    { type: 'wall', x: 300, y: 200 }
                ]
            }
        },
        {
            id: 6, name: '激戦の荒野', desc: '足場の悪い荒野', enemies: [4800, 4800, 4800],
            map: {
                terrain: [
                    { type: 'bad_road', x: 50, y: 100, w: 300, h: 600 } // ステージ大半が悪路
                ]
            }
        },
        { id: 7, name: '騎馬軍団', desc: '高速の騎馬隊', enemies: [5400, 5400, 5400], type: 'cavalry' },
        { id: 8, name: '鉄壁の陣', desc: '堅い守りを崩せ', enemies: [6000, 6000, 6000], type: 'tank' },
        { id: 9, name: '弓兵の嵐', desc: '遠距離攻撃の嵐', enemies: [5400, 5400, 5400, 5400], type: 'range' },
        { id: 10, name: '魔王の城', desc: '最終決戦', enemies: [7200, 7200, 7200, 7200] }
    ],

    // デフォルト軍
    // 平均予算3000ptでの配分例
    DEFAULT_UNITS: [
        {
            id: 'default_red',
            seed: 'default_red_seed_v1',
            name: '赤の軍',
            totalCost: 3000,
            stats: { hp: 1300, atk: 400, def: 300, rng: 500, spd: 400 },
            class: 'infantry',
            isDefault: true
        },
        {
            id: 'default_blue',
            seed: 'default_blue_seed_v1',
            name: '青の軍',
            totalCost: 3000,
            stats: { hp: 1000, atk: 400, def: 200, rng: 500, spd: 700 }, // 高機動
            class: 'cavalry',
            isDefault: true
        },
        {
            id: 'default_green',
            seed: 'default_green_seed_v1',
            name: '緑の軍',
            totalCost: 3000,
            stats: { hp: 1500, atk: 300, def: 400, rng: 500, spd: 300 }, // 高防御
            class: 'tank',
            isDefault: true
        },
        {
            id: 'default_yellow',
            seed: 'default_yellow_seed_v1',
            name: '黄の軍',
            totalCost: 3000,
            stats: { hp: 800, atk: 350, def: 150, rng: 2000, spd: 300 }, // 長射程: 2000 * 0.1 = 200px
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
        infantry: { name: '歩兵', symbol: '凸', char: '歩', color: '#FFFFFF' },
        cavalry: { name: '騎馬', symbol: '凸', char: '騎', color: '#4A90D9' },
        tank: { name: '重装', symbol: '凸', char: '重', color: '#D4A853' },
        range: { name: '遠距離', symbol: '凸', char: '弓', color: '#D95050' },
        special: { name: '忍', symbol: '凸', char: '忍', color: '#9B59B6' }
    },

    // レアリティ表示
    RARITY_DISPLAY: {
        NORMAL: { name: '並', color: '#AAAAAA' },
        RARE: { name: '良', color: '#4A90D9' },
        SUPER_RARE: { name: '激強', color: '#9B59B6' },
        LEGEND: { name: '神', color: '#FFD700' }
    }
};

// ハードモードのステージ自動生成 (ID 11-20)
// ステージ1-10をベースに、パラメータを+4000して激強に
(function () {
    const HARD_START_ID = 11;
    const NORMAL_STAGES_COUNT = 10;

    for (let i = 0; i < NORMAL_STAGES_COUNT; i++) {
        const baseStage = CONFIG.STAGES[i];

        // ディープコピー
        const hardStage = JSON.parse(JSON.stringify(baseStage));

        hardStage.id = baseStage.id + 10;
        hardStage.name = '【裏】' + baseStage.name;
        hardStage.desc = 'ハード: ' + baseStage.desc;
        hardStage.isHard = true;

        // 敵戦力強化 (元の値 + 4000, 最大9999)
        if (hardStage.enemies) {
            hardStage.enemies = hardStage.enemies.map(p => Math.min(9999, p + 4000));
        }

        CONFIG.STAGES.push(hardStage);
    }
})();

// グローバルにエクスポート
window.CONFIG = CONFIG;
