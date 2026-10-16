/**
 * game.js
 * Core Game Logic (The Model)
 */
class Game {
    constructor(rows, cols, colorCount) {
        this.rows = rows;
        this.cols = cols;
        this.colorCount = Math.max(3, Math.min(colorCount, 7)); // 3-7 colors
        this.grid = []; // 2D array [row][col]
        this.score = 0;
        this.isGameOver = false;

        // Initialize Grid
        this.initGrid();
    }

    initGrid() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                // Random color 1..colorCount
                row.push({
                    color: Math.floor(Math.random() * this.colorCount) + 1,
                    id: Math.random().toString(36).substr(2, 9), // Unique ID for animations
                    offsetY: 0, // For falling animation
                    state: 'idle'
                });
            }
            this.grid.push(row);
        }
    }

    // --- Interaction ---

    // Returns the cluster of connected blocks at (r, c)
    getCluster(r, c) {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return [];
        const targetColor = this.grid[r][c]?.color;
        if (!targetColor) return [];

        const visited = new Set();
        const cluster = [];
        const queue = [{ r, c }];
        const key = (r, c) => `${r},${c}`;

        visited.add(key(r, c));
        cluster.push({ r, c });

        while (queue.length > 0) {
            const cur = queue.shift();

            // Neighbors: Up, Down, Left, Right
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            for (let d of dirs) {
                const nr = cur.r + d[0];
                const nc = cur.c + d[1];

                if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                    if (this.grid[nr][nc] && this.grid[nr][nc].color === targetColor) {
                        const k = key(nr, nc);
                        if (!visited.has(k)) {
                            visited.add(k);
                            cluster.push({ r: nr, c: nc });
                            queue.push({ r: nr, c: nc });
                        }
                    }
                }
            }
        }
        return cluster;
    }

    // Handle Tap
    tap(r, c) {
        if (this.isGameOver) return { success: false };
        if (!this.grid[r][c]) return { success: false };

        const cluster = this.getCluster(r, c);

        // Rule: Remove if 2 or more connected
        if (cluster.length >= 2) {
            // Calculate Score
            const gained = Math.pow(cluster.length - 1, 2) * 10;
            this.score += gained;

            // Remove Blocks (Set to null)
            cluster.forEach(p => {
                this.grid[p.r][p.c] = null;
            });

            // Apply Gravity
            this.applyGravity();

            // Check Empty Columns (Slide Left)
            this.slideColumns();

            // Check Game Over
            if (this.checkGameOver()) {
                this.isGameOver = true;
            }

            return { success: true, count: cluster.length, score: gained, gameOver: this.isGameOver };
        }

        return { success: false };
    }

    applyGravity() {
        // For each column
        for (let c = 0; c < this.cols; c++) {
            let writeRow = this.rows - 1;
            // Iterate from bottom up
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.grid[r][c] !== null) {
                    if (r !== writeRow) {
                        // Move animation logic could go here
                        this.grid[writeRow][c] = this.grid[r][c];
                        this.grid[r][c] = null;
                    }
                    writeRow--;
                }
            }
        }
    }

    slideColumns() {
        // Find empty columns and shift remaining columns left
        // Not all SameGame variants do this, but the spec says "like SameGame, vertical empty columns slide left"
        // (Actually spec said "right cols slide left")

        let writeCol = 0;
        for (let c = 0; c < this.cols; c++) {
            // Check if column is empty
            let isEmpty = true;
            for (let r = 0; r < this.rows; r++) {
                if (this.grid[r][c] !== null) {
                    isEmpty = false;
                    break;
                }
            }

            if (!isEmpty) {
                if (c !== writeCol) {
                    // Move column `c` to `writeCol`
                    for (let r = 0; r < this.rows; r++) {
                        this.grid[r][writeCol] = this.grid[r][c];
                        this.grid[r][c] = null;
                    }
                }
                writeCol++;
            }
        }
    }

    checkGameOver() {
        // Naive check: iterate all cells, check if any has a neighbor of same color
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c]) {
                    const color = this.grid[r][c].color;
                    // Check Right
                    if (c + 1 < this.cols && this.grid[r][c + 1] && this.grid[r][c + 1].color === color) return false;
                    // Check Down
                    if (r + 1 < this.rows && this.grid[r + 1][c] && this.grid[r + 1][c].color === color) return false;
                }
            }
        }
        // Also if grid is empty, game over
        // But if blocks remain and no pairs, game over
        return true;
    }

    // --- Analysis for Rendering (The Cat Logic) ---
    /*
      Returns a grid of metadata for rendering:
      {
         isHead, isFace, isHand, isFoot, isTail,
         connections: { up, down, left, right }
      }
    */
    analyzeGrid() {
        const metaGrid = [];

        // 1. Basic Connectivity
        for (let r = 0; r < this.rows; r++) {
            const rowMeta = [];
            for (let c = 0; c < this.cols; c++) {
                const cell = this.grid[r][c];
                if (!cell) {
                    rowMeta.push(null);
                    continue;
                }

                const m = {
                    color: cell.color,
                    u: (r > 0 && this.grid[r - 1][c]?.color === cell.color),
                    d: (r < this.rows - 1 && this.grid[r + 1][c]?.color === cell.color),
                    l: (c > 0 && this.grid[r][c - 1]?.color === cell.color),
                    r: (c < this.cols - 1 && this.grid[r][c + 1]?.color === cell.color),

                    isHead: false,
                    isHand: false,
                    isFoot: false,
                    isTail: false
                };
                rowMeta.push(m);
            }
            metaGrid.push(rowMeta);
        }

        // 2. Identify Clusters & Assign Roles
        const visited = new Set();
        const key = (r, c) => `${r},${c}`;

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!metaGrid[r][c] || visited.has(key(r, c))) continue;

                // BFS to find cluster
                const cluster = [];
                const queue = [{ r, c }];
                visited.add(key(r, c));
                cluster.push({ r, c });

                while (queue.length > 0) {
                    const cur = queue.shift();
                    // Neighbors (already checked connectivity in step 1, but we can reuse meta)
                    const m = metaGrid[cur.r][cur.c];
                    if (m.u && !visited.has(key(cur.r - 1, cur.c))) { visited.add(key(cur.r - 1, cur.c)); queue.push({ r: cur.r - 1, c: cur.c }); cluster.push({ r: cur.r - 1, c: cur.c }); }
                    if (m.d && !visited.has(key(cur.r + 1, cur.c))) { visited.add(key(cur.r + 1, cur.c)); queue.push({ r: cur.r + 1, c: cur.c }); cluster.push({ r: cur.r + 1, c: cur.c }); }
                    if (m.l && !visited.has(key(cur.r, cur.c - 1))) { visited.add(key(cur.r, cur.c - 1)); queue.push({ r: cur.r, c: cur.c - 1 }); cluster.push({ r: cur.r, c: cur.c - 1 }); }
                    if (m.r && !visited.has(key(cur.r, cur.c + 1))) { visited.add(key(cur.r, cur.c + 1)); queue.push({ r: cur.r, c: cur.c + 1 }); cluster.push({ r: cur.r, c: cur.c + 1 }); }
                }

                // --- Assign Roles within Cluster ---

                // 1. Head: Min Y, then Min X
                let head = cluster[0];
                for (let p of cluster) {
                    if (p.r < head.r) head = p;
                    else if (p.r === head.r && p.c < head.c) head = p;
                }
                metaGrid[head.r][head.c].isHead = true;

                // 2. Hand (Left Hand): Max Y, then Min X
                let hand = cluster[0];
                for (let p of cluster) {
                    if (p.r > hand.r) hand = p;
                    else if (p.r === hand.r && p.c < hand.c) hand = p;
                }
                metaGrid[hand.r][hand.c].isHand = true;

                // 3. Foot (Right Foot): Max Y, then Max X
                let foot = cluster[0];
                for (let p of cluster) {
                    if (p.r > foot.r) foot = p;
                    else if (p.r === foot.r && p.c > foot.c) foot = p;
                }
                metaGrid[foot.r][foot.c].isFoot = true;

                // 4. Tail: Max X, then Min Y (Higher priority for 'perky' tail)
                let tail = cluster[0];
                for (let p of cluster) {
                    if (p.c > tail.c) tail = p;
                    else if (p.c === tail.c && p.r < tail.r) tail = p;
                }
                metaGrid[tail.r][tail.c].isTail = true;
            }
        }

        return metaGrid;
    }
}
