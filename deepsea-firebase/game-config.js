/**
 * ディープダイブ サバイバル - ゲーム設定ファイル
 * このファイルでゲームバランスを調整できます
 */

const GAME_CONFIG = {
    // ===================
    // プレイヤー設定
    // ===================
    player: {
        maxHP: 3,                    // 最大HP
        moveSpeed: 200,              // 移動速度 (px/秒)
        floatSpeed: 150,             // 浮上速度 (px/秒)
        invincibleTime: 1000,        // ダメージ後の無敵時間 (ms)
        hitboxWidth: 40,             // 当たり判定幅
        hitboxHeight: 50,            // 当たり判定高さ
        oxygenShareCost: 25,         // 蘇生時に提供する酸素量
        oxygenReviveAmount: 50,      // 蘇生時に相手が回復する酸素量
    },

    // ===================
    // 酸素設定
    // ===================
    oxygen: {
        max: 100,                    // 最大酸素量
        baseConsumption: 1,          // 基本消費速度 (/秒)
        surfaceRecovery: true,       // 海面で全回復するか
        depthMultipliers: {          // 深度別消費倍率
            shallow: 1.0,            // 浅瀬 (0-100m)
            mid: 1.5,                // 中層 (100-300m)
            deep: 2.0,               // 深海 (300-600m)
            abyss: 3.0,              // 深淵 (600m+)
        },
    },

    // ===================
    // 深度・ステージ設定
    // ===================
    depth: {
        maxDepth: 1000,              // 最深部 (ゴール)
        autoScrollSpeed: 30,         // 自動スクロール速度 (px/秒)
        zones: {
            shallow: { start: 0, end: 100 },
            mid: { start: 100, end: 300 },
            deep: { start: 300, end: 600 },
            abyss: { start: 600, end: 1000 },
        },
        backgrounds: {
            shallow: '#4A90D9',
            mid: '#2D5986',
            deep: '#1A3A5C',
            abyss: '#0D1F33',
        },
    },

    // ===================
    // 攻撃設定
    // ===================
    attack: {
        initialAmmo: 30,             // 初期弾薬数
        maxAmmo: 99,                 // 最大弾薬数
        bulletSpeed: 400,            // 弾速 (px/秒)
        fireRate: 300,               // 連射間隔 (ms)
        bulletDamage: 1,             // 弾丸ダメージ
    },

    // ===================
    // 敵設定
    // ===================
    enemies: {
        respawn: false,              // 敵を倒した後に復活するか
        fish: {
            name: '小魚',
            hp: 1,
            speed: 100,
            score: 10,
            spawnZones: ['shallow', 'mid', 'deep', 'abyss'],
            spawnRate: { shallow: 0.2, mid: 0.25, deep: 0.3, abyss: 0.25 },
        },
        jellyfish: {
            name: 'クラゲ',
            hp: 2,
            speed: 50,
            score: 20,
            spawnZones: ['mid', 'deep', 'abyss'],
            spawnRate: { mid: 0.15, deep: 0.2, abyss: 0.25 },
        },
        shark: {
            name: 'サメ',
            hp: 3,
            speed: 120,
            score: 50,
            chasePlayer: true,
            spawnZones: ['deep', 'abyss'],
            spawnRate: { deep: 0.1, abyss: 0.15 },
        },
        anglerfish: {
            name: 'アンコウ',
            hp: 5,
            speed: 40,
            score: 100,
            hasLight: true,
            spawnZones: ['abyss'],
            spawnRate: { abyss: 0.05 },
        },
        giantSquid: {
            name: '大王イカ',
            hp: 10,
            speed: 80,
            score: 500,
            isBoss: true,
            spawnZones: ['abyss'],
            spawnRate: { abyss: 0.01 },
        },
    },

    // ===================
    // アイテム設定
    // ===================
    items: {
        bubbleSmall: {
            name: '泡（小）',
            effect: { oxygen: 10 },
            spawnInterval: { min: 2000, max: 5000 },
            spawnChance: 0.4,
        },
        bubbleLarge: {
            name: '泡（大）',
            effect: { oxygen: 30 },
            spawnInterval: { min: 5000, max: 10000 },
            spawnChance: 0.2,
        },
        oxygenTank: {
            name: '酸素ボンベ',
            effect: { oxygen: 50 },
            spawnInterval: { min: 15000, max: 30000 },
            spawnChance: 0.05,
        },
        heart: {
            name: '回復アイテム',
            effect: { hp: 1 },
            spawnInterval: { min: 20000, max: 40000 },
            spawnChance: 0.05,
        },
        ammo: {
            name: '弾薬補給',
            effect: { ammo: 10 },
            spawnInterval: { min: 10000, max: 20000 },
            spawnChance: 0.15,
        },
        coin: {
            name: 'コイン',
            effect: { score: 100 },
            spawnInterval: { min: 5000, max: 15000 },
            spawnChance: 0.15,
        },
        treasure: {
            name: '宝箱',
            effect: { random: true },
            spawnInterval: { min: 30000, max: 60000 },
            spawnChance: 0.02,
        },
    },

    // ===================
    // スコア設定
    // ===================
    score: {
        depthBonus: 1,               // 1mあたりのスコア
        enemyMultiplier: 1,          // 敵撃破スコア倍率
        itemMultiplier: 1,           // アイテム取得スコア倍率
    },

    // ===================
    // マルチプレイヤー設定
    // ===================
    multiplayer: {
        maxPlayers: 4,               // 最大プレイヤー数
        roomCodeLength: 4,           // ルームコード桁数
        syncRate: 60,                // 同期レート (fps)
        reviveTime: 5000,            // 復活待ち時間 (ms)
        reviveDistance: 100,         // 復活に必要な味方との距離 (px)
    },

    // ===================
    // ゲーム全般設定
    // ===================
    game: {
        canvasWidth: 400,            // キャンバス幅
        canvasHeight: 700,           // キャンバス高さ
        fps: 60,                     // フレームレート
        enemySpawnInterval: 1000,    // 敵生成間隔 (ms)
        maxEnemiesOnScreen: 15,      // 画面上の最大敵数
    },
};

// 設定をエクスポート（モジュール対応）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GAME_CONFIG;
}
