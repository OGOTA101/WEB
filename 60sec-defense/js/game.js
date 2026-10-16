/**
 * game.js
 * ゲームロジックの中核
 */
import { TimeLoop } from './timeLoop.js';

export class Game {
    constructor(timeLoop) {
        this.timeLoop = timeLoop;
        this.state = 'title'; // title, playing, pause, gameover, clear

        // パラメータ
        this.width = 360;
        this.height = 640;
        this.maxWave = 3;
        this.defenseMax = 10;
        this.gameTime = 60; // 1ウェーブ60秒

        // ゲーム状態
        this.currentWave = 1;
        this.defense = 10;
        this.score = 0;
        this.lives = 3; // 猫の残機（3匹）
        this.waveTime = 60;
        this.spawnedCount = 0; // そのウェーブでスポーン済み数
        this.maxSpawnCount = 3; // 1ウェーブあたりの最大敵数

        // オブジェクト
        this.player = null;
        this.ghosts = []; // ゴースト猫たち
        this.enemies = [];
        this.bullets = [];
        this.cannons = [];
        this.effects = [];

        // レーン定義（少し中央に寄せる）
        // 元: 60, 180, 300 -> 新: 70, 180, 290
        this.lanes = [70, 180, 290];

        // エリア定義
        // 発射エリア(fire)は大砲の右(+40)
        // 右端: 290 + 35 = 325 (画面端360に対し余裕あり)
        this.areas = {
            ammo: { x: 180, y: 600, w: 80, h: 60, name: 'ammo' }, // 弾薬庫
            load: [ // 装填エリア（大砲の後ろ）
                { x: 70, y: 560, w: 40, h: 40, cannonId: 0 },
                { x: 180, y: 560, w: 40, h: 40, cannonId: 1 },
                { x: 290, y: 560, w: 40, h: 40, cannonId: 2 }
            ],
            fire: [ // 発射エリア（大砲の横=右側）
                { x: 105, y: 500, w: 35, h: 40, cannonId: 0 },
                { x: 215, y: 500, w: 35, h: 40, cannonId: 1 },
                { x: 325, y: 500, w: 35, h: 40, cannonId: 2 }
            ]
        };
    }

    init() {
        this.currentWave = 1;
        this.defense = this.defenseMax;
        this.score = 0;
        this.lives = 3;
        this.timeLoop.clearAll();

        this.startWave(1);
    }

    startWave(wave) {
        // ウェーブ開始処理
        this.currentWave = wave;
        this.waveTime = this.gameTime;
        this.spawnedCount = 0;
        this.maxSpawnCount = 3; // 1ウェーブ3匹まで

        // オブジェクトリセット
        this.createPlayer();
        this.enemies = [];
        this.bullets = [];
        this.effects = [];
        // 大砲位置もレーンに合わせる
        this.cannons = [
            { id: 0, x: 70, y: 500, loaded: false, shell: null, coolDown: 0 },
            { id: 1, x: 180, y: 500, loaded: false, shell: null, coolDown: 0 },
            { id: 2, x: 290, y: 500, loaded: false, shell: null, coolDown: 0 }
        ];

        // タイムループのリセットはリロード時のみなので、ここでは保持される
        this.ghosts = [];
        const ghostCount = this.timeLoop.getGhostCount();
        for (let i = 0; i < ghostCount; i++) {
            this.ghosts.push({
                x: 180, y: 550, dir: 'down',
                state: 'idle', holding: null,
                actionTimer: 0
            });
        }
        this.timeLoop.resetPlayback();
        this.timeLoop.startRecording();

        this.state = 'playing';
    }

    createPlayer() {
        this.player = {
            x: 180, y: 580, // 初期位置
            targetX: 180, targetY: 580,
            speed: 100, // px per second
            dir: 'down',
            state: 'idle', // idle, moving, action
            holding: null, // 持っている砲弾
            actionTimer: 0 // エリア滞在時間計測用
        };
    }

