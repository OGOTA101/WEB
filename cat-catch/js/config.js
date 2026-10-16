/**
 * Cat Catch - Game Configuration
 * ゲームの設定値と定数を管理
 */

const CONFIG = {
    // ゲーム基本設定
    GAME: {
        TOTAL_WAVES: 30,           // 全ウェーブ数
        CASTLE_MAX_HP: 3,          // 城の初期HP
        UFO_CAPACITY: 3,           // UFOの初期格納容量
        UFO_SPEED: 150,            // UFOの移動速度 (px/sec)
        CAPTURE_TIME: 1000,        // 格納にかかる時間 (ms)
        CAPTURE_RANGE: 64,         // 格納範囲 (px)
        EJECT_TIME: 500,           // 射出にかかる時間 (ms)
    },

    // 画面サイズ
    SCREEN: {
        ASPECT_RATIO: 9 / 16,      // 9:16 縦長
        MIN_WIDTH: 320,
        MAX_WIDTH: 480,
    },

    // アセットパス
    ASSETS: {
        IMAGES: {
            BG_FIELD: 'assets/images/bg_field.png',
            CASTLE: 'assets/images/castle.png',
            VOLCANO: 'assets/images/volcano.png',
            LAKE: 'assets/images/lake.png',
            UFO: 'assets/images/ufo.png',
            CAT: 'assets/images/cat.png',  // 後で追加
            MOUSE_NORMAL: 'assets/images/mouse_normal.png',  // 後で追加
            MOUSE_FIRE: 'assets/images/mouse_fire.png',      // 後で追加
            MOUSE_WATER: 'assets/images/mouse_water.png',    // 後で追加
            MOUSE_FAST: 'assets/images/mouse_fast.png',      // 後で追加
            MOUSE_BIG: 'assets/images/mouse_big.png',        // 後で追加
            MOUSE_BOSS: 'assets/images/mouse_boss.png',      // 後で追加
            FX_CAPTURE: 'assets/images/fx_capture.png',
            FX_FIRE: 'assets/images/fx_fire.png',
            FX_SPLASH: 'assets/images/fx_splash.png',
        },
        AUDIO: {
            BGM: [
                { id: 'bgm1', name: 'Milktea', src: 'assets/audio/ontama_piano2_milktea.mp3' },
                { id: 'bgm2', name: 'Tsubomi', src: 'assets/audio/ontama_piano2_tsubomi.mp3' },
                { id: 'bgm3', name: 'Yukidoke', src: 'assets/audio/ontama_piano2_yukidoke.mp3' },
            ],
            SE: {
                BUTTON: 'assets/audio/決定ボタンを押す33.mp3',
                CAPTURE: 'assets/audio/決定ボタンを押す41.mp3',
                EJECT: 'assets/audio/決定ボタンを押す45.mp3',
                SCENE_CHANGE: 'assets/audio/シーン切り替え2.mp3',
                TITLE: 'assets/audio/タイトル表示.mp3',
            }
        }
    },

    // フィールド配置（画面に対する割合）
    FIELD: {
        CASTLE: { x: 0.5, y: 0.45 },      // 城（中央やや上）
        VOLCANO: { x: 0.8, y: 0.75 },     // 火山（右下）
        LAKE: { x: 0.2, y: 0.75 },        // 湖（左下）
    },

    // 敵の設定
    ENEMY: {
        TYPES: {
            NORMAL: {
                id: 'normal',
                name: '通常ネズミ',
                speed: 15,           // 移動速度 (px/sec) - 半分に減速
                hp: 1,
                slots: 1,            // 格納枠消費
                weakness: 'all',     // 弱点 (all = 火山・湖どちらでもOK)
                sprite: 'mouse_normal',
            },
            FIRE: {
                id: 'fire',
                name: '炎ネズミ',
                speed: 15,
                hp: 1,
                slots: 1,
                weakness: 'water',   // 湖でのみ撃退可能
                sprite: 'mouse_fire',
            },
            WATER: {
                id: 'water',
                name: '水ネズミ',
                speed: 15,
                hp: 1,
                slots: 1,
                weakness: 'fire',    // 火山でのみ撃退可能
                sprite: 'mouse_water',
            },
            FAST: {
                id: 'fast',
                name: '速いネズミ',
                speed: 30,           // 元々60だったのを30に
                hp: 1,
                slots: 1,
                weakness: 'all',
                sprite: 'mouse_fast',
            },
            BIG: {
                id: 'big',
                name: '大きいネズミ',
                speed: 10,           // 元々20だったのを10に
                hp: 2,
                slots: 2,
                weakness: 'all',
                sprite: 'mouse_big',
            },
            BOSS: {
                id: 'boss',
                name: 'ボスネズミ',
                speed: 8,            // 元々15だったのを8に
                hp: 5,
                slots: 3,
                weakness: 'all',
                sprite: 'mouse_boss',
            },
        },
    },

    // ウェーブ設定
    WAVES: generateWaveData(),

    // ステータス強化の定義
    UPGRADES: {
        ufo_capacity: {
            name: '格納容量',
            category: 'ufo',
            baseCost: 100,
            maxLevel: 10,
            effect: (level) => 2 + level,        // 3, 4, 5, ... 12
        },
        ufo_speed: {
            name: '移動速度',
            category: 'ufo',
            baseCost: 100,
            maxLevel: 10,
            effect: (level) => 1 + (level - 1) * 0.1, // 1.0, 1.1, 1.2, ... 2.0
        },
        ufo_capture_speed: {
            name: '格納速度',
            category: 'ufo',
            baseCost: 100,
            maxLevel: 8,
            effect: (level) => 1000 - (level - 1) * 100, // 1000, 900, ... 300ms
        },
        ufo_capture_range: {
            name: '格納範囲',
            category: 'ufo',
            baseCost: 100,
            maxLevel: 8,
            effect: (level) => 64 + (level - 1) * 8, // 64, 72, ... 120px
        },
        castle_hp: {
            name: '城HP',
            category: 'castle',
            baseCost: 150,
            maxLevel: 7,
            effect: (level) => 2 + level,        // 3, 4, 5, ... 9
        },
        skill_slow_aura: {
            name: 'スローオーラ',
            category: 'skill',
            baseCost: 200,
            maxLevel: 6,
            effect: (level) => (level - 1) * 0.05, // 0%, 5%, 10%, ... 25%
        },
    },

    // セーブデータのキー
    STORAGE_KEY: 'cat_catch_save_v1',
};

/**
 * ウェーブデータを生成
 */
function generateWaveData() {
    const waves = [];

    for (let i = 1; i <= 30; i++) {
        const wave = {
            id: i,
            enemies: [],
            isBoss: i % 10 === 0,  // 10, 20, 30はボスウェーブ
        };

        // 敵の数を決定
        let enemyCount = Math.min(3 + Math.floor(i / 2), 25);

        // 敵の種類を決定
        const types = ['normal'];
        if (i >= 6) types.push('fast');
        if (i >= 11) types.push('fire', 'water');
        if (i >= 16) types.push('big');

        // 敵を生成
        for (let j = 0; j < enemyCount; j++) {
            const type = types[Math.floor(Math.random() * types.length)];
            wave.enemies.push(type);
        }

        // ボスウェーブにはボスを追加
        if (wave.isBoss) {
            wave.enemies.push('boss');
        }

        waves.push(wave);
    }

    return waves;
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
