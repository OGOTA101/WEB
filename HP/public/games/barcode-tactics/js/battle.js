/* ========================================
   Bar-Code Tactics: 凸（TOTSU）
   バトルシステム
   ======================================== */

class BattleSystem {
    constructor(canvas, playerDeck, enemyUnits, onBattleEnd) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onBattleEnd = onBattleEnd;

        // 画面サイズ
        this.resize();

        // ゲーム状態
        this.isPaused = false;
        this.isEnded = false;
        this.cost = CONFIG.BATTLE.COST_START;
        this.lastCostTime = Date.now();

        // ユニット管理
        this.playerUnits = [];      // フィールド上のプレイヤーユニット
        this.enemyUnits = [];       // フィールド上の敵ユニット
        this.playerDeck = playerDeck.map(u => ({ ...u, deployed: false }));
        this.enemyDeck = enemyUnits.map(u => ({ ...u, deployed: false }));

        // 選択状態
        this.selectedUnit = null;

        // AI
        this.ai = new BattleAI(this);

        // イベントリスナー
        this.setupEventListeners();

        // 統計
        this.stats = {
            playerKills: 0,
            enemyKills: 0,
            damageDealt: 0,
            damageTaken: 0
        };

        // ゲームループ開始
        this.lastTime = Date.now();
        this.gameLoop();
    }

    resize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        // ヘッダーとフッターを考慮
        const headerHeight = 50;
        const footerHeight = 180;

        this.width = rect.width;
        this.height = window.innerHeight - headerHeight - footerHeight;

        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // 陣地の境界
        this.playerZoneY = this.height * 0.7;  // プレイヤー陣地の上端
        this.enemyZoneY = this.height * 0.3;   // 敵陣地の下端
    }

    setupEventListeners() {
        // タッチ/クリックイベント
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e), { passive: false });
        this.canvas.addEventListener('mousedown', (e) => this.handleClick(e));

        // リサイズ
        window.addEventListener('resize', () => this.resize());
    }

    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        this.handleInput(x, y);
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.handleInput(x, y);
    }

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

    /**
     * ユニットを出撃させる
     */
    deployUnit(deckIndex, isEnemy = false) {
        const deck = isEnemy ? this.enemyDeck : this.playerDeck;
        const units = isEnemy ? this.enemyUnits : this.playerUnits;

        if (deckIndex < 0 || deckIndex >= deck.length) return false;

        const unitData = deck[deckIndex];
        if (unitData.deployed) return false;

        // フィールド上限チェック
        if (units.length >= CONFIG.BATTLE.MAX_UNITS_ON_FIELD) return false;

        // コストチェック（プレイヤーのみ）
        if (!isEnemy) {
            const deployCost = UnitGenerator.getDeployCost(unitData);
            if (this.cost < deployCost) return false;
            this.cost -= deployCost;
        }

        // 出撃位置を決定
        const x = this.width * (0.2 + 0.6 * (deckIndex / (deck.length - 1 || 1)));
        const y = isEnemy ? 50 : this.height - 50;

        // バトルユニットを作成
        const battleUnit = this.createBattleUnit(unitData, x, y, isEnemy);
        units.push(battleUnit);

        unitData.deployed = true;

        // UI更新イベント
        if (!isEnemy) {
            this.updateDeploySlots();
        }

        return true;
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
            isEnemy
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
        // コストを回復
        const now = Date.now();
        if (now - this.lastCostTime >= 1000) {
            if (this.cost < CONFIG.BATTLE.COST_MAX) {
                this.cost = Math.min(this.cost + CONFIG.BATTLE.COST_PER_SECOND, CONFIG.BATTLE.COST_MAX);
            }
            this.lastCostTime = now;
            this.updateCostUI();
        }

        // AIの更新
        this.ai.update(dt);

        // ユニットの更新
        this.updateUnits(this.playerUnits, this.enemyUnits, dt);
        this.updateUnits(this.enemyUnits, this.playerUnits, dt);

        // 戦闘処理
        this.processCombat();

        // 死亡ユニットの除去
        this.removeDeadUnits();

        // 勝敗判定
        this.checkBattleEnd();
    }

    updateUnits(units, enemies, dt) {
        for (const unit of units) {
            // ターゲットが死んでいたらクリア
            if (unit.target && unit.target.currentHp <= 0) {
                unit.target = null;
            }

            // 移動処理
            let targetX = unit.targetX;
            let targetY = unit.targetY;

            // 攻撃対象がいる場合、その方向に移動
            if (unit.target) {
                targetX = unit.target.x;
                targetY = unit.target.y;
            }

            // 自動で最寄りの敵を狙う（ターゲットがない場合）
            if (!unit.target && !targetX && !targetY && enemies.length > 0) {
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

            if (targetX !== null && targetY !== null) {
                const dx = targetX - unit.x;
                const dy = targetY - unit.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // 攻撃範囲内なら停止
                const attackRange = CONFIG.BATTLE.ATTACK_RANGE[unit.stats.rng];
                if (unit.target && dist <= attackRange) {
                    // 攻撃範囲内
                } else if (dist > 5) {
                    // 移動
                    const speed = unit.stats.spd * CONFIG.BATTLE.SPEED_MULTIPLIER * dt;
                    const moveX = (dx / dist) * speed;
                    const moveY = (dy / dist) * speed;

                    unit.x += moveX;
                    unit.y += moveY;

                    // 画面内に制限
                    unit.x = Math.max(30, Math.min(this.width - 30, unit.x));
                    unit.y = Math.max(30, Math.min(this.height - 30, unit.y));
                } else if (!unit.target) {
                    // 目的地に到達
                    unit.targetX = null;
                    unit.targetY = null;
                }
            }
        }
    }

    processCombat() {
        const now = Date.now();

        // プレイヤーユニットの攻撃
        for (const unit of this.playerUnits) {
            this.processUnitAttack(unit, this.enemyUnits, now);
        }

        // 敵ユニットの攻撃
        for (const unit of this.enemyUnits) {
            this.processUnitAttack(unit, this.playerUnits, now);
        }
    }

    processUnitAttack(unit, enemies, now) {
        if (enemies.length === 0) return;

        // 攻撃間隔チェック
        const attackInterval = CONFIG.BATTLE.RANGE_ATTACK_INTERVAL[unit.stats.rng];
        if (now - unit.lastAttackTime < attackInterval) return;

        // 攻撃対象を探す
        let target = unit.target;
        if (!target || target.currentHp <= 0) {
            // 最も近い敵を探す
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

        // 攻撃範囲チェック
        const dx = target.x - unit.x;
        const dy = target.y - unit.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const attackRange = CONFIG.BATTLE.ATTACK_RANGE[unit.stats.rng];

        if (dist > attackRange) return;

        // ダメージ計算
        let damage = unit.stats.atk - target.stats.def;
        if (damage < CONFIG.BATTLE.MIN_DAMAGE) damage = CONFIG.BATTLE.MIN_DAMAGE;

        // ランダム幅
        const variance = 1 - CONFIG.BATTLE.DAMAGE_VARIANCE + Math.random() * CONFIG.BATTLE.DAMAGE_VARIANCE * 2;
        damage = Math.floor(damage * variance);

        // 相性ボーナス
        if (UnitGenerator.hasAdvantage(unit.class, target.class)) {
            damage = Math.floor(damage * CONFIG.BATTLE.ADVANTAGE_MULTIPLIER);
        }

        // ダメージ適用
        target.currentHp -= damage;
        unit.lastAttackTime = now;

        // 統計更新
        if (unit.isEnemy) {
            this.stats.damageTaken += damage;
        } else {
            this.stats.damageDealt += damage;
        }

        // TODO: ダメージエフェクト表示
    }

    removeDeadUnits() {
        // プレイヤーユニット
        for (let i = this.playerUnits.length - 1; i >= 0; i--) {
            if (this.playerUnits[i].currentHp <= 0) {
                this.stats.enemyKills++;
                this.playerUnits.splice(i, 1);
            }
        }

        // 敵ユニット
        for (let i = this.enemyUnits.length - 1; i >= 0; i--) {
            if (this.enemyUnits[i].currentHp <= 0) {
                this.stats.playerKills++;
                this.enemyUnits.splice(i, 1);
            }
        }
    }

    checkBattleEnd() {
        // 敵全滅チェック
        const allEnemiesDeployed = this.enemyDeck.every(u => u.deployed);
        const allEnemiesDead = this.enemyUnits.length === 0;

        if (allEnemiesDeployed && allEnemiesDead) {
            this.endBattle(true);
            return;
        }

        // 味方全滅チェック
        const allPlayersDeployed = this.playerDeck.every(u => u.deployed);
        const allPlayersDead = this.playerUnits.length === 0;

        if (allPlayersDeployed && allPlayersDead) {
            this.endBattle(false);
            return;
        }
    }

    endBattle(isWin) {
        this.isEnded = true;
        if (this.onBattleEnd) {
            this.onBattleEnd(isWin, this.stats);
        }
    }

    /**
     * 描画処理
     */
    render() {
        const ctx = this.ctx;

        // 背景クリア（古地図風）
        ctx.fillStyle = '#F5E6D3';
        ctx.fillRect(0, 0, this.width, this.height);

        // グリッド線
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

        // 中央ライン
        ctx.strokeStyle = 'rgba(74, 55, 40, 0.3)';
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(0, this.height / 2);
        ctx.lineTo(this.width, this.height / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 選択ユニットの移動先表示
        if (this.selectedUnit) {
            ctx.strokeStyle = 'rgba(58, 93, 174, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.selectedUnit.x, this.selectedUnit.y, CONFIG.BATTLE.UNIT_SIZE + 10, 0, Math.PI * 2);
            ctx.stroke();
        }

        // ユニット描画
        for (const unit of this.enemyUnits) {
            this.renderUnit(unit, true);
        }
        for (const unit of this.playerUnits) {
            this.renderUnit(unit, false);
        }
    }

    renderUnit(unit, isEnemy) {
        const ctx = this.ctx;
        const size = CONFIG.BATTLE.UNIT_SIZE;
        const x = unit.x;
        const y = unit.y;

        // HP割合に応じた凸の数
        const hpRatio = unit.currentHp / unit.maxHp;
        let symbolCount;
        if (hpRatio > 0.75) symbolCount = 4;
        else if (hpRatio > 0.5) symbolCount = 3;
        else if (hpRatio > 0.25) symbolCount = 2;
        else symbolCount = 1;

        // 凸のシンボルを取得
        const classInfo = CONFIG.CLASS_DISPLAY[unit.class] || CONFIG.CLASS_DISPLAY.infantry;
        const symbol = classInfo.symbol;

        // 背景円
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = isEnemy ? 'rgba(26, 26, 26, 0.2)' : 'rgba(255, 255, 255, 0.2)';
        ctx.fill();

        // 選択状態
        if (unit === this.selectedUnit) {
            ctx.strokeStyle = '#3A5DAE';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // 凸を描画（2x2グリッド）
        const positions = [
            { dx: -8, dy: -8 },
            { dx: 8, dy: -8 },
            { dx: -8, dy: 8 },
            { dx: 8, dy: 8 }
        ];

        ctx.font = 'bold 16px "Noto Sans JP"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isEnemy ? '#1A1A1A' : '#FFFFFF';

        // 縁取り
        ctx.strokeStyle = isEnemy ? '#FFFFFF' : '#1A1A1A';
        ctx.lineWidth = 2;

        for (let i = 0; i < symbolCount; i++) {
            const pos = positions[i];
            ctx.strokeText(symbol, x + pos.dx, y + pos.dy);
            ctx.fillText(symbol, x + pos.dx, y + pos.dy);
        }

        // 名前
        ctx.font = '10px "Noto Sans JP"';
        ctx.fillStyle = isEnemy ? '#C73E3A' : '#3A5DAE';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeText(unit.name, x, y - size / 2 - 10);
        ctx.fillText(unit.name, x, y - size / 2 - 10);

        // HPバー
        const barWidth = size;
        const barHeight = 4;
        const barX = x - barWidth / 2;
        const barY = y + size / 2 + 5;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = hpRatio > 0.5 ? '#4A7C3F' : hpRatio > 0.25 ? '#D4A853' : '#C73E3A';
        ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);
    }

    // UI更新メソッド
    updateCostUI() {
        const fill = document.getElementById('cost-fill');
        const value = document.getElementById('cost-value');
        if (fill) {
            fill.style.width = `${(this.cost / CONFIG.BATTLE.COST_MAX) * 100}%`;
        }
        if (value) {
            value.textContent = `${Math.floor(this.cost)}/${CONFIG.BATTLE.COST_MAX}`;
        }
    }

    updateDeploySlots() {
        // main.jsで実装
        if (window.updateDeploySlots) {
            window.updateDeploySlots();
        }
    }

    updateEnemyInfo() {
        const remaining = this.enemyDeck.filter(u => !u.deployed).length + this.enemyUnits.length;
        const total = this.enemyDeck.length;
        const el = document.getElementById('enemy-remaining');
        if (el) {
            el.textContent = `残り: ${remaining}/${total}`;
        }
    }

    // 一時停止
    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
        this.lastTime = Date.now();
        this.lastCostTime = Date.now();
    }

    // クリーンアップ
    destroy() {
        this.isEnded = true;
    }
}

// グローバルにエクスポート
window.BattleSystem = BattleSystem;