    // リロード機能（タイムループ）
    tryReload() {
        if (this.lives <= 1) return false; // 残機不足

        this.lives--;
        this.timeLoop.saveRecord(); // 現在のプレイを記録

        // ウェーブ1からやり直し
        // 防衛力等はリセット
        this.createPlayer();
        this.currentWave = 1;
        this.waveTime = this.gameTime;
        this.defense = this.defenseMax;

        // 敵と弾リセット
        this.enemies = [];
        this.bullets = [];
        this.effects = [];

        // 大砲リセット
        this.cannons.forEach(c => {
            c.loaded = false;
            c.shell = null;
        });

        // ゴースト生成
        this.ghosts = [];
        const ghostCount = this.timeLoop.getGhostCount();
        for (let i = 0; i < ghostCount; i++) {
            this.ghosts.push({
                x: 180, y: 580, dir: 'down', state: 'idle', holding: null
            });
        }

        this.timeLoop.resetPlayback(); // 再生位置リセット
        this.timeLoop.startRecording(); // 新しい記録開始

        return true;
    }

    update(dt) {
        if (this.state !== 'playing') return;

        // 時間経過
        this.waveTime -= dt;
        if (this.waveTime <= 0) {
            // ウェーブクリア判定
            if (this.enemies.length === 0) {
                this.nextWave();
            }
        }

        // 敵のスポーン（簡易版）
        this.spawnEnemies(dt);

        // プレイヤー処理
        this.updateCat(this.player, dt, true); // true = プレイヤー

        // ゴースト処理（タイムループ再生）
        this.updateGhosts(dt);

        // オブジェクト更新
        this.updateBullets(dt);
        this.updateEnemies(dt);
        this.checkCollisions();

        // プレイヤーの行動記録（移動）
        this.timeLoop.recordPosition(this.player.x, this.player.y, this.player.dir);
    }

    updateCat(cat, dt, isPlayer) {
        // 移動処理
        if (isPlayer && (cat.x !== cat.targetX || cat.y !== cat.targetY)) {
            const dx = cat.targetX - cat.x;
            const dy = cat.targetY - cat.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 2) {
                cat.x = cat.targetX;
                cat.y = cat.targetY;
            } else {
                const moveDist = cat.speed * dt;
                cat.x += (dx / dist) * moveDist;
                cat.y += (dy / dist) * moveDist;

                // 向き更新
                if (Math.abs(dx) > Math.abs(dy)) {
                    cat.dir = dx > 0 ? 'right' : 'left';
                } else {
                    cat.dir = dy > 0 ? 'down' : 'up';
                }
            }
        }

