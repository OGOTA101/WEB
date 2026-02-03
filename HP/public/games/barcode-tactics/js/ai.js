/* ========================================
   Bar-Code Tactics: 凸（TOTSU）
   CPU AI
   ======================================== */

class BattleAI {
    constructor(battleSystem) {
        this.battle = battleSystem;
        this.lastDeployTime = 0;
        this.deployInterval = 3000; // 3秒ごとに出撃判断
        this.thinkInterval = 500;   // 0.5秒ごとに思考
        this.lastThinkTime = 0;
    }

    update(dt) {
        const now = Date.now();

        // 出撃判断
        if (now - this.lastDeployTime >= this.deployInterval) {
            this.tryDeploy();
            this.lastDeployTime = now;
        }

        // ユニットの行動指示
        if (now - this.lastThinkTime >= this.thinkInterval) {
            this.think();
            this.lastThinkTime = now;
        }
    }

    tryDeploy() {
        // フィールド上のユニット数チェック
        if (this.battle.enemyUnits.length >= CONFIG.BATTLE.MAX_UNITS_ON_FIELD) {
            return;
        }

        // 未出撃のユニットを探す
        const deck = this.battle.enemyDeck;
        for (let i = 0; i < deck.length; i++) {
            if (!deck[i].deployed) {
                this.battle.deployUnit(i, true);
                break;
            }
        }
    }

    think() {
        // 各敵ユニットの行動を決定
        for (const unit of this.battle.enemyUnits) {
            this.decideAction(unit);
        }
    }

    decideAction(unit) {
        const playerUnits = this.battle.playerUnits;
        if (playerUnits.length === 0) return;

        // 遠距離ユニットの場合
        if (unit.stats.rng >= 2) {
            this.rangeUnitAI(unit, playerUnits);
            return;
        }

        // 近接ユニットの場合
        this.meleeUnitAI(unit, playerUnits);
    }

    meleeUnitAI(unit, enemies) {
        // 最も近い敵を狙う
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
        }
    }

    rangeUnitAI(unit, enemies) {
        // 遠距離ユニットは距離を保ちながら攻撃
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

        if (!closestEnemy) return;

        const attackRange = CONFIG.BATTLE.ATTACK_RANGE[unit.stats.rng];
        const idealDistance = attackRange * 0.8; // 射程の8割の距離を保つ

        if (closestDist < idealDistance * 0.5) {
            // 近すぎる場合は後退
            const dx = unit.x - closestEnemy.x;
            const dy = unit.y - closestEnemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0) {
                unit.targetX = unit.x + (dx / dist) * 100;
                unit.targetY = Math.max(30, unit.y - 50); // 後退
                unit.target = null;
            }
        } else {
            // 攻撃範囲内なら攻撃
            unit.target = closestEnemy;
            unit.targetX = null;
            unit.targetY = null;
        }
    }
}

// グローバルにエクスポート
window.BattleAI = BattleAI;
