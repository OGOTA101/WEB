// ねこCPU AI for ねこもくならべ Game
class NekomokuCPU {
    constructor(difficulty = 'easy') {
        this.difficulty = difficulty;
        this.boardSize = 15;
        this.maxDepth = difficulty === 'hard' ? 3 : 1;

        // 猫の鳴き声メッセージ
        this.catMessages = {
            easy: ['にゃーん🐱', 'みゃー', 'ニャンニャン', 'ぺろぺろ'],
            hard: ['にゃーお🦁', 'ガオー', 'フシャー', 'ゴロゴロ']
        };
    }

    // メインのねこAI思考関数
    getMove(board, cpuColor) {
        const catSound = this.catMessages[this.difficulty][Math.floor(Math.random() * this.catMessages[this.difficulty].length)];
        console.log(`🐱 ねこCPU思考開始 ${catSound} (難易度: ${this.difficulty})`);

        if (this.difficulty === 'easy') {
            return this.getEasyMove(board, cpuColor);
        } else {
            return this.getHardMove(board, cpuColor);
        }
    }

    // 初級ねこAI：基本的な戦略
    getEasyMove(board, cpuColor) {
        const playerColor = cpuColor === 1 ? 2 : 1;

        // 1. 勝利手があるかチェック
        const winMove = this.findWinningMove(board, cpuColor);
        if (winMove) {
            console.log('🎯 にゃんと！勝利手を発見:', winMove);
            return winMove;
        }

        // 2. 相手の勝利を阻止
        const blockMove = this.findWinningMove(board, playerColor);
        if (blockMove) {
            console.log('🛡️ にゃにゃ！相手の勝利を阻止:', blockMove);
            return blockMove;
        }

        // 3. 3連を作る
        const threeMove = this.findThreeInARow(board, cpuColor);
        if (threeMove) {
            console.log('⚡ にゃんにゃん！3連を作成:', threeMove);
            return threeMove;
        }

        // 4. 相手の3連を阻止
        const blockThreeMove = this.findThreeInARow(board, playerColor);
        if (blockThreeMove) {
            console.log('🚫 フシャー！相手の3連を阻止:', blockThreeMove);
            return blockThreeMove;
        }

        // 5. 中央付近にランダム配置
        return this.getCenterRandomMove(board);
    }

    // 上級ねこAI：より高度な戦略
    getHardMove(board, cpuColor) {
        const playerColor = cpuColor === 1 ? 2 : 1;

        // 1. 勝利手があるかチェック
        const winMove = this.findWinningMove(board, cpuColor);
        if (winMove) {
            console.log('🎯 ガオー！勝利手を発見:', winMove);
            return winMove;
        }

        // 2. 相手の勝利を阻止
        const blockMove = this.findWinningMove(board, playerColor);
        if (blockMove) {
            console.log('🛡️ フシャーッ！相手の勝利を阻止:', blockMove);
            return blockMove;
        }

        // 3. ミニマックス評価で最適手を探索
        const bestMove = this.minimax(board, this.maxDepth, true, cpuColor, -Infinity, Infinity);
        if (bestMove.move) {
            console.log('🧠 ゴロゴロ...ミニマックス最適手:', bestMove.move, 'スコア:', bestMove.score);
            return bestMove.move;
        }

        // 4. フォールバック：中央付近にランダム配置
        return this.getCenterRandomMove(board);
    }

