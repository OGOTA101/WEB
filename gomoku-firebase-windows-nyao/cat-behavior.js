/**
 * 猫の挙動を管理するクラス
 * NekomokuNarabage から猫関連の機能を分離
 */
class CatBehavior {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.catImages = { black: null, white: null };
        this.nyaaSound = null;
        this.loadCatAssets();
    }

    /**
     * 猫の状態を完全リセット
     */
    async resetCatState() {
        console.log('🐱 猫の状態をリセット中...');

        // 進行中のアニメーションを停止
        if (this.currentAnimation) {
            cancelAnimationFrame(this.currentAnimation);
            this.currentAnimation = null;
        }

        // 盤面クリックを有効化
        if (this.game) {
            this.game.boardClickEnabled = true;
        }

        // 軌跡エフェクトをクリア
        this.clearAllEffects();

        console.log('✅ 猫の状態リセット完了');
    }

    /**
     * すべてのエフェクトをクリア
     */
    clearAllEffects() {
        // 軌跡エフェクトのDOM要素を削除
        const trails = document.querySelectorAll('.cat-trail');
        trails.forEach(trail => {
            if (trail.parentNode) {
                trail.parentNode.removeChild(trail);
            }
        });

        // 移動エフェクトのDOM要素を削除
        const effects = document.querySelectorAll('.cat-move-effect');
        effects.forEach(effect => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        });
    }

    /**
     * 猫の移動処理
     */
    async performCatMovement(playerColor) {
        const playerStones = this.countPlayerStones(playerColor);
        console.log(`🐱 ${playerColor === 1 ? '黒' : '白'}猫の移動判定: ${playerStones}個の石`);

        if (playerStones < 2) {
            console.log('🐱 石が2個未満のため、猫は移動しません');
            return;
        }

        // 猫移動中は盤面クリックを無効化
        this.game.boardClickEnabled = false;

        // 移動する猫の数を決定
        let movingCats = 1;
        if (playerStones >= 20) {
            movingCats = 3;
        } else if (playerStones >= 10) {
            movingCats = 2;
        }

        console.log(`🐱 ${movingCats}匹の猫が移動します`);

        // 移動可能な猫の位置を取得
        const movableCats = this.getMovableCats(playerColor);

        if (movableCats.length === 0) {
            console.log('🐱 移動可能な猫がいません');
            this.game.boardClickEnabled = true;
            return;
        }

        // ランダムに移動する猫を選択
        const catsToMove = this.selectRandomCats(movableCats, movingCats);

        // 各猫を移動（スライドアニメーション付き）
        for (const cat of catsToMove) {
            await this.moveCatWithAnimation(cat, playerColor);
            await this.sleep(500);
        }

        // 猫移動完了後、盤面クリックを再開
        this.game.boardClickEnabled = true;

        // **撫でられた猫の状態をリセット**
        if (this.game.pettedCat) {
            console.log('🐱 撫でられた猫の状態をリセット:', this.game.pettedCat);
            this.game.pettedCat = null;
            // 盤面を再描画して！マークを消去
            this.game.drawBoard();
        }

        console.log('🐱 すべての猫移動完了、盤面クリック再開');
    }

    /**
     * プレイヤーの石数をカウント
     */
    countPlayerStones(playerColor) {
        let count = 0;
        for (let y = 0; y < this.game.boardSize; y++) {
            for (let x = 0; x < this.game.boardSize; x++) {
                if (this.game.gameState.board[y][x] === playerColor) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * 移動可能な猫の位置を取得
     */
    getMovableCats(playerColor) {
        const movableCats = [];

        for (let y = 0; y < this.game.boardSize; y++) {
            for (let x = 0; x < this.game.boardSize; x++) {
                if (this.game.gameState.board[y][x] === playerColor) {
                    // 置いたばかりの石は移動しない
                    if (this.game.lastPlacedStone &&
                        this.game.lastPlacedStone.x === x &&
                        this.game.lastPlacedStone.y === y &&
                        this.game.lastPlacedStone.player === playerColor) {
                        console.log(`🐱 置いたばかりの石は移動対象外: (${x}, ${y})`);
                        continue;
                    }

                    // 移動可能な方向があるかチェック
                    const possibleMoves = this.getPossibleMoves(x, y);
                    if (possibleMoves.length > 0) {
                        movableCats.push({ x, y, possibleMoves });
                    }
                }
            }
        }

        return movableCats;
    }

    /**
     * 指定位置から可能な移動先を取得
     */
    getPossibleMoves(x, y) {
        const moves = [];
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1] // 上、下、左、右
        ];

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;

            // 盤面内の空きマスまたは盤面外（フェードアウト用）
            if ((newX >= 0 && newX < this.game.boardSize &&
                newY >= 0 && newY < this.game.boardSize &&
                this.game.gameState.board[newY][newX] === 0) ||
                (newX < 0 || newX >= this.game.boardSize ||
                    newY < 0 || newY >= this.game.boardSize)) {
                moves.push({
                    x: newX,
                    y: newY,
                    isOutOfBounds: newX < 0 || newX >= this.game.boardSize ||
                        newY < 0 || newY >= this.game.boardSize
                });
            }
        }

        return moves;
    }

    /**
     * ランダムに猫を選択（撫でられた猫の移動確率を考慮）
     */
    selectRandomCats(movableCats, count) {
        const catsWithProbability = movableCats.map(cat => {
            // 撫でられた猫かチェック
            const isPetted = this.game.pettedCat &&
                this.game.pettedCat.x === cat.x &&
                this.game.pettedCat.y === cat.y;

            return {
                ...cat,
                isPetted: isPetted,
                moveProbability: isPetted ? 0.5 : 0.3 // 撫でられた猫は50%、通常は30%
            };
        });

        // 確率に基づいて移動する猫を決定
        const movingCats = [];
        for (const cat of catsWithProbability) {
            if (Math.random() < cat.moveProbability) {
                movingCats.push(cat);
                console.log(`🐱 ${cat.isPetted ? '撫でられた' : '通常の'}猫が移動決定: (${cat.x}, ${cat.y})`);
            }
        }

        // 移動する猫が多すぎる場合は制限
        const finalCats = movingCats.slice(0, count);

        // 移動する猫が少ない場合は、残りの猫からランダム選択
        if (finalCats.length < count) {
            const remainingCats = catsWithProbability.filter(cat =>
                !finalCats.some(moving => moving.x === cat.x && moving.y === cat.y)
            );
            const shuffled = remainingCats.sort(() => 0.5 - Math.random());
            const additional = shuffled.slice(0, count - finalCats.length);
            finalCats.push(...additional);
        }

        return finalCats;
    }

    /**
     * アニメーション付き猫移動（同期版）
     */
    async moveCatWithAnimation(cat, playerColor) {
        if (cat.possibleMoves.length === 0) return;

        // ランダムに移動先を選択
        const move = cat.possibleMoves[Math.floor(Math.random() * cat.possibleMoves.length)];

        console.log(`🐱 猫移動: (${cat.x}, ${cat.y}) → (${move.x}, ${move.y}) ${move.isOutOfBounds ? '(盤面外)' : ''}`);

        // 猫の鳴き声再生
        this.playNyaaSound();

        // アニメーション開始と同時に駒を移動
        // 元の位置をクリア
        this.game.gameState.board[cat.y][cat.x] = 0;

        if (!move.isOutOfBounds) {
            // 盤面内移動の場合、新しい位置に配置
            this.game.gameState.board[move.y][move.x] = playerColor;
        }

        // スライド移動アニメーション（駒移動済み）
        await this.animateCatSlideSync(cat.x, cat.y, move.x, move.y, playerColor, move.isOutOfBounds);

        // 軌跡表示
        this.showCatTrail(cat.x, cat.y, move.x, move.y);

        // 画面更新
        this.game.forceUpdateDisplay();
    }

    /**
     * 同期版猫のスライド移動アニメーション
     */
    async animateCatSlideSync(fromX, fromY, toX, toY, playerColor, isOutOfBounds) {
        return new Promise((resolve) => {
            const ctx = this.game.ctx;
            const startTime = performance.now();
            const duration = 800; // 800ms

            const fromCenterX = fromX * this.game.cellSize + this.game.cellSize / 2;
            const fromCenterY = fromY * this.game.cellSize + this.game.cellSize / 2;
            const toCenterX = toX * this.game.cellSize + this.game.cellSize / 2;
            const toCenterY = toY * this.game.cellSize + this.game.cellSize / 2;

            // 盤面外の場合の座標計算
            const finalToCenterX = toX < 0 ? -this.game.cellSize / 2 :
                toX >= this.game.boardSize ? this.game.elements.gameBoard.width + this.game.cellSize / 2 :
                    toCenterX;
            const finalToCenterY = toY < 0 ? -this.game.cellSize / 2 :
                toY >= this.game.boardSize ? this.game.elements.gameBoard.height + this.game.cellSize / 2 :
                    toCenterY;

            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // イージング関数（ease-out）
                const easeProgress = 1 - Math.pow(1 - progress, 3);

                // 現在位置を計算
                const currentX = fromCenterX + (finalToCenterX - fromCenterX) * easeProgress;
                const currentY = fromCenterY + (finalToCenterY - fromCenterY) * easeProgress;

                // 盤面を通常通り描画（駒は既に移動済み）
                this.game.drawBoard();

                // 移動中の猫を元の位置から現在位置まで描画
                this.drawMovingCatSync(fromCenterX, fromCenterY, currentX, currentY, playerColor, progress, isOutOfBounds);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    /**
     * 移動中の猫を描画（同期版）
     */
    drawMovingCatSync(fromX, fromY, currentX, currentY, playerColor, progress, isOutOfBounds) {
        const ctx = this.game.ctx;
        ctx.save();

        // 移動中は少し大きくして目立たせる
        const scale = 1 + 0.2 * Math.sin(progress * Math.PI);

        // 盤面外移動の場合はフェードアウト効果
        const alpha = isOutOfBounds ? (1 - progress * 0.7) : (0.8 + 0.2 * Math.sin(progress * Math.PI * 2));
        ctx.globalAlpha = alpha;

        const catImage = playerColor === 1 ? this.catImages.black : this.catImages.white;
        const imageSize = this.game.cellSize * 0.88 * scale;

        if (catImage && catImage.complete) {
            const imageX = currentX - imageSize / 2;
            const imageY = currentY - imageSize / 2;
            ctx.drawImage(catImage, imageX, imageY, imageSize, imageSize);
        } else {
            // デフォルト石
            const radius = this.game.cellSize * 0.4 * scale;
            ctx.beginPath();
            ctx.arc(currentX, currentY, radius, 0, 2 * Math.PI);
            ctx.fillStyle = playerColor === 1 ? '#000' : '#fff';
            ctx.fill();
            ctx.strokeStyle = playerColor === 1 ? '#333' : '#000';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // 移動軌跡をリアルタイムで描画
        if (progress > 0.1) {
            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * 猫の軌跡表示
     */
    showCatTrail(fromX, fromY, toX, toY) {
        const ctx = this.game.ctx;
        const fromCenterX = fromX * this.game.cellSize + this.game.cellSize / 2;
        const fromCenterY = fromY * this.game.cellSize + this.game.cellSize / 2;
        const toCenterX = toX * this.game.cellSize + this.game.cellSize / 2;
        const toCenterY = toY * this.game.cellSize + this.game.cellSize / 2;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 8;
        ctx.lineCap = 'round';

        // 点線の軌跡を描画
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(fromCenterX, fromCenterY);
        ctx.lineTo(toCenterX, toCenterY);
        ctx.stroke();

        ctx.restore();

        // 2秒後に軌跡を消去
        setTimeout(() => {
            this.game.drawBoard();
        }, 2000);
    }

    /**
     * 移動エフェクト
     */
    showMoveEffect(fromX, fromY, toX, toY) {
        const ctx = this.game.ctx;
        const fromCenterX = fromX * this.game.cellSize + this.game.cellSize / 2;
        const fromCenterY = fromY * this.game.cellSize + this.game.cellSize / 2;
        const toCenterX = toX * this.game.cellSize + this.game.cellSize / 2;
        const toCenterY = toY * this.game.cellSize + this.game.cellSize / 2;

        ctx.save();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 5;

        // 移動の矢印を描画
        ctx.beginPath();
        ctx.moveTo(fromCenterX, fromCenterY);
        ctx.lineTo(toCenterX, toCenterY);
        ctx.stroke();

        // 矢印の先端
        const angle = Math.atan2(toCenterY - fromCenterY, toCenterX - fromCenterX);
        const arrowSize = 10;
        ctx.beginPath();
        ctx.moveTo(toCenterX, toCenterY);
        ctx.lineTo(toCenterX - arrowSize * Math.cos(angle - Math.PI / 6),
            toCenterY - arrowSize * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(toCenterX, toCenterY);
        ctx.lineTo(toCenterX - arrowSize * Math.cos(angle + Math.PI / 6),
            toCenterY - arrowSize * Math.sin(angle + Math.PI / 6));
        ctx.stroke();

        ctx.restore();

        // 0.8秒後にエフェクトを消去
        setTimeout(() => {
            this.game.drawBoard();
        }, 800);
    }

    /**
     * 猫フェードアウトエフェクト
     */
    showCatFadeOut(fromX, fromY, toX, toY, playerColor) {
        const ctx = this.game.ctx;
        const fromCenterX = fromX * this.game.cellSize + this.game.cellSize / 2;
        const fromCenterY = fromY * this.game.cellSize + this.game.cellSize / 2;

        // フェードアウトアニメーション
        let alpha = 1.0;
        const fadeStep = 0.05;

        const fadeAnimation = () => {
            // 背景をクリア（その部分だけ）
            const clearRadius = this.game.cellSize / 2 + 5;
            ctx.clearRect(fromCenterX - clearRadius, fromCenterY - clearRadius,
                clearRadius * 2, clearRadius * 2);

            // 盤面の格子を再描画（その部分だけ）
            this.redrawGridSection(fromX, fromY);

            if (alpha > 0) {
                ctx.save();
                ctx.globalAlpha = alpha;

                // 猫画像または通常の石を半透明で描画
                const catImage = playerColor === 1 ? this.catImages.black : this.catImages.white;
                if (catImage && catImage.complete) {
                    const imageSize = this.game.cellSize * 0.88;
                    const imageX = fromCenterX - imageSize / 2;
                    const imageY = fromCenterY - imageSize / 2;
                    ctx.drawImage(catImage, imageX, imageY, imageSize, imageSize);
                } else {
                    // デフォルト石
                    const radius = this.game.cellSize * 0.4;
                    ctx.beginPath();
                    ctx.arc(fromCenterX, fromCenterY, radius, 0, 2 * Math.PI);
                    ctx.fillStyle = playerColor === 1 ? '#000' : '#fff';
                    ctx.fill();
                    ctx.strokeStyle = playerColor === 1 ? '#333' : '#000';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // キラキラエフェクト
                for (let i = 0; i < 5; i++) {
                    const sparkleX = fromCenterX + (Math.random() - 0.5) * this.game.cellSize;
                    const sparkleY = fromCenterY + (Math.random() - 0.5) * this.game.cellSize;
                    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
                    ctx.beginPath();
                    ctx.arc(sparkleX, sparkleY, 2, 0, 2 * Math.PI);
                    ctx.fill();
                }

                ctx.restore();

                alpha -= fadeStep;
                requestAnimationFrame(fadeAnimation);
            } else {
                // フェードアウト完了後、完全に盤面を再描画
                this.game.drawBoard();
                console.log('🌫️ 猫フェードアウト完了');
            }
        };

        fadeAnimation();
    }

    /**
     * 格子の部分再描画
     */
    redrawGridSection(gridX, gridY) {
        const ctx = this.game.ctx;
        const size = this.game.cellSize;

        ctx.save();
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;

        // その位置の縦線と横線を再描画
        const centerX = gridX * size + size / 2;
        const centerY = gridY * size + size / 2;

        // 縦線
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, this.game.boardSize * size);
        ctx.stroke();

        // 横線
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(this.game.boardSize * size, centerY);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * スリープ関数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 猫画像と音声の読み込み
     */
    loadCatAssets() {
        console.log('🐱 猫アセットの読み込みを開始');

        // 白猫画像の読み込み
        this.catImages.white = new Image();
        this.catImages.white.onload = () => {
            console.log('✅ 白猫画像読み込み完了');
        };
        this.catImages.white.onerror = () => {
            console.warn('⚠️ 白猫画像の読み込み失敗 - デフォルト石を使用');
            this.catImages.white = null;
        };
        this.catImages.white.src = 'Wite.png';

        // 黒猫画像の読み込み
        this.catImages.black = new Image();
        this.catImages.black.onload = () => {
            console.log('✅ 黒猫画像読み込み完了');
        };
        this.catImages.black.onerror = () => {
            console.warn('⚠️ 黒猫画像の読み込み失敗 - デフォルト石を使用');
            this.catImages.black = null;
        };
        this.catImages.black.src = 'Black.png';

        // にゃあ音声の読み込み
        this.nyaaSound = new Audio();
        this.nyaaSound.preload = 'auto';
        this.nyaaSound.oncanplaythrough = () => {
            console.log('✅ にゃあ音声読み込み完了');
        };
        this.nyaaSound.onerror = () => {
            console.warn('⚠️ にゃあ音声の読み込み失敗');
            this.nyaaSound = null;
        };

        // 音声ファイルパスを設定（複数形式対応）
        if (this.nyaaSound.canPlayType('audio/mpeg')) {
            this.nyaaSound.src = 'nyaa.mp3';
        } else if (this.nyaaSound.canPlayType('audio/wav')) {
            this.nyaaSound.src = 'nyaa.wav';
        } else if (this.nyaaSound.canPlayType('audio/ogg')) {
            this.nyaaSound.src = 'nyaa.ogg';
        }
    }

    /**
     * にゃあ音声の再生
     */
    playNyaaSound() {
        if (this.nyaaSound) {
            try {
                this.nyaaSound.currentTime = 0; // 再生位置をリセット
                this.nyaaSound.play().catch(error => {
                    console.warn('🔇 音声再生エラー:', error);
                });
            } catch (error) {
                console.warn('🔇 音声再生エラー:', error);
            }
        }
    }
}