        // エリア判定と自動アクション
        this.checkAreas(cat, dt, isPlayer);
    }

    // ゴーストの更新（記録されたログに基づいて動作）
    updateGhosts(dt) {
        const currentTime = Date.now() - this.timeLoop.startTime;
        const actions = this.timeLoop.getGhostActions(currentTime);

        actions.forEach(({ ghostIndex, action }) => {
            const ghost = this.ghosts[ghostIndex];
            if (!ghost) return;

            switch (action.type) {
                case 'move':
                    ghost.x = action.x;
                    ghost.y = action.y;
                    ghost.dir = action.direction;
                    break;
                case 'pickup':
                    // 弾薬庫アクション再現
                    this.executeAction(ghost, 'pickup');
                    break;
                case 'load':
                    // 装填アクション再現
                    this.executeAction(ghost, 'load', action.cannonId);
                    break;
                case 'fire':
                    // 発射アクション再現
                    this.executeAction(ghost, 'fire', action.cannonId);
                    break;
            }
        });
    }

    checkAreas(cat, dt, isPlayer) {
        // 停止中のみアクション進行
        // プレイヤー判定: 目的地に着いているか
        // ゴーストは記録されたアクションで動くのでここでは判定しない（isPlayerのみ）
        if (!isPlayer) return;

        const isMoving = (cat.x !== cat.targetX || cat.y !== cat.targetY);
        if (isMoving) {
            cat.actionTimer = 0;
            return;
        }

        // 1. 弾薬庫エリア
        if (this.isInRect(cat, this.areas.ammo)) {
            if (!cat.holding) {
                cat.actionTimer += dt;
                if (cat.actionTimer > 1.0) {
                    this.executeAction(cat, 'pickup');
                    if (isPlayer) this.timeLoop.recordAction('pickup', {});
                    cat.actionTimer = 0;
                }
            }
        }
        // 2. 装填エリア
        else {
            let inLoadArea = false;
            this.areas.load.forEach(area => {
                if (this.isInRect(cat, area)) {
                    inLoadArea = true;
                    if (cat.holding && !this.cannons[area.cannonId].loaded) {
                        cat.actionTimer += dt;
                        if (cat.actionTimer > 1.5) {
                            this.executeAction(cat, 'load', area.cannonId);
                            if (isPlayer) this.timeLoop.recordAction('load', { cannonId: area.cannonId });
                            cat.actionTimer = 0;
                        }
                    }
                }
            });

            // 3. 発射エリア
            if (!inLoadArea) {
                this.areas.fire.forEach(area => {
                    if (this.isInRect(cat, area)) {
                        if (this.cannons[area.cannonId].loaded) {
                            cat.actionTimer += dt;
                            if (cat.actionTimer > 0.5) {
                                this.executeAction(cat, 'fire', area.cannonId);
                                if (isPlayer) this.timeLoop.recordAction('fire', { cannonId: area.cannonId });
                                cat.actionTimer = 0;
                            }
                        }
                    }
                });
            }
        }
    }

    executeAction(cat, type, targetId) {
        if (type === 'pickup') {
            cat.holding = 'normal'; // デッキ機能は後で実装、今はnormal固定
            // Effect
        } else if (type === 'load') {
            if (cat.holding && !this.cannons[targetId].loaded) {
                this.cannons[targetId].loaded = true;
                this.cannons[targetId].shell = cat.holding;
                cat.holding = null;
            }
        } else if (type === 'fire') {
            if (this.cannons[targetId].loaded) {
                this.cannons[targetId].loaded = false;
                const shellType = this.cannons[targetId].shell;
                this.cannons[targetId].shell = null;

                // 弾生成
                this.bullets.push({
                    x: this.cannons[targetId].x,
                    y: this.cannons[targetId].y - 20,
                    type: shellType,
                    speed: 50 // 弾速ダウン (100 -> 50)
                });
            }
        }
    }

    handleInput(x, y) {
        // 猫の移動可能範囲（画面下1/3）
        const moveableTop = this.height * 0.60;

        if (y < moveableTop) y = moveableTop;
        if (y > this.height) y = this.height;
        if (x < 0) x = 0;
        if (x > this.width) x = this.width;

        this.player.targetX = x;
        this.player.targetY = y;
        this.player.actionTimer = 0; // 移動したらアクションキャンセル
    }

    spawnEnemies(dt) {
        // 3匹出したらもう出さない
        if (this.spawnedCount >= this.maxSpawnCount) return;

        // 固定タイミングで出現させる（例: 5秒, 20秒, 35秒）
        // ランダムだと偏るので、時間経過で判定

        // 簡易実装: ランダムだが確率を調整し、かつ上限を守る
        // 前の敵が出てから一定時間は出ないようにする制御が必要だが、
        // ここではシンプルに確率を下げて対応
        if (Math.random() < 0.005) { // 確率低下
            const laneIdx = this.spawnedCount % 3; // 0, 1, 2 と順番に出す（一列）

            this.enemies.push({
                x: this.lanes[laneIdx],
                y: -30,
                hp: 1,
                speed: 7.5, // 速度大幅ダウン (30 -> 7.5)
                type: 'normal'
            });
            this.spawnedCount++;
        }
    }

    updateBullets(dt) {
        this.bullets.forEach(b => {
            b.y -= b.speed * dt;
        });
        this.bullets = this.bullets.filter(b => b.y > -50);
    }

    updateEnemies(dt) {
        this.enemies.forEach(e => {
            if (e.y < 450) { // 防衛ラインまで
                e.y += e.speed * dt;
            } else {
                // 攻撃中
                if (Math.random() < 0.01) {
                    this.defense -= 1;
                    if (this.defense <= 0) this.state = 'gameover';
                }
            }
        });
    }

    checkCollisions() {
        // 当たり判定（円形）
        this.bullets.forEach(b => {
            this.enemies.forEach(e => {
                if (e.hp <= 0) return;
                const dx = b.x - e.x;
                const dy = b.y - e.y;
                if (dx * dx + dy * dy < 20 * 20) { // 半径20px
                    e.hp -= 1;
                    b.hit = true;
                    this.score += 100;
                }
            });
        });

        this.bullets = this.bullets.filter(b => !b.hit);
        this.enemies = this.enemies.filter(e => e.hp > 0);
    }

    nextWave() {
        if (this.currentWave < this.maxWave) {
            this.startWave(this.currentWave + 1);
        } else {
            this.state = 'clear';
        }
    }

    isInRect(point, rect) {
        const halfW = rect.w / 2;
        const halfH = rect.h / 2;
        return (point.x >= rect.x - halfW && point.x <= rect.x + halfW &&
            point.y >= rect.y - halfH && point.y <= rect.y + halfH);
    }
}