    // 勝利手を探す
    findWinningMove(board, color) {
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (board[y][x] === 0) {
                    // 仮に石を置いてみる
                    board[y][x] = color;
                    if (this.checkWin(board, x, y, color)) {
                        board[y][x] = 0; // 元に戻す
                        return { x, y };
                    }
                    board[y][x] = 0; // 元に戻す
                }
            }
        }
        return null;
    }

    // 3連を作る手を探す
    findThreeInARow(board, color) {
        const moves = [];

        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (board[y][x] === 0) {
                    board[y][x] = color;
                    const score = this.evaluatePosition(board, x, y, color);
                    if (score >= 100) { // 3連のスコア閾値
                        moves.push({ x, y, score });
                    }
                    board[y][x] = 0;
                }
            }
        }

        if (moves.length > 0) {
            // 最高スコアの手を選択
            moves.sort((a, b) => b.score - a.score);
            return moves[0];
        }

        return null;
    }

    // 中央付近のランダム配置
    getCenterRandomMove(board) {
        const center = Math.floor(this.boardSize / 2);
        const radius = 4;
        const moves = [];

        for (let y = Math.max(0, center - radius); y <= Math.min(this.boardSize - 1, center + radius); y++) {
            for (let x = Math.max(0, center - radius); x <= Math.min(this.boardSize - 1, center + radius); x++) {
                if (board[y][x] === 0) {
                    moves.push({ x, y });
                }
            }
        }

        if (moves.length === 0) {
            // 中央付近に空きがない場合、全体からランダム選択
            for (let y = 0; y < this.boardSize; y++) {
                for (let x = 0; x < this.boardSize; x++) {
                    if (board[y][x] === 0) {
                        moves.push({ x, y });
                    }
                }
            }
        }

        if (moves.length > 0) {
            const randomIndex = Math.floor(Math.random() * moves.length);
            console.log('🎲 ランダム配置:', moves[randomIndex]);
            return moves[randomIndex];
        }

        return null;
    }

    // ミニマックス法（アルファベータ枝刈り付き）
    minimax(board, depth, isMaximizing, cpuColor, alpha, beta) {
        const playerColor = cpuColor === 1 ? 2 : 1;

        if (depth === 0) {
            return { score: this.evaluateBoard(board, cpuColor), move: null };
        }

        const moves = this.getValidMoves(board);
        if (moves.length === 0) {
            return { score: 0, move: null };
        }

        let bestMove = null;

        if (isMaximizing) {
            let maxScore = -Infinity;

            for (const move of moves) {
                board[move.y][move.x] = cpuColor;

                if (this.checkWin(board, move.x, move.y, cpuColor)) {
                    board[move.y][move.x] = 0;
                    return { score: 10000, move };
                }

                const result = this.minimax(board, depth - 1, false, cpuColor, alpha, beta);
                board[move.y][move.x] = 0;

                if (result.score > maxScore) {
                    maxScore = result.score;
                    bestMove = move;
                }

                alpha = Math.max(alpha, result.score);
                if (beta <= alpha) break; // アルファベータ枝刈り
            }

            return { score: maxScore, move: bestMove };
        } else {
            let minScore = Infinity;

            for (const move of moves) {
                board[move.y][move.x] = playerColor;

                if (this.checkWin(board, move.x, move.y, playerColor)) {
                    board[move.y][move.x] = 0;
                    return { score: -10000, move };
                }

                const result = this.minimax(board, depth - 1, true, cpuColor, alpha, beta);
                board[move.y][move.x] = 0;

                if (result.score < minScore) {
                    minScore = result.score;
                    bestMove = move;
                }

                beta = Math.min(beta, result.score);
                if (beta <= alpha) break; // アルファベータ枝刈り
            }

            return { score: minScore, move: bestMove };
        }
    }

    // 有効な手の一覧を取得（周辺の空きマスのみ）
    getValidMoves(board) {
        const moves = [];
        const occupied = new Set();

        // 既に石が置かれている位置の周辺をチェック
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (board[y][x] !== 0) {
                    // 周辺8方向をチェック
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < this.boardSize && ny >= 0 && ny < this.boardSize) {
                                if (board[ny][nx] === 0) {
                                    const key = `${nx},${ny}`;
                                    if (!occupied.has(key)) {
                                        moves.push({ x: nx, y: ny });
                                        occupied.add(key);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 盤面が空の場合は中央から開始
        if (moves.length === 0) {
            const center = Math.floor(this.boardSize / 2);
            moves.push({ x: center, y: center });
        }

        return moves;
    }

    // 盤面全体の評価
    evaluateBoard(board, cpuColor) {
        let score = 0;
        const playerColor = cpuColor === 1 ? 2 : 1;

        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (board[y][x] === cpuColor) {
                    score += this.evaluatePosition(board, x, y, cpuColor);
                } else if (board[y][x] === playerColor) {
                    score -= this.evaluatePosition(board, x, y, playerColor);
                }
            }
        }

        return score;
    }

    // 特定位置の評価
    evaluatePosition(board, x, y, color) {
        let score = 0;
        const directions = [
            [0, 1],   // 横
            [1, 0],   // 縦
            [1, 1],   // 右斜め
            [1, -1]   // 左斜め
        ];

        for (const [dx, dy] of directions) {
            const lineScore = this.evaluateLine(board, x, y, dx, dy, color);
            score += lineScore;
        }

        return score;
    }

    // 一方向のライン評価
    evaluateLine(board, x, y, dx, dy, color) {
        let count = 1; // 現在の石を含む
        let openEnds = 0; // 両端の空きスペース

        // 正方向をチェック
        let i = 1;
        while (i < 5) {
            const nx = x + dx * i;
            const ny = y + dy * i;
            if (nx < 0 || nx >= this.boardSize || ny < 0 || ny >= this.boardSize) break;
            if (board[ny][nx] === color) {
                count++;
                i++;
            } else if (board[ny][nx] === 0) {
                openEnds++;
                break;
            } else {
                break;
            }
        }

        // 負方向をチェック
        i = 1;
        while (i < 5) {
            const nx = x - dx * i;
            const ny = y - dy * i;
            if (nx < 0 || nx >= this.boardSize || ny < 0 || ny >= this.boardSize) break;
            if (board[ny][nx] === color) {
                count++;
                i++;
            } else if (board[ny][nx] === 0) {
                openEnds++;
                break;
            } else {
                break;
            }
        }

        // スコア計算
        if (count >= 5) return 10000; // 勝利
        if (count === 4 && openEnds >= 1) return 1000; // 4連
        if (count === 3 && openEnds >= 2) return 100; // オープン3連
        if (count === 3 && openEnds >= 1) return 50; // 3連
        if (count === 2 && openEnds >= 2) return 10; // オープン2連
        if (count === 2 && openEnds >= 1) return 5; // 2連

        return 1;
    }

    // 勝利判定
    checkWin(board, lastX, lastY, color) {
        const directions = [
            [0, 1],   // 横
            [1, 0],   // 縦
            [1, 1],   // 右斜め
            [1, -1]   // 左斜め
        ];

        for (const [dx, dy] of directions) {
            let count = 1; // 置いた石を含む

            // 正方向をチェック
            for (let i = 1; i < 5; i++) {
                const x = lastX + dx * i;
                const y = lastY + dy * i;
                if (x < 0 || x >= this.boardSize || y < 0 || y >= this.boardSize || board[y][x] !== color) break;
                count++;
            }

            // 負方向をチェック
            for (let i = 1; i < 5; i++) {
                const x = lastX - dx * i;
                const y = lastY - dy * i;
                if (x < 0 || x >= this.boardSize || y < 0 || y >= this.boardSize || board[y][x] !== color) break;
                count++;
            }

            if (count >= 5) {
                return true;
            }
        }

        return false;
    }
}
