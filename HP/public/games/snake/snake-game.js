// スネークゲーム - テンプレート対応版
(function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const gridSize = 20;
    const canvasSize = 600;

    let snake = [{ x: 300, y: 300 }];
    let direction = { x: 0, y: 0 };
    let foods = [];
    let score = 0;
    let level = 1;
    let gameRunning = false;

    let difficulty = 'easy';
    const difficultySettings = {
        easy: { speed: 200, scoreMultiplier: 1 },
        normal: { speed: 150, scoreMultiplier: 1.2 },
        hard: { speed: 100, scoreMultiplier: 1.5 },
        extreme: { speed: 80, scoreMultiplier: 2 }
    };

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const fruitImages = {};
    let imagesLoaded = 0;
    const totalImages = 4;

    const foodTypes = [
        { emoji: '🍎', points: 10, color: '#ff0000', weight: 40, image: 'apple' },
        { emoji: '🍌', points: 20, color: '#ffff00', weight: 30, image: 'banana' },
        { emoji: '🍇', points: 30, color: '#800080', weight: 20, image: 'grape' },
        { emoji: '🍓', points: 50, color: '#ff69b4', weight: 10, image: 'strawberry' }
    ];

    let highScore = localStorage.getItem('snakeHighScore') || 0;
    let sessionHighScore = 0;
    let sessionHighLength = 1;
    let sessionHighLevel = 1;

    function loadImages() {
        const imageNames = ['apple', 'banana', 'grape', 'strawberry'];
        imageNames.forEach(name => {
            const img = new Image();
            img.onload = () => {
                imagesLoaded++;
                if (imagesLoaded === totalImages) {
                    gameFramework.onImagesLoaded();
                }
            };
            img.onerror = () => {
                console.warn(`Failed to load image: ${name}.png`);
                imagesLoaded++;
                if (imagesLoaded === totalImages) {
                    gameFramework.onImagesLoaded();
                }
            };
            img.src = `assets/images/${name}.png`;
            fruitImages[name] = img;
        });
    }

    function setupEventListeners() {
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                setDifficulty(this.dataset.difficulty);
            });
        });

        document.addEventListener('keydown', handleKeyPress);
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

        adjustCanvasSize();
        window.addEventListener('resize', adjustCanvasSize);
    }

    function adjustCanvasSize() {
        const container = document.querySelector('.game-container');
        const containerWidth = container.clientWidth - 40;

        if (containerWidth < 600) {
            canvas.style.width = (containerWidth - 20) + 'px';
            canvas.style.height = (containerWidth - 20) + 'px';
        } else {
            canvas.style.width = '600px';
            canvas.style.height = '600px';
        }
    }

    function setDifficulty(level) {
        difficulty = level;
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
    }

    function handleTouchStart(e) {
        e.preventDefault();
        if (!gameRunning || gameFramework.isPaused) return;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        if (!gameRunning || gameFramework.isPaused) return;

        const touch = e.changedTouches[0];
        touchEndX = touch.clientX;
        touchEndY = touch.clientY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const minSwipeDistance = 30;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0 && direction.x === 0) {
                    direction = { x: gridSize, y: 0 };
                } else if (deltaX < 0 && direction.x === 0) {
                    direction = { x: -gridSize, y: 0 };
                }
            }
        } else {
            if (Math.abs(deltaY) > minSwipeDistance) {
                if (deltaY > 0 && direction.y === 0) {
                    direction = { x: 0, y: gridSize };
                } else if (deltaY < 0 && direction.y === 0) {
                    direction = { x: 0, y: -gridSize };
                }
            }
        }
    }

    function onGameStart() {
        gameRunning = true;
        direction = { x: gridSize, y: 0 };
        snake = [{ x: 300, y: 300 }];
        score = 0;
        level = 1;
        foods = [];

        generateFood();
        updateStats();
    }

    function onGameOver() {
        document.getElementById('finalScore').textContent = score;
        document.getElementById('finalLength').textContent = snake.length;
        document.getElementById('finalLevel').textContent = level;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            document.getElementById('highScore').textContent = highScore;
        }
    }

    function onGameReset() {
        gameRunning = false;
        snake = [{ x: 300, y: 300 }];
        direction = { x: 0, y: 0 };
        score = 0;
        level = 1;
        foods = [];

        updateStats();
        generateFood();
        drawGame();
    }

    function generateFood() {
        const normalFoodCount = Math.floor(Math.random() * 3) + 1;

        for (let i = 0; i < normalFoodCount; i++) {
            let newFood;
            let attempts = 0;

            do {
                const randomValue = Math.random() * 100;
                let selectedType = foodTypes[0];
                let cumulative = 0;

                for (const type of foodTypes) {
                    cumulative += type.weight;
                    if (randomValue <= cumulative) {
                        selectedType = type;
                        break;
                    }
                }

                newFood = {
                    x: Math.floor(Math.random() * (canvasSize / gridSize)) * gridSize,
                    y: Math.floor(Math.random() * (canvasSize / gridSize)) * gridSize,
                    type: selectedType
                };
                attempts++;
            } while ((isPositionOccupied(newFood.x, newFood.y) || isPositionInFoods(newFood.x, newFood.y)) && attempts < 50);

            if (attempts < 50) {
                foods.push(newFood);
            }
        }
    }

    function isPositionOccupied(x, y) {
        return snake.some(segment => segment.x === x && segment.y === y);
    }

    function isPositionInFoods(x, y) {
        return foods.some(food => food.x === x && food.y === y);
    }

    function updateGame() {
        if (!gameRunning || gameFramework.isPaused) return;

        const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

        if (head.x < 0 || head.x >= canvasSize || head.y < 0 || head.y >= canvasSize) {
            gameFramework.gameOver();
            return;
        }

        if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            gameFramework.gameOver();
            return;
        }

        snake.unshift(head);

        let foodEaten = false;
        for (let i = foods.length - 1; i >= 0; i--) {
            const food = foods[i];
            if (head.x === food.x && head.y === food.y) {
                const settings = difficultySettings[difficulty];
                score += Math.floor(food.type.points * settings.scoreMultiplier);
                foods.splice(i, 1);
                foodEaten = true;
                updateStats();

                const newLevel = Math.floor(snake.length / 5) + 1;
                if (newLevel > level) {
                    level = newLevel;
                    updateStats();
                }

                if (foods.length === 0) {
                    generateFood();
                }
                break;
            }
        }

        if (!foodEaten) {
            snake.pop();
        }

        drawGame();
    }

    function drawGame() {
        ctx.fillStyle = '#2d5a2d';
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        ctx.strokeStyle = '#4a7c4a';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= canvasSize; i += gridSize) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvasSize);
            ctx.moveTo(0, i);
            ctx.lineTo(canvasSize, i);
            ctx.stroke();
        }

        snake.forEach((segment, index) => {
            ctx.save();

            if (index === 0) {
                // 蛇の頭部（方向に応じて顔の向きを変更）
                const gradient = ctx.createRadialGradient(
                    segment.x + gridSize / 2, segment.y + gridSize / 2, 0,
                    segment.x + gridSize / 2, segment.y + gridSize / 2, gridSize / 2
                );
                gradient.addColorStop(0, '#44ff44');
                gradient.addColorStop(1, '#00dd00');
                ctx.fillStyle = gradient;

                ctx.beginPath();
                ctx.roundRect(segment.x + 1, segment.y + 1, gridSize - 2, gridSize - 2, 4);
                ctx.fill();

                // 方向に応じて目と口の位置を計算
                let eyeOffset1X, eyeOffset1Y, eyeOffset2X, eyeOffset2Y;
                let mouthX, mouthY, mouthWidth, mouthHeight;

                if (direction.x > 0) { // 右向き
                    eyeOffset1X = 12; eyeOffset1Y = 6;
                    eyeOffset2X = 12; eyeOffset2Y = 14;
                    mouthX = 15; mouthY = 10; mouthWidth = 2; mouthHeight = 1;
                } else if (direction.x < 0) { // 左向き
                    eyeOffset1X = 8; eyeOffset1Y = 6;
                    eyeOffset2X = 8; eyeOffset2Y = 14;
                    mouthX = 3; mouthY = 10; mouthWidth = 2; mouthHeight = 1;
                } else if (direction.y < 0) { // 上向き
                    eyeOffset1X = 6; eyeOffset1Y = 8;
                    eyeOffset2X = 14; eyeOffset2Y = 8;
                    mouthX = 10; mouthY = 3; mouthWidth = 1; mouthHeight = 2;
                } else { // 下向き（デフォルト）
                    eyeOffset1X = 6; eyeOffset1Y = 12;
                    eyeOffset2X = 14; eyeOffset2Y = 12;
                    mouthX = 10; mouthY = 15; mouthWidth = 1; mouthHeight = 2;
                }

                // 目を描画
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(segment.x + eyeOffset1X, segment.y + eyeOffset1Y, 2, 0, Math.PI * 2);
                ctx.arc(segment.x + eyeOffset2X, segment.y + eyeOffset2Y, 2, 0, Math.PI * 2);
                ctx.fill();

                // 目のハイライト
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(segment.x + eyeOffset1X + 0.5, segment.y + eyeOffset1Y - 0.5, 1, 0, Math.PI * 2);
                ctx.arc(segment.x + eyeOffset2X + 0.5, segment.y + eyeOffset2Y - 0.5, 1, 0, Math.PI * 2);
                ctx.fill();

                // 口を描画
                ctx.fillStyle = '#000';
                ctx.fillRect(segment.x + mouthX, segment.y + mouthY, mouthWidth, mouthHeight);
            } else {
                const bodyProgress = Math.min(index / snake.length, 0.8);
                const greenComponent = Math.floor(200 - (bodyProgress * 80));
                const redComponent = Math.floor(bodyProgress * 180);
                const blueComponent = Math.floor(bodyProgress * 180);

                const gradient = ctx.createRadialGradient(
                    segment.x + gridSize / 2, segment.y + gridSize / 2, 2,
                    segment.x + gridSize / 2, segment.y + gridSize / 2, gridSize / 2
                );
                gradient.addColorStop(0, `rgb(${redComponent + 20}, ${greenComponent + 20}, ${blueComponent + 20})`);
                gradient.addColorStop(1, `rgb(${redComponent}, ${greenComponent}, ${blueComponent})`);
                ctx.fillStyle = gradient;

                ctx.beginPath();
                ctx.roundRect(segment.x + 2, segment.y + 2, gridSize - 4, gridSize - 4, 2);
                ctx.fill();

                ctx.strokeStyle = `rgba(0, ${Math.floor(greenComponent * 0.7)}, 0, 0.8)`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            ctx.restore();
        });

        foods.forEach(food => {
            const img = fruitImages[food.type.image];
            if (img && img.complete) {
                ctx.drawImage(img, food.x, food.y, gridSize, gridSize);
            } else {
                const centerX = food.x + gridSize / 2;
                const centerY = food.y + gridSize / 2;
                const radius = gridSize / 2 - 2;

                ctx.fillStyle = food.type.color;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#000';
                ctx.font = `${gridSize - 4}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(food.type.emoji, centerX, centerY);
            }
        });

        if (gameFramework.isPaused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvasSize, canvasSize);
            ctx.fillStyle = '#32CD32';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvasSize / 2, canvasSize / 2);
            ctx.textAlign = 'left';
        }
    }

    function updateStats() {
        document.getElementById('score').textContent = score;
        document.getElementById('length').textContent = snake.length;
        document.getElementById('level').textContent = level;

        if (score > sessionHighScore) {
            sessionHighScore = score;
            sessionHighLength = snake.length;
            sessionHighLevel = level;
            document.getElementById('sessionHigh').textContent = sessionHighScore;
            document.getElementById('sessionLength').textContent = sessionHighLength;
            document.getElementById('sessionLevel').textContent = sessionHighLevel;
        }
    }

    function handleKeyPress(event) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D', ' '].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (event.key === ' ') {
            if (gameRunning) {
                gameFramework.togglePause();
            }
            return;
        }

        if (!gameRunning || gameFramework.isPaused) return;

        switch (event.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                if (direction.y === 0) direction = { x: 0, y: -gridSize };
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                if (direction.y === 0) direction = { x: 0, y: gridSize };
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                if (direction.x === 0) direction = { x: -gridSize, y: 0 };
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                if (direction.x === 0) direction = { x: gridSize, y: 0 };
                break;
        }
    }

    function changeDirection(dir) {
        if (!gameRunning || gameFramework.isPaused) return;

        switch (dir) {
            case 'UP':
                if (direction.y === 0) direction = { x: 0, y: -gridSize };
                break;
            case 'DOWN':
                if (direction.y === 0) direction = { x: 0, y: gridSize };
                break;
            case 'LEFT':
                if (direction.x === 0) direction = { x: -gridSize, y: 0 };
                break;
            case 'RIGHT':
                if (direction.x === 0) direction = { x: gridSize, y: 0 };
                break;
        }
    }

    function init() {
        document.getElementById('highScore').textContent = highScore;

        loadImages();
        generateFood();
        setupEventListeners();
        drawGame();
    }

    const gameFramework = new GameFramework({
        requiresImageLoading: true,
        startButtonText: '🎮 ゲーム開始',
        onGameStart: onGameStart,
        onGameOver: onGameOver,
        onGameReset: onGameReset,
        gameUpdateFunction: updateGame,
        gameSpeed: 150
    });

    window.changeDirection = changeDirection;
    window.startGame = () => gameFramework.startGame();
    window.pauseGame = () => gameFramework.togglePause();
    window.resetGame = () => gameFramework.resetGame();

    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius) {
            this.beginPath();
            this.moveTo(x + radius, y);
            this.lineTo(x + width - radius, y);
            this.quadraticCurveTo(x + width, y, x + width, y + radius);
            this.lineTo(x + width, y + height - radius);
            this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            this.lineTo(x + radius, y + height);
            this.quadraticCurveTo(x, y + height, x, y + height - radius);
            this.lineTo(x, y + radius);
            this.quadraticCurveTo(x, y, x + radius, y);
            this.closePath();
        };
    }

    window.addEventListener('load', init);
})();
