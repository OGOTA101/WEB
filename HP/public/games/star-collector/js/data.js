/**
 * data.js
 * Holds game configuration, item data, and storage logic.
 */

// Difficulty Table
const DIFFICULTY_TABLE = [
    { maxCombo: 9, spawnRate: 3000, lifeTime: 3000, type: 'static', desc: 'Thinking time' },
    { maxCombo: 29, spawnRate: 2500, lifeTime: 2500, type: 'static', desc: 'Slow' },
    { maxCombo: 59, spawnRate: 2000, lifeTime: 2000, type: 'static', desc: 'Normal' },
    { maxCombo: 89, spawnRate: 1800, lifeTime: 1500, type: 'static', desc: 'Fast' },
    { maxCombo: 119, spawnRate: 1500, lifeTime: 1200, type: 'wobbly', desc: 'Wobbly' },
    { maxCombo: 149, spawnRate: 1200, lifeTime: 1000, type: 'moving', desc: 'Moving' },
    { maxCombo: 179, spawnRate: 800, lifeTime: 800, type: 'rush', desc: 'Rush' },
    { maxCombo: 199, spawnRate: 1000, lifeTime: 700, type: 'blink', desc: 'Blink' },
    { maxCombo: 9999, spawnRate: 500, lifeTime: 600, type: 'starfall', desc: 'Starfall' }
];

// Accessories Data
const ITEM_DB = {
    head: [
        { id: 'h01', name: '星のかけらピン', desc: '小さな星が光るヘアピン', cost: 0, buff: {} },
        { id: 'h02', name: 'ナイトキャップ', desc: 'スタミナ減少20%OFF', cost: 100, buff: { staminaSave: 0.2 } },
        { id: 'h03', name: '三日月の冠', desc: '表示時間+0.2秒', cost: 300, buff: { timeExtend: 200 } },
        { id: 'h04', name: '宇宙メット', desc: 'コンボボーナス+1', cost: 500, buff: { comboBonus: 1 } },
        { id: 'h05', name: 'ねこみみ', desc: 'フィーバー率UP', cost: 1000, buff: { feverUp: 1.5 } }
    ],
    neck: [
        { id: 'n01', name: '赤いリボン', desc: 'お母さんにもらったリボン', cost: 0, buff: {} },
        { id: 'n02', name: '鈴の首輪', desc: '歩くと可愛い音がする', cost: 150, buff: { soundChange: true } },
        { id: 'n03', name: '銀河ストール', desc: '星獲得数+10%', cost: 400, buff: { starBonus: 0.1 } },
        { id: 'n04', name: '天使の羽', desc: '自動回復(微)', cost: 800, buff: { regen: true } },
        { id: 'n05', name: 'あったかマフラー', desc: 'ミス判定を少し甘く', cost: 200, buff: { hitBox: 1.2 } }
    ],
    aura: [
        { id: 'a01', name: 'なし', desc: '', cost: 0, buff: {} },
        { id: 'a02', name: '光の足跡', desc: '歩いた場所に光が残る', cost: 500, buff: { visual: 'footprint' } },
        { id: 'a03', name: 'ホタル', desc: '周囲を光が舞う', cost: 800, buff: { visual: 'firefly' } },
        { id: 'a04', name: '虹オーラ', desc: '全ステータス微増', cost: 2000, buff: { allStats: 0.05 } }
    ]
};

// Storage Manager
class StorageManager {
    static KEY = 'starry_cat_save_v1';

    static load() {
        try {
            const raw = localStorage.getItem(this.KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error('Save load failed', e);
        }
        return this.getDefaultHeader();
    }

    static save(data) {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Save failed', e);
        }
    }

    static getDefaultHeader() {
        return {
            stars: 0,
            highScore: 0,
            inventory: ['h01', 'n01', 'a01'], // Owned Item IDs
            equipped: {
                head: 'h01',
                neck: 'n01',
                aura: 'a01'
            },
            settings: {
                bgm: true,
                se: true
            }
        };
    }
}
