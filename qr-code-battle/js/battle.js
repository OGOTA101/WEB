/* ========================================
   Bar-Code Tactics: 凸（TOTSU）
   バトルシステム
   ======================================== */


class BattleSystem {
    constructor(canvas, playerDeck, enemyUnits, mapData, onBattleEnd, seed = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onBattleEnd = onBattleEnd;
        this.mapData = mapData || { terrain: [], objects: [] };

        // RNG初期化
        if (seed && Math.seedrandom) {
            this.rng = new Math.seedrandom(seed);
        } else {
            this.rng = Math.random;
        }

        // 画面サイズ
        this.resize();

        // 地形・オブジェクト初期化
        this.terrain = this.mapData.terrain || [];
        this.objects = (this.mapData.objects || []).map(o => {
            const stat = CONFIG.OBJECT_STATS[o.type] || { hp: 1000, width: 40, height: 40, name: '物体' };
            // 座標調整: 画面幅に応じてスケールするか、絶対座標か。
            // ここでは絶対座標（config）をそのまま使う（画面幅が可変だがスマホなら350-400px程度）
            return {
                id: `obj_${o.type}_${o.x}_${o.y}`,
                ...o,
                ...stat,
                currentHp: stat.hp,
                maxHp: stat.hp,
                isObject: true
            };
        });

        // ゲーム状態
        this.isPaused = false;
        this.isEnded = false;
        this.isAutoMode = false; // Autoモード
        this.phase = 'start'; // start, battle, end
        this.animTime = 0;
        this.result = null; // win/lose
        // Cost system removed

        // ユニット管理
        this.playerUnits = [];      // フィールド上のプレイヤーユニット
        this.enemyUnits = [];       // フィールド上の敵ユニット
        this.playerDeck = playerDeck.map(u => ({ ...u, deployed: false }));
        this.enemyDeck = enemyUnits.map(u => ({ ...u, deployed: false }));

        // エフェクト管理
        this.effects = [];
        this.floatingTexts = [];

        // 選択状態
        this.selectedUnit = null;

        // AI
        this.ai = new BattleAI(this);

        // イベントリスナー
        this.setupEventListeners();

        // スキルボタンリスナー
        const btnSkill = document.getElementById('btn-skill');
        if (btnSkill) {
            btnSkill.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.selectedUnit) {
                    this.activateSkill(this.selectedUnit);
                }
            };
        }

        // 統計
        this.stats = {
            playerKills: 0,
            enemyKills: 0,
            damageDealt: 0,
            damageTaken: 0
        };

        // ゲームループ開始
        this.startTime = Date.now();
        this.lastTime = this.startTime;

        // 全ユニット出撃
        this.deployAllUnits();

        this.gameLoop();
    }

    resize() {
        // コンテナのサイズに合わせる
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // 描画解像度を設定（物理ピクセル）
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        // 論理サイズ（ゲーム内座標系）固定 (9:16比率)
        this.width = 450;
        this.height = 800;

        // 画面に収まる最大スケールを計算 (Letterbox/Pillarbox)
        const scaleW = this.canvas.width / this.width;
        const scaleH = this.canvas.height / this.height;
        this.scale = Math.min(scaleW, scaleH);

        // 中央寄せオフセット
        this.offsetX = (this.canvas.width - this.width * this.scale) / 2;
        this.offsetY = (this.canvas.height - this.height * this.scale) / 2;

        // 描画コンテキスト設定
        this.ctx.resetTransform();
        // 背景黒塗り（レターボックス用）
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // ゲーム領域へ移動・スケール
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        // クリップ（描画領域外にはみ出さないように）
        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.width, this.height);
        this.ctx.clip();



        // 陣地の境界
        this.playerZoneY = this.height * 0.7;  // プレイヤー陣地の上端
        this.enemyZoneY = this.height * 0.3;   // 敵陣地の下端
    }

    deployAllUnits() {
        // 論理サイズが固定されたため、常に同じ配置になる
        const pSlotWidth = this.width / 5;
        this.playerDeck.forEach((unitData, index) => {
            const x = pSlotWidth * (index + 1);
            const y = this.height - 160;

            const unit = this.deployUnitAt(unitData, x, y, false);
            if (unit) unit.deckIndex = index;
        });

        const eSlotWidth = this.width / (this.enemyDeck.length + 1);
        this.enemyDeck.forEach((unitData, index) => {
            const x = eSlotWidth * (index + 1);
            const y = 100;

            const unit = this.deployUnitAt(unitData, x, y, true);
            if (unit) unit.deckIndex = index;
        });

        this.updateEnemyInfo();
        this.initUnitStatusUI();
    }

    // ... (deployUnitAt method remains same) ...
    deployUnitAt(unitData, x, y, isEnemy) {
        if (unitData.deployed) return null;

        const units = isEnemy ? this.enemyUnits : this.playerUnits;

        // バトルユニットを作成
        const battleUnit = this.createBattleUnit(unitData, x, y, isEnemy);
        units.push(battleUnit);

        unitData.deployed = true;
        return battleUnit;
    }

    // 衝突解決と重さの処理 (強化版)
    resolveCollisions(dt) {
        const allUnits = [...this.playerUnits, ...this.enemyUnits];
        const unitSize = CONFIG.BATTLE.UNIT_SIZE;
        const pushRadius = unitSize * 0.9;

        for (let i = 0; i < allUnits.length; i++) {
            for (let j = i + 1; j < allUnits.length; j++) {
                const u1 = allUnits[i];
                const u2 = allUnits[j];

                const dx = u2.x - u1.x;
                const dy = u2.y - u1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < pushRadius && dist > 0) {
                    const overlap = pushRadius - dist;

                    const m1 = Math.max(10, u1.currentHp);
                    const m2 = Math.max(10, u2.currentHp);
                    const totalMass = m1 + m2;

                    const m1Ratio = m2 / totalMass;
                    const m2Ratio = m1 / totalMass;

                    const pushX = (dx / dist) * overlap;
                    const pushY = (dy / dist) * overlap;

                    const stiffness = 20.0;

                    u1.x -= pushX * m1Ratio * stiffness * dt;
                    u1.y -= pushY * m1Ratio * stiffness * dt;
                    u2.x += pushX * m2Ratio * stiffness * dt;
                    u2.y += pushY * m2Ratio * stiffness * dt;

                    // 交戦状態フラグの設定
                    if (u1.isEnemy !== u2.isEnemy) {
                        u1.isEngaged = true;
                        u2.isEngaged = true;
                    }
                }
            }
        }
    }

    setupEventListeners() {
        // タッチイベント
        this.canvas.addEventListener('touchstart', (e) => this.handleInputStart(e, true), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleInputEnd(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleInputMove(e), { passive: false });

        // マウスイベント
        this.canvas.addEventListener('mousedown', (e) => this.handleInputStart(e, false));
        this.canvas.addEventListener('mouseup', (e) => this.handleInputEnd(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleInputMove(e));

        // リサイズ
        window.addEventListener('resize', () => this.resize());
    }

    handleInputStart(e, isTouch) {
        if (this.isEnded) return;
        e.preventDefault();

        let clientX, clientY;
        if (isTouch) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // 入力座標(Client)を論理座標(Game)に変換
        // 物理キャンバス座標
        const cvsX = (clientX - rect.left) * dpr;
        const cvsY = (clientY - rect.top) * dpr;

        // 論理座標へ逆変換
        const x = (cvsX - this.offsetX) / this.scale;
        const y = (cvsY - this.offsetY) / this.scale;

        this.inputStartX = x;
        this.inputStartY = y;
        this.isLongPress = false;

        // 長押しタイマー開始
        this.longPressTimer = setTimeout(() => {
            this.isLongPress = true;
            const unit = this.getUnitAt(x, y, [...this.playerUnits, ...this.enemyUnits]);
            if (unit && window.showUnitPopup) {
                window.showUnitPopup(unit);
            }
        }, 500); // 0.5秒長押し
    }

    handleInputMove(e) {
        if (!this.longPressTimer) return;

        // 一定以上動いたら長押しキャンセル
        let clientX, clientY;
        if (e.type === 'touchmove') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // 座標変換ロジックを統一
        const cvsX = (clientX - rect.left) * dpr;
        const cvsY = (clientY - rect.top) * dpr;
        const x = (cvsX - this.offsetX) / this.scale;
        const y = (cvsY - this.offsetY) / this.scale;

        const dist = Math.sqrt(Math.pow(x - this.inputStartX, 2) + Math.pow(y - this.inputStartY, 2));
        if (dist > 10) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    handleInputEnd(e) {
        e.preventDefault();

        // ポップアップを閉じる処理は削除（長押し・ダブルタップで見たいので）

        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        if (this.isLongPress) {
            // 長押しだった場合はクリック処理をしない
            this.isLongPress = false;
            return;
        }

        const now = Date.now();
        if (this.lastTapTime && (now - this.lastTapTime < 300)) {
            // ダブルタップ
            const unit = this.getUnitAt(this.inputStartX, this.inputStartY, [...this.playerUnits, ...this.enemyUnits]);
            if (unit && window.showUnitPopup) {
                window.showUnitPopup(unit);
                this.lastTapTime = 0;
                return;
            }
        }
        this.lastTapTime = now;

        // クリック処理（移動・ターゲット指定）
        this.handleClickLogic(this.inputStartX, this.inputStartY);
    }

    handleClickLogic(x, y) {
        if (this.isEnded) return;

        const clickedUnit = this.getUnitAt(x, y, [...this.playerUnits, ...this.enemyUnits]);

        if (this.selectedUnit) {
            // 既にユニットを選択中の場合：命令を優先

            if (clickedUnit && clickedUnit.isEnemy) {
                // 敵をタップ -> 追跡（攻撃）
                this.selectedUnit.target = clickedUnit;
                this.selectedUnit.targetX = null;
                this.selectedUnit.targetY = null;
                if (window.soundManager) window.soundManager.playSE('se_click'); // ターゲット指定音に変更
            } else {
                // 味方や地面をタップ -> その位置へ移動
                // "別の自軍指定にならず、その位置を指定する"
                this.selectedUnit.targetX = x;
                this.selectedUnit.targetY = y;
                this.selectedUnit.target = null;
            }
            // 命令完了後は選択解除
            this.selectedUnit = null;

        } else {
            // 未選択時：味方ユニットがいれば選択
            if (clickedUnit && !clickedUnit.isEnemy) {
                this.selectedUnit = clickedUnit;
            }
        }
    }

    // 既存のハンドラは削除
    handleTouch(e) { }
    handleMouseMove(e) { }
    handleClick(e) { }


    handleInput(x, y) {
        if (this.isPaused || this.isEnded) return;

        // プレイヤーユニットをタップしたか確認
        const clickedUnit = this.getUnitAt(x, y, this.playerUnits);

        if (clickedUnit) {
            // ユニットを選択
            this.selectedUnit = clickedUnit;
            return;
        }

        // 敵ユニットをタップしたか確認
        const targetEnemy = this.getUnitAt(x, y, this.enemyUnits);

        if (this.selectedUnit) {
            if (targetEnemy) {
                // 敵を攻撃対象に設定
                this.selectedUnit.target = targetEnemy;
                this.selectedUnit.targetX = null;
                this.selectedUnit.targetY = null;
            } else {
                // 移動先を設定
                this.selectedUnit.targetX = x;
                this.selectedUnit.targetY = y;
                this.selectedUnit.target = null;
            }
            this.selectedUnit = null;
        }
    }

    getUnitAt(x, y, units) {
        const size = CONFIG.BATTLE.UNIT_SIZE;
        return units.find(u => {
            const dx = u.x - x;
            const dy = u.y - y;
            return Math.sqrt(dx * dx + dy * dy) < size;
        });
    }

    // 古いdeployUnitは廃止（deployAllUnitsで管理）
    deployUnit(deckIndex, isEnemy = false, ignoreCost = false) {
        return false;
    }

    createBattleUnit(unitData, x, y, isEnemy) {
        return {
            ...unitData,
            x,
            y,
            currentHp: unitData.stats.hp,
            maxHp: unitData.stats.hp,
            target: null,
            targetX: null,
            targetY: null,
            lastAttackTime: 0,
            isEnemy,
            // 物理演算用
            vx: 0,
            vy: 0,
            // 向き制御
            rotation: isEnemy ? Math.PI / 2 : -Math.PI / 2, // 敵は下向き、プレイヤーは上向き
            turnSpeed: 2.0 // ラジアン/秒
        };
    }

    /**
     * ゲームループ
     */
    gameLoop() {
        if (this.isEnded) return;

        const now = Date.now();
        const dt = (now - this.lastTime) / 1000; // 秒単位
        this.lastTime = now;

        if (!this.isPaused) {
            this.update(dt);
        }

        this.render();

        requestAnimationFrame(() => this.gameLoop());
    }

    /**
     * 更新処理
     */
    update(dt) {
        this.animTime += dt;

        if (this.phase === 'start') {
            if (this.animTime > 2.0) {
                this.phase = 'battle';
                this.animTime = 0;
            }
            return; // 開戦演出中は停止
        }

        if (this.phase === 'end') {
            if (this.animTime > 3.0) {
                if (!this.isEnded) {
                    this.endBattle(this.result);
                }
            }
            // 終了演出中はエフェクトのみ更新
            this.updateEffects(dt);
            return;
        }

        // AIの更新
        this.ai.update(dt);

        // ユニットの更新
        this.updateUnits(this.playerUnits, this.enemyUnits, dt);
        this.updateUnits(this.enemyUnits, this.playerUnits, dt);

        // 衝突解決（重さ処理）
        this.resolveCollisions(dt);

        // 戦闘処理
        this.processCombat();

        // エフェクト更新
        this.updateEffects(dt);

        // 死亡ユニットの除去
        this.removeDeadUnits();

        // 勝敗判定
        this.checkBattleEnd();

        // UI更新
        this.updateUnitStatusUI();
        this.updateSkillButton();
    }

    updateUnits(units, enemies, dt) {
        for (const unit of units) {
            // スキルタイマー更新
            if (unit.skillActive && unit.skillTimer > 0) {
                unit.skillTimer -= dt;
                if (unit.skillTimer <= 0) {
                    unit.skillActive = false;
                    unit.skillType = null;
                }
            }

            // ターゲットが死んでいたらターゲット解除
            if (unit.target && unit.target.currentHp <= 0) {
                unit.target = null;
                // 移動ターゲットもクリアして即座に再索敵させる
                unit.targetX = null;
                unit.targetY = null;
            }

            // 地形補正のリセット
            unit.terrainMod = { spd: 1.0, atk: 1.0 };

            // 地形判定
            const terrain = this.getTerrainAt(unit.x, unit.y);
            if (terrain && CONFIG.TERRAIN_EFFECTS[terrain.type]) {
                const eff = CONFIG.TERRAIN_EFFECTS[terrain.type];
                unit.terrainMod.spd = eff.spd;
                unit.terrainMod.atk = eff.atk;

                // 山の特殊移動（上り坂・下り坂）
                if (terrain.type === 'mountain') {
                    const cx = terrain.x + terrain.w / 2;
                    const cy = terrain.y + terrain.h / 2;
                    const vecX = cx - unit.x;
                    const vecY = cy - unit.y;
                    // 移動方向ベクトル
                    const moveX = Math.cos(unit.rotation);
                    const moveY = Math.sin(unit.rotation);

                    // 内積（正なら中心に向かっている＝上り、負なら離れている＝下り）
                    const dot = vecX * moveX + vecY * moveY;
                    if (dot > 0) {
                        unit.terrainMod.spd *= 0.6; // 上り坂はさらに遅く
                    } else {
                        unit.terrainMod.spd *= 1.4; // 下り坂は速く
                    }
                }
            }

            // 移動目標の決定
            let targetX = unit.targetX;
            let targetY = unit.targetY;

            if (unit.target) {
                targetX = unit.target.x;
                targetY = unit.target.y;
            }

            // Autoモードまたは敵なら自動索敵
            const shouldAuto = unit.isEnemy || this.isAutoMode;
            if (shouldAuto && !unit.target && !targetX && !targetY && enemies.length > 0) {
                let closestEnemy = null;
                let closestDist = Infinity;
                for (const enemy of enemies) {
                    const dx = enemy.x - unit.x;
                    const dy = enemy.y - unit.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestEnemy = enemy;
                    }
                }
                if (closestEnemy) {
                    unit.target = closestEnemy;
                    targetX = closestEnemy.x;
                    targetY = closestEnemy.y;
                }
            }

            // 移動処理
            let desiredAngle = unit.rotation;
            let moveSpeed = 0;

            if (targetX !== null && targetY !== null) {
                const dx = targetX - unit.x;
                const dy = targetY - unit.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                const rangeMultiplier = CONFIG.BATTLE.RANGE_PIXEL_MULTIPLIER || 0.1;
                let attackRange = unit.stats.rng * rangeMultiplier;
                // スキル：射程2倍
                if (unit.skillType === 'sniper' && unit.skillActive) {
                    attackRange *= 2.0;
                }
                const stopDist = unit.target ? attackRange : 15;

                desiredAngle = Math.atan2(dy, dx);
                const diff = this.normalizeAngle(desiredAngle - unit.rotation);

                // 旋回
                const turnSpeed = unit.turnSpeed || 3.0;
                let turnAmount = turnSpeed * dt;
                if (Math.abs(diff) < turnAmount) {
                    unit.rotation = desiredAngle;
                } else {
                    unit.rotation += Math.sign(diff) * turnAmount;
                }
                unit.rotation = this.normalizeAngle(unit.rotation);

                // 前進
                const angleDiff = Math.abs(diff);
                let speedFactor = 1.0;
                if (angleDiff > Math.PI / 2) speedFactor = 0;
                else if (angleDiff > Math.PI / 4) speedFactor = 0.5;

                if (dist > stopDist) {
                    // 基本速度 * 全体係数 * 旋回減速 * 地形効果
                    moveSpeed = unit.stats.spd * CONFIG.BATTLE.SPEED_MULTIPLIER * speedFactor * unit.terrainMod.spd;
                    // スキル：速度3倍
                    if (unit.skillType === 'rush' && unit.skillActive) {
                        moveSpeed *= 3.0;
                    }
                } else {
                    if (!unit.target) {
                        unit.targetX = null;
                        unit.targetY = null;
                    }
                }
            }

            // 交戦中の速度ペナルティ
            if (unit.isEngaged) {
                moveSpeed *= 0.3;
                unit.isEngaged = false;
            }

            // 速度ベクトルの適用
            unit.vx = Math.cos(unit.rotation) * moveSpeed;
            unit.vy = Math.sin(unit.rotation) * moveSpeed;

            // オブジェクト衝突判定（簡易版：移動後に衝突するなら戻す）
            const nextX = unit.x + unit.vx * dt;
            const nextY = unit.y + unit.vy * dt;
            const unitRad = CONFIG.BATTLE.UNIT_SIZE / 2;

            let collision = false;
            for (const obj of this.objects) {
                if (obj.currentHp <= 0) continue;
                // 円と矩形の衝突（簡易的に円と円、または距離チェック）
                // オブジェクトを円とみなす(width/2)
                const objRad = obj.width / 2;
                const dx = nextX - obj.x;
                const dy = nextY - obj.y;
                const d = Math.sqrt(dx * dx + dy * dy);

                if (d < unitRad + objRad) {
                    collision = true;
                    // 押し戻しベクトル（中心から外へ）
                    // 完全に止めるより、滑らせる方が自然だが、ここでは停止
                    break;
                }
            }

            if (!collision) {
                unit.x = nextX;
                unit.y = nextY;
            }

            // 画面内に制限
            unit.x = Math.max(30, Math.min(this.width - 30, unit.x));
            unit.y = Math.max(30, Math.min(this.height - 30, unit.y));
        }
    }

    getTerrainAt(x, y) {
        if (!this.terrain) return null;
        // 後ろの要素（描画順が上）を優先するか？ 普通Mapは重ならない前提
        return this.terrain.find(t =>
            x >= t.x && x <= t.x + t.w &&
            y >= t.y && y <= t.y + t.h
        );
    }

    checkBattleEnd() {
        if (this.phase === 'end') return;

        const allEnemiesDeployed = this.enemyDeck.every(u => u.deployed);
        const allEnemiesDead = this.enemyUnits.length === 0;

        if (allEnemiesDeployed && allEnemiesDead) {
            this.triggerBattleEnd(true);
            return;
        }

        const allPlayersDeployed = this.playerDeck.every(u => u.deployed);
        const allPlayersDead = this.playerUnits.length === 0;

        if (allPlayersDeployed && allPlayersDead) {
            this.triggerBattleEnd(false);
            return;
        }
    }

    triggerBattleEnd(isWin) {
        this.phase = 'end';
        this.animTime = 0;
        this.result = isWin;

        // 敗者を消滅させる（演出）
        if (isWin) {
            this.enemyUnits = [];
        } else {
            this.playerUnits = [];
        }
    }



    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;
        return angle;
    }

    processCombat() {
        const now = Date.now();

        // プレイヤーユニットの攻撃
        for (const unit of this.playerUnits) {
            this.processUnitAttackMulti(unit, this.enemyUnits, now);
        }

        // 敵ユニットの攻撃
        for (const unit of this.enemyUnits) {
            this.processUnitAttackMulti(unit, this.playerUnits, now);
        }
    }

    processUnitAttack(unit, enemies, now) {
        if (enemies.length === 0) return;

        // 攻撃間隔は基本値を使用
        const attackInterval = CONFIG.BATTLE.ATTACK_INTERVAL;
        if (now - unit.lastAttackTime < attackInterval) return;

        let target = unit.target;
        // ターゲットがいない、または射程外・死亡時は、正面の敵を探す（Autoモードでなくても攻撃はする）
        if (!target || target.currentHp <= 0) {
            // 射程内かつ、自分の正面(±45度)にいる敵を優先
            // ...適当な索敵（既存ロジック流用でOK）
            let closestDist = Infinity;
            for (const enemy of enemies) {
                const dx = enemy.x - unit.x;
                const dy = enemy.y - unit.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < closestDist) {
                    closestDist = dist;
                    target = enemy;
                }
            }
        }

        if (!target) return;

        const dx = target.x - unit.x;
        const dy = target.y - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // 射程判定
        const rangeMultiplier = CONFIG.BATTLE.RANGE_PIXEL_MULTIPLIER || 0.1;
        const attackRange = unit.stats.rng * rangeMultiplier;

        if (dist > attackRange) return;

        // 向き判定（攻撃できるのは正面のみとするならここで判定だが、
        // 「後から攻撃されるとダメージ増」の実装が主なので、攻撃自体は全方位可能とするか、
        // あるいは正面を向かないと撃てないとするか。
        // リクエスト「軍隊は進行方向に回転し」て進むので、攻撃も正面範囲に制限するのが自然だが、
        // 今回はまずダメージ計算への背面補正を実装。攻撃可能角は一旦広めにとっておく（あるいは制限なし）。

        let diff = unit.stats.atk - target.stats.def;

        // 基本ダメージ: 差分の10% または 攻撃力の5%（最低保証）
        let baseDamage = Math.max(diff * 0.1, unit.stats.atk * 0.05);

        // 最小ダメージ設定
        if (baseDamage < CONFIG.BATTLE.MIN_DAMAGE) baseDamage = CONFIG.BATTLE.MIN_DAMAGE;

        // 方向補正
        // 攻撃ベクトル（攻撃者 -> 対象）の角度
        const attackAngle = Math.atan2(dy, dx);
        // 対象の向きと攻撃の来る方向の差
        // 攻撃が来る方向は attackAngle。
        // 対象の正面は target.rotation。
        // 背後を取られている = 攻撃者の位置が、対象の背中側 = attackAngle と target.rotation が近い
        // 例: 対象が右(0)向き。攻撃者が右(0)にいる(正面)。 -> 背後ではない。攻撃者が左(PI)にいる(背後)。
        // 待て、attackAngleは「攻撃者がターゲットを見る向き」。
        // ターゲットから見た攻撃者の方向は attackAngle + PI。
        // 背後から殴られる = ターゲットのrotation と (attackAngle) が同じ方向。
        // 例: ターゲット -> (0度)。 攻撃者 -> ターゲット (0度)。
        // つまりターゲットの後ろから攻撃者が追っている形。
        // なので、 abs(target.rotation - attackAngle) が小さいほど「背面攻撃」。

        const angleToAttackerDiff = Math.abs(this.normalizeAngle(target.rotation - attackAngle));

        let directionMult = 1.0;
        let hitType = '';

        if (angleToAttackerDiff < Math.PI / 4) {
            // 差が45度以内 = 背後からの攻撃（追われている）
            directionMult = 1.2;
            hitType = 'BACK STAB!';
        } else if (angleToAttackerDiff < 3 * Math.PI / 4) {
            // 45~135度 = 横からの攻撃
            directionMult = 1.1;
            hitType = 'SIDE ATTACK';
        } else {
            // 135度以上 = 正面からの攻撃
            directionMult = 1.0;
        }

        baseDamage *= directionMult;

        const variance = 1 - CONFIG.BATTLE.DAMAGE_VARIANCE + this.rng() * CONFIG.BATTLE.DAMAGE_VARIANCE * 2;
        let damage = Math.floor(baseDamage * variance);

        // クリティカル・相性
        let isCritical = false;
        if (UnitGenerator.hasAdvantage(unit.class, target.class)) {
            damage = Math.floor(damage * CONFIG.BATTLE.ADVANTAGE_MULTIPLIER);
            isCritical = true;
        }

        target.currentHp -= damage;
        unit.lastAttackTime = now;

        // エフェクト生成
        this.spawnEffect(target.x, target.y, 'hit');

        let color = isCritical ? '#FF0000' : '#FFFFFF';
        if (directionMult >= 1.2) color = '#FFA500'; // 背面はオレンジ

        this.spawnFloatingText(target.x, target.y - 20, damage.toString() + (hitType ? `\n${hitType}` : ''), color, isCritical);

        if (unit.isEnemy) {
            this.stats.damageTaken += damage;
        } else {
            this.stats.damageDealt += damage;
        }
    }

    processUnitAttackMulti(unit, enemies, now) {
        if (enemies.length === 0) return;

        // 攻撃間隔は基本値を使用
        const attackInterval = CONFIG.BATTLE.ATTACK_INTERVAL;
        if (now - unit.lastAttackTime < attackInterval) return;

        // 射程計算
        const rangeMultiplier = CONFIG.BATTLE.RANGE_PIXEL_MULTIPLIER || 0.1;
        let attackRange = unit.stats.rng * rangeMultiplier;

        // 最低射程保証（接触して攻撃できないのを防ぐ）
        // ユニットサイズ(40) + マージン(10)
        attackRange = Math.max(attackRange, CONFIG.BATTLE.UNIT_SIZE + 10);

        // スキル：射程2倍
        if (unit.skillType === 'sniper' && unit.skillActive) {
            attackRange *= 2.0;
        }

        let hitCount = 0;

        // 攻撃対象をリストアップ
        const validTargets = [];
        for (const target of enemies) {
            if (target.currentHp <= 0) continue;

            const dx = target.x - unit.x;
            const dy = target.y - unit.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 射程外ならスキップ
            if (dist > attackRange) continue;

            validTargets.push(target);
        }

        if (validTargets.length === 0) return;

        // 攻撃力を分散
        // ユーザー要件: "攻撃力がそれぞれ等分される"
        const effectiveAtk = unit.stats.atk / validTargets.length;

        for (const target of validTargets) {
            hitCount++;

            const dx = target.x - unit.x;
            const dy = target.y - unit.y;

            // ダメージ計算
            let diff = effectiveAtk - target.stats.def;
            let baseDamage = Math.max(diff * 0.1, effectiveAtk * 0.05);
            if (baseDamage < CONFIG.BATTLE.MIN_DAMAGE) baseDamage = CONFIG.BATTLE.MIN_DAMAGE;

            const attackAngle = Math.atan2(dy, dx);
            const angleToAttackerDiff = Math.abs(this.normalizeAngle(target.rotation - attackAngle));

            let directionMult = 1.0;
            let hitType = '';

            if (angleToAttackerDiff < Math.PI / 4) {
                directionMult = 1.2;
                hitType = 'BACK STAB!';
            } else if (angleToAttackerDiff < 3 * Math.PI / 4) {
                directionMult = 1.1;
                hitType = 'SIDE ATTACK';
            }

            baseDamage *= directionMult;

            const variance = 1 - CONFIG.BATTLE.DAMAGE_VARIANCE + Math.random() * CONFIG.BATTLE.DAMAGE_VARIANCE * 2;
            let damage = Math.floor(baseDamage * variance);

            // 忍者スキル：3倍ダメージ
            if (unit.skillType === 'critical' && unit.skillActive) {
                damage *= 3;
                unit.skillActive = false; // 一回のみ
                unit.skillType = null;
                hitType = (hitType ? hitType + '\n' : '') + 'CRITICAL!!';
            }

            if (UnitGenerator.hasAdvantage(unit.class, target.class)) {
                damage = Math.floor(damage * CONFIG.BATTLE.ADVANTAGE_MULTIPLIER);
            }

            // ダメージ適用
            target.currentHp -= damage;

            // 反撃: ターゲットがいなくて待機中の場合、攻撃者に向かう（手動操作中以外）
            if (!target.target && target.targetX === null && target.currentHp > 0) {
                target.target = unit;
            }

            // エフェクト生成
            this.spawnEffect(target.x, target.y, 'hit');

            let color = '#FFFFFF';
            if (directionMult >= 1.2) color = '#FFA500';

            this.spawnFloatingText(target.x, target.y - 20, damage.toString() + (hitType ? `\n${hitType}` : ''), color, false);

            if (unit.isEnemy) {
                this.stats.damageTaken += damage;
            } else {
                this.stats.damageDealt += damage;
            }
        }

        if (hitCount > 0) {
            unit.lastAttackTime = now;
            if (window.soundManager) {
                // 攻撃ヒット音（頻度が高いので音量注意、またはスロットリング）
                window.soundManager.playSE('se_attack');
            }
        }
    }

    spawnEffect(x, y, type) {
        let maxLife = 0.3;
        let radius = 20;

        if (type === 'explosion') {
            maxLife = 0.8;
            radius = 60;
        }

        this.effects.push({
            x, y, type,
            life: 0,
            maxLife: maxLife,
            radius: radius
        });
    }

    spawnFloatingText(x, y, text, color, isCritical) {
        this.floatingTexts.push({
            x, y, text, color,
            life: 0,
            maxLife: 1.0,
            scale: isCritical ? 1.5 : 1.0,
            vy: -20 // 上昇速度
        });
    }

    updateEffects(dt) {
        // エフェクト更新
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.life += dt;
            if (effect.life >= effect.maxLife) {
                this.effects.splice(i, 1);
            }
        }

        // テキスト更新
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const text = this.floatingTexts[i];
            text.life += dt;
            text.y += text.vy * dt;
            if (text.life >= text.maxLife) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    removeDeadUnits() {
        for (let i = this.playerUnits.length - 1; i >= 0; i--) {
            if (this.playerUnits[i].currentHp <= 0) {
                const u = this.playerUnits[i];
                this.spawnEffect(u.x, u.y, 'explosion');
                this.spawnFloatingText(u.x, u.y, "DESTROYED", '#AAAAAA', false);
                this.stats.enemyKills++;
                this.playerUnits.splice(i, 1);
            }
        }

        for (let i = this.enemyUnits.length - 1; i >= 0; i--) {
            if (this.enemyUnits[i].currentHp <= 0) {
                const u = this.enemyUnits[i];
                this.spawnEffect(u.x, u.y, 'explosion');
                this.spawnFloatingText(u.x, u.y, "DEFEATED", '#FFFF00', true);
                this.stats.playerKills++;
                this.enemyUnits.splice(i, 1);
            }
        }
    }

    checkBattleEnd() {
        if (this.phase === 'end') return;

        const allEnemiesDeployed = this.enemyDeck.every(u => u.deployed);
        const allEnemiesDead = this.enemyUnits.length === 0;

        if (allEnemiesDeployed && allEnemiesDead) {
            this.triggerBattleEnd(true);
            return;
        }

        const allPlayersDeployed = this.playerDeck.every(u => u.deployed);
        const allPlayersDead = this.playerUnits.length === 0;

        if (allPlayersDeployed && allPlayersDead) {
            this.triggerBattleEnd(false);
            return;
        }
    }

    triggerBattleEnd(isWin) {
        this.phase = 'end';
        this.animTime = 0;
        this.result = isWin;

        // 敗者を消滅させる（演出）
        if (isWin) {
            this.enemyUnits = [];
        } else {
            this.playerUnits = [];
        }
    }

    endBattle(isWin) {
        this.isEnded = true;

        const duration = (Date.now() - this.startTime) / 1000;
        const finalStats = {
            ...this.stats,
            time: duration,
            kills: this.stats.enemyKills // Map for main.js compatibility
        };

        if (this.onBattleEnd) {
            this.onBattleEnd(isWin, finalStats);
        }
    }

    /**
     * 描画処理
     */
    renderMap(ctx) {
        // 地形描画
        this.terrain.forEach(t => {
            if (t.type === 'mountain') {
                ctx.fillStyle = 'rgba(160, 82, 45, 0.3)'; // Sienna
                ctx.fillRect(t.x, t.y, t.w, t.h);
                ctx.font = '20px "Noto Sans JP"';
                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(160, 82, 45, 0.5)';
                ctx.fillText('▲', t.x + t.w / 2, t.y + t.h / 2);
            } else if (t.type === 'river') {
                ctx.fillStyle = 'rgba(30, 144, 255, 0.3)'; // DodgerBlue
                ctx.fillRect(t.x, t.y, t.w, t.h);
                ctx.font = '16px "Noto Sans JP"';
                ctx.fillStyle = 'rgba(30, 144, 255, 0.8)';
                ctx.fillText('川', t.x + t.w / 2, t.y + t.h / 2);
            } else if (t.type === 'bad_road') {
                ctx.fillStyle = 'rgba(139, 69, 19, 0.3)'; // SaddleBrown
                ctx.fillRect(t.x, t.y, t.w, t.h);
                ctx.fillStyle = 'rgba(139, 69, 19, 0.5)';
                ctx.fillText('悪路', t.x + t.w / 2, t.y + t.h / 2);
            }
        });

        // オブジェクト描画
        this.objects.forEach(o => {
            if (o.currentHp <= 0) return;

            ctx.save();
            ctx.translate(o.x, o.y);

            // 本体
            ctx.fillStyle = '#666';
            ctx.beginPath();
            if (o.type === 'rock') {
                ctx.arc(0, 0, o.width / 2, 0, Math.PI * 2);
            } else {
                ctx.fillRect(-o.width / 2, -o.height / 2, o.width, o.height);
            }
            ctx.fill();
            ctx.strokeStyle = '#333';
            ctx.stroke();

            // 名前
            ctx.fillStyle = '#FFF';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(o.name || '', 0, 0);

            // HPバー
            const hpRatio = Math.max(0, o.currentHp / o.maxHp);
            const barW = o.width;
            const barY = -o.height / 2 - 8;
            ctx.fillStyle = '#333';
            ctx.fillRect(-barW / 2, barY, barW, 4);
            ctx.fillStyle = hpRatio > 0.5 ? '#0F0' : '#F00';
            ctx.fillRect(-barW / 2, barY, barW * hpRatio, 4);

            ctx.restore();
        });
    }

    render() {
        if (!this.ctx) return;

        // 解像度チェック＆自動リサイズ（引き伸ばし防止）
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        // 1ピクセル以上のズレがあればリサイズ
        if (Math.abs(this.canvas.width - rect.width * dpr) > 1 ||
            Math.abs(this.canvas.height - rect.height * dpr) > 1) {
            this.resize();
        }

        const ctx = this.ctx;

        ctx.clearRect(0, 0, this.width, this.height);

        // 背景
        ctx.fillStyle = '#E8E4D9'; // 和紙っぽい色
        ctx.fillRect(0, 0, this.width, this.height);

        // マップ描画
        this.renderMap(ctx);

        // グリッド描画
        ctx.strokeStyle = 'rgba(74, 55, 40, 0.1)';
        ctx.lineWidth = 1;

        const gridSize = 40;
        for (let x = 0; x < this.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        // ターゲットライン描画
        this.renderTargetLines(ctx);

        // 選択ユニットのUI (移動ライン等は残す)
        if (this.selectedUnit) {
            // 背景マーカー（大きな青い円）は削除しました（ユーザーフィードバック対応）

            // 選択中のユニットの移動先ラインを強調
            if (this.selectedUnit.target) {
                ctx.beginPath();
                ctx.moveTo(this.selectedUnit.x, this.selectedUnit.y);
                ctx.lineTo(this.selectedUnit.target.x, this.selectedUnit.target.y);
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (this.selectedUnit.targetX !== null) {
                // 移動ライン
                ctx.beginPath();
                ctx.moveTo(this.selectedUnit.x, this.selectedUnit.y);
                ctx.lineTo(this.selectedUnit.targetX, this.selectedUnit.targetY);
                ctx.strokeStyle = '#00FF00';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);

                // 目標地点に・印
                const tx = this.selectedUnit.targetX;
                const ty = this.selectedUnit.targetY;
                ctx.fillStyle = '#00FF00';
                ctx.beginPath();
                ctx.arc(tx, ty, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // ユニット描画
        for (const unit of this.enemyUnits) {
            this.renderUnit(unit, true);
        }
        for (const unit of this.playerUnits) {
            this.renderUnit(unit, false);
        }

        // エフェクト描画
        this.renderEffects(ctx);

        // オーバーレイ（開始・終了演出）
        this.renderOverlay(ctx);
    }

    renderOverlay(ctx) {
        const w = this.width;
        const h = this.height;

        if (this.phase === 'start') {
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, 0.5 - this.animTime * 0.5)})`;
            ctx.fillRect(0, 0, w, h);

            const scale = 1 + this.animTime * 0.5;
            const alpha = Math.max(0, 1 - (this.animTime - 1.0)); // 1秒後からフェードアウト

            ctx.save();
            ctx.translate(w / 2, h / 2);
            ctx.scale(scale, scale);
            ctx.font = 'bold 48px "Noto Sans JP", serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.shadowColor = '#FFFFFF';
            ctx.shadowBlur = 10;
            ctx.fillText("合戦開始", 0, 0);
            ctx.restore();
        } else if (this.phase === 'end') {
            const alpha = Math.min(0.7, this.animTime * 0.5);
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(0, 0, w, h);

            if (this.animTime > 0.5) {
                ctx.save();
                ctx.translate(w / 2, h / 2);
                ctx.font = 'bold 64px "Noto Sans JP", serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#FFFFFF';
                // ctx.shadowColor = '#FFD700'; // 重いかも
                // ctx.shadowBlur = 20;
                ctx.fillText("終戦！", 0, 0);

                // 勝利/敗北サブテキスト
                if (this.animTime > 1.5) {
                    ctx.font = 'bold 32px "Noto Sans JP", serif';
                    const subText = this.result ? "敵軍壊滅" : "自軍敗走...";
                    const subColor = this.result ? '#FFD700' : '#AAAAAA';
                    ctx.fillStyle = subColor;
                    ctx.fillText(subText, 0, 60);
                }
                ctx.restore();
            }
        }
    }

    renderEffects(ctx) {
        // ヒットエフェクト / 爆発
        for (const effect of this.effects) {
            if (effect.type === 'hit') {
                const alpha = 1 - (effect.life / effect.maxLife);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, 20 + effect.life * 50, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            } else if (effect.type === 'explosion') {
                const progress = effect.life / effect.maxLife;
                const alpha = 1 - progress;

                ctx.globalAlpha = alpha;

                // 爆発の芯
                ctx.fillStyle = '#FFFF00';
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, effect.radius * progress, 0, Math.PI * 2);
                ctx.fill();

                // 爆発の外炎
                ctx.strokeStyle = '#FF4500';
                ctx.lineWidth = 5 * (1 - progress);
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, effect.radius * progress * 1.5, 0, Math.PI * 2);
                ctx.stroke();

                ctx.globalAlpha = 1.0;
            }
        }

        // ダメージテキスト
        for (const text of this.floatingTexts) {
            const alpha = 1 - (text.life / text.maxLife);
            ctx.globalAlpha = alpha;
            ctx.font = `bold ${16 * text.scale}px sans-serif`;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.fillStyle = text.color;
            ctx.strokeText(text.text, text.x, text.y);
            ctx.fillText(text.text, text.x, text.y);
            ctx.globalAlpha = 1.0;
        }
    }

    spawnEffect(x, y, type) {
        let maxLife = 0.3;
        let radius = 20;

        if (type === 'explosion') {
            maxLife = 0.8;
            radius = 60;
        }

        this.effects.push({
            x, y, type,
            life: 0,
            maxLife: maxLife,
            radius: radius
        });
    }

    addFloatingText(x, y, text, color, fontSize = 20) {
        this.floatingTexts.push({
            x, y, text, color,
            life: 0,
            maxLife: 1.0,
            scale: fontSize / 16
        });
    }

    renderTargetLines(ctx) {
        ctx.lineWidth = 1;

        // プレイヤーユニットのライン（青）
        ctx.strokeStyle = 'rgba(58, 93, 174, 0.3)';
        for (const unit of this.playerUnits) {
            if (unit.target) {
                ctx.beginPath();
                ctx.moveTo(unit.x, unit.y);
                ctx.lineTo(unit.target.x, unit.target.y);
                ctx.stroke();
            } else if (unit.targetX !== null) {
                ctx.beginPath();
                ctx.moveTo(unit.x, unit.y);
                ctx.lineTo(unit.targetX, unit.targetY);
                ctx.stroke();
            }
        }

        // 敵ユニットのライン（赤）
        ctx.strokeStyle = 'rgba(199, 62, 58, 0.3)';
        for (const unit of this.enemyUnits) {
            if (unit.target) {
                ctx.beginPath();
                ctx.moveTo(unit.x, unit.y);
                ctx.lineTo(unit.target.x, unit.target.y);
                ctx.stroke();
            }
        }
    }


    renderUnit(unit, isEnemy) {
        const ctx = this.ctx;
        const size = CONFIG.BATTLE.UNIT_SIZE;
        const x = unit.x;
        const y = unit.y;

        // 選択中の場合、攻撃範囲と衝突判定を描画
        if (unit === this.selectedUnit) {
            const rangeMultiplier = CONFIG.BATTLE.RANGE_PIXEL_MULTIPLIER || 0.1;
            let finalRange = unit.stats.rng * rangeMultiplier;

            // スキル補正（範囲3倍）
            if (unit.skillType === 'sniper' && unit.skillActive) {
                finalRange *= 3;
            }

            ctx.save();
            ctx.translate(x, y);

            // 1. 攻撃範囲（薄い赤色の円）
            ctx.beginPath();
            ctx.arc(0, 0, finalRange, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 50, 50, 0.15)'; // 赤系
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 50, 50, 0.6)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]); // 点線
            ctx.stroke();
            ctx.setLineDash([]);

            // 2. 衝突判定（物理ボディ）の可視化
            // ユニットサイズ = 直径。半径は size/2
            ctx.beginPath();
            ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; // 白枠で衝突判定を示す
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.restore();
        }

        const hpRatio = unit.currentHp / unit.maxHp;

        // サイズスケーリング（最小50%）
        const scale = 0.5 + 0.5 * hpRatio;

        const classInfo = CONFIG.CLASS_DISPLAY[unit.class] || CONFIG.CLASS_DISPLAY.infantry;
        const symbol = classInfo.symbol;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(unit.rotation + Math.PI / 2);

        // 背景円
        ctx.beginPath();
        ctx.arc(0, 0, size / 2 * scale, 0, Math.PI * 2); // 背景も小さくする？ "軍隊の見た目" -> symbol size. Let's scale everything attached to unit context.
        // But if I scale context, the circle scales too.
        // User said "Size gets smaller".

        // 正面インジケーター（三角形） - Scaleの外に置くか内に置くか。
        // If unit gets smaller, direction should probably remain visible? 
        // Let's scale the whole context.
        ctx.scale(scale, scale);

        // 背景円
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = isEnemy ? 'rgba(26, 26, 26, 0.2)' : 'rgba(255, 255, 255, 0.2)';
        ctx.fill();

        // 選択状態
        if (unit === this.selectedUnit) {
            ctx.strokeStyle = '#FFD700'; // 金色で選択強調
            ctx.lineWidth = 3 / scale; // 線の太さは維持
            ctx.stroke();
        }

        // 正面インジケーター（三角形）
        ctx.beginPath();
        ctx.moveTo(0, -size / 2 - 5); // 先端
        ctx.lineTo(4, -size / 2 + 2);
        ctx.lineTo(-4, -size / 2 + 2);
        ctx.closePath();
        ctx.fillStyle = isEnemy ? '#C73E3A' : '#3A5DAE';
        ctx.fill();

        // 凸を描画（1つのみ）
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 凸（凸型図形）をパスで描画
        const char = classInfo.char || symbol.charAt(0);

        // 図形定義 (中心 0,0)
        // 全体サイズ感: size (40px)
        const w = size * 0.9;
        const h = size * 0.9;
        const topW = w * 0.5; // 上の突起の幅
        const topH = h * 0.35; // 上の突起の高さ
        const baseH = h - topH;

        // 座標計算
        // 上辺 Y: -h/2
        // 下辺 Y: h/2
        // 肩 Y: -h/2 + topH
        const yTop = -h / 2;
        const yShoulder = yTop + topH;
        const yBottom = h / 2;

        ctx.beginPath();
        ctx.moveTo(-topW / 2, yTop);       // 左上
        ctx.lineTo(topW / 2, yTop);        // 右上
        ctx.lineTo(topW / 2, yShoulder);   // 右首元
        ctx.lineTo(w / 2, yShoulder);      // 右肩
        ctx.lineTo(w / 2, yBottom);        // 右下
        ctx.lineTo(-w / 2, yBottom);       // 左下
        ctx.lineTo(-w / 2, yShoulder);     // 左肩
        ctx.lineTo(-topW / 2, yShoulder);  // 左首元
        ctx.closePath();

        if (isEnemy) {
            // 敵: 黒系塗りつぶし、白枠
            ctx.fillStyle = '#222222';
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 文字: 白
            ctx.fillStyle = '#FFFFFF';
        } else {
            // 味方: 白系塗りつぶし、青枠
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = '#3A5DAE';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 文字: 黒
            ctx.fillStyle = '#000000';
        }

        // クラス文字描画
        ctx.font = 'bold 16px "Noto Sans JP", sans-serif';
        // 少し下にずらして重心に合わせる
        ctx.fillText(char, 0, 5);

        ctx.restore();

        // HPバー
        const barWidth = size * scale; // バーも小さくする
        const barHeight = 4;
        const barX = x - barWidth / 2;
        const barY = y + size / 2 * scale + 5;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = hpRatio > 0.5 ? '#4A7C3F' : hpRatio > 0.25 ? '#D4A853' : '#C73E3A';
        ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

        // 数字情報
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        ctx.fillText(Math.ceil(unit.currentHp), x, barY + 12);
    }

    renderEffects(ctx) {
        // ヒットエフェクト
        for (const effect of this.effects) {
            if (effect.type === 'hit') {
                const alpha = 1 - (effect.life / effect.maxLife);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, 20 + effect.life * 50, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
        }

        // ダメージテキスト
        for (const text of this.floatingTexts) {
            const alpha = 1 - (text.life / text.maxLife);
            ctx.globalAlpha = alpha;
            ctx.font = `bold ${16 * text.scale}px sans-serif`;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.fillStyle = text.color;
            ctx.strokeText(text.text, text.x, text.y);
            ctx.fillText(text.text, text.x, text.y);
            ctx.globalAlpha = 1.0;
        }
    }

    // UI更新メソッド
    updateEnemyInfo() {
        const remaining = this.enemyDeck.filter(u => !u.deployed).length + this.enemyUnits.length;
        const total = this.enemyDeck.length;
        const el = document.getElementById('enemy-remaining');
        if (el) {
            el.textContent = `残り: ${remaining}/${total}`;
        }
    }

    initUnitStatusUI() {
        const container = document.getElementById('unit-status-container');
        if (!container) return;
        container.innerHTML = '';

        this.playerDeck.forEach((unit, index) => {
            const item = document.createElement('div');
            item.className = 'unit-status-item';
            item.id = `unit-status-${unit.id}`;

            const classInfo = CONFIG.CLASS_DISPLAY[unit.class] || CONFIG.CLASS_DISPLAY.infantry;

            // ゲージ（背景）とコンテンツ（前面）
            item.innerHTML = `
                <div class="unit-status-gauge" id="unit-status-gauge-${unit.id}"></div>
                <div class="unit-status-content">
                    <div class="unit-header-short">
                        <span class="unit-name">${unit.name}</span>
                        <span class="unit-class">${classInfo.name}</span>
                    </div>
                    <div class="unit-params-list">
                        <div class="p-row"><span class="lbl">攻</span>${unit.stats.atk}</div>
                        <div class="p-row"><span class="lbl">防</span>${unit.stats.def}</div>
                        <div class="p-row"><span class="lbl">射</span>${unit.stats.rng}</div>
                        <div class="p-row"><span class="lbl">機</span>${unit.stats.spd}</div>
                    </div>
                </div>
                <div class="unit-status-overlay" id="unit-status-overlay-${unit.id}"></div>
            `;
            container.appendChild(item);

            const handleUnitSelect = () => {
                const battleUnit = this.playerUnits.find(u => u.id === unit.id);
                if (battleUnit && battleUnit.currentHp > 0) {
                    this.selectedUnit = battleUnit;
                    // グローバル関数のplaySe、またはwindow.soundManagerを使用
                    if (typeof playSe === 'function') {
                        playSe('tap');
                    } else if (window.soundManager) {
                        window.soundManager.playSE('tap');
                    }
                    this.updateSkillButton();
                }
            };

            if (window.setupInteraction) {
                // 長押し/ダブルタップで詳細、シングルタップで選択
                window.setupInteraction(item, unit, handleUnitSelect);
            } else {
                // フォールバック
                item.addEventListener('click', handleUnitSelect);
            }
        });
    }

    updateUnitStatusUI() {
        this.playerDeck.forEach(deckUnit => {
            const item = document.getElementById(`unit-status-${deckUnit.id}`);
            const gaugeEl = document.getElementById(`unit-status-gauge-${deckUnit.id}`);
            const overlayEl = document.getElementById(`unit-status-overlay-${deckUnit.id}`);
            if (!item || !gaugeEl) return;

            const battleUnit = this.playerUnits.find(u => u.id === deckUnit.id);

            item.classList.remove('active', 'engaged', 'dead');
            overlayEl.textContent = '';

            if (battleUnit) {
                // 生存
                if (battleUnit === this.selectedUnit) {
                    item.classList.add('active');
                }

                // HPゲージ更新
                const hpRatio = Math.max(0, battleUnit.currentHp / battleUnit.maxHp);
                gaugeEl.style.width = `${hpRatio * 100}%`;

                // 色の変化（ピンチで赤くするなど）
                if (hpRatio < 0.3) {
                    gaugeEl.style.background = 'rgba(255, 69, 0, 0.4)';
                } else {
                    gaugeEl.style.background = 'rgba(58, 93, 174, 0.4)';
                }

                const isAttacking = battleUnit.cooldown > 0 && battleUnit.target && battleUnit.target.currentHp > 0;
                const isClose = battleUnit.target && Math.hypot(battleUnit.target.x - battleUnit.x, battleUnit.target.y - battleUnit.y) < (battleUnit.stats.rng * 1.5 + 50);

                if (battleUnit.isEngaged && (isAttacking || isClose)) {
                    item.classList.add('engaged');
                    overlayEl.textContent = '⚔️FIGHTING';
                    overlayEl.style.color = '#FF4500';
                    overlayEl.style.fontWeight = 'bold';
                    gaugeEl.style.background = 'rgba(255, 69, 0, 0.5)'; // 交戦中は赤
                }
            } else {
                // 死亡
                item.classList.add('dead');
                gaugeEl.style.width = '0%';
                overlayEl.textContent = '💀LOST';
                overlayEl.style.color = '#888888';
            }
        });
    }

    updateSkillButton() {
        const btnSkill = document.getElementById('btn-skill');
        if (!btnSkill) return;

        if (this.selectedUnit && !this.selectedUnit.skillUsed && this.selectedUnit.currentHp > 0 && !this.isEnded) {
            btnSkill.classList.remove('hidden');

            // クラス別テキスト
            const { CLASS } = CONFIG;
            let text = "⚡ スキル発動";
            switch (this.selectedUnit.class) {
                case CLASS.INFANTRY: text = "⚡ 回復 (小)"; break;
                case CLASS.SPECIAL: text = "⚡ 必殺の一撃"; break;
                case CLASS.TANK: text = "⚡ 鉄壁"; break;
                case CLASS.RANGE: text = "⚡ 千里眼"; break;
                case CLASS.CAVALRY: text = "⚡ 神速"; break;
            }
            btnSkill.textContent = text;
        } else {
            btnSkill.classList.add('hidden');
        }
    }

    activateSkill(unit) {
        if (!unit || unit.skillUsed || unit.currentHp <= 0) return;

        unit.skillUsed = true;
        unit.skillActive = true;
        unit.skillTimer = 10.0;

        // エフェクト・サウンド
        if (window.soundManager) window.soundManager.playSE('se_charge'); // 汎用スキル音（突撃音を使用）
        this.addFloatingText(unit.x, unit.y - 40, 'SKILL ACTIVATE!', '#FFD700', 30);

        const { CLASS } = CONFIG;

        // クラス別効果
        switch (unit.class) {
            case CLASS.INFANTRY:
                // 体力2割回復
                const heal = unit.maxHp * 0.2;
                unit.currentHp = Math.min(unit.maxHp, unit.currentHp + heal);
                this.addFloatingText(unit.x, unit.y - 60, 'RECOVER', '#00FF00', 20);
                unit.skillActive = false; // 即時効果なのでアクティブフラグは不要だが、エフェクト用に残す？一旦OFF
                break;

            case CLASS.SPECIAL:
                // 忍者：次の一撃3倍 (フラグで管理)
                unit.skillType = 'critical';
                // 時間制限なし（一回打つまで）または10秒? "一回" implies next hit.
                // Timer is 10s fallback or unused? I will use 'critical' flag in combat logic.
                this.addFloatingText(unit.x, unit.y - 60, 'DEADLY BLOW', '#800080', 20);
                break;

            case CLASS.TANK:
                // 重装：無敵＆押し返し (10秒)
                unit.skillType = 'fortress';
                this.addFloatingText(unit.x, unit.y - 60, 'FORTRESS', '#4682B4', 20);
                break;

            case CLASS.RANGE:
                // 弓兵：射程3倍 (10秒)
                unit.skillType = 'sniper';
                this.addFloatingText(unit.x, unit.y - 60, 'EAGLE EYE', '#2E8B57', 20);
                break;

            case CLASS.CAVALRY:
                // 騎兵：速度3倍 (10秒)
                unit.skillType = 'rush';
                this.addFloatingText(unit.x, unit.y - 60, 'GOD SPEED', '#FFA500', 20);
                break;
        }

        // UI更新
        this.updateUnitStatusUI();
    }

    // 敵のスキル発動（外部から呼び出し）
    enemyUseSkill(deckIndex) {
        const unit = this.enemyUnits.find(u => u.deckIndex === deckIndex);
        if (unit && unit.currentTp >= 100) {
            this.activateSkill(unit);
        }
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
        this.lastTime = Date.now();
    }

    destroy() {
        this.isEnded = true;
    }
}

// グローバルにエクスポート
window.BattleSystem = BattleSystem;

