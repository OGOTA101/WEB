/**
 * ネズミ狩りの夜 - ゲーム設定
 */

const GAME_CONFIG = {
    // ゲーム基本設定
    game: {
        maxWave: 30,
        baseMicePerWave: 5,
        miceIncreasePerWave: 3,
        waveAnnounceDuration: 2000, // ms
    },

    // 猫（プレイヤー）設定
    cat: {
        size: 48,
        moveSpeed: 400, // pixels per second (very fast)
        attackRange: 60, // 基本攻撃範囲
        attackSpeed: 1.0, // 秒/回
        attackDamage: 15, // 基本ネズミは一撃
        colors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3'], // プレイヤー色
    },

    // ネズミ（敵）設定
    mice: {
        normal: {
            name: '通常ネズミ',
            hp: 10,
            speed: 40,
            damage: 5,
            score: 10,
            size: 24,
        },
        fast: {
            name: '速いネズミ',
            hp: 8,
            speed: 80,
            damage: 3,
            score: 15,
            size: 20,
        },
        big: {
            name: '大きいネズミ',
            hp: 40,
            speed: 25,
            damage: 10,
            score: 30,
            size: 40,
        },
        boss: {
            name: 'ボスネズミ',
            hp: 150,
            speed: 20,
            damage: 20,
            score: 100,
            size: 64,
        },
        swarm: {
            name: '群れネズミ',
            hp: 5,
            speed: 35,
            damage: 2,
            score: 5,
            size: 16,
        }
    },

    // チーズ（守護対象）設定
    cheese: {
        maxHP: 100,
        dayRecovery: 10, // 昼の回復量
        position: { y: 0.9 }, // 画面下部90%の位置
    },

    // スキルツリー設定
    skills: {
        // 速攻型
        speed: {
            attackSpeed1: { name: '猫パンチ連打 Lv1', cost: 2, effect: { attackSpeedMult: 1.3 } },
            attackSpeed2: { name: '猫パンチ連打 Lv2', cost: 3, effect: { attackSpeedMult: 1.6 }, requires: 'attackSpeed1' },
            attackSpeed3: { name: '猫パンチ連打 Lv3', cost: 4, effect: { attackSpeedMult: 2.0 }, requires: 'attackSpeed2' },
            multiHit: { name: '乱れ爪', cost: 6, effect: { multiTarget: 2 }, requires: 'attackSpeed2' },
            machineGun: { name: '猫マシンガン', cost: 10, effect: { attackSpeedMult: 4.0, moveSpeedMult: 0.8 }, requires: 'attackSpeed3' },
        },
        // 範囲型
        range: {
            range1: { name: '爪旋風 Lv1', cost: 2, effect: { rangeMult: 1.5 } },
            range2: { name: '爪旋風 Lv2', cost: 3, effect: { rangeMult: 2.0 }, requires: 'range1' },
            range3: { name: '爪旋風 Lv3', cost: 4, effect: { rangeMult: 3.0 }, requires: 'range2' },
            pierce: { name: '衝撃波', cost: 6, effect: { pierce: true }, requires: 'range2' },
            storm: { name: '猫嵐', cost: 10, effect: { rangeMult: 5.0 }, requires: 'range3' },
        },
        // 狙撃型
        sniper: {
            reach1: { name: '遠距離爪 Lv1', cost: 2, effect: { reachMult: 2.0 } },
            reach2: { name: '遠距離爪 Lv2', cost: 3, effect: { reachMult: 3.0 }, requires: 'reach1' },
            reach3: { name: '遠距離爪 Lv3', cost: 4, effect: { reachMult: 5.0 }, requires: 'reach2' },
            execute: { name: '必殺の一撃', cost: 7, effect: { executeThreshold: 0.5 }, requires: 'reach2' },
            snipe: { name: 'スナイパー猫', cost: 10, effect: { fullScreenAttack: true, cooldown: 5 }, requires: 'reach3' },
        },
        // 守護型
        guardian: {
            slow1: { name: '威嚇オーラ Lv1', cost: 2, effect: { slowAura: 0.2 } },
            slow2: { name: '威嚇オーラ Lv2', cost: 3, effect: { slowAura: 0.4 }, requires: 'slow1' },
            slow3: { name: '威嚇オーラ Lv3', cost: 4, effect: { slowAura: 0.6 }, requires: 'slow2' },
            barrier: { name: 'チーズバリア', cost: 6, effect: { cheeseExtraHP: 50 }, requires: 'slow2' },
            invincible: { name: '絶対守護', cost: 10, effect: { cheeseInvincibleDuration: 10 }, requires: 'barrier' },
        },
        // 共通
        common: {
            moveSpeed1: { name: '俊足 Lv1', cost: 2, effect: { moveSpeedMult: 1.2 } },
            moveSpeed2: { name: '俊足 Lv2', cost: 3, effect: { moveSpeedMult: 1.4 }, requires: 'moveSpeed1' },
            moveSpeed3: { name: '俊足 Lv3', cost: 4, effect: { moveSpeedMult: 1.6 }, requires: 'moveSpeed2' },
            moveAttack: { name: '移動攻撃', cost: 6, effect: { attackWhileMoving: true, movingDamageMult: 0.5 }, requires: 'moveSpeed2' },
            expUp: { name: '経験値アップ', cost: 4, effect: { spMult: 1.5 } },
            nineLife: { name: '九つの命', cost: 8, effect: { reviveCheese: true } },
        }
    },

    // SP獲得設定
    sp: {
        perWaveClear: 3,
        perKills: { count: 10, sp: 1 },
        perBossKill: 5,
        noDamageBonus: 2,
    },

    // Firebase同期設定
    sync: {
        intervalMs: 100, // 100ms = 10fps 同期
        staleTimeout: 5000, // 5秒で古いプレイヤーを削除
    }
};
